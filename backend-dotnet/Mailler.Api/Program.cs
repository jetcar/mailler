using System.Security.Claims;
using System.Diagnostics;
using Mailler.Api.Configuration;
using Mailler.Api.Data;
using Mailler.Api.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.DataProtection.EntityFrameworkCore;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using NLog.Web;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.ClearProviders();
builder.Host.UseNLog();

var frontendUrl = builder.Configuration["FRONTEND_URL"] ?? "http://localhost:5173";
var appBasePath = NormalizeBasePath(builder.Configuration["APP_BASE_PATH"]);
var databaseConnectionString = ResolvePostgresConnectionString(builder.Configuration);
var runtimeOptions = CreateRuntimeOptions(builder.Configuration, builder.Environment, frontendUrl, appBasePath);

builder.Services
    .AddDataProtection()
    .SetApplicationName("Mailler.Api")
    .PersistKeysToDbContext<MaillerDbContext>();

builder.Services.AddSingleton(runtimeOptions);
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<AppUrlBuilder>();
builder.Services.AddScoped<CurrentUserAccessor>();
builder.Services.AddScoped<UserProvisioningService>();
builder.Services.AddScoped<LocalSmtpSendService>();
builder.Services.AddSingleton<ImportWorkflowService>();
if (!runtimeOptions.DisableSmtpListener)
{
    builder.Services.AddHostedService<SmtpReceiveHostedService>();
}

builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.SnakeCaseLower;
});
builder.Services.AddEndpointsApiExplorer();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(frontendUrl)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

builder.Services.AddDbContext<MaillerDbContext>(options =>
    options.UseNpgsql(databaseConnectionString));

var authenticationBuilder = builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = CookieAuthenticationDefaults.AuthenticationScheme;
    options.DefaultSignInScheme = CookieAuthenticationDefaults.AuthenticationScheme;
    options.DefaultScheme = CookieAuthenticationDefaults.AuthenticationScheme;
});

authenticationBuilder.AddCookie(options =>
{
    options.Cookie.HttpOnly = true;
    options.Cookie.SameSite = SameSiteMode.Lax;
    options.Cookie.SecurePolicy = runtimeOptions.TrustProxy || runtimeOptions.IsProduction
        ? CookieSecurePolicy.Always
        : CookieSecurePolicy.SameAsRequest;
    options.LoginPath = "/auth/login";
    options.LogoutPath = "/auth/logout";
    options.Events = new CookieAuthenticationEvents
    {
        OnRedirectToLogin = context =>
        {
            if (IsApiRequest(context.Request.Path))
            {
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                return Task.CompletedTask;
            }

            context.Response.Redirect(context.RedirectUri);
            return Task.CompletedTask;
        },
        OnRedirectToAccessDenied = context =>
        {
            if (IsApiRequest(context.Request.Path))
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                return Task.CompletedTask;
            }

            context.Response.Redirect(context.RedirectUri);
            return Task.CompletedTask;
        }
    };
});

if (runtimeOptions.OidcConfigured)
{
    authenticationBuilder.AddOpenIdConnect(OpenIdConnectDefaults.AuthenticationScheme, options =>
    {
        options.SignInScheme = CookieAuthenticationDefaults.AuthenticationScheme;
        options.Authority = runtimeOptions.OidcIssuer!;
        options.ClientId = runtimeOptions.OidcClientId!;
        options.ClientSecret = runtimeOptions.OidcClientSecret!;
        options.ResponseType = "code";
        options.UsePkce = true;
        options.SaveTokens = true;
        options.GetClaimsFromUserInfoEndpoint = true;
        options.MapInboundClaims = false;
        options.CallbackPath = runtimeOptions.OidcCallbackPath;
        options.RequireHttpsMetadata = !runtimeOptions.AllowInsecureOidcTls && runtimeOptions.OidcIssuerUsesHttps;
        options.TokenValidationParameters.NameClaimType = "name";
        options.TokenValidationParameters.RoleClaimType = "role";
        options.CorrelationCookie.SameSite = SameSiteMode.Lax;
        options.NonceCookie.SameSite = SameSiteMode.Lax;

        options.Scope.Clear();
        foreach (var scope in runtimeOptions.OidcScopes)
        {
            options.Scope.Add(scope);
        }

        if (runtimeOptions.AllowInsecureOidcTls)
        {
            options.BackchannelHttpHandler = new HttpClientHandler
            {
                ServerCertificateCustomValidationCallback = HttpClientHandler.DangerousAcceptAnyServerCertificateValidator
            };
        }

        options.Events = new OpenIdConnectEvents
        {
            OnRedirectToIdentityProvider = context =>
            {
                if (!string.IsNullOrWhiteSpace(runtimeOptions.OidcPublicIssuer)
                    && !string.Equals(runtimeOptions.OidcPublicIssuer, runtimeOptions.OidcIssuer, StringComparison.OrdinalIgnoreCase))
                {
                    context.ProtocolMessage.IssuerAddress = context.ProtocolMessage.IssuerAddress.Replace(
                        runtimeOptions.OidcIssuer!,
                        runtimeOptions.OidcPublicIssuer!,
                        StringComparison.OrdinalIgnoreCase);
                }

                return Task.CompletedTask;
            },
            OnRemoteFailure = async context =>
            {
                var logger = context.HttpContext.RequestServices
                    .GetRequiredService<ILoggerFactory>()
                    .CreateLogger("Mailler.Api.Auth");

                logger.LogWarning(context.Failure, "OIDC remote authentication failed");

                context.HandleResponse();
                await context.HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
                context.Response.Redirect(BuildAppPath(runtimeOptions.AppBasePath, "/?authError=oidc_remote_failure"));
            },
            OnTokenValidated = async context =>
            {
                var provisioningService = context.HttpContext.RequestServices.GetRequiredService<UserProvisioningService>();
                var localUser = await provisioningService.SyncUserAsync(context.Principal!, context.HttpContext.RequestAborted);

                if (context.Principal?.Identity is ClaimsIdentity identity)
                {
                    var existingLocalUserId = identity.FindFirst("local_user_id");
                    if (existingLocalUserId is not null)
                    {
                        identity.RemoveClaim(existingLocalUserId);
                    }

                    identity.AddClaim(new Claim("local_user_id", localUser.Id.ToString()));
                }
            }
        };
    });
}

builder.Services.AddAuthorization();

var app = builder.Build();
var migrateOnly = ShouldRunMigrateOnly(args);

if (runtimeOptions.AutoMigrate || migrateOnly)
{
    await DatabaseInitializationService.InitializeAsync(app.Services, databaseConnectionString, app.Environment.ContentRootPath, app.Logger, app.Lifetime.ApplicationStopping);
}

if (migrateOnly)
{
    app.Logger.LogInformation("Migration-only mode complete. Exiting without starting web host.");
    return;
}

if (runtimeOptions.TrustProxy)
{
    var forwardedHeadersOptions = new ForwardedHeadersOptions
    {
        ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
    };

    forwardedHeadersOptions.KnownIPNetworks.Clear();
    forwardedHeadersOptions.KnownProxies.Clear();

    app.UseForwardedHeaders(forwardedHeadersOptions);
}

if (!string.IsNullOrEmpty(appBasePath))
{
    var configuredPathBase = new PathString(appBasePath);

    app.Use((context, next) =>
    {
        if (context.Request.Path.StartsWithSegments(configuredPathBase, out var remainingPath))
        {
            context.Request.PathBase = configuredPathBase;
            context.Request.Path = remainingPath;
        }

        return next();
    });
}

app.UseRouting();

app.Use(async (context, next) =>
{
    var requestId = context.TraceIdentifier;
    var requestPath = $"{context.Request.PathBase}{context.Request.Path}{context.Request.QueryString}";

    if (ShouldSkipRequestLogging(context.Request.Path))
    {
        await next();
        return;
    }

    var stopwatch = Stopwatch.StartNew();

    app.Logger.LogInformation("Request started {RequestId} {Method} {Path}", requestId, context.Request.Method, requestPath);

    try
    {
        await next();
    }
    finally
    {
        stopwatch.Stop();
        app.Logger.LogInformation(
            "Request finished {RequestId} {Method} {Path} {StatusCode} {ElapsedMilliseconds}ms",
            requestId,
            context.Request.Method,
            requestPath,
            context.Response.StatusCode,
            stopwatch.ElapsedMilliseconds);
    }
});

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

var frontendIndexPath = Path.Combine(app.Environment.ContentRootPath, "wwwroot", "index.html");
if (File.Exists(frontendIndexPath))
{
    app.UseDefaultFiles();
    app.UseStaticFiles();
}

app.MapControllers();

if (File.Exists(frontendIndexPath))
{
    app.MapFallback(async context =>
    {
        if (IsReservedRequestPath(context.Request.Path))
        {
            context.Response.StatusCode = StatusCodes.Status404NotFound;
            return;
        }

        await context.Response.SendFileAsync(frontendIndexPath);
    });
}

app.Run();

static string NormalizeBasePath(string? value)
{
    if (string.IsNullOrWhiteSpace(value) || value == "/")
    {
        return string.Empty;
    }

    var normalized = value.StartsWith('/') ? value : $"/{value}";
    return normalized.TrimEnd('/');
}

static string ResolvePostgresConnectionString(IConfiguration configuration)
{
    var databaseUrl = configuration["DATABASE_URL"];
    if (!string.IsNullOrWhiteSpace(databaseUrl))
    {
        return ConvertDatabaseUrlToConnectionString(databaseUrl);
    }

    var host = configuration["DB_HOST"];
    var port = configuration["DB_PORT"];
    var database = configuration["DB_NAME"];
    var username = configuration["DB_USER"];
    var password = configuration["DB_PASSWORD"];

    if (!string.IsNullOrWhiteSpace(host)
        || !string.IsNullOrWhiteSpace(port)
        || !string.IsNullOrWhiteSpace(database)
        || !string.IsNullOrWhiteSpace(username)
        || !string.IsNullOrWhiteSpace(password))
    {
        return $"Host={host ?? "localhost"};Port={port ?? "5432"};Database={database ?? "mailler"};Username={username ?? "postgres"};Password={password ?? string.Empty}";
    }

    var configuredConnectionString = configuration.GetConnectionString("DefaultConnection");
    if (!string.IsNullOrWhiteSpace(configuredConnectionString))
    {
        return configuredConnectionString;
    }

    return "Host=localhost;Port=5432;Database=mailler;Username=postgres;Password=";
}

static string BuildAppPath(string appBasePath, string pathname)
{
    var normalizedPathname = pathname.StartsWith('/') ? pathname : $"/{pathname}";
    return string.IsNullOrEmpty(appBasePath)
        ? normalizedPathname
        : $"{appBasePath}{normalizedPathname}";
}

static bool ShouldSkipRequestLogging(PathString requestPath)
{
    return requestPath.StartsWithSegments("/health", StringComparison.OrdinalIgnoreCase)
        || requestPath.StartsWithSegments("/ready", StringComparison.OrdinalIgnoreCase);
}

static string ConvertDatabaseUrlToConnectionString(string databaseUrl)
{
    var uri = new Uri(databaseUrl);
    var userInfo = uri.UserInfo.Split(':', 2);
    var username = Uri.UnescapeDataString(userInfo[0]);
    var password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : string.Empty;
    var database = uri.AbsolutePath.Trim('/');

    return $"Host={uri.Host};Port={uri.Port};Database={database};Username={username};Password={password};Ssl Mode=Prefer;Trust Server Certificate=true";
}

static RuntimeOptions CreateRuntimeOptions(IConfiguration configuration, IHostEnvironment environment, string frontendUrl, string appBasePath)
{
    var callbackPath = ResolveCallbackPath(configuration["OIDC_CALLBACK_URL"], appBasePath);
    var oidcIssuer = configuration["OIDC_ISSUER"];
    var isTesting = environment.IsEnvironment("Testing");

    return new RuntimeOptions
    {
        FrontendUrl = frontendUrl,
        AppBasePath = appBasePath,
        OidcIssuer = oidcIssuer,
        OidcPublicIssuer = configuration["OIDC_PUBLIC_ISSUER"],
        OidcClientId = configuration["OIDC_CLIENT_ID"],
        OidcClientSecret = configuration["OIDC_CLIENT_SECRET"],
        OidcCallbackPath = callbackPath,
        OidcScopes = ParseScopes(configuration["OIDC_SCOPE"]),
        AllowInsecureOidcTls = string.Equals(configuration["ALLOW_INSECURE_OIDC_TLS"], "true", StringComparison.OrdinalIgnoreCase),
        SmtpCertPath = configuration["SMTP_CERT_PATH"] ?? "/certs",
        SmtpPorts = ParsePorts(configuration["SMTP_PORTS"]),
        AutoMigrate = !isTesting && !string.Equals(configuration["AUTO_MIGRATE"], "false", StringComparison.OrdinalIgnoreCase),
        DisableSmtpListener = isTesting || string.Equals(configuration["DISABLE_SMTP_LISTENER"], "true", StringComparison.OrdinalIgnoreCase),
        TrustProxy = string.Equals(configuration["TRUST_PROXY"], "true", StringComparison.OrdinalIgnoreCase),
        IsProduction = string.Equals(configuration["NODE_ENV"], "production", StringComparison.OrdinalIgnoreCase)
    };
}

static string ResolveCallbackPath(string? callbackUrl, string appBasePath)
{
    const string fallbackPath = "/auth/callback";

    if (string.IsNullOrWhiteSpace(callbackUrl))
    {
        return fallbackPath;
    }

    var rawPath = Uri.TryCreate(callbackUrl, UriKind.Absolute, out var absoluteUri)
        ? absoluteUri.AbsolutePath
        : callbackUrl;

    if (!string.IsNullOrEmpty(appBasePath)
        && rawPath.StartsWith(appBasePath, StringComparison.OrdinalIgnoreCase))
    {
        rawPath = rawPath[appBasePath.Length..];
    }

    if (string.IsNullOrWhiteSpace(rawPath) || rawPath == "/")
    {
        return fallbackPath;
    }

    return rawPath.StartsWith('/') ? rawPath : $"/{rawPath}";
}

static string[] ParseScopes(string? value)
{
    var scopes = (value ?? "openid profile email")
        .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

    return scopes.Length == 0 ? ["openid", "profile", "email"] : scopes;
}

static bool IsApiRequest(PathString requestPath)
{
    return requestPath.StartsWithSegments("/api", StringComparison.OrdinalIgnoreCase)
        || requestPath.StartsWithSegments("/auth/me", StringComparison.OrdinalIgnoreCase);
}

static bool IsReservedRequestPath(PathString requestPath)
{
    return requestPath.StartsWithSegments("/api", StringComparison.OrdinalIgnoreCase)
        || requestPath.StartsWithSegments("/auth", StringComparison.OrdinalIgnoreCase)
        || requestPath.StartsWithSegments("/health", StringComparison.OrdinalIgnoreCase)
        || requestPath.StartsWithSegments("/webmail", StringComparison.OrdinalIgnoreCase);
}

static bool ShouldRunMigrateOnly(string[] args)
{
    return args.Any(arg =>
        string.Equals(arg, "--migrate-only", StringComparison.OrdinalIgnoreCase)
        || string.Equals(arg, "migrate", StringComparison.OrdinalIgnoreCase));
}

static int[] ParsePorts(string? value)
{
    var ports = (value ?? "25,587,465")
        .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
        .Select(port => int.TryParse(port, out var parsedPort) ? parsedPort : (int?)null)
        .Where(port => port.HasValue)
        .Select(port => port!.Value)
        .Distinct()
        .ToArray();

    return ports.Length == 0 ? [25, 587, 465] : ports;
}

public partial class Program;
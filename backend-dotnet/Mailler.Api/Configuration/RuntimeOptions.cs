namespace Mailler.Api.Configuration;

public sealed class RuntimeOptions
{
    public string FrontendUrl { get; init; } = string.Empty;

    public string AppBasePath { get; init; } = string.Empty;

    public string? OidcIssuer { get; init; }

    public string? OidcPublicIssuer { get; init; }

    public string? OidcClientId { get; init; }

    public string? OidcClientSecret { get; init; }

    public string OidcCallbackPath { get; init; } = "/auth/callback";

    public string[] OidcScopes { get; init; } = ["openid", "profile", "email"];

    public bool AllowInsecureOidcTls { get; init; }

    public string SmtpCertPath { get; init; } = "/certs";

    public int[] SmtpPorts { get; init; } = [25, 587, 465];

    public bool AutoMigrate { get; init; } = true;

    public bool DisableSmtpListener { get; init; }

    public bool TrustProxy { get; init; }

    public bool IsProduction { get; init; }

    public bool OidcConfigured =>
        !string.IsNullOrWhiteSpace(OidcIssuer)
        && !string.IsNullOrWhiteSpace(OidcClientId)
        && !string.IsNullOrWhiteSpace(OidcClientSecret);

    public bool OidcIssuerUsesHttps =>
        Uri.TryCreate(OidcIssuer, UriKind.Absolute, out var uri)
        && string.Equals(uri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase);
}
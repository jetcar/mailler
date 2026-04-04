using Mailler.Api.Configuration;
using Mailler.Api.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Mailler.Api.Controllers;

[ApiController]
[Route("auth")]
public sealed class AuthController(CurrentUserAccessor currentUserAccessor, AppUrlBuilder appUrlBuilder, RuntimeOptions runtimeOptions) : ControllerBase
{
    [AllowAnonymous]
    [HttpGet("login")]
    public IActionResult Login()
    {
        if (!runtimeOptions.OidcConfigured)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { error = "OIDC is not configured" });
        }

        return Challenge(new AuthenticationProperties
        {
            RedirectUri = appUrlBuilder.BuildFrontendUrl("/inbox")
        }, OpenIdConnectDefaults.AuthenticationScheme);
    }

    [HttpGet("logout")]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return Ok(new { message = "Logged out successfully" });
    }

    [AllowAnonymous]
    [HttpGet("me")]
    public async Task<IActionResult> GetCurrentUser(CancellationToken cancellationToken)
    {
        var user = await currentUserAccessor.GetCurrentUserAsync(cancellationToken);
        if (user is null)
        {
            return Unauthorized(new { authenticated = false });
        }

        return Ok(new
        {
            authenticated = true,
            user = new
            {
                user.Id,
                user.Email,
                user.DisplayName
            }
        });
    }
}
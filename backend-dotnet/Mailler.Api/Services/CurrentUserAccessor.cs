using System.Security.Claims;
using Mailler.Api.Data;
using Mailler.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Mailler.Api.Services;

public sealed class CurrentUserAccessor(IHttpContextAccessor httpContextAccessor, MaillerDbContext dbContext)
{
    public async Task<User?> GetCurrentUserAsync(CancellationToken cancellationToken = default)
    {
        var principal = httpContextAccessor.HttpContext?.User;
        if (principal?.Identity?.IsAuthenticated != true)
        {
            return null;
        }

        var localUserIdClaim = principal.FindFirst("local_user_id")?.Value;
        if (int.TryParse(localUserIdClaim, out var localUserId))
        {
            return await dbContext.Users.FirstOrDefaultAsync(user => user.Id == localUserId, cancellationToken);
        }

        var oidcSubject = principal.FindFirst("sub")?.Value
            ?? principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (string.IsNullOrWhiteSpace(oidcSubject))
        {
            return null;
        }

        return await dbContext.Users.FirstOrDefaultAsync(user => user.OidcSub == oidcSubject, cancellationToken);
    }
}
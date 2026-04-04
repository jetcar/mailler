using System.Security.Claims;
using Mailler.Api.Data;
using Mailler.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Mailler.Api.Services;

public sealed class UserProvisioningService(MaillerDbContext dbContext)
{
    public async Task<User> SyncUserAsync(ClaimsPrincipal principal, CancellationToken cancellationToken = default)
    {
        var oidcSubject = principal.FindFirst("sub")?.Value
            ?? principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (string.IsNullOrWhiteSpace(oidcSubject))
        {
            throw new InvalidOperationException("OIDC subject claim is required.");
        }

        var email = principal.FindFirst("email")?.Value;
        if (string.IsNullOrWhiteSpace(email))
        {
            throw new InvalidOperationException("OIDC email claim is required.");
        }

        var displayName = principal.FindFirst("name")?.Value
            ?? principal.FindFirst("preferred_username")?.Value
            ?? email;

        var user = await dbContext.Users.FirstOrDefaultAsync(x => x.OidcSub == oidcSubject, cancellationToken);
        if (user is null)
        {
            user = new User
            {
                OidcSub = oidcSubject,
                Email = email,
                DisplayName = displayName,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            dbContext.Users.Add(user);
            await dbContext.SaveChangesAsync(cancellationToken);

            dbContext.EmailAccounts.Add(new EmailAccount
            {
                UserId = user.Id,
                EmailAddress = email,
                IsDefault = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });

            await dbContext.SaveChangesAsync(cancellationToken);
            return user;
        }

        user.Email = email;
        user.DisplayName = displayName;
        user.UpdatedAt = DateTime.UtcNow;

        var emailAccount = await dbContext.EmailAccounts.FirstOrDefaultAsync(x => x.UserId == user.Id, cancellationToken);
        if (emailAccount is null)
        {
            dbContext.EmailAccounts.Add(new EmailAccount
            {
                UserId = user.Id,
                EmailAddress = email,
                IsDefault = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
        }
        else if (!string.Equals(emailAccount.EmailAddress, email, StringComparison.OrdinalIgnoreCase))
        {
            emailAccount.EmailAddress = email;
            emailAccount.UpdatedAt = DateTime.UtcNow;
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return user;
    }
}
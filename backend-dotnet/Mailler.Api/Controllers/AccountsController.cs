using Mailler.Api.Data;
using Mailler.Api.Models;
using Mailler.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json.Serialization;

namespace Mailler.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/accounts")]
public sealed class AccountsController(MaillerDbContext dbContext, CurrentUserAccessor currentUserAccessor) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
    {
        var user = await currentUserAccessor.GetCurrentUserAsync(cancellationToken);
        if (user is null)
        {
            return Unauthorized(new { error = "Authentication required" });
        }

        var accounts = await dbContext.EmailAccounts
            .AsNoTracking()
            .Where(account => account.UserId == user.Id)
            .OrderByDescending(account => account.IsDefault)
            .ThenBy(account => account.EmailAddress)
            .ToListAsync(cancellationToken);

        return Ok(new { accounts = accounts.Select(MapAccountResponse) });
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id, CancellationToken cancellationToken)
    {
        var user = await currentUserAccessor.GetCurrentUserAsync(cancellationToken);
        if (user is null)
        {
            return Unauthorized(new { error = "Authentication required" });
        }

        var account = await dbContext.EmailAccounts
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == id && item.UserId == user.Id, cancellationToken);

        if (account is null)
        {
            return NotFound(new { error = "Resource not found" });
        }

        return Ok(new { account = MapAccountResponse(account) });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] UpsertEmailAccountRequest request, CancellationToken cancellationToken)
    {
        var user = await currentUserAccessor.GetCurrentUserAsync(cancellationToken);
        if (user is null)
        {
            return Unauthorized(new { error = "Authentication required" });
        }

        if (string.IsNullOrWhiteSpace(request.EmailAddress))
        {
            return BadRequest(new { error = "Email address is required" });
        }

        if (request.IsDefault)
        {
            await UnsetDefaultAccountsAsync(user.Id, null, cancellationToken);
        }

        var account = new EmailAccount
        {
            UserId = user.Id,
            EmailAddress = request.EmailAddress.Trim(),
            IsDefault = request.IsDefault,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        dbContext.EmailAccounts.Add(account);
        await dbContext.SaveChangesAsync(cancellationToken);

        return StatusCode(StatusCodes.Status201Created, new { account = MapAccountResponse(account) });
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpsertEmailAccountRequest request, CancellationToken cancellationToken)
    {
        var user = await currentUserAccessor.GetCurrentUserAsync(cancellationToken);
        if (user is null)
        {
            return Unauthorized(new { error = "Authentication required" });
        }

        var account = await dbContext.EmailAccounts
            .FirstOrDefaultAsync(item => item.Id == id && item.UserId == user.Id, cancellationToken);

        if (account is null)
        {
            return NotFound(new { error = "Resource not found" });
        }

        if (!string.IsNullOrWhiteSpace(request.EmailAddress))
        {
            account.EmailAddress = request.EmailAddress.Trim();
        }

        if (request.IsDefault)
        {
            await UnsetDefaultAccountsAsync(user.Id, account.Id, cancellationToken);
        }

        account.IsDefault = request.IsDefault;
        account.UpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);
        return Ok(new { account = MapAccountResponse(account) });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        var user = await currentUserAccessor.GetCurrentUserAsync(cancellationToken);
        if (user is null)
        {
            return Unauthorized(new { error = "Authentication required" });
        }

        var account = await dbContext.EmailAccounts
            .FirstOrDefaultAsync(item => item.Id == id && item.UserId == user.Id, cancellationToken);

        if (account is null)
        {
            return NotFound(new { error = "Resource not found" });
        }

        dbContext.EmailAccounts.Remove(account);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new { message = "Account deleted successfully" });
    }

    private async Task UnsetDefaultAccountsAsync(int userId, int? excludedAccountId, CancellationToken cancellationToken)
    {
        var existingDefaults = await dbContext.EmailAccounts
            .Where(account => account.UserId == userId && account.IsDefault)
            .ToListAsync(cancellationToken);

        foreach (var account in existingDefaults)
        {
            if (excludedAccountId.HasValue && account.Id == excludedAccountId.Value)
            {
                continue;
            }

            account.IsDefault = false;
            account.UpdatedAt = DateTime.UtcNow;
        }
    }

    private static EmailAccountResponse MapAccountResponse(EmailAccount account)
    {
        return new EmailAccountResponse(
            account.Id,
            account.UserId,
            account.EmailAddress,
            account.IsDefault,
            account.CreatedAt,
            account.UpdatedAt);
    }

    public sealed class UpsertEmailAccountRequest
    {
        [JsonPropertyName("email_address")]
        public string? EmailAddress { get; init; }

        [JsonPropertyName("is_default")]
        public bool IsDefault { get; init; }
    }

    public sealed record EmailAccountResponse(
        [property: JsonPropertyName("id")] int Id,
        [property: JsonPropertyName("user_id")] int UserId,
        [property: JsonPropertyName("email_address")] string EmailAddress,
        [property: JsonPropertyName("is_default")] bool IsDefault,
        [property: JsonPropertyName("created_at")] DateTime CreatedAt,
        [property: JsonPropertyName("updated_at")] DateTime UpdatedAt);
}
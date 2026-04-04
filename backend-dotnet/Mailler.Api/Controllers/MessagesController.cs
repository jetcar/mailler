using Mailler.Api.Data;
using Mailler.Api.Models;
using Mailler.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Mailler.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/messages")]
public sealed class MessagesController(
    MaillerDbContext dbContext,
    CurrentUserAccessor currentUserAccessor,
    ImportWorkflowService importWorkflowService,
    LocalSmtpSendService localSmtpSendService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? folder,
        [FromQuery] int? limit,
        [FromQuery] int? offset,
        [FromQuery] string? search,
        CancellationToken cancellationToken)
    {
        var user = await currentUserAccessor.GetCurrentUserAsync(cancellationToken);
        if (user is null)
        {
            return Unauthorized(new { error = "Authentication required" });
        }

        var resolvedLimit = limit ?? 1000;
        var resolvedOffset = offset ?? 0;

        var query = dbContext.Messages
            .AsNoTracking()
            .Where(message => message.Account != null && message.Account.UserId == user.Id);

        if (!string.IsNullOrWhiteSpace(folder) && !string.Equals(folder, "All", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(message => message.Folder == folder);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var pattern = $"%{search}%";
            query = query.Where(message =>
                EF.Functions.ILike(message.Subject ?? string.Empty, pattern)
                || EF.Functions.ILike(message.FromAddress ?? string.Empty, pattern)
                || EF.Functions.ILike(message.BodyText ?? string.Empty, pattern));
        }

        var total = await query.CountAsync(cancellationToken);

        var messages = await query
            .OrderByDescending(message => message.ReceivedDate)
            .Skip(resolvedOffset)
            .Take(resolvedLimit)
            .Select(message => new
            {
                message.Id,
                message.MessageId,
                message.FromAddress,
                message.ToAddresses,
                message.CcAddresses,
                message.Subject,
                message.BodyText,
                message.BodyHtml,
                message.ReceivedDate,
                message.IsRead,
                message.IsStarred,
                message.Folder,
                account = new
                {
                    message.Account!.EmailAddress
                }
            })
            .ToListAsync(cancellationToken);

        return Ok(new
        {
            messages,
            total,
            limit = resolvedLimit,
            offset = resolvedOffset
        });
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id, CancellationToken cancellationToken)
    {
        var user = await currentUserAccessor.GetCurrentUserAsync(cancellationToken);
        if (user is null)
        {
            return Unauthorized(new { error = "Authentication required" });
        }

        var message = await dbContext.Messages
            .Include(item => item.Account)
            .FirstOrDefaultAsync(item => item.Id == id && item.Account != null && item.Account.UserId == user.Id, cancellationToken);

        if (message is null)
        {
            return NotFound(new { error = "Message not found" });
        }

        if (!message.IsRead)
        {
            message.IsRead = true;
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        return Ok(new
        {
            message = new
            {
                message.Id,
                message.MessageId,
                message.FromAddress,
                message.ToAddresses,
                message.CcAddresses,
                message.Subject,
                message.BodyText,
                message.BodyHtml,
                message.ReceivedDate,
                message.IsRead,
                message.IsStarred,
                message.Folder,
                account = new
                {
                    message.Account!.EmailAddress,
                    message.Account.UserId
                }
            }
        });
    }

    [HttpPost("sync")]
    public async Task<IActionResult> Sync([FromBody] SyncRequest request, CancellationToken cancellationToken)
    {
        var user = await currentUserAccessor.GetCurrentUserAsync(cancellationToken);
        if (user is null)
        {
            return Unauthorized(new { error = "Authentication required" });
        }

        if (request.AccountId is null)
        {
            return BadRequest(new { error = "account_id required" });
        }

        var account = await dbContext.EmailAccounts
            .FirstOrDefaultAsync(item => item.Id == request.AccountId.Value && item.UserId == user.Id, cancellationToken);

        if (account is null)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { error = "Invalid account" });
        }

        var total = await dbContext.Messages.CountAsync(item => item.AccountId == account.Id, cancellationToken);

        return Ok(new
        {
            message = "Sync completed",
            synced = 0,
            total
        });
    }

    [HttpPost("send")]
    public async Task<IActionResult> Send([FromBody] SendMessageRequest request, CancellationToken cancellationToken)
    {
        var user = await currentUserAccessor.GetCurrentUserAsync(cancellationToken);
        if (user is null)
        {
            return Unauthorized(new { error = "Authentication required" });
        }

        if (request.AccountId is null || string.IsNullOrWhiteSpace(request.To) || string.IsNullOrWhiteSpace(request.Subject))
        {
            return BadRequest(new { error = "Missing required fields: account_id, to, subject" });
        }

        var account = await dbContext.EmailAccounts
            .FirstOrDefaultAsync(item => item.Id == request.AccountId.Value && item.UserId == user.Id, cancellationToken);

        if (account is null)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { error = "Invalid account" });
        }

        var messageId = await localSmtpSendService.SendAsync(
            account.EmailAddress,
            request.To,
            request.Cc,
            request.Bcc,
            request.Subject,
            request.Text,
            request.Html,
            cancellationToken);

        dbContext.Messages.Add(new Message
        {
            AccountId = account.Id,
            MessageId = messageId,
            FromAddress = account.EmailAddress,
            ToAddresses = request.To,
            CcAddresses = request.Cc ?? string.Empty,
            Subject = string.IsNullOrWhiteSpace(request.Subject) ? "(no subject)" : request.Subject,
            BodyText = request.Text ?? string.Empty,
            BodyHtml = request.Html ?? string.Empty,
            ReceivedDate = DateTime.UtcNow,
            Folder = "SENT",
            IsRead = true,
            IsStarred = false,
            CreatedAt = DateTime.UtcNow,
            RawHeaders = JsonDocument.Parse("{}")
        });

        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new
        {
            message = "Email sent successfully",
            messageId
        });
    }

    [HttpPost("import/folders")]
    public async Task<IActionResult> FetchFolders([FromBody] ImportFoldersRequest request, CancellationToken cancellationToken)
    {
        var user = await currentUserAccessor.GetCurrentUserAsync(cancellationToken);
        if (user is null)
        {
            return Unauthorized(new { error = "Authentication required" });
        }

        if (string.IsNullOrWhiteSpace(request.ImapHost) || string.IsNullOrWhiteSpace(request.ImapUsername) || string.IsNullOrWhiteSpace(request.ImapPassword))
        {
            return BadRequest(new { error = "Missing required fields: imap_host, imap_username, imap_password" });
        }

        try
        {
            var folders = await importWorkflowService.FetchFoldersAsync(
                new ImportWorkflowService.ImportFoldersRequest(
                    request.ImapHost,
                    request.ImapPort,
                    request.ImapUsername,
                    request.ImapPassword),
                cancellationToken);

            return Ok(new { folders });
        }
        catch (Exception exception)
        {
            return BadRequest(new { error = exception.Message });
        }
    }

    [HttpGet("import/progress/{sessionId}")]
    public async Task Progress(string sessionId, CancellationToken cancellationToken)
    {
        var user = await currentUserAccessor.GetCurrentUserAsync(cancellationToken);
        if (user is null)
        {
            Response.StatusCode = StatusCodes.Status401Unauthorized;
            return;
        }

        var reader = importWorkflowService.OpenProgressStream(sessionId, user.Id);

        Response.Headers.Append("Content-Type", "text/event-stream");
        Response.Headers.Append("Cache-Control", "no-cache");
        Response.Headers.Append("Connection", "keep-alive");

        await WriteSseAsync(new { type = "connected", sessionId }, cancellationToken);

        await foreach (var importEvent in reader.ReadAllAsync(cancellationToken))
        {
            await WriteSseAsync(new
            {
                importEvent.Type,
                importEvent.SessionId,
                importEvent.Level,
                importEvent.Message,
                importEvent.Timestamp,
                importEvent.Results,
                importEvent.Error
            }, cancellationToken);
        }
    }

    [HttpPost("import/multi")]
    public async Task<IActionResult> ImportMulti([FromBody] ImportMultiRequest request, CancellationToken cancellationToken)
    {
        var user = await currentUserAccessor.GetCurrentUserAsync(cancellationToken);
        if (user is null)
        {
            return Unauthorized(new { error = "Authentication required" });
        }

        if (request.AccountId is null
            || string.IsNullOrWhiteSpace(request.ImapHost)
            || string.IsNullOrWhiteSpace(request.ImapUsername)
            || string.IsNullOrWhiteSpace(request.ImapPassword)
            || request.Folders is null
            || request.Folders.Count == 0
            || string.IsNullOrWhiteSpace(request.SessionId))
        {
            return BadRequest(new { error = "Missing required fields: account_id, imap_host, imap_username, imap_password, folders (array)" });
        }

        var account = await dbContext.EmailAccounts
            .FirstOrDefaultAsync(item => item.Id == request.AccountId.Value && item.UserId == user.Id, cancellationToken);

        if (account is null)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { error = "Invalid account" });
        }

        try
        {
            importWorkflowService.StartImportMulti(
                request.SessionId,
                user.Id,
                account.Id,
                new ImportWorkflowService.ImportMultiRequest(
                    request.ImapHost,
                    request.ImapPort,
                    request.ImapUsername,
                    request.ImapPassword,
                    request.Folders,
                    request.SessionId));

            return StatusCode(StatusCodes.Status202Accepted, new
            {
                message = "Import started",
                sessionId = request.SessionId,
                folders = request.Folders.Count
            });
        }
        catch (Exception exception)
        {
            return BadRequest(new { error = exception.Message });
        }
    }

    [HttpPost("import/stop/{sessionId}")]
    public async Task<IActionResult> StopImport(string sessionId, CancellationToken cancellationToken)
    {
        var user = await currentUserAccessor.GetCurrentUserAsync(cancellationToken);
        if (user is null)
        {
            return Unauthorized(new { error = "Authentication required" });
        }

        var stopped = importWorkflowService.StopImport(sessionId, user.Id);
        if (!stopped)
        {
            return NotFound(new
            {
                success = false,
                message = "No active import found with this session ID"
            });
        }

        return Ok(new
        {
            success = true,
            message = "Stop request sent. Import will stop after current batch."
        });
    }

    [HttpPatch("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateMessageRequest request, CancellationToken cancellationToken)
    {
        var user = await currentUserAccessor.GetCurrentUserAsync(cancellationToken);
        if (user is null)
        {
            return Unauthorized(new { error = "Authentication required" });
        }

        var message = await dbContext.Messages
            .Include(item => item.Account)
            .FirstOrDefaultAsync(item => item.Id == id && item.Account != null && item.Account.UserId == user.Id, cancellationToken);

        if (message is null)
        {
            return NotFound(new { error = "Message not found" });
        }

        if (request.IsRead.HasValue)
        {
            message.IsRead = request.IsRead.Value;
        }

        if (request.IsStarred.HasValue)
        {
            message.IsStarred = request.IsStarred.Value;
        }

        if (!string.IsNullOrWhiteSpace(request.Folder))
        {
            message.Folder = request.Folder.Trim();
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new
        {
            message = new
            {
                message.Id,
                message.MessageId,
                message.FromAddress,
                message.ToAddresses,
                message.CcAddresses,
                message.Subject,
                message.BodyText,
                message.BodyHtml,
                message.ReceivedDate,
                message.IsRead,
                message.IsStarred,
                message.Folder
            }
        });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        var user = await currentUserAccessor.GetCurrentUserAsync(cancellationToken);
        if (user is null)
        {
            return Unauthorized(new { error = "Authentication required" });
        }

        var message = await dbContext.Messages
            .Include(item => item.Account)
            .FirstOrDefaultAsync(item => item.Id == id && item.Account != null && item.Account.UserId == user.Id, cancellationToken);

        if (message is null)
        {
            return NotFound(new { error = "Message not found" });
        }

        dbContext.Messages.Remove(message);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new { message = "Message deleted successfully" });
    }

    public sealed class SyncRequest
    {
        [JsonPropertyName("account_id")]
        public int? AccountId { get; init; }
    }

    public sealed class SendMessageRequest
    {
        [JsonPropertyName("account_id")]
        public int? AccountId { get; init; }

        [JsonPropertyName("to")]
        public string? To { get; init; }

        [JsonPropertyName("cc")]
        public string? Cc { get; init; }

        [JsonPropertyName("bcc")]
        public string? Bcc { get; init; }

        [JsonPropertyName("subject")]
        public string? Subject { get; init; }

        [JsonPropertyName("text")]
        public string? Text { get; init; }

        [JsonPropertyName("html")]
        public string? Html { get; init; }
    }

    public sealed class ImportFoldersRequest
    {
        [JsonPropertyName("imap_host")]
        public string? ImapHost { get; init; }

        [JsonPropertyName("imap_port")]
        public int? ImapPort { get; init; }

        [JsonPropertyName("imap_username")]
        public string? ImapUsername { get; init; }

        [JsonPropertyName("imap_password")]
        public string? ImapPassword { get; init; }
    }

    public sealed class ImportMultiRequest
    {
        [JsonPropertyName("account_id")]
        public int? AccountId { get; init; }

        [JsonPropertyName("imap_host")]
        public string? ImapHost { get; init; }

        [JsonPropertyName("imap_port")]
        public int? ImapPort { get; init; }

        [JsonPropertyName("imap_username")]
        public string? ImapUsername { get; init; }

        [JsonPropertyName("imap_password")]
        public string? ImapPassword { get; init; }

        [JsonPropertyName("folders")]
        public List<string> Folders { get; init; } = [];

        [JsonPropertyName("session_id")]
        public string? SessionId { get; init; }
    }

    public sealed class UpdateMessageRequest
    {
        [JsonPropertyName("is_read")]
        public bool? IsRead { get; init; }

        [JsonPropertyName("is_starred")]
        public bool? IsStarred { get; init; }

        [JsonPropertyName("folder")]
        public string? Folder { get; init; }
    }

    private async Task WriteSseAsync(object payload, CancellationToken cancellationToken)
    {
        var json = JsonSerializer.Serialize(payload, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower
        });

        await Response.WriteAsync($"data: {json}\n\n", cancellationToken);
        await Response.Body.FlushAsync(cancellationToken);
    }
}
using System.Text.Json;

namespace Mailler.Api.Models;

public sealed class Message
{
    public int Id { get; set; }

    public int AccountId { get; set; }

    public string? MessageId { get; set; }

    public string? FromAddress { get; set; }

    public string? ToAddresses { get; set; }

    public string? CcAddresses { get; set; }

    public string? Subject { get; set; }

    public string? BodyText { get; set; }

    public string? BodyHtml { get; set; }

    public DateTime? ReceivedDate { get; set; }

    public bool IsRead { get; set; }

    public bool IsStarred { get; set; }

    public string Folder { get; set; } = "INBOX";

    public JsonDocument? RawHeaders { get; set; }

    public DateTime CreatedAt { get; set; }

    public EmailAccount? Account { get; set; }
}
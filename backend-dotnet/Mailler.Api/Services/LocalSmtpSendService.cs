using Mailler.Api.Data;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.EntityFrameworkCore;
using MimeKit;

namespace Mailler.Api.Services;

public sealed class LocalSmtpSendService(IConfiguration configuration, MaillerDbContext dbContext)
{
    public async Task<string> SendAsync(
        string from,
        string to,
        string? cc,
        string? bcc,
        string subject,
        string? text,
        string? html,
        CancellationToken cancellationToken = default)
    {
        var host = configuration["SMTP_HOST"] ?? "localhost";
        var port = int.TryParse(configuration["SMTP_SEND_PORT"], out var resolvedPort) ? resolvedPort : 587;

        var message = new MimeMessage();
        message.From.Add(MailboxAddress.Parse(from));
        message.To.AddRange(InternetAddressList.Parse(to));

        if (!string.IsNullOrWhiteSpace(cc))
        {
            message.Cc.AddRange(InternetAddressList.Parse(cc));
        }

        if (!string.IsNullOrWhiteSpace(bcc))
        {
            message.Bcc.AddRange(InternetAddressList.Parse(bcc));
        }

        message.Subject = string.IsNullOrWhiteSpace(subject) ? "(no subject)" : subject;

        var bodyBuilder = new BodyBuilder
        {
            TextBody = text,
            HtmlBody = html
        };

        message.Body = bodyBuilder.ToMessageBody();

        var sender = message.From.Mailboxes.First();
        var recipients = message.To.Mailboxes
            .Concat(message.Cc.Mailboxes)
            .Concat(message.Bcc.Mailboxes)
            .DistinctBy(mailbox => mailbox.Address)
            .ToList();

        var recipientAddresses = recipients.Select(mailbox => mailbox.Address).ToList();
        var localAddresses = await dbContext.EmailAccounts
            .Where(account => recipientAddresses.Contains(account.EmailAddress))
            .Select(account => account.EmailAddress)
            .ToListAsync(cancellationToken);

        var localRecipients = recipients.Where(mailbox => localAddresses.Contains(mailbox.Address)).ToList();
        var externalRecipients = recipients.Where(mailbox => !localAddresses.Contains(mailbox.Address)).ToList();

        if (externalRecipients.Count > 0)
        {
            await SendViaSendgridAsync(message, sender, externalRecipients, cancellationToken);
        }

        if (localRecipients.Count > 0)
        {
            using var client = new SmtpClient();
            await client.ConnectAsync(host, port, SecureSocketOptions.None, cancellationToken);
            await client.SendAsync(message, sender, localRecipients, cancellationToken);
            await client.DisconnectAsync(true, cancellationToken);
        }

        return message.MessageId ?? string.Empty;
    }

    private async Task SendViaSendgridAsync(
        MimeMessage message,
        MailboxAddress sender,
        IEnumerable<MailboxAddress> recipients,
        CancellationToken cancellationToken)
    {
        var apiKey = configuration["SendgridApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            throw new InvalidOperationException("SendgridApiKey is not configured; cannot deliver to external recipients.");
        }

        var host = configuration["SENDGRID_SMTP_HOST"] ?? "smtp.sendgrid.net";
        var port = int.TryParse(configuration["SENDGRID_SMTP_PORT"], out var resolvedPort) ? resolvedPort : 587;

        using var client = new SmtpClient();
        await client.ConnectAsync(host, port, SecureSocketOptions.StartTls, cancellationToken);
        await client.AuthenticateAsync("apikey", apiKey, cancellationToken);
        await client.SendAsync(message, sender, recipients, cancellationToken);
        await client.DisconnectAsync(true, cancellationToken);
    }
}

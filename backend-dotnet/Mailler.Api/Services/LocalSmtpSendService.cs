using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace Mailler.Api.Services;

public sealed class LocalSmtpSendService(IConfiguration configuration)
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

        using var client = new SmtpClient();
        await client.ConnectAsync(host, port, SecureSocketOptions.None, cancellationToken);
        await client.SendAsync(message, cancellationToken);
        await client.DisconnectAsync(true, cancellationToken);

        return message.MessageId ?? string.Empty;
    }
}
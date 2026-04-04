using System.Collections.Concurrent;
using System.Net;
using System.Net.Security;
using System.Net.Sockets;
using System.Security.Authentication;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using Mailler.Api.Configuration;
using Mailler.Api.Data;
using Mailler.Api.Models;
using Microsoft.EntityFrameworkCore;
using MimeKit;

namespace Mailler.Api.Services;

public sealed class SmtpReceiveHostedService(
    IServiceScopeFactory scopeFactory,
    RuntimeOptions runtimeOptions,
    ILogger<SmtpReceiveHostedService> logger) : BackgroundService
{
    private readonly List<TcpListener> _listeners = [];
    private readonly List<Task> _listenerTasks = [];
    private readonly ConcurrentBag<Task> _clientTasks = [];
    private X509Certificate2? _certificate;

    protected override Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _certificate = LoadCertificate();

        foreach (var port in runtimeOptions.SmtpPorts)
        {
            var listener = new TcpListener(IPAddress.Any, port);
            listener.Start();
            _listeners.Add(listener);

            logger.LogInformation("SMTP listener started on port {Port}", port);
            _listenerTasks.Add(AcceptLoopAsync(listener, port, stoppingToken));
        }

        return Task.CompletedTask;
    }

    public override async Task StopAsync(CancellationToken cancellationToken)
    {
        foreach (var listener in _listeners)
        {
            try
            {
                listener.Stop();
            }
            catch
            {
            }
        }

        await base.StopAsync(cancellationToken);

        if (_listenerTasks.Count > 0)
        {
            await Task.WhenAll(_listenerTasks);
        }
    }

    private async Task AcceptLoopAsync(TcpListener listener, int port, CancellationToken cancellationToken)
    {
        try
        {
            while (!cancellationToken.IsCancellationRequested)
            {
                TcpClient client;
                try
                {
                    client = await listener.AcceptTcpClientAsync(cancellationToken);
                }
                catch (OperationCanceledException)
                {
                    break;
                }
                catch (ObjectDisposedException)
                {
                    break;
                }

                var task = HandleClientAsync(client, port, cancellationToken);
                _clientTasks.Add(task);
            }
        }
        catch (Exception exception)
        {
            logger.LogError(exception, "SMTP accept loop failed on port {Port}", port);
        }
    }

    private async Task HandleClientAsync(TcpClient client, int port, CancellationToken cancellationToken)
    {
        using var _ = client;
        var remoteEndPoint = client.Client.RemoteEndPoint?.ToString();

        try
        {
            await using var networkStream = client.GetStream();
            Stream stream = networkStream;

            if (port == 465)
            {
                if (_certificate is null)
                {
                    logger.LogWarning("Received SMTPS connection on port 465 without a certificate configured");
                    return;
                }

                var sslStream = new SslStream(networkStream, false);
                await sslStream.AuthenticateAsServerAsync(new SslServerAuthenticationOptions
                {
                    ServerCertificate = _certificate,
                    EnabledSslProtocols = SslProtocols.Tls12 | SslProtocols.Tls13,
                    ClientCertificateRequired = false
                }, cancellationToken);

                stream = sslStream;
            }

            using var reader = new StreamReader(stream, Encoding.ASCII, leaveOpen: true);
            using var writer = new StreamWriter(stream, Encoding.ASCII, leaveOpen: true)
            {
                NewLine = "\r\n",
                AutoFlush = true
            };

            var session = new SmtpSession();
            await writer.WriteLineAsync("220 Mailler SMTP Server");

            while (!cancellationToken.IsCancellationRequested)
            {
                var line = await reader.ReadLineAsync(cancellationToken);
                if (line is null)
                {
                    break;
                }

                if (session.IsReadingData)
                {
                    if (line == ".")
                    {
                        session.IsReadingData = false;
                        await PersistMessageAsync(session, port, cancellationToken);
                        session.ResetEnvelope();
                        await writer.WriteLineAsync("250 Message accepted for delivery");
                        continue;
                    }

                    if (line.StartsWith("..", StringComparison.Ordinal))
                    {
                        line = line[1..];
                    }

                    session.MessageLines.Add(line);
                    continue;
                }

                var command = line.Trim();
                if (command.StartsWith("EHLO", StringComparison.OrdinalIgnoreCase) || command.StartsWith("HELO", StringComparison.OrdinalIgnoreCase))
                {
                    session.ClientName = command.Split(' ', 2).ElementAtOrDefault(1) ?? string.Empty;
                    await writer.WriteLineAsync("250-mailler");
                    if (port != 465 && _certificate is not null)
                    {
                        await writer.WriteLineAsync("250-STARTTLS");
                    }
                    await writer.WriteLineAsync("250 OK");
                    continue;
                }

                if (command.StartsWith("MAIL FROM:", StringComparison.OrdinalIgnoreCase))
                {
                    session.MailFrom = ExtractAddress(command[10..]);
                    await writer.WriteLineAsync("250 OK");
                    continue;
                }

                if (command.StartsWith("RCPT TO:", StringComparison.OrdinalIgnoreCase))
                {
                    var recipient = ExtractAddress(command[8..]);
                    if (!string.IsNullOrWhiteSpace(recipient))
                    {
                        session.Recipients.Add(recipient);
                    }

                    await writer.WriteLineAsync("250 OK");
                    continue;
                }

                if (command.Equals("DATA", StringComparison.OrdinalIgnoreCase))
                {
                    if (session.Recipients.Count == 0)
                    {
                        await writer.WriteLineAsync("554 No valid recipients");
                        continue;
                    }

                    session.IsReadingData = true;
                    session.MessageLines.Clear();
                    await writer.WriteLineAsync("354 End data with <CR><LF>.<CR><LF>");
                    continue;
                }

                if (command.Equals("RSET", StringComparison.OrdinalIgnoreCase))
                {
                    session.ResetEnvelope();
                    await writer.WriteLineAsync("250 OK");
                    continue;
                }

                if (command.Equals("NOOP", StringComparison.OrdinalIgnoreCase))
                {
                    await writer.WriteLineAsync("250 OK");
                    continue;
                }

                if (command.Equals("QUIT", StringComparison.OrdinalIgnoreCase))
                {
                    await writer.WriteLineAsync("221 Bye");
                    break;
                }

                if (command.Equals("STARTTLS", StringComparison.OrdinalIgnoreCase))
                {
                    await writer.WriteLineAsync(_certificate is null
                        ? "454 TLS not available"
                        : "454 STARTTLS not implemented in this rewrite yet");
                    continue;
                }

                await writer.WriteLineAsync("250 OK");
            }
        }
        catch (OperationCanceledException)
        {
        }
        catch (Exception exception)
        {
            logger.LogError(exception, "SMTP client session failed on port {Port} from {RemoteEndPoint}", port, remoteEndPoint);
        }
        finally
        {
            try
            {
                client.Close();
            }
            catch
            {
            }
        }
    }

    private async Task PersistMessageAsync(SmtpSession session, int port, CancellationToken cancellationToken)
    {
        var rawMessage = string.Join("\r\n", session.MessageLines);
        if (string.IsNullOrWhiteSpace(rawMessage))
        {
            return;
        }

        MimeMessage parsedMessage;
        await using (var memoryStream = new MemoryStream(Encoding.UTF8.GetBytes(rawMessage)))
        {
            parsedMessage = await MimeMessage.LoadAsync(memoryStream, cancellationToken);
        }

        await using var scope = scopeFactory.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<MaillerDbContext>();

        foreach (var recipient in session.Recipients)
        {
            var account = await dbContext.EmailAccounts.FirstOrDefaultAsync(
                item => item.EmailAddress == recipient,
                cancellationToken);

            if (account is null)
            {
                logger.LogWarning("No local account found for SMTP recipient {Recipient} on port {Port}", recipient, port);
                continue;
            }

            dbContext.Messages.Add(new Message
            {
                AccountId = account.Id,
                MessageId = parsedMessage.MessageId,
                FromAddress = parsedMessage.From.ToString(),
                ToAddresses = parsedMessage.To.ToString(),
                CcAddresses = parsedMessage.Cc.ToString(),
                Subject = string.IsNullOrWhiteSpace(parsedMessage.Subject) ? "(no subject)" : parsedMessage.Subject,
                BodyText = parsedMessage.TextBody ?? string.Empty,
                BodyHtml = parsedMessage.HtmlBody ?? string.Empty,
                ReceivedDate = parsedMessage.Date != DateTimeOffset.MinValue ? parsedMessage.Date.UtcDateTime : DateTime.UtcNow,
                Folder = "INBOX",
                IsRead = false,
                IsStarred = false,
                CreatedAt = DateTime.UtcNow,
                RawHeaders = null
            });

            logger.LogInformation("Stored received SMTP email for {Recipient} on port {Port}", recipient, port);
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private X509Certificate2? LoadCertificate()
    {
        try
        {
            var keyFile = Path.Combine(runtimeOptions.SmtpCertPath, "localhost.key");
            var certFile = Path.Combine(runtimeOptions.SmtpCertPath, "localhost.crt");

            if (!File.Exists(keyFile) || !File.Exists(certFile))
            {
                logger.LogWarning("SMTP TLS certificates not found in {CertPath}; SMTPS will be unavailable", runtimeOptions.SmtpCertPath);
                return null;
            }

            return X509Certificate2.CreateFromPemFile(certFile, keyFile);
        }
        catch (Exception exception)
        {
            logger.LogError(exception, "Failed to load SMTP TLS certificates from {CertPath}", runtimeOptions.SmtpCertPath);
            return null;
        }
    }

    private static string ExtractAddress(string input)
    {
        var trimmed = input.Trim();
        if (trimmed.StartsWith('<') && trimmed.EndsWith('>'))
        {
            trimmed = trimmed[1..^1];
        }

        return trimmed.Trim();
    }

    private sealed class SmtpSession
    {
        public string ClientName { get; set; } = string.Empty;

        public string? MailFrom { get; set; }

        public List<string> Recipients { get; } = [];

        public List<string> MessageLines { get; } = [];

        public bool IsReadingData { get; set; }

        public void ResetEnvelope()
        {
            MailFrom = null;
            Recipients.Clear();
            MessageLines.Clear();
            IsReadingData = false;
        }
    }
}
using System.Collections.Concurrent;
using System.Text.Json;
using System.Threading.Channels;
using MailKit;
using MailKit.Net.Imap;
using MailKit.Search;
using MailKit.Security;
using Mailler.Api.Configuration;
using Mailler.Api.Data;
using Mailler.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Mailler.Api.Services;

public sealed class ImportWorkflowService(IServiceScopeFactory scopeFactory, RuntimeOptions runtimeOptions)
{
    private readonly ConcurrentDictionary<string, ImportSessionState> _sessions = new();

    public ChannelReader<ImportEvent> OpenProgressStream(string sessionId, int userId)
    {
        return GetOrCreateSession(sessionId, userId).Channel.Reader;
    }

    public bool StopImport(string sessionId, int userId)
    {
        if (!_sessions.TryGetValue(sessionId, out var session) || session.UserId != userId || !session.IsRunning)
        {
            return false;
        }

        session.CancellationTokenSource.Cancel();
        EmitLog(sessionId, "warning", "Stop requested, finishing current batch...");
        return true;
    }

    public async Task<IReadOnlyList<ImportFolderInfo>> FetchFoldersAsync(ImportFoldersRequest request, CancellationToken cancellationToken)
    {
        using var client = await ConnectAsync(request.ImapHost, request.ImapPort, request.ImapUsername, request.ImapPassword, cancellationToken);

        var folders = new List<ImportFolderInfo>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        if (client.Inbox.Attributes.HasFlag(FolderAttributes.NoSelect) is false && seen.Add(client.Inbox.FullName))
        {
            folders.Add(new ImportFolderInfo(client.Inbox.FullName, client.Inbox.Name, false));
        }

        foreach (var personalNamespace in client.PersonalNamespaces)
        {
            var root = client.GetFolder(personalNamespace);
            await CollectFoldersAsync(root, folders, seen, cancellationToken);
        }

        await client.DisconnectAsync(true, cancellationToken);
        return folders.OrderBy(folder => folder.Name, StringComparer.OrdinalIgnoreCase).ToList();
    }

    public void StartImportMulti(string sessionId, int userId, int accountId, ImportMultiRequest request)
    {
        var session = GetOrCreateSession(sessionId, userId);
        if (session.IsRunning)
        {
            throw new InvalidOperationException("An import is already running for this session.");
        }

        session.IsRunning = true;

        _ = Task.Run(async () =>
        {
            try
            {
                var results = await ExecuteMultiFolderImportAsync(sessionId, userId, accountId, request, session.CancellationTokenSource.Token);
                await EmitCompleteAsync(sessionId, results, null);
            }
            catch (OperationCanceledException)
            {
                var cancelledResults = new ImportResults(0, 0, [], true);
                await EmitCompleteAsync(sessionId, cancelledResults, null);
            }
            catch (Exception exception)
            {
                await EmitCompleteAsync(sessionId, null, exception.Message);
            }
        });
    }

    private async Task<ImportResults> ExecuteMultiFolderImportAsync(
        string sessionId,
        int userId,
        int accountId,
        ImportMultiRequest request,
        CancellationToken cancellationToken)
    {
        EmitLog(sessionId, "info", $"Starting import from {request.Folders.Count} folders (processing in batches of 10)");

        var totalImported = 0;
        var totalSkipped = 0;
        var folderResults = new List<ImportFolderResult>();
        var cancelled = false;

        for (var index = 0; index < request.Folders.Count; index++)
        {
            if (cancellationToken.IsCancellationRequested)
            {
                cancelled = true;
                EmitLog(sessionId, "warning", "🛑 Import stopped by user");
                break;
            }

            var folderName = request.Folders[index];

            try
            {
                EmitLog(sessionId, "info", $"[{index + 1}/{request.Folders.Count}] Processing folder: {folderName}");
                var result = await ImportFolderAsync(sessionId, userId, accountId, request, folderName, cancellationToken);

                totalImported += result.Imported;
                totalSkipped += result.Skipped;
                folderResults.Add(result);

                if (result.Cancelled)
                {
                    cancelled = true;
                    break;
                }

                EmitLog(sessionId, "success", $"✅ {folderName}: {result.Imported} imported, {result.Skipped} skipped");
            }
            catch (OperationCanceledException)
            {
                cancelled = true;
                EmitLog(sessionId, "warning", "🛑 Import stopped by user");
                break;
            }
            catch (Exception exception)
            {
                folderResults.Add(new ImportFolderResult(folderName, 0, 0, exception.Message, false));
                EmitLog(sessionId, "error", $"❌ {folderName}: {exception.Message}");
            }
        }

        if (!cancelled)
        {
            EmitLog(sessionId, "success", $"Import complete! Total: {totalImported} imported, {totalSkipped} skipped");
        }
        else
        {
            EmitLog(sessionId, "warning", $"Import stopped. Processed: {totalImported} imported, {totalSkipped} skipped");
        }

        return new ImportResults(totalImported, totalSkipped, folderResults, cancelled);
    }

    private async Task<ImportFolderResult> ImportFolderAsync(
        string sessionId,
        int userId,
        int accountId,
        ImportMultiRequest request,
        string folderName,
        CancellationToken cancellationToken)
    {
        EmitLog(sessionId, "info", $"Connecting to {request.ImapHost}...");

        await using var scope = scopeFactory.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<MaillerDbContext>();

        var account = await dbContext.EmailAccounts.FirstOrDefaultAsync(
            item => item.Id == accountId && item.UserId == userId,
            cancellationToken);

        if (account is null)
        {
            throw new InvalidOperationException("Invalid account");
        }

        using var client = await ConnectAsync(request.ImapHost, request.ImapPort, request.ImapUsername, request.ImapPassword, cancellationToken);
        EmitLog(sessionId, "info", $"Connected! Opening folder: {folderName}");

        var folder = await FindFolderAsync(client, folderName, cancellationToken);
        if (folder is null)
        {
            throw new InvalidOperationException($"Folder '{folderName}' not found");
        }

        await folder.OpenAsync(FolderAccess.ReadOnly, cancellationToken);
        EmitLog(sessionId, "info", $"Searching for emails in {folderName}...");

        var uniqueIds = await folder.SearchAsync(SearchQuery.All, cancellationToken);
        var batchSize = 10;
        var totalBatches = Math.Max(1, (int)Math.Ceiling(uniqueIds.Count / (double)batchSize));
        EmitLog(sessionId, "info", $"Found {uniqueIds.Count} messages, will download and process in batches of {batchSize}...");

        var imported = 0;
        var skipped = 0;

        for (var batchStart = 0; batchStart < uniqueIds.Count; batchStart += batchSize)
        {
            var batchNumber = (batchStart / batchSize) + 1;
            var batchIds = uniqueIds.Skip(batchStart).Take(batchSize).ToList();

            EmitLog(sessionId, "info", $"📥 Batch {batchNumber}/{totalBatches}: Downloading {batchIds.Count} messages...");

            foreach (var (uniqueId, relativeIndex) in batchIds.Select((value, idx) => (value, idx)))
            {
                var globalIndex = batchStart + relativeIndex + 1;
                if (relativeIndex == 0 || relativeIndex == batchIds.Count - 1)
                {
                    EmitLog(sessionId, "info", $"  Processing {globalIndex}/{uniqueIds.Count} ({imported} imported, {skipped} skipped)");
                }

                try
                {
                    var message = await folder.GetMessageAsync(uniqueId, cancellationToken);
                    var messageId = string.IsNullOrWhiteSpace(message.MessageId)
                        ? $"imported-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}-{uniqueId.Id}@{request.ImapHost}"
                        : message.MessageId;

                    var exists = await dbContext.Messages.AnyAsync(
                        item => item.AccountId == accountId && item.MessageId == messageId,
                        cancellationToken);

                    if (exists)
                    {
                        skipped++;
                        continue;
                    }

                    dbContext.Messages.Add(new Message
                    {
                        AccountId = accountId,
                        MessageId = messageId,
                        FromAddress = message.From.ToString(),
                        ToAddresses = message.To.ToString(),
                        CcAddresses = message.Cc.ToString(),
                        Subject = string.IsNullOrWhiteSpace(message.Subject) ? "(no subject)" : message.Subject,
                        BodyText = message.TextBody ?? string.Empty,
                        BodyHtml = message.HtmlBody ?? string.Empty,
                        ReceivedDate = message.Date != DateTimeOffset.MinValue ? message.Date.UtcDateTime : DateTime.UtcNow,
                        Folder = folderName,
                        IsRead = false,
                        IsStarred = false,
                        CreatedAt = DateTime.UtcNow,
                        RawHeaders = JsonDocument.Parse("{}")
                    });

                    imported++;
                }
                catch
                {
                    skipped++;
                }
            }

            await dbContext.SaveChangesAsync(cancellationToken);
            EmitLog(sessionId, "info", $"  ✅ Batch {batchNumber}/{totalBatches} complete: {imported} total imported, {skipped} total skipped");

            if (cancellationToken.IsCancellationRequested)
            {
                EmitLog(sessionId, "warning", $"🛑 Import stopped after batch {batchNumber}/{totalBatches}");
                await client.DisconnectAsync(true, CancellationToken.None);
                return new ImportFolderResult(folderName, imported, skipped, null, true);
            }
        }

        await client.DisconnectAsync(true, cancellationToken);
        return new ImportFolderResult(folderName, imported, skipped, null, false);
    }

    private async Task<ImapClient> ConnectAsync(string host, int? port, string username, string password, CancellationToken cancellationToken)
    {
        var client = new ImapClient();

        if (runtimeOptions.AllowInsecureOidcTls)
        {
            client.ServerCertificateValidationCallback = (_, _, _, _) => true;
        }

        var resolvedPort = port ?? 993;
        var socketOptions = resolvedPort == 993 ? SecureSocketOptions.SslOnConnect : SecureSocketOptions.StartTlsWhenAvailable;

        await client.ConnectAsync(host, resolvedPort, socketOptions, cancellationToken);
        await client.AuthenticateAsync(username, password, cancellationToken);
        return client;
    }

    private async Task CollectFoldersAsync(IMailFolder folder, List<ImportFolderInfo> folders, HashSet<string> seen, CancellationToken cancellationToken)
    {
        foreach (var child in await folder.GetSubfoldersAsync(false, cancellationToken))
        {
            if (!child.Attributes.HasFlag(FolderAttributes.NoSelect) && seen.Add(child.FullName))
            {
                folders.Add(new ImportFolderInfo(child.FullName, child.Name, false));
            }

            await CollectFoldersAsync(child, folders, seen, cancellationToken);
        }
    }

    private async Task<IMailFolder?> FindFolderAsync(ImapClient client, string folderName, CancellationToken cancellationToken)
    {
        if (string.Equals(folderName, client.Inbox.FullName, StringComparison.OrdinalIgnoreCase)
            || string.Equals(folderName, "INBOX", StringComparison.OrdinalIgnoreCase))
        {
            return client.Inbox;
        }

        foreach (var personalNamespace in client.PersonalNamespaces)
        {
            var root = client.GetFolder(personalNamespace);
            var folder = await FindFolderRecursiveAsync(root, folderName, cancellationToken);
            if (folder is not null)
            {
                return folder;
            }
        }

        return null;
    }

    private static async Task<IMailFolder?> FindFolderRecursiveAsync(IMailFolder folder, string folderName, CancellationToken cancellationToken)
    {
        foreach (var child in await folder.GetSubfoldersAsync(false, cancellationToken))
        {
            if (string.Equals(child.FullName, folderName, StringComparison.OrdinalIgnoreCase))
            {
                return child;
            }

            var nested = await FindFolderRecursiveAsync(child, folderName, cancellationToken);
            if (nested is not null)
            {
                return nested;
            }
        }

        return null;
    }

    private ImportSessionState GetOrCreateSession(string sessionId, int userId)
    {
        return _sessions.AddOrUpdate(
            sessionId,
            _ => new ImportSessionState(userId),
            (_, existing) =>
            {
                if (existing.UserId != userId)
                {
                    throw new InvalidOperationException("Import session belongs to another user.");
                }

                return existing;
            });
    }

    private void EmitLog(string sessionId, string level, string message)
    {
        if (_sessions.TryGetValue(sessionId, out var session))
        {
            session.Channel.Writer.TryWrite(new ImportEvent(
                sessionId,
                "log",
                level,
                message,
                DateTimeOffset.UtcNow,
                null,
                null));
        }
    }

    private async Task EmitCompleteAsync(string sessionId, ImportResults? results, string? error)
    {
        if (_sessions.TryRemove(sessionId, out var session))
        {
            session.IsRunning = false;
            session.Channel.Writer.TryWrite(new ImportEvent(
                sessionId,
                "complete",
                null,
                null,
                DateTimeOffset.UtcNow,
                results,
                error));

            session.Channel.Writer.TryComplete();
            session.CancellationTokenSource.Dispose();
        }

        await Task.CompletedTask;
    }

    public sealed record ImportFoldersRequest(string ImapHost, int? ImapPort, string ImapUsername, string ImapPassword);

    public sealed record ImportMultiRequest(string ImapHost, int? ImapPort, string ImapUsername, string ImapPassword, IReadOnlyList<string> Folders, string SessionId);

    public sealed record ImportFolderInfo(string Name, string DisplayName, bool HasChildren);

    public sealed record ImportFolderResult(string Name, int Imported, int Skipped, string? Error, bool Cancelled);

    public sealed record ImportResults(int TotalImported, int TotalSkipped, IReadOnlyList<ImportFolderResult> Folders, bool Cancelled);

    public sealed record ImportEvent(
        string SessionId,
        string Type,
        string? Level,
        string? Message,
        DateTimeOffset Timestamp,
        ImportResults? Results,
        string? Error);

    private sealed class ImportSessionState(int userId)
    {
        public int UserId { get; } = userId;

        public Channel<ImportEvent> Channel { get; } = System.Threading.Channels.Channel.CreateUnbounded<ImportEvent>();

        public CancellationTokenSource CancellationTokenSource { get; } = new();

        public bool IsRunning { get; set; }
    }
}
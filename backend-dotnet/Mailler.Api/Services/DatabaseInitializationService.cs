using Npgsql;

namespace Mailler.Api.Services;

public static class DatabaseInitializationService
{
    public static async Task InitializeAsync(
        IServiceProvider services,
        string connectionString,
        string contentRootPath,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        logger.LogInformation("Initializing database");

        var migrationsDirectory = ResolveMigrationsDirectory(contentRootPath);
        var targetBuilder = new NpgsqlConnectionStringBuilder(connectionString);
        var targetDatabase = string.IsNullOrWhiteSpace(targetBuilder.Database)
            ? "mailler"
            : targetBuilder.Database;

        await CreateDatabaseIfMissingAsync(targetBuilder, targetDatabase, logger, cancellationToken);
        await ApplyPendingMigrationsAsync(connectionString, migrationsDirectory, logger, cancellationToken);
        await EnsureDataProtectionKeysTableAsync(connectionString, cancellationToken);

        logger.LogInformation("Database initialization complete");
    }

    private static async Task CreateDatabaseIfMissingAsync(
        NpgsqlConnectionStringBuilder targetBuilder,
        string targetDatabase,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        var adminBuilder = new NpgsqlConnectionStringBuilder(targetBuilder.ConnectionString)
        {
            Database = "postgres"
        };

        await using var connection = new NpgsqlConnection(adminBuilder.ConnectionString);
        await connection.OpenAsync(cancellationToken);

        await using var existsCommand = new NpgsqlCommand("SELECT 1 FROM pg_database WHERE datname = @name", connection);
        existsCommand.Parameters.AddWithValue("name", targetDatabase);

        var exists = await existsCommand.ExecuteScalarAsync(cancellationToken) is not null;
        if (exists)
        {
            logger.LogInformation("Database '{Database}' already exists", targetDatabase);
            return;
        }

        logger.LogInformation("Creating database '{Database}'", targetDatabase);

        var quotedDatabaseName = $"\"{targetDatabase.Replace("\"", "\"\"")}\"";
        await using var createCommand = new NpgsqlCommand($"CREATE DATABASE {quotedDatabaseName}", connection);
        await createCommand.ExecuteNonQueryAsync(cancellationToken);

        logger.LogInformation("Database '{Database}' created successfully", targetDatabase);
    }

    private static async Task ApplyPendingMigrationsAsync(
        string connectionString,
        string migrationsDirectory,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);

        await EnsureSchemaMigrationsTableAsync(connection, cancellationToken);
        var appliedMigrations = await GetAppliedMigrationsAsync(connection, cancellationToken);

        var migrationFiles = Directory.GetFiles(migrationsDirectory, "*.sql")
            .Select(Path.GetFileName)
            .Where(file => file is not null)
            .Cast<string>()
            .OrderBy(file => file, StringComparer.Ordinal)
            .ToList();

        var pendingMigrations = migrationFiles
            .Where(file => !appliedMigrations.Contains(file))
            .ToList();

        if (pendingMigrations.Count == 0)
        {
            logger.LogInformation("All migrations are up to date");
            return;
        }

        logger.LogInformation("Found {Count} pending migration(s)", pendingMigrations.Count);

        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);

        try
        {
            foreach (var migrationFile in pendingMigrations)
            {
                var migrationPath = Path.Combine(migrationsDirectory, migrationFile);
                logger.LogInformation("Applying migration {Migration}", migrationFile);

                var sql = await File.ReadAllTextAsync(migrationPath, cancellationToken);
                await using var migrationCommand = new NpgsqlCommand(sql, connection, transaction);
                await migrationCommand.ExecuteNonQueryAsync(cancellationToken);

                await using var recordCommand = new NpgsqlCommand(
                    "INSERT INTO schema_migrations (migration_name) VALUES (@name)",
                    connection,
                    transaction);

                recordCommand.Parameters.AddWithValue("name", migrationFile);
                await recordCommand.ExecuteNonQueryAsync(cancellationToken);

                logger.LogInformation("Migration {Migration} applied successfully", migrationFile);
            }

            await transaction.CommitAsync(cancellationToken);
        }
        catch
        {
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }
    }

    private static async Task EnsureSchemaMigrationsTableAsync(NpgsqlConnection connection, CancellationToken cancellationToken)
    {
        const string sql = """
            CREATE TABLE IF NOT EXISTS schema_migrations (
              id SERIAL PRIMARY KEY,
              migration_name VARCHAR(255) UNIQUE NOT NULL,
              applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """;

        await using var command = new NpgsqlCommand(sql, connection);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private static async Task EnsureDataProtectionKeysTableAsync(string connectionString, CancellationToken cancellationToken)
    {
        const string sql = """
            CREATE TABLE IF NOT EXISTS data_protection_keys (
              id SERIAL PRIMARY KEY,
              friendly_name TEXT NULL,
              xml TEXT NULL
            )
            """;

        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);

        await using var command = new NpgsqlCommand(sql, connection);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private static async Task<HashSet<string>> GetAppliedMigrationsAsync(NpgsqlConnection connection, CancellationToken cancellationToken)
    {
        var applied = new HashSet<string>(StringComparer.Ordinal);

        await using var command = new NpgsqlCommand("SELECT migration_name FROM schema_migrations ORDER BY migration_name", connection);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        while (await reader.ReadAsync(cancellationToken))
        {
            applied.Add(reader.GetString(0));
        }

        return applied;
    }

    private static string ResolveMigrationsDirectory(string contentRootPath)
    {
        var candidateDirectories = new[]
        {
            Path.Combine(contentRootPath, "database", "migrations"),
            Path.GetFullPath(Path.Combine(contentRootPath, "..", "..", "database", "migrations"))
        };

        var migrationsDirectory = candidateDirectories.FirstOrDefault(Directory.Exists);
        if (migrationsDirectory is null)
        {
            throw new DirectoryNotFoundException($"Migration directory not found. Checked: {string.Join(", ", candidateDirectories)}");
        }

        return migrationsDirectory;
    }
}
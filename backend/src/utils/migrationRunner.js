const { Client } = require('pg');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

/**
 * Migration Runner - Automatically creates database and applies migrations
 * Similar to EF Core migrations in .NET
 */

async function createDatabaseIfNotExists() {
    const dbName = process.env.DB_NAME || 'mailler';

    // Parse connection details
    const config = {
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 5432,
        database: 'postgres' // Connect to default postgres database first
    };

    const client = new Client(config);

    try {
        await client.connect();

        // Check if database exists
        const result = await client.query(
            "SELECT 1 FROM pg_database WHERE datname = $1",
            [dbName]
        );

        if (result.rows.length === 0) {
            console.log(`📦 Creating database '${dbName}'...`);
            // Database doesn't exist, create it
            await client.query(`CREATE DATABASE ${dbName}`);
            console.log(`✅ Database '${dbName}' created successfully`);
        } else {
            console.log(`✅ Database '${dbName}' already exists`);
        }
    } catch (error) {
        console.error('Error creating database:', error.message);
        throw error;
    } finally {
        await client.end();
    }
}

async function getMigrationsStatus(client) {
    // Create migrations tracking table if it doesn't exist
    await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      migration_name VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

    const result = await client.query(
        'SELECT migration_name FROM schema_migrations ORDER BY migration_name'
    );

    return new Set(result.rows.map(row => row.migration_name));
}

async function applyMigration(client, migrationFile, migrationPath) {
    const migrationName = path.basename(migrationFile);

    try {
        console.log(`  📄 Applying ${migrationName}...`);

        // Read and execute migration SQL
        const sql = await fs.readFile(migrationPath, 'utf8');
        await client.query(sql);

        // Record migration as applied
        await client.query(
            'INSERT INTO schema_migrations (migration_name) VALUES ($1)',
            [migrationName]
        );

        console.log(`  ✅ ${migrationName} applied successfully`);
    } catch (error) {
        console.error(`  ❌ Error applying ${migrationName}:`, error.message);
        throw error;
    }
}

async function runMigrations() {
    const dbName = process.env.DB_NAME || 'mailler';

    // Connect to the target database
    const config = {
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 5432,
        database: dbName
    };

    const client = new Client(config);

    try {
        await client.connect();
        console.log('🔧 Checking for pending migrations...');

        // Get applied migrations
        const appliedMigrations = await getMigrationsStatus(client);

        // Read migration files
        // In Docker: /app/src/utils -> /app/database/migrations
        // Locally: backend/src/utils -> database/migrations (up 3 levels to root)
        const migrationsDir = path.join(__dirname, '../..', 'database', 'migrations');
        const files = await fs.readdir(migrationsDir);
        const migrationFiles = files
            .filter(f => f.endsWith('.sql'))
            .sort(); // Sort to ensure order (001, 002, etc.)

        // Find pending migrations
        const pendingMigrations = migrationFiles.filter(
            file => !appliedMigrations.has(file)
        );

        if (pendingMigrations.length === 0) {
            console.log('✅ All migrations are up to date');
            return;
        }

        console.log(`📋 Found ${pendingMigrations.length} pending migration(s)`);

        // Begin transaction
        await client.query('BEGIN');

        try {
            // Apply each pending migration
            for (const migrationFile of pendingMigrations) {
                const migrationPath = path.join(migrationsDir, migrationFile);
                await applyMigration(client, migrationFile, migrationPath);
            }

            await client.query('COMMIT');
            console.log('✅ All migrations applied successfully');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
    } catch (error) {
        console.error('Migration error:', error.message);
        throw error;
    } finally {
        await client.end();
    }
}

async function initializeDatabase() {
    console.log('🗄️  Initializing database...');

    try {
        // Step 1: Create database if it doesn't exist
        await createDatabaseIfNotExists();

        // Step 2: Run migrations
        await runMigrations();

        console.log('✅ Database initialization complete');
    } catch (error) {
        console.error('❌ Database initialization failed:', error.message);
        throw error;
    }
}

module.exports = { initializeDatabase, runMigrations, createDatabaseIfNotExists };

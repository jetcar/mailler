# Database Migrations Guide

## Overview

Mailler uses **automatic database migrations** similar to Entity Framework Core in .NET. You don't need PostgreSQL client tools (psql, createdb) installed on your machine - the application handles everything!

## How It Works

### 🚀 Automatic Migration on Startup

When you start the application, it automatically:

1. **Creates the database** if it doesn't exist
2. **Checks for pending migrations** by comparing applied migrations with available SQL files
3. **Applies pending migrations** in order (001, 002, 003, etc.)
4. **Tracks applied migrations** in the `schema_migrations` table

This happens **every time you start the application** (via `npm start` or `npm run dev`).

### 📋 Migration Tracking

A special table `schema_migrations` tracks which migrations have been applied:

```sql
CREATE TABLE schema_migrations (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) UNIQUE NOT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

Each migration file name is recorded when applied, preventing duplicate execution.

## Usage

### Option 1: Automatic (Recommended)

Just start your application - migrations run automatically!

```bash
cd backend
npm run dev
```

**Output:**
```
🗄️ Initializing database...
📦 Creating database 'mailler'...
✅ Database 'mailler' created successfully
🔧 Checking for pending migrations...
📋 Found 4 pending migration(s)
  📄 Applying 001_create_users.sql...
  ✅ 001_create_users.sql applied successfully
  📄 Applying 002_create_email_accounts.sql...
  ✅ 002_create_email_accounts.sql applied successfully
  📄 Applying 003_create_messages.sql...
  ✅ 003_create_messages.sql applied successfully
  📄 Applying 004_create_settings.sql...
  ✅ 004_create_settings.sql applied successfully
✅ All migrations applied successfully
✅ Database initialization complete
```

### Option 2: Manual Migration

Run migrations without starting the server:

```bash
cd backend
npm run migrate
```

### Option 3: During Setup

The setup script offers to run migrations:

**Windows (PowerShell):**
```powershell
.\setup.ps1
```

**Linux/Mac (Bash):**
```bash
./setup.sh
```

## Configuration

### Environment Variables

Set these in `backend/.env`:

```env
# Database connection
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mailler
DB_USER=postgres
DB_PASSWORD=your_password

# Auto-migration control
AUTO_MIGRATE=true  # Set to 'false' to disable automatic migrations
```

### Disable Auto-Migration

To prevent automatic migrations on startup, set in `.env`:

```env
AUTO_MIGRATE=false
```

Then run migrations manually when needed:
```bash
npm run migrate
```

## Creating New Migrations

### Step 1: Create SQL File

Create a new file in `database/migrations/` with the next sequential number:

```bash
database/migrations/005_add_attachments.sql
```

### Step 2: Write Migration SQL

Make migrations **idempotent** (safe to run multiple times):

```sql
-- Example: 005_add_attachments.sql
CREATE TABLE IF NOT EXISTS attachments (
    id SERIAL PRIMARY KEY,
    message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    content_type VARCHAR(100),
    size INTEGER,
    file_path TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_attachments_message_id ON attachments(message_id);
```

**Best Practices:**
- ✅ Use `CREATE TABLE IF NOT EXISTS`
- ✅ Use `CREATE INDEX IF NOT EXISTS`
- ✅ Use sequential numbering (005, 006, etc.)
- ✅ Use descriptive names
- ✅ Include proper indexes
- ✅ Define foreign key constraints

### Step 3: Apply Migration

**Automatic:** Just restart the application

**Manual:**
```bash
npm run migrate
```

## Migration File Structure

All migrations are in `database/migrations/`:

```
database/migrations/
├── 001_create_users.sql
├── 002_create_email_accounts.sql
├── 003_create_messages.sql
├── 004_create_settings.sql
└── 005_your_new_migration.sql  ← Your new migration
```

## Comparison with Other Systems

### vs Entity Framework Core (.NET)

| Feature | EF Core | Mailler |
|---------|---------|---------|
| Auto-create database | ✅ Yes | ✅ Yes |
| Auto-apply migrations | ✅ Yes | ✅ Yes |
| Migration tracking | ✅ `__EFMigrationsHistory` | ✅ `schema_migrations` |
| Format | C# code | SQL files |
| Rollback | ✅ Yes | ❌ Manual |

### vs Sequelize Migrations

| Feature | Sequelize CLI | Mailler |
|---------|---------------|---------|
| Auto-apply on startup | ❌ No | ✅ Yes |
| Tracking | ✅ `SequelizeMeta` | ✅ `schema_migrations` |
| Format | JavaScript | SQL files |
| Extra CLI needed | ✅ Yes | ❌ No |

### vs Raw SQL (psql)

| Feature | psql | Mailler |
|---------|------|---------|
| Requires psql installed | ✅ Yes | ❌ No |
| Auto-create database | ❌ Manual | ✅ Yes |
| Tracking | ❌ None | ✅ Yes |
| Cross-platform | ⚠️ Requires config | ✅ Yes |

## Troubleshooting

### Database Already Exists Error

If you see an error about the database existing but migrations failing:

```bash
# Option 1: Drop and recreate
psql -U postgres -c "DROP DATABASE IF EXISTS mailler;"
npm run migrate

# Option 2: Fix migrations manually and re-run
npm run migrate
```

### Migration Failed Mid-Way

Migrations run in a **transaction**. If one fails, all are rolled back automatically.

Fix the problematic SQL file and re-run:
```bash
npm run migrate
```

### Check Applied Migrations

Connect to your database and query:

```sql
SELECT * FROM schema_migrations ORDER BY applied_at;
```

### Reset All Migrations

**Warning: This deletes all data!**

```sql
-- Connect to postgresql
psql -U postgres

-- Drop database
DROP DATABASE IF EXISTS mailler;

-- Migrations will recreate everything on next startup
```

## Advanced Usage

### Skip Auto-Migration in Production

For production deployments, you might want to apply migrations manually:

1. Set `AUTO_MIGRATE=false` in production `.env`
2. Run migrations during deployment:
   ```bash
   npm run migrate
   ```
3. Start the application:
   ```bash
   npm start
   ```

### Migration in Docker

The application auto-migrates in Docker too! Just ensure PostgreSQL is ready:

```yaml
# docker-compose.yml already handles this
backend:
  depends_on:
    postgres:
      condition: service_healthy  # Waits for PostgreSQL
```

### CI/CD Integration

In your CI/CD pipeline:

```bash
# Install dependencies
npm install

# Run migrations (in test environment)
npm run migrate

# Run tests
npm test

# Deploy (production uses AUTO_MIGRATE=false)
# Run migrations manually before deploying:
npm run migrate
```

## Benefits

✅ **No client tools required** - Works on any machine with Node.js  
✅ **Automatic** - Runs on app startup  
✅ **Tracked** - Knows which migrations are applied  
✅ **Idempotent** - Safe to run multiple times  
✅ **Transactional** - All-or-nothing application  
✅ **Cross-platform** - Works on Windows, Linux, Mac  
✅ **Developer-friendly** - Similar to EF Core experience  

## Migration Runner Source

The migration system is implemented in:
- `backend/src/utils/migrationRunner.js` - Core migration logic
- `backend/migrate.js` - Standalone migration script
- `backend/src/app.js` - Auto-migration on startup

Feel free to customize the migration runner for your specific needs!

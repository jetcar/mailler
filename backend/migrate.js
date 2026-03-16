#!/usr/bin/env node

/**
 * Standalone migration script
 * Usage: npm run migrate
 */

require('dotenv').config();
const { initializeDatabase } = require('./src/utils/migrationRunner');

async function main() {
    console.log('🚀 Starting database migration process...\n');

    try {
        await initializeDatabase();
        console.log('\n🎉 Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        process.exit(1);
    }
}

main();

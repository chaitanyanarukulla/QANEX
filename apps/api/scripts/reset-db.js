
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Load .env manually
try {
    const envPath = path.resolve(__dirname, '../.env');
    if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf8');
        envConfig.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                process.env[match[1]] = match[2].replace(/^"(.*)"$/, '$1');
            }
        });
        console.log('Loaded .env file');
    }
} catch (e) {
    console.log('Could not load .env file', e);
}

async function resetDb() {
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
        console.error('CRITICAL: Cannot reset database in PRODUCTION environment.');
        process.exit(1);
    }

    // Use config from app.module.ts (defaults for local dev)
    const client = new Client({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        user: process.env.DB_USER || 'qanexus',
        password: process.env.DB_PASSWORD || 'qanexus_dev_password',
        database: process.env.DB_NAME || 'qanexus',
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    });

    try {
        await client.connect();
        console.log('Connected to database...');

        // 1. Drop and Recreate Schema
        console.log('Dropping public schema...');
        await client.query('DROP SCHEMA public CASCADE;');
        console.log('Recreating public schema...');
        await client.query('CREATE SCHEMA public;');

        console.log('Database reset complete. Please restart the backend server to recreate tables.');

    } catch (err) {
        console.error('Error resetting database:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

resetDb();

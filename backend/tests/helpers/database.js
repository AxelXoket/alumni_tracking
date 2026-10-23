/**
 * Test database helper. Require it BEFORE anything from src/, because it
 * points the app at a separate database (default: alumni_tracking_test) so
 * the tests never touch development data.
 *
 * Needs a reachable PostgreSQL, e.g. `docker compose up -d db`.
 */
process.env.DB_NAME = process.env.TEST_DB_NAME || 'alumni_tracking_test';

const { Client } = require('pg');
const config = require('../../src/config');
const db = require('../../src/db/pool');
const { migrate } = require('../../src/db/migrate');
const { seed } = require('../../src/db/seed');

const quiet = () => {};

async function ensureDatabaseExists() {
  const admin = new Client({ ...config.db, database: 'postgres' });
  try {
    await admin.connect();
    const { rowCount } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [config.db.database]);
    if (rowCount === 0) await admin.query(`CREATE DATABASE "${config.db.database.replace(/"/g, '')}"`);
  } catch {
    // no permission to create databases: assume it was created by hand
  } finally {
    await admin.end().catch(() => {});
  }
}

async function prepareDatabase() {
  await ensureDatabaseExists();
  await migrate({ log: quiet });
  await resetDatabase();
}

/** Empties every table (CASCADE follows foreign keys) and reloads the seed data. */
async function resetDatabase() {
  await db.getPool().query('TRUNCATE users, announcements CASCADE');
  await seed({ log: quiet });
}

function closeDatabase() {
  return db.close();
}

module.exports = { prepareDatabase, resetDatabase, closeDatabase };

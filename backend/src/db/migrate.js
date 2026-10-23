const fs = require('fs/promises');
const path = require('path');
const db = require('./pool');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');
// arbitrary constant used for pg_advisory_lock, so two app instances starting
// at the same time cannot run the same migration twice
const LOCK_KEY = 482015;

async function listMigrationFiles() {
  const files = await fs.readdir(MIGRATIONS_DIR);
  return files.filter((file) => file.endsWith('.sql')).sort();
}

/**
 * Applies every migrations/*.sql file that is not yet recorded in the
 * schema_migrations table. Files run in name order (001_, 002_, ...), each in
 * its own transaction: a failing file is rolled back and stops the run.
 * Returns the names of the files applied in this call.
 */
async function migrate({ pool = db.getPool(), log = console.log } = {}) {
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [LOCK_KEY]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name       text        PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )`);

    const { rows } = await client.query('SELECT name FROM schema_migrations');
    const done = new Set(rows.map((row) => row.name));
    const applied = [];

    for (const file of await listMigrationFiles()) {
      if (done.has(file)) continue;
      const sql = await fs.readFile(path.join(MIGRATIONS_DIR, file), 'utf8');
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        err.message = `Migration ${file} failed: ${err.message}`;
        throw err;
      }
      applied.push(file);
      log(`[migrate] applied ${file}`);
    }

    if (applied.length === 0) log('[migrate] database schema is up to date');
    return applied;
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [LOCK_KEY]).catch(() => {});
    client.release();
  }
}

module.exports = { migrate, listMigrationFiles };

// `npm run migrate`
if (require.main === module) {
  migrate()
    .catch((err) => {
      console.error(err.message);
      process.exitCode = 1;
    })
    .finally(() => db.close());
}

const fs = require('fs/promises');
const path = require('path');
const db = require('./pool');

const SEEDS_DIR = path.join(__dirname, 'seeds');

/**
 * Loads the sample data. Every seed file is idempotent (ON CONFLICT DO
 * NOTHING), so this is safe to run on each start: it fills an empty database
 * and leaves existing rows untouched.
 */
async function seed({ pool = db.getPool(), log = console.log } = {}) {
  const files = (await fs.readdir(SEEDS_DIR)).filter((file) => file.endsWith('.sql')).sort();
  for (const file of files) {
    const sql = await fs.readFile(path.join(SEEDS_DIR, file), 'utf8');
    await pool.query(sql);
    log(`[seed] loaded ${file}`);
  }
}

module.exports = { seed };

// `npm run seed`
if (require.main === module) {
  seed()
    .catch((err) => {
      console.error(err.message);
      process.exitCode = 1;
    })
    .finally(() => db.close());
}

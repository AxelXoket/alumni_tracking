const { Pool } = require('pg');
const config = require('../config');

let pool = null;

// The pool is created lazily so that importing this module never opens a
// connection (tests and the in-memory parts of the app do not need one).
function getPool() {
  if (!pool) {
    pool = new Pool({ ...config.db, max: 10, connectionTimeoutMillis: 3000, idleTimeoutMillis: 30000 });
    pool.on('error', (err) => console.error('Unexpected PostgreSQL client error:', err.message));
  }
  return pool;
}

async function ping() {
  try {
    await getPool().query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

async function close() {
  if (pool) {
    const current = pool;
    pool = null;
    await current.end();
  }
}

module.exports = { getPool, ping, close };

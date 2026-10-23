const path = require('path');
const dotenv = require('dotenv');

// Local runs read the shared .env at the repository root; inside Docker the
// variables come from docker-compose instead, so a missing file is fine.
dotenv.config({ path: path.resolve(__dirname, '..', '..', '..', '.env') });

function toPort(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 && parsed < 65536 ? parsed : fallback;
}

const env = process.env.NODE_ENV || 'development';

module.exports = Object.freeze({
  env,
  // node --test sets NODE_TEST_CONTEXT in every test process
  isTest: env === 'test' || Boolean(process.env.NODE_TEST_CONTEXT),
  isProduction: env === 'production',
  appName: process.env.APP_NAME || 'Alumni Tracking System',
  host: process.env.HOST || '0.0.0.0',
  port: toPort(process.env.PORT, 3000),
  db: Object.freeze({
    host: process.env.DB_HOST || 'localhost',
    port: toPort(process.env.DB_PORT, 5432),
    user: process.env.DB_USER || 'alumni_app',
    password: process.env.DB_PASSWORD || 'alumni_app_pw',
    database: process.env.DB_NAME || 'alumni_tracking',
  }),
});

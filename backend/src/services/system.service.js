const os = require('os');
const config = require('../config');
const HttpError = require('../lib/http-error');
const db = require('../db/pool');

const startedAt = Date.now();

function formatDuration(totalSeconds) {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);
  return parts.join(' ');
}

async function getHealth() {
  const uptimeSeconds = Math.floor((Date.now() - startedAt) / 1000);
  const databaseUp = await db.ping();
  return {
    // the API keeps working without the database, so report "degraded" instead of failing
    status: databaseUp ? 'ok' : 'degraded',
    service: config.appName,
    environment: config.env,
    uptime: { seconds: uptimeSeconds, readable: formatDuration(uptimeSeconds) },
    timestamp: new Date().toISOString(),
    runtime: {
      node: process.version,
      platform: os.platform(),
      memoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
    },
    database: { connected: databaseUp },
  };
}

function greet(rawName) {
  const name = String(rawName || '').trim();
  if (!name) throw HttpError.badRequest('name must not be empty');
  if (name.length > 50) throw HttpError.badRequest('name must be at most 50 characters long');
  return {
    name,
    message: `Hello, ${name}! Welcome to the ${config.appName}.`,
  };
}

const NUMBER_PATTERN = /^-?\d+(\.\d+)?$/;

function parseOperand(raw, label) {
  if (!NUMBER_PATTERN.test(String(raw).trim())) {
    throw HttpError.badRequest(`${label} must be a valid number`, { [label]: raw });
  }
  const value = Number(raw);
  if (!Number.isFinite(value)) throw HttpError.badRequest(`${label} is out of range`, { [label]: raw });
  return value;
}

function sum(rawA, rawB) {
  const a = parseOperand(rawA, 'number1');
  const b = parseOperand(rawB, 'number2');
  // round away floating point noise such as 0.1 + 0.2 = 0.30000000000000004
  const result = Number((a + b).toPrecision(15));
  return { operation: 'sum', number1: a, number2: b, result };
}

module.exports = { getHealth, greet, sum, formatDuration };

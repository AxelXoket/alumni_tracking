const config = require('../config');
const { failure } = require('../lib/reply');

// JSON endpoints always answer in JSON, even when opened from a browser
const JSON_PREFIXES = ['/api', '/health', '/hello', '/sum'];

// PostgreSQL error codes that are the client's fault rather than a server bug.
// The services validate first, so these mostly cover races (two requests
// creating the same email at once) and act as a safety net.
const PG_ERRORS = {
  23505: { status: 409, message: 'A record with the same unique value already exists' },
  23503: { status: 409, message: 'The record is referenced by, or refers to, a missing record' },
  23514: { status: 400, message: 'A value is outside the allowed range' },
  '22P02': { status: 400, message: 'A value has an invalid format' },
};

function wantsHtml(req) {
  const isJsonRoute = JSON_PREFIXES.some((prefix) => req.path === prefix || req.path.startsWith(`${prefix}/`));
  return !isJsonRoute && req.accepts(['json', 'html']) === 'html';
}

function normalize(err) {
  // body-parser reports malformed JSON with type 'entity.parse.failed'
  if (err.type === 'entity.parse.failed') return { status: 400, message: 'Request body is not valid JSON' };
  if (err.code && PG_ERRORS[err.code]) return PG_ERRORS[err.code];
  const status = err.status || err.statusCode || 500;
  const message = status >= 500 && config.isProduction ? 'Internal server error' : err.message;
  return { status, message, details: err.details };
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const { status, message, details } = normalize(err);

  if (status >= 500 && !config.isTest) console.error(err);

  if (wantsHtml(req)) {
    return res.status(status).render('error', { title: `${status}`, status, message });
  }
  return failure(res, status, message, details);
}

module.exports = errorHandler;

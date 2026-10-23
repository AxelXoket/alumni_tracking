const config = require('../config');
const { failure } = require('../lib/reply');

// JSON endpoints always answer in JSON, even when opened from a browser
const JSON_PREFIXES = ['/api', '/health', '/hello', '/sum'];

function wantsHtml(req) {
  const isJsonRoute = JSON_PREFIXES.some((prefix) => req.path === prefix || req.path.startsWith(`${prefix}/`));
  return !isJsonRoute && req.accepts(['json', 'html']) === 'html';
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // body-parser reports malformed JSON with type 'entity.parse.failed'
  const status = err.type === 'entity.parse.failed' ? 400 : err.status || err.statusCode || 500;
  const message = status >= 500 && config.isProduction ? 'Internal server error' : err.message;

  if (status >= 500 && !config.isTest) console.error(err);

  if (wantsHtml(req)) {
    return res.status(status).render('error', { title: `${status}`, status, message });
  }
  return failure(res, status, err.type === 'entity.parse.failed' ? 'Request body is not valid JSON' : message, err.details);
}

module.exports = errorHandler;

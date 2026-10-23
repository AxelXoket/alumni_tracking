const { STATUS_CODES } = require('http');

/**
 * JSON response helpers.
 *
 * Success responses are the plain resource: a list endpoint returns a JSON
 * array, a single-item endpoint returns the object. List sizes are also sent
 * in the X-Total-Count header.
 *
 * Errors share one flat shape:
 *   { error: "<HTTP reason phrase>", message: "...", details?: [{ field, message }] }
 */
function ok(res, data, status = 200) {
  return res.status(status).json(data);
}

function list(res, items) {
  res.set('X-Total-Count', String(items.length));
  return ok(res, items);
}

function created(res, data) {
  return ok(res, data, 201);
}

function failure(res, status, message, details) {
  const body = { error: STATUS_CODES[status] || 'Error', message };
  if (details !== undefined) body.details = details;
  return res.status(status).json(body);
}

module.exports = { ok, list, created, failure };

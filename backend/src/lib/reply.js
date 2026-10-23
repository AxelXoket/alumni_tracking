/**
 * Every JSON response uses the same envelope:
 *   success -> { success: true, data, ...meta }
 *   failure -> { success: false, error: { status, message, details? } }
 */
function success(res, data, { status = 200, meta } = {}) {
  return res.status(status).json({ success: true, ...meta, data });
}

function list(res, items) {
  return success(res, items, { meta: { count: items.length } });
}

function created(res, data) {
  return success(res, data, { status: 201 });
}

function failure(res, status, message, details) {
  const error = { status, message };
  if (details !== undefined) error.details = details;
  return res.status(status).json({ success: false, error });
}

module.exports = { success, list, created, failure };

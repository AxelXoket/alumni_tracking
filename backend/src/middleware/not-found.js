const HttpError = require('../lib/http-error');

// Reached only when no route matched; hands a 404 to the error handler so API
// and browser requests get the same treatment as other errors.
function notFound(req, res, next) {
  next(HttpError.notFound(`Route ${req.method} ${req.originalUrl} does not exist`));
}

module.exports = notFound;

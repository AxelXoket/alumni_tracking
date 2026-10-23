/**
 * Error type that carries an HTTP status code. Services throw these and the
 * central error middleware turns them into a consistent JSON (or HTML) reply.
 */
class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    if (details !== undefined) this.details = details;
  }

  static badRequest(message, details) {
    return new HttpError(400, message, details);
  }

  static notFound(message = 'Resource not found') {
    return new HttpError(404, message);
  }

  static conflict(message) {
    return new HttpError(409, message);
  }

  /**
   * Duplicate job application. The week 6 specification fixes the response
   * body to { error: "Conflict", message: "User has already applied for this
   * job posting" }, which is exactly what the error handler sends for it.
   */
  static alreadyApplied() {
    return new HttpError(409, 'User has already applied for this job posting');
  }
}

module.exports = HttpError;

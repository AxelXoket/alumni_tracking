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
   * Duplicate job application. The response body of this case is part of the
   * week 6 specification, so it is sent exactly as is instead of the usual
   * error envelope.
   */
  static alreadyApplied() {
    const err = new HttpError(409, 'User has already applied for this job posting');
    err.responseBody = { error: 'Conflict', message: err.message };
    return err;
  }
}

module.exports = HttpError;

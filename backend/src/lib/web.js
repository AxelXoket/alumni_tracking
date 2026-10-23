const HttpError = require('./http-error');

/**
 * Helpers shared by the web (HTML) controllers.
 *
 * Browser forms cannot read JSON errors, so after a form POST the controllers
 * redirect back to the list page with ?status=... on success or ?error=... on
 * failure (Post/Redirect/Get). The list page turns these into a flash message.
 */

function withQuery(path, params) {
  const query = new URLSearchParams(params).toString();
  return query ? `${path}?${query}` : path;
}

function flashFrom(query = {}) {
  const messages = {
    created: 'Saved successfully.',
    applied: 'Application sent.',
    updated: 'Changes saved.',
    deleted: 'Deleted successfully.',
  };
  if (query.error) return { type: 'error', text: String(query.error).slice(0, 300) };
  if (query.status && messages[query.status]) return { type: 'success', text: messages[query.status] };
  return null;
}

function errorText(err) {
  if (Array.isArray(err.details) && err.details.length > 0) {
    return err.details.map((detail) => detail.message).join(', ');
  }
  return err.message;
}

/**
 * Runs a form action and redirects. Client errors (4xx) go back with an error
 * message; anything else is passed to the error handler. `backTo` is a path
 * or a function of the request (e.g. back to the job a form was posted from).
 */
function formAction(backTo, action, successStatus) {
  return async (req, res, next) => {
    const path = typeof backTo === 'function' ? backTo(req) : backTo;
    try {
      await action(req);
      res.redirect(303, withQuery(path, { status: successStatus }));
    } catch (err) {
      if (err instanceof HttpError && err.status < 500) {
        res.redirect(303, withQuery(path, { error: errorText(err) }));
      } else {
        next(err);
      }
    }
  };
}

module.exports = { withQuery, flashFrom, errorText, formAction };

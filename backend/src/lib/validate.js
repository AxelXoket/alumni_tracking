const HttpError = require('./http-error');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isBlank(value) {
  return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
}

function checkValue(field, raw, rule) {
  if (rule.oneOf) {
    const candidate = typeof raw === 'string' ? raw.trim().toLowerCase() : raw;
    if (!rule.oneOf.includes(candidate)) {
      return { error: `${field} must be one of: ${rule.oneOf.join(', ')}` };
    }
    return { value: candidate };
  }

  if (rule.type === 'integer') {
    const number = typeof raw === 'string' && /^-?\d+$/.test(raw.trim()) ? Number(raw) : raw;
    if (!Number.isInteger(number)) return { error: `${field} must be a whole number` };
    if (rule.minValue !== undefined && number < rule.minValue) {
      return { error: `${field} must be ${rule.minValue} or greater` };
    }
    if (rule.maxValue !== undefined && number > rule.maxValue) {
      return { error: `${field} must be ${rule.maxValue} or less` };
    }
    return { value: number };
  }

  if (typeof raw !== 'string') return { error: `${field} must be a string` };

  let value = raw.trim();
  if (rule.lowercase) value = value.toLowerCase();
  if (rule.min && value.length < rule.min) {
    return { error: `${field} must be at least ${rule.min} characters long` };
  }
  if (rule.max && value.length > rule.max) {
    return { error: `${field} must be at most ${rule.max} characters long` };
  }
  if (rule.pattern && !rule.pattern.test(value)) {
    return { error: rule.patternMessage || `${field} has an invalid format` };
  }
  return { value };
}

/**
 * Validates a request body against a small rule set and returns a cleaned copy
 * (trimmed strings, lower-cased enums). Unknown keys are dropped.
 *
 * With `partial: true` (PATCH) required fields may be omitted, but at least one
 * known field has to be present. Throws a 400 HttpError listing every problem.
 */
function validate(input, schema, { partial = false } = {}) {
  const body = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const errors = [];
  const clean = {};

  for (const [field, rule] of Object.entries(schema)) {
    const raw = body[field];

    if (isBlank(raw)) {
      if (partial) {
        if (raw !== undefined && rule.required) errors.push({ field, message: `${field} cannot be empty` });
        else if (raw !== undefined) clean[field] = null;
      } else if (rule.required) {
        errors.push({ field, message: `${field} is required` });
      } else {
        clean[field] = rule.default !== undefined ? rule.default : null;
      }
      continue;
    }

    const result = checkValue(field, raw, rule);
    if (result.error) errors.push({ field, message: result.error });
    else clean[field] = result.value;
  }

  if (partial && errors.length === 0 && Object.keys(clean).length === 0) {
    errors.push({ field: null, message: `Provide at least one of: ${Object.keys(schema).join(', ')}` });
  }

  if (errors.length > 0) throw HttpError.badRequest('Validation failed', errors);
  return clean;
}

function assertUuid(id, field = 'id') {
  if (typeof id !== 'string' || !UUID_PATTERN.test(id)) {
    throw HttpError.badRequest(`${field} must be a valid UUID`);
  }
}

module.exports = { validate, assertUuid, EMAIL_PATTERN, UUID_PATTERN };

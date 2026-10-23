const store = require('../store/user.store');
const HttpError = require('../lib/http-error');
const { validate, EMAIL_PATTERN } = require('../lib/validate');

const ROLES = ['alumni', 'student', 'faculty', 'admin'];

const USER_SCHEMA = {
  name: { required: true, min: 2, max: 100 },
  email: {
    required: true,
    max: 255,
    lowercase: true,
    pattern: EMAIL_PATTERN,
    patternMessage: 'email must be a valid email address',
  },
  role: { oneOf: ROLES, default: 'alumni' },
  department: { max: 120 },
  graduationYear: { type: 'integer', minValue: 1950, maxValue: 2100 },
};

function ensureEmailIsFree(email, ownerId) {
  const existing = store.findByEmail(email);
  if (existing && existing.id !== ownerId) {
    throw HttpError.conflict(`A user with email ${email} already exists`);
  }
}

function listUsers({ role, search } = {}) {
  let users = store.all();
  if (role) {
    const wanted = String(role).toLowerCase();
    if (!ROLES.includes(wanted)) {
      throw HttpError.badRequest(`role filter must be one of: ${ROLES.join(', ')}`);
    }
    users = users.filter((user) => user.role === wanted);
  }
  if (search) {
    const term = String(search).trim().toLowerCase();
    users = users.filter(
      (user) => user.name.toLowerCase().includes(term) || user.email.includes(term),
    );
  }
  return users.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
}

function getUser(id) {
  const user = store.findById(id);
  if (!user) throw HttpError.notFound(`User ${id} not found`);
  return user;
}

function createUser(body) {
  const data = validate(body, USER_SCHEMA);
  ensureEmailIsFree(data.email);
  return store.insert(data);
}

function replaceUser(id, body) {
  getUser(id);
  const data = validate(body, USER_SCHEMA);
  ensureEmailIsFree(data.email, id);
  return store.update(id, data);
}

function updateUser(id, body) {
  getUser(id);
  const changes = validate(body, USER_SCHEMA, { partial: true });
  if (changes.email) ensureEmailIsFree(changes.email, id);
  return store.update(id, changes);
}

function deleteUser(id) {
  const user = getUser(id);
  store.remove(id);
  return user;
}

module.exports = { ROLES, listUsers, getUser, createUser, replaceUser, updateUser, deleteUser };

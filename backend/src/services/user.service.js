const { userModel } = require('../models/user.model');
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

async function ensureEmailIsFree(email, ownerId) {
  const existing = await userModel.findByEmail(email);
  if (existing && existing.id !== ownerId) {
    throw HttpError.conflict(`A user with email ${email} already exists`);
  }
}

function parseFilters({ role, search } = {}) {
  const filters = {};
  if (role) {
    filters.role = String(role).toLowerCase();
    if (!ROLES.includes(filters.role)) {
      throw HttpError.badRequest(`role filter must be one of: ${ROLES.join(', ')}`);
    }
  }
  if (search && String(search).trim()) filters.search = String(search).trim();
  return filters;
}

async function listUsers(query) {
  return userModel.findAll(parseFilters(query));
}

async function getUser(id) {
  const user = await userModel.findById(id);
  if (!user) throw HttpError.notFound(`User ${id} not found`);
  return user;
}

async function createUser(body) {
  const data = validate(body, USER_SCHEMA);
  await ensureEmailIsFree(data.email);
  return userModel.create(data);
}

async function replaceUser(id, body) {
  await getUser(id);
  const data = validate(body, USER_SCHEMA);
  await ensureEmailIsFree(data.email, id);
  return userModel.update(id, data);
}

async function updateUser(id, body) {
  await getUser(id);
  const changes = validate(body, USER_SCHEMA, { partial: true });
  if (changes.email) await ensureEmailIsFree(changes.email, id);
  return userModel.update(id, changes);
}

async function deleteUser(id) {
  const user = await getUser(id);
  await userModel.delete(id);
  return user;
}

async function getRoleCounts() {
  return userModel.countByRole();
}

module.exports = {
  ROLES,
  listUsers,
  getUser,
  createUser,
  replaceUser,
  updateUser,
  deleteUser,
  getRoleCounts,
};

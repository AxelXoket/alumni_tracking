const { jobPostingModel, WORK_MODES, EMPLOYMENT_TYPES } = require('../models/job-posting.model');
const { userModel } = require('../models/user.model');
const HttpError = require('../lib/http-error');
const { validate, assertUuid } = require('../lib/validate');

const JOB_SCHEMA = {
  title: { required: true, min: 2, max: 150 },
  company: { required: true, min: 2, max: 150 },
  location: { max: 120 },
  workMode: { oneOf: WORK_MODES, default: 'onsite' },
  employmentType: { oneOf: EMPLOYMENT_TYPES, default: 'full_time' },
  description: { max: 5000 },
};

async function requireUser(userId) {
  const user = await userModel.findById(userId);
  if (!user) throw HttpError.notFound(`User ${userId} not found`);
  return user;
}

function parseFilters({ userId, workMode, search } = {}) {
  const filters = {};
  if (userId) {
    assertUuid(userId, 'userId');
    filters.userId = userId;
  }
  if (workMode) {
    filters.workMode = String(workMode).toLowerCase();
    if (!WORK_MODES.includes(filters.workMode)) {
      throw HttpError.badRequest(`workMode filter must be one of: ${WORK_MODES.join(', ')}`);
    }
  }
  if (search && String(search).trim()) filters.search = String(search).trim();
  return filters;
}

async function listJobs(query) {
  return jobPostingModel.findAll(parseFilters(query));
}

async function getJob(id) {
  const job = await jobPostingModel.findById(id);
  if (!job) throw HttpError.notFound(`Job posting ${id} not found`);
  return job;
}

/** Jobs posted by one user (GET /api/users/:id/jobs). 404 if the user does not exist. */
async function listJobsOfUser(userId) {
  await requireUser(userId);
  return jobPostingModel.findByUserId(userId);
}

/**
 * Creates a job for the given poster. The poster always comes from the
 * caller (the URL in POST /api/users/:id/jobs), never from the request body.
 */
async function createJobForUser(userId, body) {
  await requireUser(userId);
  const data = validate(body, JOB_SCHEMA);
  return jobPostingModel.create({ ...data, userId });
}

/** POST /api/jobs: here the poster has to be named in the body as userId. */
async function createJob(body = {}) {
  const userId = body.userId ?? body.user_id;
  if (userId === undefined || userId === null || userId === '') {
    throw HttpError.badRequest('Validation failed', [{ field: 'userId', message: 'userId is required' }]);
  }
  assertUuid(userId, 'userId');
  return createJobForUser(userId, body);
}

async function replaceJob(id, body) {
  await getJob(id);
  return jobPostingModel.update(id, validate(body, JOB_SCHEMA));
}

async function updateJob(id, body) {
  await getJob(id);
  return jobPostingModel.update(id, validate(body, JOB_SCHEMA, { partial: true }));
}

/** Deleting a job also deletes its applications (ON DELETE CASCADE). */
async function deleteJob(id) {
  const job = await getJob(id);
  await jobPostingModel.delete(id);
  return job;
}

module.exports = {
  WORK_MODES,
  EMPLOYMENT_TYPES,
  listJobs,
  getJob,
  listJobsOfUser,
  createJob,
  createJobForUser,
  replaceJob,
  updateJob,
  deleteJob,
};

const { applicationModel, STATUSES } = require('../models/application.model');
const { jobPostingModel } = require('../models/job-posting.model');
const { userModel } = require('../models/user.model');
const HttpError = require('../lib/http-error');
const { validate, assertUuid } = require('../lib/validate');

const APPLY_SCHEMA = {
  status: { oneOf: STATUSES, default: 'applied' },
  coverLetter: { max: 2000 },
};

const STATUS_SCHEMA = { status: { required: true, oneOf: STATUSES } };

async function requireUser(userId) {
  if (!(await userModel.findById(userId))) throw HttpError.notFound(`User ${userId} not found`);
}

async function requireJob(jobId) {
  if (!(await jobPostingModel.findById(jobId))) throw HttpError.notFound(`Job posting ${jobId} not found`);
}

function requiredId(value, field) {
  if (value === undefined || value === null || value === '') {
    throw HttpError.badRequest('Validation failed', [{ field, message: `${field} is required` }]);
  }
  assertUuid(value, field);
  return value;
}

async function listApplications({ status } = {}) {
  const filters = {};
  if (status) {
    filters.status = String(status).toLowerCase();
    if (!STATUSES.includes(filters.status)) {
      throw HttpError.badRequest(`status filter must be one of: ${STATUSES.join(', ')}`);
    }
  }
  return applicationModel.findAll(filters);
}

async function getApplication(id) {
  const application = await applicationModel.findById(id);
  if (!application) throw HttpError.notFound(`Application ${id} not found`);
  return application;
}

async function listApplicationsOfJob(jobId) {
  await requireJob(jobId);
  return applicationModel.findByJobId(jobId);
}

async function listApplicationsOfUser(userId) {
  await requireUser(userId);
  return applicationModel.findByUserId(userId);
}

/**
 * A user applies to a job. Order of checks: ids present and valid (400),
 * user and job exist (404), not applied before (409), then insert.
 */
async function apply(jobId, body = {}) {
  const userId = requiredId(body.userId ?? body.user_id, 'userId');
  requiredId(jobId, 'jobPostingId');
  const data = validate(body, APPLY_SCHEMA);

  await requireUser(userId);
  await requireJob(jobId);
  if (await applicationModel.findByPair(userId, jobId)) throw HttpError.alreadyApplied();

  try {
    return await applicationModel.create({ ...data, userId, jobPostingId: jobId });
  } catch (err) {
    // two identical requests at the same time: the UNIQUE constraint decides
    if (err.code === '23505') throw HttpError.alreadyApplied();
    throw err;
  }
}

/** POST /api/applications: the job is named in the body. */
async function createApplication(body = {}) {
  const jobId = body.jobPostingId ?? body.jobId ?? body.job_posting_id;
  return apply(requiredId(jobId, 'jobPostingId'), body);
}

async function updateStatus(id, body) {
  await getApplication(id);
  const { status } = validate(body, STATUS_SCHEMA);
  return applicationModel.updateStatus(id, status);
}

async function deleteApplication(id) {
  const application = await getApplication(id);
  await applicationModel.delete(id);
  return application;
}

async function getStatusCounts() {
  return applicationModel.countByStatus();
}

module.exports = {
  STATUSES,
  listApplications,
  getApplication,
  listApplicationsOfJob,
  listApplicationsOfUser,
  apply,
  createApplication,
  updateStatus,
  deleteApplication,
  getStatusCounts,
};

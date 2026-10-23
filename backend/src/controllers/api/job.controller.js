const jobService = require('../../services/job.service');
const applicationService = require('../../services/application.service');
const reply = require('../../lib/reply');

/** API controller for job postings, including the nested routes. */

async function index(req, res) {
  reply.list(res, await jobService.listJobs(req.query));
}

async function show(req, res) {
  reply.ok(res, await jobService.getJob(req.params.id));
}

async function store(req, res) {
  reply.created(res, await jobService.createJob(req.body));
}

async function replace(req, res) {
  reply.ok(res, await jobService.replaceJob(req.params.id, req.body));
}

async function update(req, res) {
  reply.ok(res, await jobService.updateJob(req.params.id, req.body));
}

async function destroy(req, res) {
  const job = await jobService.deleteJob(req.params.id);
  reply.ok(res, { id: job.id, deleted: true });
}

// GET /api/users/:id/jobs
async function indexForUser(req, res) {
  reply.list(res, await jobService.listJobsOfUser(req.params.id));
}

// POST /api/users/:id/jobs — the poster is taken from the URL only
async function storeForUser(req, res) {
  reply.created(res, await jobService.createJobForUser(req.params.id, req.body));
}

// GET /api/jobs/:id/applications
async function applications(req, res) {
  reply.list(res, await applicationService.listApplicationsOfJob(req.params.id));
}

// POST /api/jobs/:id/applications — 409 if the user already applied
async function apply(req, res) {
  reply.created(res, await applicationService.apply(req.params.id, req.body));
}

module.exports = {
  index,
  show,
  store,
  replace,
  update,
  destroy,
  indexForUser,
  storeForUser,
  applications,
  apply,
};

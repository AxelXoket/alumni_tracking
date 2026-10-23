const applicationService = require('../../services/application.service');
const reply = require('../../lib/reply');

/** API controller for applications (/api/applications). */

async function index(req, res) {
  reply.list(res, await applicationService.listApplications(req.query));
}

async function show(req, res) {
  reply.success(res, await applicationService.getApplication(req.params.id));
}

async function store(req, res) {
  reply.created(res, await applicationService.createApplication(req.body));
}

// PATCH /api/applications/:id — only the status can change
async function update(req, res) {
  reply.success(res, await applicationService.updateStatus(req.params.id, req.body));
}

async function destroy(req, res) {
  const application = await applicationService.deleteApplication(req.params.id);
  reply.success(res, { id: application.id, deleted: true });
}

// GET /api/users/:id/applications
async function indexForUser(req, res) {
  reply.list(res, await applicationService.listApplicationsOfUser(req.params.id));
}

module.exports = { index, show, store, update, destroy, indexForUser };

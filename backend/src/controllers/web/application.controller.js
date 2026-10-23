const applicationService = require('../../services/application.service');
const jobService = require('../../services/job.service');
const userService = require('../../services/user.service');
const { flashFrom, formAction } = require('../../lib/web');

/** Web controller for applications: tracking table, new application, status, withdraw. */

async function index(req, res) {
  const [applications, counts, jobs, users] = await Promise.all([
    applicationService.listApplications(),
    applicationService.getStatusCounts(),
    jobService.listJobs(),
    userService.listUsers(),
  ]);
  res.render('applications/index', {
    title: 'Applications',
    active: 'applications',
    applications,
    counts,
    jobs,
    users,
    statuses: applicationService.STATUSES,
    flash: flashFrom(req.query),
    scripts: ['/js/app.js'],
  });
}

const create = formAction('/applications', (req) => applicationService.createApplication(req.body), 'applied');

const updateStatus = formAction(
  '/applications',
  (req) => applicationService.updateStatus(req.params.id, req.body),
  'updated',
);

const destroy = formAction(
  '/applications',
  (req) => applicationService.deleteApplication(req.params.id),
  'deleted',
);

module.exports = { index, create, updateStatus, destroy };

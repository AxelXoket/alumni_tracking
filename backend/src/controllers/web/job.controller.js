const jobService = require('../../services/job.service');
const applicationService = require('../../services/application.service');
const userService = require('../../services/user.service');
const { flashFrom, formAction } = require('../../lib/web');

/** Web controller for job postings: list, detail, post, apply and delete. */

async function index(req, res) {
  const [jobs, users] = await Promise.all([jobService.listJobs(), userService.listUsers()]);
  res.render('jobs/index', {
    title: 'Jobs',
    active: 'jobs',
    jobs,
    users,
    stats: {
      total: jobs.length,
      flexible: jobs.filter((job) => job.workMode !== 'onsite').length,
      companies: new Set(jobs.map((job) => job.company.toLowerCase())).size,
      applications: jobs.reduce((sum, job) => sum + job.applicationCount, 0),
    },
    workModes: jobService.WORK_MODES,
    employmentTypes: jobService.EMPLOYMENT_TYPES,
    statuses: applicationService.STATUSES,
    flash: flashFrom(req.query),
    scripts: ['/js/app.js'],
  });
}

async function show(req, res) {
  const job = await jobService.getJob(req.params.id);
  const [applications, users] = await Promise.all([
    applicationService.listApplicationsOfJob(job.id),
    userService.listUsers(),
  ]);
  const appliedIds = new Set(applications.map((application) => application.userId));
  res.render('jobs/show', {
    title: job.title,
    active: 'jobs',
    job,
    applications,
    // people who can still apply: not the poster and not already applied
    candidates: users.filter((user) => user.id !== job.userId && !appliedIds.has(user.id)),
    flash: flashFrom(req.query),
    scripts: ['/js/app.js'],
  });
}

const create = formAction('/jobs', (req) => jobService.createJob(req.body), 'created');

const destroy = formAction('/jobs', (req) => jobService.deleteJob(req.params.id), 'deleted');

const apply = formAction(
  (req) => `/jobs/${encodeURIComponent(req.params.id)}`,
  (req) => applicationService.apply(req.params.id, req.body),
  'applied',
);

module.exports = { index, show, create, destroy, apply };

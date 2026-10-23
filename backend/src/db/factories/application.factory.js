const db = require('../pool');
const { applicationModel } = require('../../models/application.model');

/**
 * Application factory: build / create helpers for tests and a small,
 * idempotent sample set so the applications page is not empty on first start.
 */

// sample applications: fixed id, the sample job applied to, and its status
const SAMPLE_APPLICATIONS = [
  { id: '5a7f3c22-8e1b-4d09-9c6e-2f4b8a1d3e01', job: '9d4e2b71-0c6a-4f3e-8a15-6b2c7d9e1f01', status: 'interview' },
  { id: '5a7f3c22-8e1b-4d09-9c6e-2f4b8a1d3e02', job: '9d4e2b71-0c6a-4f3e-8a15-6b2c7d9e1f02', status: 'applied' },
  { id: '5a7f3c22-8e1b-4d09-9c6e-2f4b8a1d3e03', job: '9d4e2b71-0c6a-4f3e-8a15-6b2c7d9e1f03', status: 'reviewing' },
];

function build(overrides = {}) {
  return { status: 'applied', coverLetter: null, ...overrides };
}

async function create(overrides = {}) {
  if (!overrides.userId || !overrides.jobPostingId) {
    throw new Error('applicationFactory.create needs userId and jobPostingId');
  }
  return applicationModel.create(build(overrides));
}

async function seed({ pool = db.getPool(), log = console.log } = {}) {
  // students apply; fall back to any user if there are none
  const { rows: candidates } = await pool.query(
    `SELECT id FROM users ORDER BY (role = 'student') DESC, created_at LIMIT 1`,
  );
  if (candidates.length === 0) return [];
  const candidate = candidates[0].id;

  const inserted = [];
  for (const sample of SAMPLE_APPLICATIONS) {
    // skip the sample if its job is missing or posted by the candidate themselves
    const { rowCount } = await pool.query(
      `INSERT INTO applications (id, user_id, job_posting_id, status, cover_letter)
       SELECT $1, $2, j.id, $3, NULL FROM job_postings j WHERE j.id = $4 AND j.user_id <> $2
       ON CONFLICT DO NOTHING`,
      [sample.id, candidate, sample.status, sample.job],
    );
    if (rowCount) inserted.push(sample.id);
  }
  log(`[seed] applications: ${inserted.length} inserted`);
  return inserted;
}

module.exports = { SAMPLE_APPLICATIONS, build, create, seed };

const { describe, it, before, beforeEach, after } = require('node:test');
const { prepareDatabase, resetDatabase, closeDatabase } = require('./helpers/database');
const assert = require('node:assert/strict');
const request = require('supertest');
const createApp = require('../src/app');
const { jobPostingModel } = require('../src/models/job-posting.model');
const { applicationModel } = require('../src/models/application.model');

const app = createApp();
const ELIF = '6f1c2a8e-3b7d-4c51-9a2e-0d4f8b6c1e01';
const AYSE = '6f1c2a8e-3b7d-4c51-9a2e-0d4f8b6c1e03';
const JOB_ID = '9d4e2b71-0c6a-4f3e-8a15-6b2c7d9e1f01';

before(prepareDatabase);
beforeEach(resetDatabase);
after(closeDatabase);

describe('GET /jobs (view)', () => {
  it('renders the job board with the seeded jobs and the post / apply dialogs', async () => {
    const res = await request(app).get('/jobs').expect(200);
    assert.match(res.text, /id="job-list"/);
    assert.match(res.text, /Junior Backend Developer/);
    assert.match(res.text, /id="job-form-dialog"/);
    assert.match(res.text, /id="apply-dialog"/);
  });

  it('renders a job detail page with its applications', async () => {
    const res = await request(app).get(`/jobs/${JOB_ID}`).expect(200);
    assert.match(res.text, /Anatolia Fintech/);
    assert.match(res.text, /Applications \(1\)/);
  });

  it('returns 404 for an unknown job', async () => {
    await request(app).get('/jobs/00000000-0000-4000-8000-000000000000').set('Accept', 'text/html').expect(404);
  });
});

describe('job form fallbacks', () => {
  it('POST /jobs creates a job for the chosen poster', async () => {
    const res = await request(app)
      .post('/jobs')
      .type('form')
      .send({ userId: ELIF, title: 'Form posted job', company: 'Form Co', workMode: 'hybrid', employmentType: 'internship' })
      .expect(303);
    assert.equal(res.headers.location, '/jobs?status=created');
    const jobs = await jobPostingModel.findAll({ search: 'Form posted job' });
    assert.equal(jobs.length, 1);
    assert.equal(jobs[0].userId, ELIF);
  });

  it('POST /jobs without a poster redirects with an error', async () => {
    const res = await request(app).post('/jobs').type('form').send({ title: 'No poster', company: 'X Co' }).expect(303);
    assert.match(res.headers.location, /^\/jobs\?error=/);
  });

  it('POST /jobs/:id/apply sends an application and returns to the job', async () => {
    const res = await request(app).post(`/jobs/${JOB_ID}/apply`).type('form').send({ userId: AYSE }).expect(303);
    assert.equal(res.headers.location, `/jobs/${JOB_ID}?status=applied`);
    assert.ok(await applicationModel.findByPair(AYSE, JOB_ID));
  });

  it('applying twice redirects with the "already applied" message', async () => {
    await request(app).post(`/jobs/${JOB_ID}/apply`).type('form').send({ userId: AYSE }).expect(303);
    const res = await request(app).post(`/jobs/${JOB_ID}/apply`).type('form').send({ userId: AYSE }).expect(303);
    assert.match(decodeURIComponent(res.headers.location.replace(/\+/g, ' ')), /already applied/);
  });

  it('POST /jobs/:id/delete removes the job', async () => {
    const res = await request(app).post(`/jobs/${JOB_ID}/delete`).expect(303);
    assert.equal(res.headers.location, '/jobs?status=deleted');
    assert.equal(await jobPostingModel.findById(JOB_ID), null);
  });
});

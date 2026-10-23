const { describe, it, before, beforeEach, after } = require('node:test');
const { prepareDatabase, resetDatabase, closeDatabase } = require('./helpers/database');
const assert = require('node:assert/strict');
const request = require('supertest');
const createApp = require('../src/app');
const jobPostingFactory = require('../src/db/factories/job-posting.factory');

const app = createApp();
const ELIF = '6f1c2a8e-3b7d-4c51-9a2e-0d4f8b6c1e01'; // alumni
const MERT = '6f1c2a8e-3b7d-4c51-9a2e-0d4f8b6c1e02'; // student
const MISSING_ID = '00000000-0000-4000-8000-000000000000';

const jobPayload = (overrides = {}) => ({
  title: 'QA Engineer',
  company: 'Galata Software',
  location: 'Istanbul',
  workMode: 'remote',
  employmentType: 'full_time',
  description: 'Write and automate test plans.',
  ...overrides,
});

before(prepareDatabase);
beforeEach(resetDatabase);
after(closeDatabase);

describe('job posting factory', () => {
  it('seeds the sample jobs, each posted by an existing user', async () => {
    const res = await request(app).get('/api/jobs').expect(200);
    assert.equal(res.body.length, jobPostingFactory.SAMPLE_JOBS.length);
    assert.ok(res.body.every((job) => job.postedBy && job.postedBy.name));
  });

  it('build() returns defaults that can be overridden', () => {
    const job = jobPostingFactory.build({ company: 'Override Inc' });
    assert.equal(job.company, 'Override Inc');
    assert.equal(job.workMode, 'onsite');
  });

  it('create() inserts a job for the given user', async () => {
    const job = await jobPostingFactory.create({ userId: ELIF, title: 'Factory job' });
    assert.equal(job.userId, ELIF);
    await request(app).get(`/api/jobs/${job.id}`).expect(200);
  });
});

describe('POST /api/users/:id/jobs (nested, one-to-many)', () => {
  it('creates a job for the user in the URL', async () => {
    const res = await request(app).post(`/api/users/${ELIF}/jobs`).send(jobPayload()).expect(201);
    assert.equal(res.body.userId, ELIF);
    assert.equal(res.body.postedBy.name, 'Elif Yılmaz');
    assert.equal(res.body.workMode, 'remote');
  });

  it('ignores a userId sent in the body: the poster comes from the URL only', async () => {
    const res = await request(app)
      .post(`/api/users/${ELIF}/jobs`)
      .send(jobPayload({ userId: MERT, user_id: MERT }))
      .expect(201);
    assert.equal(res.body.userId, ELIF);
  });

  it('returns 404 when the user does not exist', async () => {
    await request(app).post(`/api/users/${MISSING_ID}/jobs`).send(jobPayload()).expect(404);
  });

  it('returns 400 for invalid job data', async () => {
    const res = await request(app)
      .post(`/api/users/${ELIF}/jobs`)
      .send({ title: '', company: 'X', workMode: 'mars' })
      .expect(400);
    const fields = res.body.details.map((detail) => detail.field).sort();
    assert.deepEqual(fields, ['company', 'title', 'workMode']);
  });
});

describe('GET /api/users/:id/jobs', () => {
  it('lists only the jobs of that user', async () => {
    await request(app).post(`/api/users/${ELIF}/jobs`).send(jobPayload()).expect(201);
    const res = await request(app).get(`/api/users/${ELIF}/jobs`).expect(200);
    assert.ok(res.body.length >= 2);
    assert.ok(res.body.every((job) => job.userId === ELIF));
  });

  it('returns 404 for an unknown user', async () => {
    await request(app).get(`/api/users/${MISSING_ID}/jobs`).expect(404);
  });
});

describe('/api/jobs', () => {
  it('filters by work mode and search', async () => {
    const remote = await request(app).get('/api/jobs?workMode=remote').expect(200);
    assert.ok(remote.body.every((job) => job.workMode === 'remote'));
    const search = await request(app).get('/api/jobs?search=flutter').expect(200);
    assert.equal(search.body.length, 1);
    await request(app).get('/api/jobs?workMode=space').expect(400);
  });

  it('POST requires the poster as userId in the body', async () => {
    await request(app).post('/api/jobs').send(jobPayload()).expect(400);
    await request(app).post('/api/jobs').send(jobPayload({ userId: MISSING_ID })).expect(404);
    const res = await request(app).post('/api/jobs').send(jobPayload({ userId: MERT })).expect(201);
    assert.equal(res.body.userId, MERT);
  });

  it('GET, PUT, PATCH and DELETE a job', async () => {
    const created = await request(app).post(`/api/users/${ELIF}/jobs`).send(jobPayload()).expect(201);
    const id = created.body.id;

    await request(app).get(`/api/jobs/${id}`).expect(200);

    const replaced = await request(app)
      .put(`/api/jobs/${id}`)
      .send(jobPayload({ title: 'Senior QA Engineer', location: null }))
      .expect(200);
    assert.equal(replaced.body.title, 'Senior QA Engineer');
    assert.equal(replaced.body.location, null);
    assert.equal(replaced.body.userId, ELIF);

    const patched = await request(app).patch(`/api/jobs/${id}`).send({ workMode: 'hybrid' }).expect(200);
    assert.equal(patched.body.workMode, 'hybrid');
    assert.equal(patched.body.title, 'Senior QA Engineer');

    await request(app).delete(`/api/jobs/${id}`).expect(200);
    await request(app).get(`/api/jobs/${id}`).expect(404);
  });

  it('returns 404 for unknown or malformed ids', async () => {
    await request(app).get(`/api/jobs/${MISSING_ID}`).expect(404);
    await request(app).patch(`/api/jobs/${MISSING_ID}`).send({ title: 'New' }).expect(404);
    await request(app).delete(`/api/jobs/${MISSING_ID}`).expect(404);
    await request(app).get('/api/jobs/not-a-uuid').expect(404);
    await request(app).get('/api/jobs/not-a-uuid/applications').expect(404);
  });

  it('deleting a user also deletes the jobs they posted (ON DELETE CASCADE)', async () => {
    const created = await request(app).post(`/api/users/${MERT}/jobs`).send(jobPayload()).expect(201);
    await request(app).delete(`/api/users/${MERT}`).expect(200);
    await request(app).get(`/api/jobs/${created.body.id}`).expect(404);
  });
});

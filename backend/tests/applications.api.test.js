const { describe, it, before, beforeEach, after } = require('node:test');
const { prepareDatabase, resetDatabase, closeDatabase } = require('./helpers/database');
const assert = require('node:assert/strict');
const request = require('supertest');
const createApp = require('../src/app');
const { userModel } = require('../src/models/user.model');
const jobPostingFactory = require('../src/db/factories/job-posting.factory');

const app = createApp();
const ELIF = '6f1c2a8e-3b7d-4c51-9a2e-0d4f8b6c1e01';
const AYSE = '6f1c2a8e-3b7d-4c51-9a2e-0d4f8b6c1e03';
const MISSING_ID = '00000000-0000-4000-8000-000000000000';

let job;

before(prepareDatabase);
beforeEach(async () => {
  await resetDatabase();
  job = await jobPostingFactory.create({ userId: ELIF, title: 'Platform Engineer' });
});
after(closeDatabase);

describe('POST /api/jobs/:id/applications (nested, many-to-many)', () => {
  it('creates an application with status applied by default', async () => {
    const res = await request(app).post(`/api/jobs/${job.id}/applications`).send({ userId: AYSE }).expect(201);
    assert.equal(res.body.data.userId, AYSE);
    assert.equal(res.body.data.jobPostingId, job.id);
    assert.equal(res.body.data.status, 'applied');
    assert.equal(res.body.data.candidate.name, 'Ayşe Demir');
    assert.equal(res.body.data.job.title, 'Platform Engineer');
  });

  it('returns 409 with the specified body when the user applies twice', async () => {
    await request(app).post(`/api/jobs/${job.id}/applications`).send({ userId: AYSE }).expect(201);
    const res = await request(app).post(`/api/jobs/${job.id}/applications`).send({ userId: AYSE }).expect(409);
    assert.deepEqual(res.body, { error: 'Conflict', message: 'User has already applied for this job posting' });
  });

  it('is protected by the UNIQUE (user_id, job_posting_id) constraint as well', async () => {
    const results = await Promise.all([
      request(app).post(`/api/jobs/${job.id}/applications`).send({ userId: AYSE }),
      request(app).post(`/api/jobs/${job.id}/applications`).send({ userId: AYSE }),
    ]);
    assert.deepEqual(results.map((res) => res.status).sort(), [201, 409]);
  });

  it('validates input: missing userId 400, unknown user or job 404, bad status 400', async () => {
    await request(app).post(`/api/jobs/${job.id}/applications`).send({}).expect(400);
    await request(app).post(`/api/jobs/${job.id}/applications`).send({ userId: MISSING_ID }).expect(404);
    await request(app).post(`/api/jobs/${MISSING_ID}/applications`).send({ userId: AYSE }).expect(404);
    await request(app)
      .post(`/api/jobs/${job.id}/applications`)
      .send({ userId: AYSE, status: 'hired' })
      .expect(400);
  });
});

describe('listing applications', () => {
  beforeEach(async () => {
    await request(app)
      .post(`/api/jobs/${job.id}/applications`)
      .send({ userId: AYSE, coverLetter: 'I teach distributed systems.' })
      .expect(201);
  });

  it('GET /api/jobs/:id/applications lists the applications of the job', async () => {
    const res = await request(app).get(`/api/jobs/${job.id}/applications`).expect(200);
    assert.equal(res.body.count, 1);
    assert.equal(res.body.data[0].coverLetter, 'I teach distributed systems.');
  });

  it('GET /api/users/:id/applications lists the applications of the user', async () => {
    const res = await request(app).get(`/api/users/${AYSE}/applications`).expect(200);
    assert.ok(res.body.data.some((application) => application.jobPostingId === job.id));
    await request(app).get(`/api/users/${MISSING_ID}/applications`).expect(404);
  });

  it('GET /api/applications lists all and filters by status', async () => {
    const all = await request(app).get('/api/applications').expect(200);
    assert.ok(all.body.count >= 1);
    const applied = await request(app).get('/api/applications?status=applied').expect(200);
    assert.ok(applied.body.data.every((application) => application.status === 'applied'));
    await request(app).get('/api/applications?status=hired').expect(400);
  });
});

describe('/api/applications', () => {
  it('POST accepts the job in the body and applies the same 409 rule', async () => {
    const body = { userId: AYSE, jobPostingId: job.id };
    await request(app).post('/api/applications').send(body).expect(201);
    const res = await request(app).post('/api/applications').send(body).expect(409);
    assert.equal(res.body.error, 'Conflict');
  });

  it('PATCH changes the status, DELETE withdraws the application', async () => {
    const created = await request(app).post('/api/applications').send({ userId: AYSE, jobId: job.id }).expect(201);
    const id = created.body.data.id;

    const patched = await request(app).patch(`/api/applications/${id}`).send({ status: 'interview' }).expect(200);
    assert.equal(patched.body.data.status, 'interview');
    await request(app).patch(`/api/applications/${id}`).send({ status: 'maybe' }).expect(400);

    await request(app).delete(`/api/applications/${id}`).expect(200);
    await request(app).get(`/api/applications/${id}`).expect(404);
  });
});

describe('cascading deletes', () => {
  it('deleting a job deletes its applications', async () => {
    const created = await request(app).post(`/api/jobs/${job.id}/applications`).send({ userId: AYSE }).expect(201);
    await request(app).delete(`/api/jobs/${job.id}`).expect(200);
    await request(app).get(`/api/applications/${created.body.data.id}`).expect(404);
  });

  it('deleting a user deletes their applications', async () => {
    const temp = await userModel.create({ name: 'Temp Candidate', email: 'temp.candidate@example.edu', role: 'student' });
    const created = await request(app).post(`/api/jobs/${job.id}/applications`).send({ userId: temp.id }).expect(201);
    await request(app).delete(`/api/users/${temp.id}`).expect(200);
    await request(app).get(`/api/applications/${created.body.data.id}`).expect(404);
    await request(app).get(`/api/jobs/${job.id}`).expect(200);
  });
});

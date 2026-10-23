const { describe, it, before, beforeEach, after } = require('node:test');
const { prepareDatabase, resetDatabase, closeDatabase } = require('./helpers/database');
const assert = require('node:assert/strict');
const request = require('supertest');
const createApp = require('../src/app');
const { applicationModel } = require('../src/models/application.model');

const app = createApp();
const AYSE = '6f1c2a8e-3b7d-4c51-9a2e-0d4f8b6c1e03';
const JOB_ID = '9d4e2b71-0c6a-4f3e-8a15-6b2c7d9e1f01';
const SEEDED_APPLICATION = '5a7f3c22-8e1b-4d09-9c6e-2f4b8a1d3e01';

before(prepareDatabase);
beforeEach(resetDatabase);
after(closeDatabase);

describe('GET /applications (view)', () => {
  it('renders the tracking table with candidate and job names', async () => {
    const res = await request(app).get('/applications').expect(200);
    assert.match(res.text, /id="applications-table"/);
    assert.match(res.text, /Mert Kaya/);
    assert.match(res.text, /Junior Backend Developer/);
    assert.match(res.text, /id="status-dialog"/);
  });
});

describe('application form fallbacks', () => {
  it('POST /applications creates an application', async () => {
    const res = await request(app)
      .post('/applications')
      .type('form')
      .send({ jobPostingId: JOB_ID, userId: AYSE, status: 'applied', coverLetter: '' })
      .expect(303);
    assert.equal(res.headers.location, '/applications?status=applied');
    assert.ok(await applicationModel.findByPair(AYSE, JOB_ID));
  });

  it('a duplicate redirects with the "already applied" error', async () => {
    const form = { jobPostingId: JOB_ID, userId: AYSE };
    await request(app).post('/applications').type('form').send(form).expect(303);
    const res = await request(app).post('/applications').type('form').send(form).expect(303);
    assert.match(res.headers.location, /error=/);
    assert.match(decodeURIComponent(res.headers.location.replace(/\+/g, ' ')), /already applied/);
  });

  it('POST /applications/:id/status changes the status', async () => {
    const res = await request(app)
      .post(`/applications/${SEEDED_APPLICATION}/status`)
      .type('form')
      .send({ status: 'accepted' })
      .expect(303);
    assert.equal(res.headers.location, '/applications?status=updated');
    assert.equal((await applicationModel.findById(SEEDED_APPLICATION)).status, 'accepted');
  });

  it('POST /applications/:id/delete withdraws the application', async () => {
    await request(app).post(`/applications/${SEEDED_APPLICATION}/delete`).expect(303);
    assert.equal(await applicationModel.findById(SEEDED_APPLICATION), null);
  });
});

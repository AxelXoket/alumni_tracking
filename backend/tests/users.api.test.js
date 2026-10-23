const { describe, it, before, beforeEach, after } = require('node:test');
const { prepareDatabase, resetDatabase, closeDatabase } = require('./helpers/database');
const assert = require('node:assert/strict');
const request = require('supertest');
const createApp = require('../src/app');

const app = createApp();
const SEEDED_ID = '6f1c2a8e-3b7d-4c51-9a2e-0d4f8b6c1e01';
const MISSING_ID = '00000000-0000-4000-8000-000000000000';

const newUser = (overrides = {}) => ({
  name: 'Zeynep Arslan',
  email: 'zeynep.arslan@alumni.example.edu',
  role: 'alumni',
  department: 'Industrial Engineering',
  graduationYear: 2021,
  ...overrides,
});

before(prepareDatabase);
beforeEach(resetDatabase);
after(closeDatabase);

describe('GET /api/users', () => {
  it('lists the seeded users with a count', async () => {
    const res = await request(app).get('/api/users').expect(200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.count, 4);
    assert.equal(res.body.data.length, 4);
  });

  it('filters by role', async () => {
    const res = await request(app).get('/api/users?role=student').expect(200);
    assert.ok(res.body.data.length > 0);
    assert.ok(res.body.data.every((user) => user.role === 'student'));
  });

  it('searches by name or email', async () => {
    const res = await request(app).get('/api/users?search=elif').expect(200);
    assert.equal(res.body.count, 1);
    assert.equal(res.body.data[0].id, SEEDED_ID);
  });

  it('rejects an unknown role filter', async () => {
    await request(app).get('/api/users?role=wizard').expect(400);
  });
});

describe('GET /api/users/:id', () => {
  it('returns a single user', async () => {
    const res = await request(app).get(`/api/users/${SEEDED_ID}`).expect(200);
    assert.equal(res.body.data.email, 'elif.yilmaz@alumni.example.edu');
  });

  it('returns 404 for an unknown id', async () => {
    const res = await request(app).get(`/api/users/${MISSING_ID}`).expect(404);
    assert.equal(res.body.success, false);
  });
});

describe('POST /api/users', () => {
  it('creates a user and returns 201', async () => {
    const res = await request(app).post('/api/users').send(newUser()).expect(201);
    assert.match(res.body.data.id, /^[0-9a-f-]{36}$/);
    assert.equal(res.body.data.name, 'Zeynep Arslan');
    assert.ok(res.body.data.createdAt);

    const list = await request(app).get('/api/users').expect(200);
    assert.equal(list.body.count, 5);
  });

  it('trims strings, lower-cases the email and defaults the role', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ name: '  Deniz Ak ', email: 'Deniz.AK@Example.EDU' })
      .expect(201);
    assert.equal(res.body.data.name, 'Deniz Ak');
    assert.equal(res.body.data.email, 'deniz.ak@example.edu');
    assert.equal(res.body.data.role, 'alumni');
  });

  it('returns 400 with field details when required fields are missing', async () => {
    const res = await request(app).post('/api/users').send({}).expect(400);
    const fields = res.body.error.details.map((detail) => detail.field);
    assert.deepEqual(fields.sort(), ['email', 'name']);
  });

  it('returns 400 for an invalid email, role or graduation year', async () => {
    await request(app).post('/api/users').send(newUser({ email: 'not-an-email' })).expect(400);
    await request(app).post('/api/users').send(newUser({ role: 'wizard' })).expect(400);
    await request(app).post('/api/users').send(newUser({ graduationYear: 1800 })).expect(400);
  });

  it('returns 400 for malformed JSON', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Content-Type', 'application/json')
      .send('{"name": ')
      .expect(400);
    assert.match(res.body.error.message, /JSON/);
  });

  it('returns 409 when the email is already taken (case-insensitive)', async () => {
    await request(app)
      .post('/api/users')
      .send(newUser({ email: 'ELIF.YILMAZ@alumni.example.edu' }))
      .expect(409);
  });
});

describe('PUT /api/users/:id', () => {
  it('replaces the user', async () => {
    const res = await request(app)
      .put(`/api/users/${SEEDED_ID}`)
      .send(newUser({ email: 'elif.new@alumni.example.edu' }))
      .expect(200);
    assert.equal(res.body.data.id, SEEDED_ID);
    assert.equal(res.body.data.name, 'Zeynep Arslan');
    assert.equal(res.body.data.email, 'elif.new@alumni.example.edu');
  });

  it('requires all mandatory fields', async () => {
    await request(app).put(`/api/users/${SEEDED_ID}`).send({ name: 'Only Name' }).expect(400);
  });

  it('returns 404 for an unknown id', async () => {
    await request(app).put(`/api/users/${MISSING_ID}`).send(newUser()).expect(404);
  });
});

describe('PATCH /api/users/:id', () => {
  it('updates only the given fields', async () => {
    const res = await request(app).patch(`/api/users/${SEEDED_ID}`).send({ role: 'faculty' }).expect(200);
    assert.equal(res.body.data.role, 'faculty');
    assert.equal(res.body.data.name, 'Elif Yılmaz');
  });

  it('returns 400 when nothing updatable is sent', async () => {
    await request(app).patch(`/api/users/${SEEDED_ID}`).send({ unknown: true }).expect(400);
  });

  it('returns 409 when switching to an email that is in use', async () => {
    await request(app)
      .patch(`/api/users/${SEEDED_ID}`)
      .send({ email: 'mert.kaya@student.example.edu' })
      .expect(409);
  });
});

describe('DELETE /api/users/:id', () => {
  it('deletes the user', async () => {
    const res = await request(app).delete(`/api/users/${SEEDED_ID}`).expect(200);
    assert.deepEqual(res.body.data, { id: SEEDED_ID, deleted: true });
    await request(app).get(`/api/users/${SEEDED_ID}`).expect(404);
  });

  it('returns 404 for an unknown id', async () => {
    await request(app).delete(`/api/users/${MISSING_ID}`).expect(404);
  });
});

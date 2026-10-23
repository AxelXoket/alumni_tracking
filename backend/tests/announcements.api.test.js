const { describe, it, before, beforeEach, after } = require('node:test');
const { prepareDatabase, resetDatabase, closeDatabase } = require('./helpers/database');
const assert = require('node:assert/strict');
const request = require('supertest');
const createApp = require('../src/app');

const app = createApp();
const SEEDED_ID = '3c9b7e10-5a2f-4d8e-b1c4-7e2a9f0d5b01';
const MISSING_ID = '00000000-0000-4000-8000-000000000000';

const payload = (overrides = {}) => ({
  title: 'Career fair on 12 March',
  content: 'More than forty companies will meet graduates in the main hall.',
  category: 'career',
  priority: 'high',
  author: 'Career Center',
  ...overrides,
});

before(prepareDatabase);
beforeEach(resetDatabase);
after(closeDatabase);

describe('GET /api/announcements', () => {
  it('lists announcements, newest first', async () => {
    const res = await request(app).get('/api/announcements').expect(200);
    assert.equal(res.body.length, 4);
    const dates = res.body.map((item) => item.createdAt);
    assert.deepEqual(dates, [...dates].sort().reverse());
  });

  it('filters by category and priority', async () => {
    const byCategory = await request(app).get('/api/announcements?category=career').expect(200);
    assert.ok(byCategory.body.every((item) => item.category === 'career'));

    const byPriority = await request(app).get('/api/announcements?priority=high').expect(200);
    assert.ok(byPriority.body.length > 0);
    assert.ok(byPriority.body.every((item) => item.priority === 'high'));
  });

  it('searches title, content and author', async () => {
    const res = await request(app).get('/api/announcements?search=library').expect(200);
    assert.equal(res.body.length, 1);
  });

  it('rejects unknown filter values', async () => {
    await request(app).get('/api/announcements?category=sports').expect(400);
    await request(app).get('/api/announcements?priority=urgent').expect(400);
  });
});

describe('GET /api/announcements/:id', () => {
  it('returns one announcement', async () => {
    const res = await request(app).get(`/api/announcements/${SEEDED_ID}`).expect(200);
    assert.equal(res.body.title, 'Spring Graduate Reunion 2026');
  });

  it('returns 404 for an unknown id', async () => {
    await request(app).get(`/api/announcements/${MISSING_ID}`).expect(404);
  });
});

describe('POST /api/announcements', () => {
  it('creates an announcement', async () => {
    const res = await request(app).post('/api/announcements').send(payload()).expect(201);
    assert.ok(res.body.id);
    assert.equal(res.body.priority, 'high');
    const list = await request(app).get('/api/announcements').expect(200);
    assert.equal(list.body[0].id, res.body.id);
  });

  it('defaults the priority to normal', async () => {
    const res = await request(app).post('/api/announcements').send(payload({ priority: undefined })).expect(201);
    assert.equal(res.body.priority, 'normal');
  });

  it('accepts enum values in any case', async () => {
    const res = await request(app)
      .post('/api/announcements')
      .send(payload({ category: 'EVENT', priority: 'Low' }))
      .expect(201);
    assert.equal(res.body.category, 'event');
    assert.equal(res.body.priority, 'low');
  });

  it('returns 400 with details for invalid input', async () => {
    const res = await request(app)
      .post('/api/announcements')
      .send({ title: 'Hi', content: 'short', category: 'sports', priority: 'urgent' })
      .expect(400);
    const fields = res.body.details.map((detail) => detail.field).sort();
    assert.deepEqual(fields, ['author', 'category', 'content', 'priority', 'title']);
  });
});

describe('PUT / PATCH /api/announcements/:id', () => {
  it('PUT replaces the announcement', async () => {
    const res = await request(app)
      .put(`/api/announcements/${SEEDED_ID}`)
      .send(payload({ title: 'Reunion moved to June' }))
      .expect(200);
    assert.equal(res.body.title, 'Reunion moved to June');
    assert.equal(res.body.category, 'career');
  });

  it('PUT requires every mandatory field', async () => {
    await request(app).put(`/api/announcements/${SEEDED_ID}`).send({ title: 'Only a title' }).expect(400);
  });

  it('PATCH updates selected fields only', async () => {
    const res = await request(app).patch(`/api/announcements/${SEEDED_ID}`).send({ priority: 'low' }).expect(200);
    assert.equal(res.body.priority, 'low');
    assert.equal(res.body.title, 'Spring Graduate Reunion 2026');
  });

  it('returns 404 for unknown ids', async () => {
    await request(app).put(`/api/announcements/${MISSING_ID}`).send(payload()).expect(404);
    await request(app).patch(`/api/announcements/${MISSING_ID}`).send({ priority: 'low' }).expect(404);
  });
});

describe('DELETE /api/announcements/:id', () => {
  it('deletes the announcement', async () => {
    await request(app).delete(`/api/announcements/${SEEDED_ID}`).expect(200);
    await request(app).get(`/api/announcements/${SEEDED_ID}`).expect(404);
  });

  it('returns 404 for an unknown id', async () => {
    await request(app).delete(`/api/announcements/${MISSING_ID}`).expect(404);
  });
});

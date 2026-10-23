const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const createApp = require('../src/app');
const { AnnouncementModel, announcementModel } = require('../src/models/announcement.model');

const app = createApp();
const SEEDED_ID = '3c9b7e10-5a2f-4d8e-b1c4-7e2a9f0d5b01';

beforeEach(() => announcementModel.reset());

describe('AnnouncementModel (in memory)', () => {
  it('loads the sample announcements and counts them per category', async () => {
    const model = new AnnouncementModel();
    assert.equal(await model.count(), 4);
    assert.deepEqual(await model.countByCategory(), { general: 1, academic: 1, career: 1, event: 1 });
  });

  it('creates, updates and deletes records without leaking references', async () => {
    const model = new AnnouncementModel();
    const created = await model.create({ title: 'T', content: 'C', category: 'general', author: 'A' });
    assert.equal(created.priority, 'normal');
    created.title = 'mutated';
    assert.equal((await model.findById(created.id)).title, 'T');

    const updated = await model.update(created.id, { priority: 'high', createdAt: 'nope' });
    assert.equal(updated.priority, 'high');
    assert.equal(updated.createdAt, created.createdAt);

    assert.equal(await model.delete(created.id), true);
    assert.equal(await model.findById(created.id), null);
  });
});

describe('GET /announcements (view)', () => {
  it('renders the board with the sample announcements', async () => {
    const res = await request(app).get('/announcements').expect(200);
    assert.match(res.text, /id="announcement-list"/);
    assert.match(res.text, /Spring Graduate Reunion 2026/);
    assert.match(res.text, /Academic &amp; general/);
  });

  it('renders the detail page', async () => {
    const res = await request(app).get(`/announcements/${SEEDED_ID}`).expect(200);
    assert.match(res.text, /Alumni Relations Office/);
  });

  it('returns 404 for an unknown announcement', async () => {
    await request(app).get('/announcements/unknown').set('Accept', 'text/html').expect(404);
  });
});

describe('announcement form fallbacks', () => {
  it('POST /announcements creates and redirects', async () => {
    const res = await request(app)
      .post('/announcements')
      .type('form')
      .send({ title: 'Form notice', content: 'Posted through a plain HTML form.', category: 'general', priority: 'low', author: 'Tester' })
      .expect(303);
    assert.equal(res.headers.location, '/announcements?status=created');
    const all = await announcementModel.findAll({ search: 'form notice' });
    assert.equal(all.length, 1);
  });

  it('POST /announcements with invalid data redirects with an error', async () => {
    const res = await request(app).post('/announcements').type('form').send({ title: 'x' }).expect(303);
    assert.match(res.headers.location, /\?error=/);
  });

  it('POST /announcements/:id/edit replaces the announcement', async () => {
    await request(app)
      .post(`/announcements/${SEEDED_ID}/edit`)
      .type('form')
      .send({ title: 'Edited reunion', content: 'The reunion moves to the new hall.', category: 'event', priority: 'normal', author: 'Alumni Office' })
      .expect(303);
    assert.equal((await announcementModel.findById(SEEDED_ID)).title, 'Edited reunion');
  });

  it('POST /announcements/:id/delete removes it', async () => {
    const res = await request(app).post(`/announcements/${SEEDED_ID}/delete`).expect(303);
    assert.equal(res.headers.location, '/announcements?status=deleted');
    assert.equal(await announcementModel.findById(SEEDED_ID), null);
  });
});

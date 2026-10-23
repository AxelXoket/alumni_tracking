const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const createApp = require('../src/app');
const { userModel } = require('../src/models/user.model');

const app = createApp();
const SEEDED_ID = '6f1c2a8e-3b7d-4c51-9a2e-0d4f8b6c1e01';

beforeEach(() => userModel.reset());

describe('GET /users (view)', () => {
  it('renders the users table with the sample users', async () => {
    const res = await request(app).get('/users').expect(200);
    assert.match(res.headers['content-type'], /text\/html/);
    assert.match(res.text, /id="users-table"/);
    assert.match(res.text, /Elif Yılmaz/);
    assert.match(res.text, /Total users/);
  });

  it('shows a flash message after a redirect', async () => {
    const res = await request(app).get('/users?status=created').expect(200);
    assert.match(res.text, /Saved successfully/);
  });

  it('escapes user supplied text', async () => {
    await userModel.create({ name: '<script>alert(1)</script>', email: 'xss@example.edu', role: 'alumni' });
    const res = await request(app).get('/users').expect(200);
    assert.doesNotMatch(res.text, /<script>alert\(1\)<\/script>/);
  });
});

describe('GET /users/:id (view)', () => {
  it('renders the detail page', async () => {
    const res = await request(app).get(`/users/${SEEDED_ID}`).expect(200);
    assert.match(res.text, /elif\.yilmaz@alumni\.example\.edu/);
  });

  it('renders a 404 page for an unknown user', async () => {
    const res = await request(app).get('/users/unknown').set('Accept', 'text/html').expect(404);
    assert.match(res.text, /Page not found|not found/i);
  });
});

describe('form fallbacks', () => {
  it('POST /users creates a user and redirects with status=created', async () => {
    const res = await request(app)
      .post('/users')
      .type('form')
      .send({ name: 'Form User', email: 'form.user@example.edu', role: 'student', graduationYear: '', department: '' })
      .expect(303);
    assert.equal(res.headers.location, '/users?status=created');
    assert.ok(await userModel.findByEmail('form.user@example.edu'));
  });

  it('POST /users with invalid data redirects with an error message', async () => {
    const res = await request(app).post('/users').type('form').send({ name: 'X', email: 'bad' }).expect(303);
    assert.match(res.headers.location, /^\/users\?error=/);
  });

  it('POST /users/:id/edit replaces the user', async () => {
    const res = await request(app)
      .post(`/users/${SEEDED_ID}/edit`)
      .type('form')
      .send({ name: 'Elif Yılmaz Ak', email: 'elif.yilmaz@alumni.example.edu', role: 'alumni' })
      .expect(303);
    assert.equal(res.headers.location, '/users?status=updated');
    assert.equal((await userModel.findById(SEEDED_ID)).name, 'Elif Yılmaz Ak');
  });

  it('POST /users/:id/delete removes the user', async () => {
    const res = await request(app).post(`/users/${SEEDED_ID}/delete`).expect(303);
    assert.equal(res.headers.location, '/users?status=deleted');
    assert.equal(await userModel.findById(SEEDED_ID), null);
  });

  it('POST /users/:id/delete for an unknown id redirects with an error', async () => {
    const res = await request(app).post('/users/unknown/delete').expect(303);
    assert.match(res.headers.location, /error=/);
  });
});

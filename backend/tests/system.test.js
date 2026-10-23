const { describe, it, before, after } = require('node:test');
const { prepareDatabase, closeDatabase } = require('./helpers/database');
const assert = require('node:assert/strict');
const request = require('supertest');
const createApp = require('../src/app');

const app = createApp();

before(prepareDatabase);
after(closeDatabase);

describe('health check', () => {
  for (const path of ['/health', '/api/health']) {
    it(`GET ${path} reports the service as healthy`, async () => {
      const res = await request(app).get(path).expect(200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.status, 'ok');
      assert.equal(res.body.data.database.connected, true);
      assert.equal(typeof res.body.data.uptime.seconds, 'number');
      assert.ok(!Number.isNaN(Date.parse(res.body.data.timestamp)));
    });
  }
});

describe('GET /hello/:name', () => {
  it('greets the given name', async () => {
    const res = await request(app).get('/hello/Zeynep').expect(200);
    assert.equal(res.body.data.name, 'Zeynep');
    assert.match(res.body.data.message, /Hello, Zeynep!/);
  });

  it('decodes URL encoded names', async () => {
    const res = await request(app).get('/hello/Ali%20Veli').expect(200);
    assert.equal(res.body.data.name, 'Ali Veli');
  });

  it('rejects names longer than 50 characters', async () => {
    const res = await request(app).get(`/hello/${'a'.repeat(51)}`).expect(400);
    assert.equal(res.body.success, false);
  });
});

describe('GET /sum/:number1/:number2', () => {
  const cases = [
    ['15', '27', 42],
    ['-5', '3', -2],
    ['2.5', '0.5', 3],
    ['0.1', '0.2', 0.3],
  ];
  for (const [a, b, expected] of cases) {
    it(`${a} + ${b} = ${expected}`, async () => {
      const res = await request(app).get(`/sum/${a}/${b}`).expect(200);
      assert.equal(res.body.data.result, expected);
      assert.equal(res.body.data.operation, 'sum');
    });
  }

  it('returns 400 when an operand is not a number', async () => {
    const res = await request(app).get('/sum/abc/4').set('Accept', 'text/html').expect(400);
    assert.equal(res.body.success, false);
    assert.match(res.body.error.message, /number1/);
  });

  it('returns 400 for values such as 1e5 or Infinity', async () => {
    await request(app).get('/sum/1e5/1').expect(400);
    await request(app).get('/sum/Infinity/1').expect(400);
  });
});

describe('pages', () => {
  it('redirects / to /home', async () => {
    const res = await request(app).get('/').expect(302);
    assert.equal(res.headers.location, '/home');
  });

  for (const path of ['/home', '/about']) {
    it(`GET ${path} renders an HTML page`, async () => {
      const res = await request(app).get(path).expect(200);
      assert.match(res.headers['content-type'], /text\/html/);
      assert.match(res.text, /<nav/);
    });
  }

  it('serves the stylesheet', async () => {
    const res = await request(app).get('/css/main.css').expect(200);
    assert.match(res.headers['content-type'], /text\/css/);
  });
});

describe('API documentation', () => {
  it('serves the OpenAPI document', async () => {
    const res = await request(app).get('/api/openapi.json').expect(200);
    assert.equal(res.body.openapi, '3.0.3');
    assert.ok(res.body.paths['/api/users']);
    assert.ok(res.body.paths['/api/users/{id}']);
    assert.ok(res.body.paths['/api/announcements']);
    assert.ok(res.body.paths['/api/announcements/{id}']);
  });

  it('serves Swagger UI', async () => {
    const res = await request(app).get('/api/docs/').expect(200);
    assert.match(res.text, /swagger-ui/i);
  });
});

describe('unknown routes', () => {
  it('returns a JSON 404 under /api', async () => {
    const res = await request(app).get('/api/does-not-exist').expect(404);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.status, 404);
  });

  it('returns an HTML 404 page for browsers', async () => {
    const res = await request(app).get('/does-not-exist').set('Accept', 'text/html').expect(404);
    assert.match(res.text, /Page not found/);
  });
});

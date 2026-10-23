const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { UserModel } = require('../src/models/user.model');

describe('UserModel (in memory)', () => {
  let model;

  beforeEach(() => {
    model = new UserModel();
  });

  it('starts with the four sample users', async () => {
    assert.equal(await model.count(), 4);
    assert.equal((await model.findAll()).length, 4);
  });

  it('filters by role and search term', async () => {
    const students = await model.findAll({ role: 'student' });
    assert.ok(students.every((user) => user.role === 'student'));
    const found = await model.findAll({ search: 'YILMAZ' });
    assert.equal(found.length, 1);
  });

  it('finds by id and returns null for unknown ids', async () => {
    const [first] = await model.findAll();
    assert.equal((await model.findById(first.id)).email, first.email);
    assert.equal(await model.findById('missing'), null);
  });

  it('finds by email case-insensitively', async () => {
    const user = await model.findByEmail('ELIF.YILMAZ@alumni.example.edu');
    assert.equal(user.name, 'Elif Yılmaz');
  });

  it('creates users with id and timestamps', async () => {
    const user = await model.create({ name: 'Test User', email: 'test@example.edu', role: 'student' });
    assert.ok(user.id);
    assert.equal(user.createdAt, user.updatedAt);
    assert.equal(user.department, null);
    assert.equal(await model.count(), 5);
  });

  it('updates only the given fields and ignores unknown keys', async () => {
    const [first] = await model.findAll();
    const updated = await model.update(first.id, { role: 'admin', id: 'hacked', isRoot: true });
    assert.equal(updated.id, first.id);
    assert.equal(updated.role, 'admin');
    assert.equal(updated.name, first.name);
    assert.equal('isRoot' in updated, false);
    assert.equal(await model.update('missing', { role: 'admin' }), null);
  });

  it('deletes users', async () => {
    const [first] = await model.findAll();
    assert.equal(await model.delete(first.id), true);
    assert.equal(await model.delete(first.id), false);
    assert.equal(await model.count(), 3);
  });

  it('never exposes its internal records', async () => {
    const [first] = await model.findAll();
    first.name = 'Changed outside';
    assert.notEqual((await model.findById(first.id)).name, 'Changed outside');
  });

  it('counts users per role', async () => {
    assert.deepEqual(await model.countByRole(), { alumni: 1, student: 1, faculty: 1, admin: 1 });
  });

  it('reset restores the sample data', async () => {
    await model.create({ name: 'Temp', email: 'temp@example.edu', role: 'alumni' });
    await model.reset();
    assert.equal(await model.count(), 4);
  });
});

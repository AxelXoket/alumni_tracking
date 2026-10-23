const { describe, it, before, beforeEach, after } = require('node:test');
const { prepareDatabase, resetDatabase, closeDatabase } = require('./helpers/database');
const assert = require('node:assert/strict');
const { userModel } = require('../src/models/user.model');

const SEEDED_ID = '6f1c2a8e-3b7d-4c51-9a2e-0d4f8b6c1e01';

before(prepareDatabase);
beforeEach(resetDatabase);
after(closeDatabase);

describe('UserModel (PostgreSQL)', () => {
  it('reads the four seeded users', async () => {
    assert.equal(await userModel.count(), 4);
    assert.equal((await userModel.findAll()).length, 4);
  });

  it('filters by role and search term', async () => {
    const students = await userModel.findAll({ role: 'student' });
    assert.ok(students.length > 0);
    assert.ok(students.every((user) => user.role === 'student'));
    assert.equal((await userModel.findAll({ search: 'YILMAZ' })).length, 1);
  });

  it('treats % and _ in search terms literally', async () => {
    assert.equal((await userModel.findAll({ search: '%' })).length, 0);
  });

  it('finds by id and returns null for unknown or malformed ids', async () => {
    assert.equal((await userModel.findById(SEEDED_ID)).name, 'Elif Yılmaz');
    assert.equal(await userModel.findById('00000000-0000-4000-8000-000000000000'), null);
    assert.equal(await userModel.findById('not-a-uuid'), null);
  });

  it('finds by email case-insensitively', async () => {
    const user = await userModel.findByEmail('ELIF.YILMAZ@alumni.example.edu');
    assert.equal(user.id, SEEDED_ID);
  });

  it('maps rows to camelCase objects with ISO timestamps', async () => {
    const user = await userModel.findById(SEEDED_ID);
    assert.deepEqual(Object.keys(user).sort(), [
      'createdAt', 'department', 'email', 'graduationYear', 'id', 'name', 'role', 'updatedAt',
    ]);
    assert.equal(user.graduationYear, 2019);
    assert.equal(user.createdAt, '2025-09-01T09:00:00.000Z');
  });

  it('creates users with a generated id and default role', async () => {
    const user = await userModel.create({ name: 'Test User', email: 'test@example.edu' });
    assert.match(user.id, /^[0-9a-f-]{36}$/);
    assert.equal(user.role, 'alumni');
    assert.equal(await userModel.count(), 5);
  });

  it('updates the given fields and refreshes updated_at through the trigger', async () => {
    const before = await userModel.findById(SEEDED_ID);
    const updated = await userModel.update(SEEDED_ID, { role: 'faculty' });
    assert.equal(updated.role, 'faculty');
    assert.equal(updated.name, before.name);
    assert.ok(updated.updatedAt > before.updatedAt);
    assert.equal(await userModel.update('not-a-uuid', { role: 'admin' }), null);
  });

  it('deletes users', async () => {
    assert.equal(await userModel.delete(SEEDED_ID), true);
    assert.equal(await userModel.delete(SEEDED_ID), false);
    assert.equal(await userModel.count(), 3);
  });

  it('counts users per role', async () => {
    assert.deepEqual(await userModel.countByRole(), { alumni: 1, student: 1, faculty: 1, admin: 1 });
  });

  it('enforces the unique email index in the database', async () => {
    await assert.rejects(
      userModel.create({ name: 'Copy', email: 'Elif.Yilmaz@alumni.example.edu' }),
      (err) => err.code === '23505',
    );
  });
});

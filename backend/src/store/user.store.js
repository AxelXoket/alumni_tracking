const { randomUUID } = require('crypto');

/**
 * In-memory user storage. The week 3 brief asks for user CRUD without a
 * database, so records live in a Map for the lifetime of the process.
 * Every read returns a copy so callers can never mutate stored records.
 */

const SEED_USERS = [
  {
    id: '6f1c2a8e-3b7d-4c51-9a2e-0d4f8b6c1e01',
    name: 'Elif Yılmaz',
    email: 'elif.yilmaz@alumni.example.edu',
    role: 'alumni',
    department: 'Computer Engineering',
    graduationYear: 2019,
    createdAt: '2025-09-01T09:00:00.000Z',
    updatedAt: '2025-09-01T09:00:00.000Z',
  },
  {
    id: '6f1c2a8e-3b7d-4c51-9a2e-0d4f8b6c1e02',
    name: 'Mert Kaya',
    email: 'mert.kaya@student.example.edu',
    role: 'student',
    department: 'Software Engineering',
    graduationYear: 2027,
    createdAt: '2025-09-02T10:30:00.000Z',
    updatedAt: '2025-09-02T10:30:00.000Z',
  },
  {
    id: '6f1c2a8e-3b7d-4c51-9a2e-0d4f8b6c1e03',
    name: 'Ayşe Demir',
    email: 'ayse.demir@example.edu',
    role: 'faculty',
    department: 'Computer Engineering',
    graduationYear: null,
    createdAt: '2025-09-03T08:15:00.000Z',
    updatedAt: '2025-09-03T08:15:00.000Z',
  },
  {
    id: '6f1c2a8e-3b7d-4c51-9a2e-0d4f8b6c1e04',
    name: 'Can Öztürk',
    email: 'can.ozturk@example.edu',
    role: 'admin',
    department: 'Alumni Relations Office',
    graduationYear: null,
    createdAt: '2025-09-04T12:00:00.000Z',
    updatedAt: '2025-09-04T12:00:00.000Z',
  },
];

const users = new Map();

const copy = (user) => (user ? { ...user } : null);

function reset() {
  users.clear();
  SEED_USERS.forEach((user) => users.set(user.id, { ...user }));
}

function all() {
  return [...users.values()].map(copy);
}

function findById(id) {
  return copy(users.get(id));
}

function findByEmail(email) {
  const target = String(email).toLowerCase();
  return copy([...users.values()].find((user) => user.email === target));
}

function insert(data) {
  const now = new Date().toISOString();
  const user = { id: randomUUID(), ...data, createdAt: now, updatedAt: now };
  users.set(user.id, user);
  return copy(user);
}

function update(id, changes) {
  const current = users.get(id);
  if (!current) return null;
  const updated = { ...current, ...changes, id, updatedAt: new Date().toISOString() };
  users.set(id, updated);
  return copy(updated);
}

function remove(id) {
  return users.delete(id);
}

reset();

module.exports = { all, findById, findByEmail, insert, update, remove, reset };

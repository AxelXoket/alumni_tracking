const { randomUUID } = require('crypto');

/**
 * User model (the "M" in MVC).
 *
 * Holds user records in memory, as the course brief still asks for no database
 * connection. All methods are async on purpose: controllers and services
 * already await them, so moving the data to PostgreSQL later only changes this
 * file. Every method returns copies, so callers can never mutate stored data.
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

const FIELDS = ['name', 'email', 'role', 'department', 'graduationYear'];

function pick(data) {
  return Object.fromEntries(FIELDS.filter((key) => key in data).map((key) => [key, data[key]]));
}

class UserModel {
  constructor(seed = SEED_USERS) {
    this.seed = seed;
    this.records = new Map();
    this.loadSeed();
  }

  loadSeed() {
    this.records.clear();
    this.seed.forEach((user) => this.records.set(user.id, { ...user }));
  }

  async findAll({ role, search } = {}) {
    const term = search ? String(search).trim().toLowerCase() : '';
    return [...this.records.values()]
      .filter((user) => !role || user.role === role)
      .filter((user) => !term || user.name.toLowerCase().includes(term) || user.email.includes(term))
      .sort((a, b) => a.name.localeCompare(b.name, 'tr'))
      .map((user) => ({ ...user }));
  }

  async findById(id) {
    const user = this.records.get(id);
    return user ? { ...user } : null;
  }

  async findByEmail(email) {
    const target = String(email).toLowerCase();
    const user = [...this.records.values()].find((record) => record.email === target);
    return user ? { ...user } : null;
  }

  async create(data) {
    const now = new Date().toISOString();
    const user = {
      id: randomUUID(),
      department: null,
      graduationYear: null,
      ...pick(data),
      createdAt: now,
      updatedAt: now,
    };
    this.records.set(user.id, user);
    return { ...user };
  }

  async update(id, changes) {
    const current = this.records.get(id);
    if (!current) return null;
    const updated = { ...current, ...pick(changes), updatedAt: new Date().toISOString() };
    this.records.set(id, updated);
    return { ...updated };
  }

  async delete(id) {
    return this.records.delete(id);
  }

  async count() {
    return this.records.size;
  }

  async countByRole() {
    const counts = { alumni: 0, student: 0, faculty: 0, admin: 0 };
    this.records.forEach((user) => {
      counts[user.role] = (counts[user.role] || 0) + 1;
    });
    return counts;
  }

  /** Restores the sample data; used by the tests. */
  async reset() {
    this.loadSeed();
  }
}

const userModel = new UserModel();

module.exports = { UserModel, userModel };

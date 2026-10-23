const { randomUUID } = require('crypto');

/**
 * Announcement model. Same approach as UserModel: in-memory records behind an
 * async interface, copies returned on every read.
 */

const CATEGORIES = ['general', 'academic', 'career', 'event'];
const PRIORITIES = ['low', 'normal', 'high'];

const SEED_ANNOUNCEMENTS = [
  {
    id: '3c9b7e10-5a2f-4d8e-b1c4-7e2a9f0d5b01',
    title: 'Spring Graduate Reunion 2026',
    content:
      'All graduates are invited to the spring reunion on campus. The day starts with a short welcome talk by the head of department, continues with lab tours and ends with dinner in the main hall.',
    category: 'event',
    priority: 'high',
    author: 'Alumni Relations Office',
    createdAt: '2025-10-01T09:00:00.000Z',
    updatedAt: '2025-10-01T09:00:00.000Z',
  },
  {
    id: '3c9b7e10-5a2f-4d8e-b1c4-7e2a9f0d5b02',
    title: 'Mentoring program applications are open',
    content:
      'Alumni who want to mentor final-year students can apply until the end of the month. Mentors meet their students online twice a month for one semester.',
    category: 'career',
    priority: 'normal',
    author: 'Career Center',
    createdAt: '2025-10-05T13:30:00.000Z',
    updatedAt: '2025-10-05T13:30:00.000Z',
  },
  {
    id: '3c9b7e10-5a2f-4d8e-b1c4-7e2a9f0d5b03',
    title: 'Guest lecture: building reliable distributed systems',
    content:
      'A 2015 graduate now working as a staff engineer will talk about lessons learned while scaling payment systems. Open to students and alumni.',
    category: 'academic',
    priority: 'normal',
    author: 'Computer Engineering Department',
    createdAt: '2025-10-08T08:00:00.000Z',
    updatedAt: '2025-10-08T08:00:00.000Z',
  },
  {
    id: '3c9b7e10-5a2f-4d8e-b1c4-7e2a9f0d5b04',
    title: 'Library access for alumni',
    content: 'Graduates can now renew their library cards online and keep remote access to the digital journals.',
    category: 'general',
    priority: 'low',
    author: 'University Library',
    createdAt: '2025-10-10T11:45:00.000Z',
    updatedAt: '2025-10-10T11:45:00.000Z',
  },
];

const FIELDS = ['title', 'content', 'category', 'priority', 'author'];

function pick(data) {
  return Object.fromEntries(FIELDS.filter((key) => key in data).map((key) => [key, data[key]]));
}

class AnnouncementModel {
  constructor(seed = SEED_ANNOUNCEMENTS) {
    this.seed = seed;
    this.records = new Map();
    this.loadSeed();
  }

  loadSeed() {
    this.records.clear();
    this.seed.forEach((item) => this.records.set(item.id, { ...item }));
  }

  /** Newest first; optional exact category / priority and free-text search. */
  async findAll({ category, priority, search } = {}) {
    const term = search ? String(search).trim().toLowerCase() : '';
    return [...this.records.values()]
      .filter((item) => !category || item.category === category)
      .filter((item) => !priority || item.priority === priority)
      .filter(
        (item) =>
          !term || [item.title, item.content, item.author].some((text) => text.toLowerCase().includes(term)),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((item) => ({ ...item }));
  }

  async findById(id) {
    const item = this.records.get(id);
    return item ? { ...item } : null;
  }

  async create(data) {
    const now = new Date().toISOString();
    const item = { id: randomUUID(), priority: 'normal', ...pick(data), createdAt: now, updatedAt: now };
    this.records.set(item.id, item);
    return { ...item };
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

  async countByCategory() {
    const counts = Object.fromEntries(CATEGORIES.map((category) => [category, 0]));
    this.records.forEach((item) => {
      counts[item.category] = (counts[item.category] || 0) + 1;
    });
    return counts;
  }

  async reset() {
    this.loadSeed();
  }
}

const announcementModel = new AnnouncementModel();

module.exports = { AnnouncementModel, announcementModel, CATEGORIES, PRIORITIES };

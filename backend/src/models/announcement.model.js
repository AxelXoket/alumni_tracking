const db = require('../db/pool');
const { UUID_PATTERN } = require('../lib/validate');
const { likePattern } = require('../lib/sql');

/**
 * Announcement model backed by the PostgreSQL `announcements` table.
 * Same interface as the week 4 in-memory version.
 */

const CATEGORIES = ['general', 'academic', 'career', 'event'];
const PRIORITIES = ['low', 'normal', 'high'];

const COLUMNS = 'id, title, content, category, priority, author, created_at, updated_at';
const FIELDS = ['title', 'content', 'category', 'priority', 'author'];

function toAnnouncement(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    category: row.category,
    priority: row.priority,
    author: row.author,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

const isUuid = (id) => typeof id === 'string' && UUID_PATTERN.test(id);

class AnnouncementModel {
  /** Newest first; optional exact category / priority and free-text search. */
  async findAll({ category, priority, search } = {}) {
    const where = [];
    const params = [];
    if (category) {
      params.push(category);
      where.push(`category = $${params.length}`);
    }
    if (priority) {
      params.push(priority);
      where.push(`priority = $${params.length}`);
    }
    if (search) {
      params.push(likePattern(search));
      const n = params.length;
      where.push(`(title ILIKE $${n} OR content ILIKE $${n} OR author ILIKE $${n})`);
    }
    const filter = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const { rows } = await db
      .getPool()
      .query(`SELECT ${COLUMNS} FROM announcements ${filter} ORDER BY created_at DESC, id`, params);
    return rows.map(toAnnouncement);
  }

  async findById(id) {
    if (!isUuid(id)) return null;
    const { rows } = await db.getPool().query(`SELECT ${COLUMNS} FROM announcements WHERE id = $1`, [id]);
    return toAnnouncement(rows[0]);
  }

  async create(data) {
    const { rows } = await db.getPool().query(
      `INSERT INTO announcements (title, content, category, priority, author)
       VALUES ($1, $2, $3, COALESCE($4, 'normal'), $5)
       RETURNING ${COLUMNS}`,
      [data.title, data.content, data.category, data.priority ?? null, data.author],
    );
    return toAnnouncement(rows[0]);
  }

  async update(id, changes) {
    if (!isUuid(id)) return null;
    const fields = FIELDS.filter((field) => field in changes);
    if (fields.length === 0) return this.findById(id);
    const sets = fields.map((field, index) => `${field} = $${index + 1}`);
    const params = [...fields.map((field) => changes[field]), id];
    const { rows } = await db.getPool().query(
      `UPDATE announcements SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING ${COLUMNS}`,
      params,
    );
    return toAnnouncement(rows[0]);
  }

  async delete(id) {
    if (!isUuid(id)) return false;
    const { rowCount } = await db.getPool().query('DELETE FROM announcements WHERE id = $1', [id]);
    return rowCount > 0;
  }

  async count() {
    const { rows } = await db.getPool().query('SELECT count(*)::int AS total FROM announcements');
    return rows[0].total;
  }

  async countByCategory() {
    const counts = Object.fromEntries(CATEGORIES.map((category) => [category, 0]));
    const { rows } = await db
      .getPool()
      .query('SELECT category, count(*)::int AS total FROM announcements GROUP BY category');
    rows.forEach((row) => {
      counts[row.category] = row.total;
    });
    return counts;
  }
}

const announcementModel = new AnnouncementModel();

module.exports = { AnnouncementModel, announcementModel, CATEGORIES, PRIORITIES };

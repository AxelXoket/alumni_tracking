const db = require('../db/pool');
const { UUID_PATTERN } = require('../lib/validate');
const { likePattern } = require('../lib/sql');

/**
 * Job posting model (`job_postings`). Every job belongs to the user who
 * posted it (one-to-many). Reads join `users`, so each job carries a small
 * `postedBy` summary that the pages can show without an extra request.
 */

const WORK_MODES = ['onsite', 'hybrid', 'remote'];
const EMPLOYMENT_TYPES = ['full_time', 'part_time', 'internship', 'contract'];

const FIELD_COLUMNS = {
  title: 'title',
  company: 'company',
  location: 'location',
  workMode: 'work_mode',
  employmentType: 'employment_type',
  description: 'description',
};

const SELECT = `
  SELECT j.id, j.user_id, j.title, j.company, j.location, j.work_mode, j.employment_type,
         j.description, j.created_at, j.updated_at,
         u.name AS poster_name, u.email AS poster_email,
         (SELECT count(*)::int FROM applications a WHERE a.job_posting_id = j.id) AS application_count
    FROM job_postings j
    JOIN users u ON u.id = j.user_id`;

function toJob(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    company: row.company,
    location: row.location,
    workMode: row.work_mode,
    employmentType: row.employment_type,
    description: row.description,
    applicationCount: row.application_count,
    postedBy: { id: row.user_id, name: row.poster_name, email: row.poster_email },
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

const isUuid = (id) => typeof id === 'string' && UUID_PATTERN.test(id);

class JobPostingModel {
  /** Newest first; optional poster, work mode and free-text filters. */
  async findAll({ userId, workMode, search } = {}) {
    const where = [];
    const params = [];
    if (userId) {
      params.push(userId);
      where.push(`j.user_id = $${params.length}`);
    }
    if (workMode) {
      params.push(workMode);
      where.push(`j.work_mode = $${params.length}`);
    }
    if (search) {
      params.push(likePattern(search));
      const n = params.length;
      where.push(`(j.title ILIKE $${n} OR j.company ILIKE $${n} OR j.location ILIKE $${n})`);
    }
    const filter = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const { rows } = await db.getPool().query(`${SELECT} ${filter} ORDER BY j.created_at DESC, j.id`, params);
    return rows.map(toJob);
  }

  async findById(id) {
    if (!isUuid(id)) return null;
    const { rows } = await db.getPool().query(`${SELECT} WHERE j.id = $1`, [id]);
    return toJob(rows[0]);
  }

  async findByUserId(userId) {
    if (!isUuid(userId)) return [];
    return this.findAll({ userId });
  }

  /** `data.userId` must reference an existing user (checked by the service). */
  async create(data, client = db.getPool()) {
    const { rows } = await client.query(
      `INSERT INTO job_postings (id, user_id, title, company, location, work_mode, employment_type, description)
       VALUES (COALESCE($1, gen_random_uuid()), $2, $3, $4, $5, COALESCE($6, 'onsite'), COALESCE($7, 'full_time'), $8)
       RETURNING id`,
      [
        data.id ?? null,
        data.userId,
        data.title,
        data.company,
        data.location ?? null,
        data.workMode ?? null,
        data.employmentType ?? null,
        data.description ?? null,
      ],
    );
    return this.findById(rows[0].id);
  }

  async update(id, changes) {
    if (!isUuid(id)) return null;
    const sets = [];
    const params = [];
    for (const [field, column] of Object.entries(FIELD_COLUMNS)) {
      if (field in changes) {
        params.push(changes[field]);
        sets.push(`${column} = $${params.length}`);
      }
    }
    if (sets.length > 0) {
      params.push(id);
      const { rowCount } = await db
        .getPool()
        .query(`UPDATE job_postings SET ${sets.join(', ')} WHERE id = $${params.length}`, params);
      if (rowCount === 0) return null;
    }
    return this.findById(id);
  }

  async delete(id) {
    if (!isUuid(id)) return false;
    const { rowCount } = await db.getPool().query('DELETE FROM job_postings WHERE id = $1', [id]);
    return rowCount > 0;
  }

  async count() {
    const { rows } = await db.getPool().query('SELECT count(*)::int AS total FROM job_postings');
    return rows[0].total;
  }
}

const jobPostingModel = new JobPostingModel();

module.exports = { JobPostingModel, jobPostingModel, WORK_MODES, EMPLOYMENT_TYPES };

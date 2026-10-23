const db = require('../db/pool');
const { UUID_PATTERN } = require('../lib/validate');

/**
 * Application model (`applications`), the join entity of the many-to-many
 * relation between users (candidates) and job postings. A user can apply to
 * a job only once: UNIQUE (user_id, job_posting_id).
 */

const STATUSES = ['applied', 'reviewing', 'interview', 'accepted', 'rejected'];

const SELECT = `
  SELECT a.id, a.user_id, a.job_posting_id, a.status, a.cover_letter, a.created_at, a.updated_at,
         u.name AS candidate_name, u.email AS candidate_email,
         j.title AS job_title, j.company AS job_company
    FROM applications a
    JOIN users u        ON u.id = a.user_id
    JOIN job_postings j ON j.id = a.job_posting_id`;

function toApplication(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    jobPostingId: row.job_posting_id,
    status: row.status,
    coverLetter: row.cover_letter,
    candidate: { id: row.user_id, name: row.candidate_name, email: row.candidate_email },
    job: { id: row.job_posting_id, title: row.job_title, company: row.job_company },
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

const isUuid = (id) => typeof id === 'string' && UUID_PATTERN.test(id);

class ApplicationModel {
  /** Newest first; optional candidate, job and status filters. */
  async findAll({ userId, jobPostingId, status } = {}) {
    const where = [];
    const params = [];
    if (userId) {
      params.push(userId);
      where.push(`a.user_id = $${params.length}`);
    }
    if (jobPostingId) {
      params.push(jobPostingId);
      where.push(`a.job_posting_id = $${params.length}`);
    }
    if (status) {
      params.push(status);
      where.push(`a.status = $${params.length}`);
    }
    const filter = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const { rows } = await db.getPool().query(`${SELECT} ${filter} ORDER BY a.created_at DESC, a.id`, params);
    return rows.map(toApplication);
  }

  async findById(id) {
    if (!isUuid(id)) return null;
    const { rows } = await db.getPool().query(`${SELECT} WHERE a.id = $1`, [id]);
    return toApplication(rows[0]);
  }

  async findByUserId(userId) {
    return isUuid(userId) ? this.findAll({ userId }) : [];
  }

  async findByJobId(jobPostingId) {
    return isUuid(jobPostingId) ? this.findAll({ jobPostingId }) : [];
  }

  async findByPair(userId, jobPostingId) {
    if (!isUuid(userId) || !isUuid(jobPostingId)) return null;
    const { rows } = await db
      .getPool()
      .query(`${SELECT} WHERE a.user_id = $1 AND a.job_posting_id = $2`, [userId, jobPostingId]);
    return toApplication(rows[0]);
  }

  /** Throws PostgreSQL error 23505 if the user already applied to the job. */
  async create(data, client = db.getPool()) {
    const { rows } = await client.query(
      `INSERT INTO applications (id, user_id, job_posting_id, status, cover_letter)
       VALUES (COALESCE($1, gen_random_uuid()), $2, $3, COALESCE($4, 'applied'), $5)
       RETURNING id`,
      [data.id ?? null, data.userId, data.jobPostingId, data.status ?? null, data.coverLetter ?? null],
    );
    return this.findById(rows[0].id);
  }

  async updateStatus(id, status) {
    if (!isUuid(id)) return null;
    const { rowCount } = await db.getPool().query('UPDATE applications SET status = $1 WHERE id = $2', [status, id]);
    return rowCount ? this.findById(id) : null;
  }

  async delete(id) {
    if (!isUuid(id)) return false;
    const { rowCount } = await db.getPool().query('DELETE FROM applications WHERE id = $1', [id]);
    return rowCount > 0;
  }

  async countByStatus() {
    const counts = Object.fromEntries(STATUSES.map((status) => [status, 0]));
    const { rows } = await db
      .getPool()
      .query('SELECT status, count(*)::int AS total FROM applications GROUP BY status');
    rows.forEach((row) => {
      counts[row.status] = row.total;
    });
    return counts;
  }
}

const applicationModel = new ApplicationModel();

module.exports = { ApplicationModel, applicationModel, STATUSES };

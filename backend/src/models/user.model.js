const db = require('../db/pool');
const { UUID_PATTERN } = require('../lib/validate');
const { likePattern } = require('../lib/sql');

/**
 * User model (the "M" in MVC), backed by the PostgreSQL `users` table.
 *
 * The public interface is the same as the in-memory version from week 4, so
 * services and controllers did not change. Rows are mapped from snake_case
 * columns to the camelCase objects the API returns.
 */

const COLUMNS = 'id, name, email, role, department, graduation_year, created_at, updated_at';

const FIELD_COLUMNS = {
  name: 'name',
  email: 'email',
  role: 'role',
  department: 'department',
  graduationYear: 'graduation_year',
};

function toUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    department: row.department,
    graduationYear: row.graduation_year,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

// ids that are not UUIDs can never match a row; checking here avoids a
// PostgreSQL "invalid input syntax for type uuid" error
const isUuid = (id) => typeof id === 'string' && UUID_PATTERN.test(id);

class UserModel {
  async findAll({ role, search } = {}) {
    const where = [];
    const params = [];
    if (role) {
      params.push(role);
      where.push(`role = $${params.length}`);
    }
    if (search) {
      params.push(likePattern(search));
      where.push(`(name ILIKE $${params.length} OR email ILIKE $${params.length} OR department ILIKE $${params.length})`);
    }
    const filter = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const { rows } = await db.getPool().query(`SELECT ${COLUMNS} FROM users ${filter} ORDER BY name`, params);
    return rows.map(toUser);
  }

  async findById(id) {
    if (!isUuid(id)) return null;
    const { rows } = await db.getPool().query(`SELECT ${COLUMNS} FROM users WHERE id = $1`, [id]);
    return toUser(rows[0]);
  }

  async findByEmail(email) {
    const { rows } = await db.getPool().query(`SELECT ${COLUMNS} FROM users WHERE lower(email) = lower($1)`, [email]);
    return toUser(rows[0]);
  }

  async create(data) {
    const { rows } = await db.getPool().query(
      `INSERT INTO users (name, email, role, department, graduation_year)
       VALUES ($1, $2, COALESCE($3, 'alumni'), $4, $5)
       RETURNING ${COLUMNS}`,
      [data.name, data.email, data.role ?? null, data.department ?? null, data.graduationYear ?? null],
    );
    return toUser(rows[0]);
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
    if (sets.length === 0) return this.findById(id);
    params.push(id);
    // updated_at is maintained by the users_set_updated_at trigger
    const { rows } = await db.getPool().query(
      `UPDATE users SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING ${COLUMNS}`,
      params,
    );
    return toUser(rows[0]);
  }

  async delete(id) {
    if (!isUuid(id)) return false;
    const { rowCount } = await db.getPool().query('DELETE FROM users WHERE id = $1', [id]);
    return rowCount > 0;
  }

  async count() {
    const { rows } = await db.getPool().query('SELECT count(*)::int AS total FROM users');
    return rows[0].total;
  }

  async countByRole() {
    const counts = { alumni: 0, student: 0, faculty: 0, admin: 0 };
    const { rows } = await db.getPool().query('SELECT role, count(*)::int AS total FROM users GROUP BY role');
    rows.forEach((row) => {
      counts[row.role] = row.total;
    });
    return counts;
  }
}

const userModel = new UserModel();

module.exports = { UserModel, userModel };

/**
 * PostgreSQL implementation of the same repository interface as
 * memoryRepository.js, using the `pg` driver against the schema in
 * schema.sql. This is the production storage engine described in the
 * architecture plan (Section 4.3 / 5).
 *
 * Not runnable in the sandbox this project was built in (no `pg` package
 * and no PostgreSQL instance available there — see README.md "Running
 * against real PostgreSQL"). It is written and reviewed as real code, and
 * every route handler in src/routes/ is written only against the interface
 * both repositories share, so this file is the only thing a deployment
 * needs to activate by installing `pg` and setting DB_MODE=postgres.
 */
import pg from 'pg';
import { config } from '../config.js';
import { hashPassword } from '../lib/password.js';

const { Pool } = pg;

// pg returns DATE columns as JS Date objects by default; the API contract
// (and the front end) expect plain 'YYYY-MM-DD' strings, so we parse dates
// as text instead of letting node-postgres convert them.
const DATE_OID = 1082;
pg.types.setTypeParser(DATE_OID, (value) => value); // value already arrives as 'YYYY-MM-DD' text

export function createPostgresRepository() {
  const pool = new Pool({ connectionString: config.databaseUrl });

  const toPublicUser = (row) => ({ id: row.id, email: row.email, name: row.name });
  const toPublicProject = (row, tasks) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    dueDate: row.due_date || '',
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    tasks: tasks.map(toPublicTask),
  });
  const toPublicTask = (row) => ({
    id: row.id,
    title: row.title,
    notes: row.notes,
    status: row.status,
    priority: row.priority,
    due: row.due || '',
    createdAt: row.created_at.toISOString(),
  });

  async function fetchTasks(projectId) {
    const { rows } = await pool.query('SELECT * FROM tasks WHERE project_id = $1 ORDER BY position, created_at', [projectId]);
    return rows;
  }

  return {
    /* ---------------------------------------------------------- users */
    async createUser({ email, password, name }) {
      const { rows } = await pool.query(
        'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING *',
        [email.toLowerCase(), hashPassword(password), name],
      );
      return toPublicUser(rows[0]);
    },

    async findUserByEmailInternal(email) {
      const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
      return rows[0] || null;
    },

    async findUserById(id) {
      const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
      return rows[0] ? toPublicUser(rows[0]) : null;
    },

    async updateUser(id, patch) {
      const { rows } = await pool.query('UPDATE users SET name = COALESCE($2, name), updated_at = now() WHERE id = $1 RETURNING *', [id, patch.name]);
      return rows[0] ? toPublicUser(rows[0]) : null;
    },

    /* ------------------------------------------------------- sessions */
    async createSession(userId) {
      const { rows } = await pool.query('INSERT INTO sessions (user_id, expires_at) VALUES ($1, now() + ($2 || \' seconds\')::interval) RETURNING id', [userId, config.tokenTtlSeconds]);
      return rows[0].id;
    },

    async findActiveSession(sessionId) {
      const { rows } = await pool.query('SELECT * FROM sessions WHERE id = $1 AND revoked_at IS NULL AND expires_at > now()', [sessionId]);
      return rows[0] || null;
    },

    async revokeSession(sessionId) {
      await pool.query('UPDATE sessions SET revoked_at = now() WHERE id = $1', [sessionId]);
    },

    /* ------------------------------------------------------- projects */
    async listProjects(ownerId) {
      const { rows } = await pool.query('SELECT * FROM projects WHERE owner_id = $1 ORDER BY updated_at DESC', [ownerId]);
      return Promise.all(rows.map(async (row) => toPublicProject(row, await fetchTasks(row.id))));
    },

    async getProject(ownerId, id) {
      const { rows } = await pool.query('SELECT * FROM projects WHERE id = $1 AND owner_id = $2', [id, ownerId]);
      if (!rows[0]) return null;
      return toPublicProject(rows[0], await fetchTasks(id));
    },

    async createProject(ownerId, data) {
      const { rows } = await pool.query(
        'INSERT INTO projects (owner_id, name, description, status, due_date) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [ownerId, data.name.trim(), (data.description || '').trim(), data.status || 'active', data.dueDate || null],
      );
      return toPublicProject(rows[0], []);
    },

    async updateProject(ownerId, id, patch) {
      const { rows } = await pool.query(
        `UPDATE projects SET
           name = COALESCE($3, name),
           description = COALESCE($4, description),
           status = COALESCE($5, status),
           due_date = CASE WHEN $6::boolean THEN $7::date ELSE due_date END,
           updated_at = now()
         WHERE id = $1 AND owner_id = $2
         RETURNING *`,
        [id, ownerId, patch.name?.trim(), patch.description?.trim(), patch.status, patch.dueDate !== undefined, patch.dueDate || null],
      );
      if (!rows[0]) return null;
      return toPublicProject(rows[0], await fetchTasks(id));
    },

    async deleteProject(ownerId, id) {
      const { rowCount } = await pool.query('DELETE FROM projects WHERE id = $1 AND owner_id = $2', [id, ownerId]);
      return rowCount > 0;
    },

    /* ---------------------------------------------------------- tasks */
    async createTask(ownerId, projectId, data) {
      const owned = await pool.query('SELECT id FROM projects WHERE id = $1 AND owner_id = $2', [projectId, ownerId]);
      if (!owned.rows[0]) return null;
      const { rows } = await pool.query(
        'INSERT INTO tasks (project_id, title, notes, status, priority, due) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [projectId, data.title.trim(), (data.notes || '').trim(), data.status || 'todo', data.priority || 'medium', data.due || null],
      );
      await pool.query('UPDATE projects SET updated_at = now() WHERE id = $1', [projectId]);
      return toPublicTask(rows[0]);
    },

    async updateTask(ownerId, projectId, taskId, patch) {
      const owned = await pool.query('SELECT id FROM projects WHERE id = $1 AND owner_id = $2', [projectId, ownerId]);
      if (!owned.rows[0]) return null;
      const { rows } = await pool.query(
        `UPDATE tasks SET
           title = COALESCE($3, title),
           notes = COALESCE($4, notes),
           status = COALESCE($5, status),
           priority = COALESCE($6, priority),
           due = CASE WHEN $7::boolean THEN $8::date ELSE due END
         WHERE id = $1 AND project_id = $2
         RETURNING *`,
        [taskId, projectId, patch.title?.trim(), patch.notes?.trim(), patch.status, patch.priority, patch.due !== undefined, patch.due || null],
      );
      if (!rows[0]) return null;
      await pool.query('UPDATE projects SET updated_at = now() WHERE id = $1', [projectId]);
      return toPublicTask(rows[0]);
    },

    async deleteTask(ownerId, projectId, taskId) {
      const owned = await pool.query('SELECT id FROM projects WHERE id = $1 AND owner_id = $2', [projectId, ownerId]);
      if (!owned.rows[0]) return false;
      const { rowCount } = await pool.query('DELETE FROM tasks WHERE id = $1 AND project_id = $2', [taskId, projectId]);
      if (rowCount > 0) await pool.query('UPDATE projects SET updated_at = now() WHERE id = $1', [projectId]);
      return rowCount > 0;
    },

    async _close() {
      await pool.end();
    },
  };
}

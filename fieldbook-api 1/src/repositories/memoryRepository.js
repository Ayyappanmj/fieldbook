/**
 * In-memory implementation of the repository interface. This is the default
 * (DB_MODE=memory) so the API runs and is fully testable with zero external
 * services — no PostgreSQL install required. postgresRepository.js implements
 * the same interface against a real database for production use; every route
 * handler is written against this interface, not against either storage
 * engine directly, so the two are interchangeable.
 */
import crypto from 'node:crypto';
import { hashPassword } from '../lib/password.js';
import { buildSeed } from './seed.js';

const clone = (value) => JSON.parse(JSON.stringify(value));
const now = () => new Date().toISOString();
const uuid = () => crypto.randomUUID();

export async function createMemoryRepository({ seed = true } = {}) {
  /** @type {Map<string, object>} */
  const users = new Map(); // id -> { id, email, passwordHash, name, createdAt, updatedAt }
  /** @type {Map<string, object>} */
  const projects = new Map(); // id -> { id, ownerId, name, description, status, dueDate, createdAt, updatedAt, tasks: Map }
  /** @type {Map<string, object>} */
  const sessions = new Map(); // id -> { id, userId, expiresAt, revokedAt }

  function toPublicUser(user) {
    return { id: user.id, email: user.email, name: user.name };
  }

  function toPublicProject(project) {
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      dueDate: project.dueDate,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      tasks: [...project.tasks.values()].map(toPublicTask),
    };
  }

  const toPublicTask = (task) => ({
    id: task.id,
    title: task.title,
    notes: task.notes,
    status: task.status,
    priority: task.priority,
    due: task.due,
    createdAt: task.createdAt,
  });

  const repo = {
    /* ---------------------------------------------------------- users */
    async createUser({ email, password, name }) {
      const user = { id: uuid(), email: email.toLowerCase(), passwordHash: hashPassword(password), name, createdAt: now(), updatedAt: now() };
      users.set(user.id, user);
      return toPublicUser(user);
    },

    /** Internal-only: includes the password hash, never returned to callers outside auth. */
    async findUserByEmailInternal(email) {
      return [...users.values()].find((u) => u.email === email.toLowerCase()) || null;
    },

    async findUserById(id) {
      const user = users.get(id);
      return user ? toPublicUser(user) : null;
    },

    async updateUser(id, patch) {
      const user = users.get(id);
      if (!user) return null;
      Object.assign(user, patch, { updatedAt: now() });
      return toPublicUser(user);
    },

    /* ------------------------------------------------------- sessions */
    async createSession(userId) {
      const session = { id: uuid(), userId, createdAt: now(), revokedAt: null };
      sessions.set(session.id, session);
      return session.id;
    },

    async findActiveSession(sessionId) {
      const session = sessions.get(sessionId);
      if (!session || session.revokedAt) return null;
      return session;
    },

    async revokeSession(sessionId) {
      const session = sessions.get(sessionId);
      if (session) session.revokedAt = now();
    },

    /* ------------------------------------------------------- projects */
    async listProjects(ownerId) {
      return [...projects.values()]
        .filter((p) => p.ownerId === ownerId)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .map(toPublicProject);
    },

    async getProject(ownerId, id) {
      const project = projects.get(id);
      if (!project || project.ownerId !== ownerId) return null;
      return toPublicProject(project);
    },

    async createProject(ownerId, data) {
      const project = {
        id: uuid(),
        ownerId,
        name: data.name.trim(),
        description: (data.description || '').trim(),
        status: data.status || 'active',
        dueDate: data.dueDate || '',
        createdAt: now(),
        updatedAt: now(),
        tasks: new Map(),
      };
      projects.set(project.id, project);
      return toPublicProject(project);
    },

    async updateProject(ownerId, id, patch) {
      const project = projects.get(id);
      if (!project || project.ownerId !== ownerId) return null;
      if (patch.name !== undefined) project.name = patch.name.trim();
      if (patch.description !== undefined) project.description = (patch.description || '').trim();
      if (patch.status !== undefined) project.status = patch.status;
      if (patch.dueDate !== undefined) project.dueDate = patch.dueDate || '';
      project.updatedAt = now();
      return toPublicProject(project);
    },

    async deleteProject(ownerId, id) {
      const project = projects.get(id);
      if (!project || project.ownerId !== ownerId) return false;
      projects.delete(id);
      return true;
    },

    /* ---------------------------------------------------------- tasks */
    async createTask(ownerId, projectId, data) {
      const project = projects.get(projectId);
      if (!project || project.ownerId !== ownerId) return null;
      const task = {
        id: uuid(),
        title: data.title.trim(),
        notes: (data.notes || '').trim(),
        status: data.status || 'todo',
        priority: data.priority || 'medium',
        due: data.due || '',
        createdAt: now(),
      };
      project.tasks.set(task.id, task);
      project.updatedAt = now();
      return toPublicTask(task);
    },

    async updateTask(ownerId, projectId, taskId, patch) {
      const project = projects.get(projectId);
      if (!project || project.ownerId !== ownerId) return null;
      const task = project.tasks.get(taskId);
      if (!task) return null;
      if (patch.title !== undefined) task.title = patch.title.trim();
      if (patch.notes !== undefined) task.notes = (patch.notes || '').trim();
      if (patch.status !== undefined) task.status = patch.status;
      if (patch.priority !== undefined) task.priority = patch.priority;
      if (patch.due !== undefined) task.due = patch.due || '';
      project.updatedAt = now();
      return toPublicTask(task);
    },

    async deleteTask(ownerId, projectId, taskId) {
      const project = projects.get(projectId);
      if (!project || project.ownerId !== ownerId) return false;
      const existed = project.tasks.delete(taskId);
      if (existed) project.updatedAt = now();
      return existed;
    },

    /* ----------------------------------------------------- dev helpers */
    /** Not part of the interface postgresRepository needs to implement — used only by tests/dev tooling. */
    async _debugState() {
      return clone({ users: [...users.values()], sessionCount: sessions.size });
    },
  };

  if (seed) await seedDemoData(repo);
  return repo;
}

async function seedDemoData(repo) {
  const { user, projects: seedProjects } = buildSeed();
  const created = await repo.createUser(user);
  for (const p of seedProjects) {
    const project = await repo.createProject(created.id, p);
    for (const t of p.tasks) {
      await repo.createTask(created.id, project.id, t);
    }
  }
}

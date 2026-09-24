/**
 * Mock API adapter: a fake back end that persists to localStorage.
 *
 * It implements the same interface as httpAdapter.js, including latency,
 * authentication, server-side validation and 401/404/422 errors, so the UI can
 * be built and tested without a running server.
 */
import { config } from '../config.js';
import { DEMO_ACCOUNT } from '../constants.js';
import { storage } from '../utils/storage.js';
import { nameFromEmail } from '../utils/format.js';
import { isValid, validateLogin, validateProject, validateTask } from '../utils/validate.js';
import { ApiError } from './ApiError.js';
import { createSeed } from './mockData.js';

const DATA_KEY = `${config.storageKey}:data`;
const SESSION_KEY = `${config.storageKey}:session`;

const wait = () => (config.mockLatencyMs > 0 ? new Promise((r) => setTimeout(r, config.mockLatencyMs)) : Promise.resolve());
const clone = (value) => JSON.parse(JSON.stringify(value));
const now = () => new Date().toISOString();
const newId = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

function loadProjects() {
  let projects = storage.get(DATA_KEY);
  if (!projects) {
    projects = createSeed();
    storage.set(DATA_KEY, projects);
  }
  return projects;
}
const save = (projects) => storage.set(DATA_KEY, projects);

function requireSession() {
  const session = storage.get(SESSION_KEY);
  if (!session) throw new ApiError('Your session has ended. Sign in again to continue.', 401);
  return session;
}

function findProject(projects, id) {
  const project = projects.find((p) => p.id === id);
  if (!project) throw new ApiError('That project no longer exists.', 404);
  return project;
}

function assertValid(errors) {
  if (!isValid(errors)) throw new ApiError('Some fields need attention.', 422, errors);
}

const cleanProject = (d) => ({
  name: d.name.trim(),
  description: (d.description || '').trim(),
  status: d.status || 'active',
  dueDate: d.dueDate || '',
});

const cleanTask = (d) => ({
  title: d.title.trim(),
  notes: (d.notes || '').trim(),
  status: d.status || 'todo',
  priority: d.priority || 'medium',
  due: d.due || '',
});

export const mockAdapter = {
  /* ---------------------------------------------------------------- auth */
  async login({ email, password }) {
    await wait();
    assertValid(validateLogin({ email, password }));
    const isDemo = email.trim().toLowerCase() === DEMO_ACCOUNT.email;
    if (isDemo && password !== DEMO_ACCOUNT.password) {
      throw new ApiError("That email and password don't match. Check them and try again.", 401);
    }
    const user = { email: email.trim().toLowerCase(), name: isDemo ? 'Sam Rivera' : nameFromEmail(email) };
    storage.set(SESSION_KEY, user);
    return clone(user);
  },

  async logout() {
    await wait();
    storage.remove(SESSION_KEY);
  },

  async getSession() {
    return clone(storage.get(SESSION_KEY));
  },

  async updateProfile({ name }) {
    await wait();
    const session = requireSession();
    if (!name || !name.trim()) throw new ApiError('Some fields need attention.', 422, { name: 'Enter your name.' });
    const user = { ...session, name: name.trim() };
    storage.set(SESSION_KEY, user);
    return clone(user);
  },

  async resetData() {
    await wait();
    requireSession();
    save(createSeed());
  },

  /* ------------------------------------------------------------ projects */
  async listProjects() {
    await wait();
    requireSession();
    return clone(loadProjects());
  },

  async getProject(id) {
    await wait();
    requireSession();
    return clone(findProject(loadProjects(), id));
  },

  async createProject(data) {
    await wait();
    requireSession();
    assertValid(validateProject(data));
    const projects = loadProjects();
    const project = { id: newId('p'), ...cleanProject(data), createdAt: now(), updatedAt: now(), tasks: [] };
    projects.push(project);
    save(projects);
    return clone(project);
  },

  async updateProject(id, patch) {
    await wait();
    requireSession();
    const projects = loadProjects();
    const project = findProject(projects, id);
    const merged = { ...project, ...patch };
    assertValid(validateProject(merged));
    Object.assign(project, cleanProject(merged), { updatedAt: now() });
    save(projects);
    return clone(project);
  },

  async deleteProject(id) {
    await wait();
    requireSession();
    const projects = loadProjects();
    findProject(projects, id);
    save(projects.filter((p) => p.id !== id));
  },

  /* --------------------------------------------------------------- tasks */
  async createTask(projectId, data) {
    await wait();
    requireSession();
    assertValid(validateTask(data));
    const projects = loadProjects();
    const project = findProject(projects, projectId);
    const task = { id: newId('t'), ...cleanTask(data), createdAt: now() };
    project.tasks.push(task);
    project.updatedAt = now();
    save(projects);
    return clone(task);
  },

  async updateTask(projectId, taskId, patch) {
    await wait();
    requireSession();
    const projects = loadProjects();
    const project = findProject(projects, projectId);
    const task = project.tasks.find((t) => t.id === taskId);
    if (!task) throw new ApiError('That task no longer exists.', 404);
    const merged = { ...task, ...patch };
    assertValid(validateTask(merged));
    Object.assign(task, cleanTask(merged));
    project.updatedAt = now();
    save(projects);
    return clone(task);
  },

  async deleteTask(projectId, taskId) {
    await wait();
    requireSession();
    const projects = loadProjects();
    const project = findProject(projects, projectId);
    if (!project.tasks.some((t) => t.id === taskId)) throw new ApiError('That task no longer exists.', 404);
    project.tasks = project.tasks.filter((t) => t.id !== taskId);
    project.updatedAt = now();
    save(projects);
  },
};

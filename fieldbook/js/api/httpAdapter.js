/**
 * HTTP API adapter: talks to a real REST back end.
 *
 * Expected endpoints (JSON in, JSON out) are documented in README.md.
 * If your Week 1 API differs, this is the ONLY file that needs to change:
 * adjust the paths and response mapping below and keep the method signatures.
 */
import { config } from '../config.js';
import { storage } from '../utils/storage.js';
import { ApiError } from './ApiError.js';

const TOKEN_KEY = `${config.storageKey}:token`;
const USER_KEY = `${config.storageKey}:user`;

async function request(method, path, body) {
  const headers = { Accept: 'application/json' };
  const token = storage.get(TOKEN_KEY);
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let response;
  try {
    response = await fetch(`${config.apiBaseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Cannot reach the server. Check your connection and try again.', 0);
  }

  if (response.status === 204) return null;
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(data?.message || `The server returned an error (${response.status}).`, response.status, data?.errors || null);
  }
  return data;
}

export const httpAdapter = {
  async login({ email, password }) {
    const { token, user } = await request('POST', '/auth/login', { email, password });
    storage.set(TOKEN_KEY, token);
    storage.set(USER_KEY, user);
    return user;
  },
  async logout() {
    try {
      await request('POST', '/auth/logout');
    } finally {
      storage.remove(TOKEN_KEY);
      storage.remove(USER_KEY);
    }
  },
  async getSession() {
    return storage.get(TOKEN_KEY) ? storage.get(USER_KEY) : null;
  },
  async updateProfile(data) {
    const user = await request('PATCH', '/me', data);
    storage.set(USER_KEY, user);
    return user;
  },
  async resetData() {
    throw new ApiError('Resetting data is only available with the demo storage.', 400);
  },

  listProjects: () => request('GET', '/projects'),
  getProject: (id) => request('GET', `/projects/${encodeURIComponent(id)}`),
  createProject: (data) => request('POST', '/projects', data),
  updateProject: (id, patch) => request('PATCH', `/projects/${encodeURIComponent(id)}`, patch),
  deleteProject: (id) => request('DELETE', `/projects/${encodeURIComponent(id)}`),

  createTask: (projectId, data) => request('POST', `/projects/${encodeURIComponent(projectId)}/tasks`, data),
  updateTask: (projectId, taskId, patch) =>
    request('PATCH', `/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(taskId)}`, patch),
  deleteTask: (projectId, taskId) =>
    request('DELETE', `/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(taskId)}`),
};

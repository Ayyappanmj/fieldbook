import './setup.js';
import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mockAdapter as api } from '../js/api/mockAdapter.js';
import { ApiError } from '../js/api/ApiError.js';
import { storage } from '../js/utils/storage.js';

beforeEach(async () => {
  await api.logout();
  storage.remove('fieldbook:test:data');
});

const signIn = () => api.login({ email: 'demo@fieldbook.dev', password: 'fieldbook' });

test('data calls require a session (401)', async () => {
  await assert.rejects(api.listProjects(), (e) => e instanceof ApiError && e.status === 401);
});

test('login: wrong demo password is rejected, validation errors are 422', async () => {
  await assert.rejects(api.login({ email: 'demo@fieldbook.dev', password: 'wrong-one' }), (e) => e.status === 401);
  await assert.rejects(api.login({ email: 'nope', password: '1' }), (e) => e.status === 422 && Boolean(e.details.email && e.details.password));
  const user = await signIn();
  assert.equal(user.name, 'Sam Rivera');
  assert.deepEqual(await api.getSession(), user);
});

test('projects: seeded, create, update, delete', async () => {
  await signIn();
  const seeded = await api.listProjects();
  assert.ok(seeded.length >= 5);

  const created = await api.createProject({ name: '  New thing ', description: 'x', dueDate: '2030-01-01' });
  assert.equal(created.name, 'New thing');
  assert.equal(created.status, 'active');
  assert.deepEqual(created.tasks, []);

  const updated = await api.updateProject(created.id, { status: 'hold' });
  assert.equal(updated.status, 'hold');
  assert.equal(updated.name, 'New thing');

  await assert.rejects(api.createProject({ name: '' }), (e) => e.status === 422 && Boolean(e.details.name));
  await api.deleteProject(created.id);
  await assert.rejects(api.getProject(created.id), (e) => e.status === 404);
});

test('tasks: create, move, edit, delete and progress persists', async () => {
  await signIn();
  const project = await api.createProject({ name: 'Task host' });
  const task = await api.createTask(project.id, { title: 'First', priority: 'high' });
  assert.equal(task.status, 'todo');

  const moved = await api.updateTask(project.id, task.id, { status: 'done' });
  assert.equal(moved.status, 'done');
  assert.equal(moved.title, 'First');

  await assert.rejects(api.updateTask(project.id, task.id, { title: '' }), (e) => e.status === 422);
  await assert.rejects(api.updateTask(project.id, 'missing', { title: 'x' }), (e) => e.status === 404);

  const reloaded = await api.getProject(project.id);
  assert.equal(reloaded.tasks.length, 1);
  await api.deleteTask(project.id, task.id);
  assert.equal((await api.getProject(project.id)).tasks.length, 0);
});

test('resetData restores the seed', async () => {
  await signIn();
  const created = await api.createProject({ name: 'Temp' });
  await api.resetData();
  await assert.rejects(api.getProject(created.id), (e) => e.status === 404);
});

test('updateProfile changes the session name', async () => {
  await signIn();
  const user = await api.updateProfile({ name: 'Alex' });
  assert.equal(user.name, 'Alex');
  await assert.rejects(api.updateProfile({ name: ' ' }), (e) => e.status === 422);
});

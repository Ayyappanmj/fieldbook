/**
 * Integration tests: a real Fieldbook API server (in-memory storage),
 * exercised only through real HTTP requests via fetch — no internal
 * shortcuts. This is the same contract the front end's httpAdapter.js
 * speaks, so a pass here is strong evidence the two projects fit together.
 */
import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../src/server.js';

let server;
let baseUrl;

before(async () => {
  const app = await createApp();
  server = app.server;
  await new Promise((resolve) => server.listen(0, resolve));
  baseUrl = `http://localhost:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

const call = (method, path, { token, body } = {}) =>
  fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

async function loginAsDemo() {
  const res = await call('POST', '/auth/login', { body: { email: 'demo@fieldbook.dev', password: 'fieldbook' } });
  const data = await res.json();
  return data.token;
}

test('rejects requests with no token', async () => {
  const res = await call('GET', '/projects');
  assert.equal(res.status, 401);
});

test('login: validation errors, wrong password, and success', async () => {
  const badFormat = await call('POST', '/auth/login', { body: { email: 'nope', password: '1' } });
  assert.equal(badFormat.status, 422);
  const badFormatBody = await badFormat.json();
  assert.ok(badFormatBody.errors.email);
  assert.ok(badFormatBody.errors.password);

  const wrongPassword = await call('POST', '/auth/login', { body: { email: 'demo@fieldbook.dev', password: 'not-it-either' } });
  assert.equal(wrongPassword.status, 401);

  const ok = await call('POST', '/auth/login', { body: { email: 'demo@fieldbook.dev', password: 'fieldbook' } });
  assert.equal(ok.status, 200);
  const body = await ok.json();
  assert.ok(body.token);
  assert.equal(body.user.email, 'demo@fieldbook.dev');
  assert.equal(body.user.name, 'Sam Rivera');
});

test('register: creates a real account, rejects duplicate email', async () => {
  const email = `new-${Date.now()}@example.com`;
  const first = await call('POST', '/auth/register', { body: { email, password: 'password1', name: 'New Person' } });
  assert.equal(first.status, 201);
  const firstBody = await first.json();
  assert.ok(firstBody.token);
  assert.equal(firstBody.user.name, 'New Person');

  const duplicate = await call('POST', '/auth/register', { body: { email, password: 'password1', name: 'New Person' } });
  assert.equal(duplicate.status, 422);

  // The freshly registered user starts with an empty workspace, not the demo seed data.
  const projects = await call('GET', '/projects', { token: firstBody.token });
  assert.deepEqual(await projects.json(), []);
});

test('GET /projects returns the seeded demo workspace with nested tasks', async () => {
  const token = await loginAsDemo();
  const res = await call('GET', '/projects', { token });
  assert.equal(res.status, 200);
  const projects = await res.json();
  assert.equal(projects.length, 6);
  const springDrop = projects.find((p) => p.name === 'Spring product drop');
  assert.equal(springDrop.tasks.length, 7);
  assert.ok(springDrop.tasks.every((t) => t.id && t.title && t.status));
});

test('project + task lifecycle: create, read, update, delete, 404s', async () => {
  const token = await loginAsDemo();

  const created = await call('POST', '/projects', { token, body: { name: 'Integration test project', description: 'x' } });
  assert.equal(created.status, 201);
  const project = await created.json();
  assert.equal(project.status, 'active');

  const missingName = await call('POST', '/projects', { token, body: { name: '' } });
  assert.equal(missingName.status, 422);

  const updated = await call('PATCH', `/projects/${project.id}`, { token, body: { status: 'hold' } });
  assert.equal(updated.status, 200);
  assert.equal((await updated.json()).status, 'hold');

  const task = await call('POST', `/projects/${project.id}/tasks`, { token, body: { title: 'Do the thing', priority: 'high' } });
  assert.equal(task.status, 201);
  const taskBody = await task.json();
  assert.equal(taskBody.status, 'todo');

  const movedTask = await call('PATCH', `/projects/${project.id}/tasks/${taskBody.id}`, { token, body: { status: 'done' } });
  assert.equal((await movedTask.json()).status, 'done');

  const emptyTitle = await call('PATCH', `/projects/${project.id}/tasks/${taskBody.id}`, { token, body: { title: '' } });
  assert.equal(emptyTitle.status, 422);

  const deletedTask = await call('DELETE', `/projects/${project.id}/tasks/${taskBody.id}`, { token });
  assert.equal(deletedTask.status, 204);

  const taskGone = await call('PATCH', `/projects/${project.id}/tasks/${taskBody.id}`, { token, body: { status: 'todo' } });
  assert.equal(taskGone.status, 404);

  const deletedProject = await call('DELETE', `/projects/${project.id}`, { token });
  assert.equal(deletedProject.status, 204);

  const projectGone = await call('GET', `/projects/${project.id}`, { token });
  assert.equal(projectGone.status, 404);
});

test('a task cannot be created under another user\u2019s project (ownership isolation)', async () => {
  const demoToken = await loginAsDemo();
  const demoProjects = await (await call('GET', '/projects', { token: demoToken })).json();
  const someDemoProjectId = demoProjects[0].id;

  const strangerEmail = `stranger-${Date.now()}@example.com`;
  const registerRes = await call('POST', '/auth/register', { body: { email: strangerEmail, password: 'password1', name: 'Stranger' } });
  const strangerToken = (await registerRes.json()).token;

  const res = await call('POST', `/projects/${someDemoProjectId}/tasks`, { token: strangerToken, body: { title: 'Should not work' } });
  assert.equal(res.status, 404, 'a stranger must not be able to add tasks to someone else\u2019s project');

  const readRes = await call('GET', `/projects/${someDemoProjectId}`, { token: strangerToken });
  assert.equal(readRes.status, 404, 'a stranger must not be able to read someone else\u2019s project');
});

test('PATCH /me updates the display name', async () => {
  const token = await loginAsDemo();
  const res = await call('PATCH', '/me', { token, body: { name: 'Alex Kim' } });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).name, 'Alex Kim');

  const emptyName = await call('PATCH', '/me', { token, body: { name: '  ' } });
  assert.equal(emptyName.status, 422);
});

test('logout revokes the session so the token no longer works', async () => {
  const token = await loginAsDemo();
  const before = await call('GET', '/me', { token });
  assert.equal(before.status, 200);

  const logout = await call('POST', '/auth/logout', { token });
  assert.equal(logout.status, 204);

  const after = await call('GET', '/me', { token });
  assert.equal(after.status, 401);
});

test('malformed JSON body is a 400, not a crash', async () => {
  const res = await fetch(`${baseUrl}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{not json' });
  assert.equal(res.status, 400);
});

test('unknown route returns 404', async () => {
  const res = await call('GET', '/not-a-real-endpoint');
  assert.equal(res.status, 404);
});

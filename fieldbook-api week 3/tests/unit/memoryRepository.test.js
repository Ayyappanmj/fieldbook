import test from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryRepository } from '../../src/repositories/memoryRepository.js';

async function freshRepo() {
  return createMemoryRepository();
}

test('is seeded with the demo user and six projects', async () => {
  const repo = await freshRepo();
  const user = await repo.findUserByEmailInternal('demo@fieldbook.dev');
  assert.ok(user);
  assert.equal(user.name, 'Sam Rivera');
  const projects = await repo.listProjects(user.id);
  assert.equal(projects.length, 6);
  assert.ok(projects.some((p) => p.name === 'Spring product drop' && p.tasks.length === 7));
});

test('projects and tasks are isolated per owner', async () => {
  const repo = await freshRepo();
  const alice = await repo.createUser({ email: 'alice@example.com', password: 'password1', name: 'Alice' });
  const bob = await repo.createUser({ email: 'bob@example.com', password: 'password1', name: 'Bob' });

  const aliceProject = await repo.createProject(alice.id, { name: "Alice's project" });
  assert.equal(await repo.getProject(bob.id, aliceProject.id), null, "Bob must not be able to read Alice's project");
  assert.equal(await repo.deleteProject(bob.id, aliceProject.id), false, "Bob must not be able to delete Alice's project");
  assert.equal((await repo.listProjects(bob.id)).length, 0);
  assert.equal((await repo.listProjects(alice.id)).length, 1);
});

test('full project and task CRUD lifecycle', async () => {
  const repo = await freshRepo();
  const user = await repo.createUser({ email: 'crud@example.com', password: 'password1', name: 'Crud Tester' });

  const project = await repo.createProject(user.id, { name: 'New project', description: 'x' });
  assert.equal(project.status, 'active');
  assert.deepEqual(project.tasks, []);

  const updated = await repo.updateProject(user.id, project.id, { status: 'hold' });
  assert.equal(updated.status, 'hold');
  assert.equal(updated.name, 'New project');

  const task = await repo.createTask(user.id, project.id, { title: 'First task', priority: 'high' });
  assert.equal(task.status, 'todo');

  const movedTask = await repo.updateTask(user.id, project.id, task.id, { status: 'done' });
  assert.equal(movedTask.status, 'done');

  const reloaded = await repo.getProject(user.id, project.id);
  assert.equal(reloaded.tasks.length, 1);
  assert.equal(reloaded.tasks[0].status, 'done');

  assert.equal(await repo.deleteTask(user.id, project.id, task.id), true);
  assert.equal((await repo.getProject(user.id, project.id)).tasks.length, 0);

  assert.equal(await repo.deleteProject(user.id, project.id), true);
  assert.equal(await repo.getProject(user.id, project.id), null);
});

test('sessions can be created, verified and revoked', async () => {
  const repo = await freshRepo();
  const user = await repo.createUser({ email: 'session@example.com', password: 'password1', name: 'Session Tester' });
  const sessionId = await repo.createSession(user.id);

  assert.ok(await repo.findActiveSession(sessionId));
  await repo.revokeSession(sessionId);
  assert.equal(await repo.findActiveSession(sessionId), null);
});

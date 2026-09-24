import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHash, matchPath, parseHash } from '../js/utils/path.js';
import { filterProjects, filterTasks, projectStats, sortProjects, sortTasks, workspaceStats } from '../js/utils/stats.js';

const today = new Date(2026, 8, 21);

test('matchPath extracts params and rejects mismatches', () => {
  assert.deepEqual(matchPath('/projects/:id', '/projects/p-1'), { id: 'p-1' });
  assert.deepEqual(matchPath('/projects/:id', '/projects/a%20b'), { id: 'a b' });
  assert.equal(matchPath('/projects/:id', '/projects'), null);
  assert.equal(matchPath('/dashboard', '/settings'), null);
  assert.deepEqual(matchPath('/', '/'), {});
});

test('parseHash and buildHash', () => {
  assert.deepEqual(parseHash(''), { path: '/', query: {} });
  assert.deepEqual(parseHash('#/dashboard?q=pins&status=active'), { path: '/dashboard', query: { q: 'pins', status: 'active' } });
  assert.deepEqual(parseHash('#/projects/p-1/'), { path: '/projects/p-1', query: {} });
  assert.equal(buildHash('/dashboard', { q: 'a b', status: '' }), '#/dashboard?q=a+b');
});

const project = (id, name, tasks, extra = {}) => ({ id, name, tasks, status: 'active', updatedAt: '2026-09-01', ...extra });
const t = (status, due = '', priority = 'medium', title = 't') => ({ id: Math.random(), title, status, due, priority, createdAt: '2026-09-01' });

test('projectStats counts progress, overdue and next due', () => {
  const s = projectStats(project('a', 'A', [t('done'), t('doing', '2026-09-30'), t('todo', '2026-09-19'), t('todo')]), today);
  assert.deepEqual({ total: s.total, done: s.done, pct: s.pct, overdue: s.overdue, nextDue: s.nextDue }, { total: 4, done: 1, pct: 25, overdue: 1, nextDue: '2026-09-19' });
  assert.equal(projectStats(project('b', 'B', []), today).pct, 0);
});

test('workspaceStats ignores completed projects', () => {
  const projects = [
    project('a', 'A', [t('todo', '2026-09-22'), t('todo', '2026-09-10'), t('done', '2026-09-10')]),
    project('b', 'B', [t('todo', '2026-09-10')], { status: 'done' }),
    project('c', 'C', [], { status: 'hold' }),
  ];
  assert.deepEqual(workspaceStats(projects, today), { activeProjects: 1, openTasks: 2, dueSoon: 1, overdue: 1 });
});

test('sortTasks: priority, then due date', () => {
  const sorted = sortTasks([t('todo', '', 'low', 'c'), t('todo', '2026-10-05', 'high', 'b'), t('todo', '2026-10-01', 'high', 'a')]);
  assert.deepEqual(sorted.map((x) => x.title), ['a', 'b', 'c']);
});

test('filters and sorts', () => {
  const list = [project('a', 'Zebra', [t('done')], { updatedAt: '2026-01-01', dueDate: '2026-12-01' }), project('b', 'apple', [t('todo')], { updatedAt: '2026-05-01', dueDate: '2026-10-01', status: 'hold' })];
  assert.deepEqual(filterProjects(list, { q: 'APP' }).map((p) => p.id), ['b']);
  assert.deepEqual(filterProjects(list, { status: 'active' }).map((p) => p.id), ['a']);
  assert.deepEqual(sortProjects(list, 'name').map((p) => p.id), ['b', 'a']);
  assert.deepEqual(sortProjects(list, 'updated').map((p) => p.id), ['b', 'a']);
  assert.deepEqual(sortProjects(list, 'due').map((p) => p.id), ['b', 'a']);
  assert.deepEqual(sortProjects(list, 'progress', today).map((p) => p.id), ['a', 'b']);
  assert.equal(filterTasks([t('todo', '', 'high', 'Fix bug'), t('todo', '', 'low', 'Write docs')], { q: 'docs' }).length, 1);
  assert.equal(filterTasks([t('todo', '', 'high'), t('todo', '', 'low')], { priority: 'high' }).length, 1);
});

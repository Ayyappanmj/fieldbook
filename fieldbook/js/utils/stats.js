/** Derived numbers for projects and the workspace. Pure functions. */
import { dueInfo, percent } from './format.js';
import { PRIORITIES } from '../constants.js';

export function projectStats(project, today = new Date()) {
  const tasks = project.tasks || [];
  const count = (s) => tasks.filter((t) => t.status === s).length;
  const open = tasks.filter((t) => t.status !== 'done');
  const dates = open.map((t) => t.due).filter(Boolean).sort();
  return {
    total: tasks.length,
    done: count('done'),
    doing: count('doing'),
    todo: count('todo'),
    open: open.length,
    pct: percent(count('done'), tasks.length),
    overdue: open.filter((t) => dueInfo(t.due, today).tone === 'overdue').length,
    nextDue: dates[0] ?? null,
  };
}

export function workspaceStats(projects, today = new Date()) {
  const tasks = projects.filter((p) => p.status !== 'done').flatMap((p) => p.tasks || []);
  const open = tasks.filter((t) => t.status !== 'done');
  const tone = (t) => dueInfo(t.due, today).tone;
  return {
    activeProjects: projects.filter((p) => p.status === 'active').length,
    openTasks: open.length,
    dueSoon: open.filter((t) => ['today', 'soon'].includes(tone(t))).length,
    overdue: open.filter((t) => tone(t) === 'overdue').length,
  };
}

const weight = (p) => PRIORITIES.find((x) => x.value === p)?.weight ?? 0;

/** Order tasks by priority (high first), then due date (soonest first), then age. */
export function sortTasks(tasks) {
  return [...tasks].sort(
    (a, b) =>
      weight(b.priority) - weight(a.priority) ||
      (a.due || '9999-99-99').localeCompare(b.due || '9999-99-99') ||
      (a.createdAt || '').localeCompare(b.createdAt || ''),
  );
}

export function filterTasks(tasks, { q = '', priority = '' } = {}) {
  const needle = q.trim().toLowerCase();
  return tasks.filter(
    (t) =>
      (!priority || t.priority === priority) &&
      (!needle || `${t.title} ${t.notes || ''}`.toLowerCase().includes(needle)),
  );
}

export function filterProjects(projects, { q = '', status = '' } = {}) {
  const needle = q.trim().toLowerCase();
  return projects.filter(
    (p) =>
      (!status || p.status === status) &&
      (!needle || `${p.name} ${p.description || ''}`.toLowerCase().includes(needle)),
  );
}

export function sortProjects(projects, key = 'updated', today = new Date()) {
  const list = [...projects];
  const by = {
    updated: (a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''),
    name: (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
    due: (a, b) => (a.dueDate || '9999-99-99').localeCompare(b.dueDate || '9999-99-99'),
    progress: (a, b) => projectStats(b, today).pct - projectStats(a, today).pct,
  };
  return list.sort(by[key] || by.updated);
}

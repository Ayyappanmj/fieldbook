import { h } from '../utils/dom.js';
import { PRIORITIES, PROJECT_STATUSES, TASK_STATUSES, labelFor } from '../constants.js';
import { dueInfo, formatDate } from '../utils/format.js';
import { icon } from './icons.js';

/** Chips always pair colour with text (and an icon where useful), never colour alone. */

export const projectStatusChip = (status) =>
  h('span', { class: ['chip', `chip--project-${status}`] }, labelFor(PROJECT_STATUSES, status));

export const taskStatusChip = (status) =>
  h('span', { class: ['chip', `chip--task-${status}`] }, labelFor(TASK_STATUSES, status));

export const priorityChip = (priority) =>
  h('span', { class: ['chip', `chip--priority-${priority}`] }, icon('flag', { size: 13 }), `${labelFor(PRIORITIES, priority)} priority`);

/** Due-date chip. Completed items show a plain date instead of an alarm. */
export function dueChip(due, { done = false, today = new Date() } = {}) {
  const info = dueInfo(due, today);
  if (info.tone === 'none') return null;
  if (done) return h('span', { class: 'chip chip--due-later' }, icon('calendar', { size: 13 }), `Due ${formatDate(due, today)}`);
  return h('span', { class: ['chip', `chip--due-${info.tone}`] }, icon(info.tone === 'overdue' ? 'alert' : 'calendar', { size: 13 }), info.label);
}

import { h } from '../utils/dom.js';
import { plural } from '../utils/format.js';
import { projectStats } from '../utils/stats.js';
import { dueChip, projectStatusChip } from './chips.js';
import { icon } from './icons.js';
import { progressBar } from './progress.js';

/** One project in the dashboard grid. The whole card is clickable via a stretched link. */
export function projectCard(project, today = new Date()) {
  const s = projectStats(project, today);
  const caption = s.total ? `${s.done} of ${s.total} ${plural(s.total, 'task')} done` : 'No tasks yet';

  return h(
    'li',
    { class: 'project-card' },
    h(
      'article',
      { class: 'project-card__inner' },
      h(
        'div',
        { class: 'project-card__top' },
        h('h3', { class: 'project-card__title' }, h('a', { class: 'project-card__link', href: `#/projects/${encodeURIComponent(project.id)}` }, project.name)),
        projectStatusChip(project.status),
      ),
      h('p', { class: 'project-card__desc' }, project.description || 'No description yet.'),
      h(
        'div',
        { class: 'project-card__progress' },
        progressBar(s.pct, { label: `${project.name} completion`, small: true }),
        h('p', { class: 'project-card__caption' }, h('span', {}, caption), h('span', { class: 'tabular' }, `${s.pct}%`)),
      ),
      h(
        'div',
        { class: 'project-card__meta' },
        project.dueDate ? dueChip(project.dueDate, { done: project.status === 'done', today }) : h('span', { class: 'chip chip--due-none' }, icon('calendar', { size: 13 }), 'No due date'),
        s.overdue > 0 && project.status !== 'done' && h('span', { class: 'chip chip--due-overdue' }, icon('alert', { size: 13 }), `${s.overdue} overdue ${plural(s.overdue, 'task')}`),
      ),
    ),
  );
}

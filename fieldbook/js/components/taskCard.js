import { h } from '../utils/dom.js';
import { TASK_STATUSES } from '../constants.js';
import { dueChip, priorityChip } from './chips.js';
import { icon } from './icons.js';

/**
 * A single task. Everything is reachable by keyboard: the checkbox toggles done,
 * the status menu moves it between columns (the accessible alternative to
 * drag-and-drop), and Edit / Delete are real buttons.
 */
export function taskCard(task, { today = new Date(), onToggle, onMove, onEdit, onDelete }) {
  const done = task.status === 'done';

  const li = h(
    'li',
    {
      class: ['task', done && 'task--done'],
      draggable: 'true',
      dataset: { taskId: task.id },
      onDragStart(event) {
        event.dataTransfer.setData('text/plain', task.id);
        event.dataTransfer.effectAllowed = 'move';
        li.classList.add('is-dragging');
      },
      onDragEnd: () => li.classList.remove('is-dragging'),
    },
    h(
      'div',
      { class: 'task__head' },
      h(
        'label',
        { class: 'check' },
        h('input', { type: 'checkbox', class: 'check__input', checked: done, 'aria-label': `Mark done: ${task.title}`, onChange: (e) => onToggle(task, e.target.checked) }),
        h('span', { class: 'check__box', 'aria-hidden': 'true' }, icon('check', { size: 14 })),
      ),
      h('h4', { class: 'task__title' }, task.title),
    ),
    task.notes && h('p', { class: 'task__notes' }, task.notes),
    h('div', { class: 'task__meta' }, priorityChip(task.priority), dueChip(task.due, { done, today })),
    h(
      'div',
      { class: 'task__actions' },
      h(
        'select',
        { class: 'control control--sm', 'aria-label': `Move \u201c${task.title}\u201d to`, onChange: (e) => onMove(task, e.target.value) },
        TASK_STATUSES.map((s) => h('option', { value: s.value, selected: s.value === task.status }, s.label)),
      ),
      h('button', { type: 'button', class: 'icon-btn icon-btn--sm', 'aria-label': `Edit task: ${task.title}`, onClick: () => onEdit(task) }, icon('edit', { size: 17 })),
      h('button', { type: 'button', class: 'icon-btn icon-btn--sm icon-btn--danger', 'aria-label': `Delete task: ${task.title}`, onClick: () => onDelete(task) }, icon('trash', { size: 17 })),
    ),
  );
  return li;
}

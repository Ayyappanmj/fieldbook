import { h, clear, debounce, domId } from '../utils/dom.js';
import { PRIORITIES, PROJECT_STATUSES, TASK_STATUSES } from '../constants.js';
import { api } from '../api/client.js';
import { navigate } from '../router.js';
import { formatDate, plural, toISODate } from '../utils/format.js';
import { filterTasks, projectStats, sortTasks } from '../utils/stats.js';
import { confirmDialog } from '../components/dialog.js';
import { dueChip } from '../components/chips.js';
import { emptyState, errorState, loadingText } from '../components/feedback.js';
import { icon } from '../components/icons.js';
import { progressRing } from '../components/progress.js';
import { openProjectDialog } from '../components/projectForm.js';
import { taskCard } from '../components/taskCard.js';
import { openTaskDialog } from '../components/taskForm.js';
import { toast } from '../components/toast.js';

export function ProjectDetailView({ params, setTitle }) {
  const today = new Date();
  const projectId = params.id;
  let project = null;
  let destroyed = false;
  const filters = { q: '', priority: '' };

  const root = h('div', { class: 'container page' });
  // Live region for screen readers: announces task moves without a visual toast.
  const liveRegion = h('p', { class: 'visually-hidden', role: 'status' });
  const content = h('div', { class: 'detail' });
  root.append(liveRegion, content);

  /* -------------------------------------------------------------- state */
  const announce = (message) => {
    liveRegion.textContent = '';
    setTimeout(() => (liveRegion.textContent = message), 30);
  };

  /** Re-render the board but keep keyboard focus on the same task control. */
  function keepFocus(render) {
    const active = document.activeElement;
    const item = active?.closest?.('[data-task-id]');
    let spec = null;
    if (item && content.contains(item)) {
      spec = { id: item.dataset.taskId, index: [...item.querySelectorAll('input,select,button')].indexOf(active) };
    }
    render();
    if (spec) content.querySelector(`[data-task-id="${CSS.escape(spec.id)}"]`)?.querySelectorAll('input,select,button')[spec.index]?.focus();
  }

  const refreshTasks = () => keepFocus(() => { renderBoard(); renderProgress(); });

  /* ------------------------------------------------------ task mutations */
  async function moveTask(task, status) {
    if (task.status === status) return;
    const previous = task.status;
    task.status = status; // optimistic: the UI updates instantly
    refreshTasks();
    announce(`Moved \u201c${task.title}\u201d to ${TASK_STATUSES.find((s) => s.value === status).label}.`);
    try {
      await api.updateTask(project.id, task.id, { status });
    } catch (error) {
      task.status = previous;
      refreshTasks();
      toast(error.message, { tone: 'error' });
    }
  }

  const toggleTask = (task, checked) => moveTask(task, checked ? 'done' : 'todo');

  async function addTask(status = 'todo') {
    const saved = await openTaskDialog({ projectId: project.id, status });
    if (!saved) return;
    project.tasks.push(saved);
    refreshTasks();
    toast('Task added.');
  }

  async function editTask(task) {
    const saved = await openTaskDialog({ projectId: project.id, task });
    if (!saved) return;
    Object.assign(task, saved);
    refreshTasks();
    toast('Task updated.');
  }

  async function deleteTask(task) {
    try {
      await api.deleteTask(project.id, task.id);
    } catch (error) {
      toast(error.message, { tone: 'error' });
      return;
    }
    project.tasks = project.tasks.filter((t) => t.id !== task.id);
    refreshTasks();
    const { title, notes, status, priority, due } = task;
    toast(`Deleted \u201c${title}\u201d.`, {
      actionLabel: 'Undo',
      onAction: async () => {
        try {
          const restored = await api.createTask(project.id, { title, notes, status, priority, due });
          if (!destroyed) {
            project.tasks.push(restored);
            refreshTasks();
          }
        } catch (error) {
          toast(error.message, { tone: 'error' });
        }
      },
    });
  }

  /* ---------------------------------------------------- project mutations */
  async function editProject() {
    const saved = await openProjectDialog({ project });
    if (!saved) return;
    project = { ...project, ...saved, tasks: project.tasks };
    renderAll();
    toast('Project updated.');
  }

  async function deleteProject() {
    const n = project.tasks.length;
    const ok = await confirmDialog({
      title: `Delete \u201c${project.name}\u201d?`,
      message: `This permanently removes the project${n ? ` and its ${n} ${plural(n, 'task')}` : ''}. You can\u2019t undo this.`,
      confirmLabel: 'Delete project',
    });
    if (!ok) return;
    try {
      await api.deleteProject(project.id);
      toast('Project deleted.');
      navigate('/dashboard');
    } catch (error) {
      toast(error.message, { tone: 'error' });
    }
  }

  async function changeProjectStatus(event) {
    const select = event.target;
    const previous = project.status;
    try {
      await api.updateProject(project.id, { status: select.value });
      project.status = select.value;
      toast(`Project marked as ${PROJECT_STATUSES.find((s) => s.value === select.value).label.toLowerCase()}.`);
    } catch (error) {
      select.value = previous;
      toast(error.message, { tone: 'error' });
    }
  }

  /* ------------------------------------------------------------ rendering */
  let ring, summaryText, headerSlot, boardEl, toolbarEl;

  function renderHeader() {
    const created = formatDate(toISODate(new Date(project.createdAt)), today);
    const statusId = domId('project-status');
    clear(headerSlot);
    headerSlot.append(
      h('a', { class: 'back-link', href: '#/dashboard' }, icon('arrowLeft', { size: 18 }), 'All projects'),
      h(
        'div',
        { class: 'detail__head' },
        h(
          'div',
          { class: 'detail__intro' },
          h('h1', { class: 'page__title' }, project.name),
          project.description && h('p', { class: 'page__lead' }, project.description),
          h(
            'div',
            { class: 'detail__meta' },
            project.dueDate ? dueChip(project.dueDate, { done: project.status === 'done', today }) : h('span', { class: 'chip chip--due-none' }, icon('calendar', { size: 13 }), 'No due date'),
            h('span', { class: 'detail__created' }, `Created ${created}`),
          ),
          h(
            'div',
            { class: 'detail__actions' },
            h('div', { class: 'inline-field' }, h('label', { for: statusId }, 'Project status'), h('select', { id: statusId, class: 'control control--sm', onChange: changeProjectStatus }, PROJECT_STATUSES.map((s) => h('option', { value: s.value, selected: s.value === project.status }, s.label)))),
            h('button', { type: 'button', class: 'btn btn--secondary btn--sm', onClick: editProject }, icon('edit', { size: 16 }), 'Edit project'),
            h('button', { type: 'button', class: 'btn btn--danger-outline btn--sm', onClick: deleteProject }, icon('trash', { size: 16 }), 'Delete project'),
          ),
        ),
        h('div', { class: 'detail__summary' }, (ring = progressRing(0, { label: 'Project completion' })), (summaryText = h('p', { class: 'detail__summary-text' }))),
      ),
    );
  }

  function renderProgress() {
    const s = projectStats(project, today);
    ring.update(s.pct);
    clear(summaryText);
    summaryText.append(
      h('strong', {}, s.total ? `${s.done} of ${s.total} ${plural(s.total, 'task')} done` : 'No tasks yet'),
      s.doing > 0 && h('span', {}, `${s.doing} in progress`),
      s.overdue > 0 && h('span', { class: 'text-alert' }, `${s.overdue} overdue`),
    );
  }

  function buildToolbar() {
    const searchId = domId('task-search');
    const priorityId = domId('task-priority');
    const rerender = () => keepFocus(renderBoard);
    return h(
      'div',
      { class: 'toolbar toolbar--tasks', role: 'search' },
      h('div', { class: 'toolbar__search' }, h('label', { class: 'visually-hidden', for: searchId }, 'Search tasks'), icon('search', { size: 18, className: 'toolbar__icon' }), h('input', { id: searchId, class: 'control control--search', type: 'search', placeholder: 'Search tasks', autocomplete: 'off', onInput: debounce((e) => { filters.q = e.target.value; rerender(); }, 150) })),
      h('div', { class: 'toolbar__sort' }, h('label', { class: 'toolbar__label', for: priorityId }, 'Priority'), h('select', { id: priorityId, class: 'control', onChange: (e) => { filters.priority = e.target.value; rerender(); } }, h('option', { value: '' }, 'All priorities'), PRIORITIES.map((p) => h('option', { value: p.value }, p.label)))),
      h('button', { type: 'button', class: 'btn btn--primary', onClick: () => addTask('todo') }, icon('plus', { size: 18 }), 'Add task'),
    );
  }

  function renderBoard() {
    clear(boardEl);
    const filtered = filterTasks(project.tasks, filters);
    const filtering = Boolean(filters.q.trim() || filters.priority);

    if (!project.tasks.length) {
      boardEl.append(emptyState({ title: 'No tasks yet', body: 'Break this project into tasks to track progress and deadlines.', action: h('button', { type: 'button', class: 'btn btn--primary', onClick: () => addTask('todo') }, icon('plus', { size: 18 }), 'Add the first task') }));
      return;
    }

    const columns = TASK_STATUSES.map((status) => {
      const tasks = sortTasks(filtered.filter((t) => t.status === status.value));
      const headingId = domId('col');
      const column = h(
        'section',
        {
          class: ['column', `column--${status.value}`],
          'aria-labelledby': headingId,
          onDragOver(e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            column.classList.add('is-over');
          },
          onDragLeave(e) {
            if (!column.contains(e.relatedTarget)) column.classList.remove('is-over');
          },
          onDrop(e) {
            e.preventDefault();
            column.classList.remove('is-over');
            const task = project.tasks.find((t) => t.id === e.dataTransfer.getData('text/plain'));
            if (task) moveTask(task, status.value);
          },
        },
        h('h2', { id: headingId, class: 'column__title' }, status.label, h('span', { class: 'column__count' }, h('span', { class: 'visually-hidden' }, 'Tasks: '), tasks.length)),
        tasks.length
          ? h('ul', { class: 'column__list' }, tasks.map((t) => taskCard(t, { today, onToggle: toggleTask, onMove: moveTask, onEdit: editTask, onDelete: deleteTask })))
          : h('p', { class: 'column__empty' }, filtering ? 'No tasks match the current search or priority.' : status.empty),
        h('button', { type: 'button', class: 'btn btn--ghost btn--sm column__add', onClick: () => addTask(status.value) }, icon('plus', { size: 16 }), h('span', {}, 'Add task'), h('span', { class: 'visually-hidden' }, ` to ${status.label}`)),
      );
      return column;
    });

    boardEl.append(h('div', { class: 'board' }, columns));
  }

  function renderAll() {
    setTitle(`${project.name} \u00b7 Fieldbook`);
    renderHeader();
    renderProgress();
    renderBoard();
  }

  /* ---------------------------------------------------------------- load */
  async function load() {
    clear(content);
    content.append(h('div', { class: 'skeleton-detail', 'aria-hidden': 'true' }, h('span', { class: 'skeleton skeleton--title' }), h('span', { class: 'skeleton' }), h('span', { class: 'skeleton skeleton--bar' })), loadingText('Loading project…'));
    try {
      project = await api.getProject(projectId);
    } catch (error) {
      if (destroyed) return;
      clear(content);
      const notFound = error.status === 404;
      content.append(
        h('a', { class: 'back-link', href: '#/dashboard' }, icon('arrowLeft', { size: 18 }), 'All projects'),
        notFound ? emptyState({ title: 'Project not found', body: 'It may have been deleted, or the link is wrong.', action: h('a', { class: 'btn btn--primary', href: '#/dashboard' }, 'Back to the dashboard') }) : errorState({ message: error.message, onRetry: load }),
      );
      return;
    }
    if (destroyed) return;

    clear(content);
    headerSlot = h('div', { class: 'detail__top' });
    toolbarEl = buildToolbar();
    boardEl = h('div', { class: 'detail__board' });
    content.append(headerSlot, toolbarEl, boardEl);
    renderAll();
  }

  load();
  return {
    el: root,
    destroy() {
      destroyed = true;
    },
  };
}

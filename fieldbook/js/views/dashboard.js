import { h, clear, debounce, domId } from '../utils/dom.js';
import { PROJECT_SORTS, PROJECT_STATUSES } from '../constants.js';
import { api } from '../api/client.js';
import { store } from '../store.js';
import { navigate } from '../router.js';
import { greeting, plural } from '../utils/format.js';
import { buildHash } from '../utils/path.js';
import { filterProjects, sortProjects, workspaceStats } from '../utils/stats.js';
import { emptyState, errorState, loadingText, skeletonCards } from '../components/feedback.js';
import { icon } from '../components/icons.js';
import { openProjectDialog } from '../components/projectForm.js';
import { projectCard } from '../components/projectCard.js';
import { toast } from '../components/toast.js';

const STATUS_FILTERS = [{ value: '', label: 'All' }, ...PROJECT_STATUSES];
const valid = (list, v, fallback) => (list.some((i) => i.value === v) ? v : fallback);

export function DashboardView({ query }) {
  const today = new Date();
  const user = store.get().user;

  const state = {
    projects: [],
    phase: 'loading', // 'loading' | 'ready' | 'error'
    error: '',
    q: query.q || '',
    status: valid(STATUS_FILTERS, query.status, ''),
    sort: valid(PROJECT_SORTS, query.sort, 'updated'),
  };
  let destroyed = false;

  /* ------------------------------------------------------------ actions */
  async function createProject() {
    const project = await openProjectDialog();
    if (!project) return;
    toast('Project created. Add its first tasks below.');
    navigate(`/projects/${encodeURIComponent(project.id)}`);
  }

  const newProjectButton = (className = 'btn btn--primary') =>
    h('button', { type: 'button', class: className, onClick: createProject }, icon('plus', { size: 18 }), 'New project');

  function syncUrl() {
    history.replaceState(null, '', buildHash('/dashboard', { q: state.q.trim(), status: state.status, sort: state.sort === 'updated' ? '' : state.sort }));
  }

  async function load() {
    state.phase = 'loading';
    renderAll();
    try {
      state.projects = await api.listProjects();
      state.phase = 'ready';
    } catch (error) {
      state.phase = 'error';
      state.error = error.message;
    }
    if (!destroyed) renderAll();
  }

  /* ------------------------------------------------------------ toolbar */
  const searchId = domId('project-search');
  const searchInput = h('input', {
    id: searchId,
    class: 'control control--search',
    type: 'search',
    value: state.q,
    placeholder: 'Search projects',
    autocomplete: 'off',
    onInput: debounce((e) => {
      state.q = e.target.value;
      syncUrl();
      renderList();
    }, 150),
  });

  const segmented = h(
    'fieldset',
    { class: 'segmented' },
    h('legend', { class: 'visually-hidden' }, 'Filter by status'),
    STATUS_FILTERS.map((f) =>
      h(
        'label',
        { class: 'segmented__item' },
        h('input', {
          type: 'radio',
          name: 'status-filter',
          value: f.value,
          checked: state.status === f.value,
          onChange: () => {
            state.status = f.value;
            syncUrl();
            renderList();
          },
        }),
        h('span', {}, f.label),
      ),
    ),
  );

  const sortId = domId('project-sort');
  const sortSelect = h(
    'select',
    {
      id: sortId,
      class: 'control',
      onChange: (e) => {
        state.sort = e.target.value;
        syncUrl();
        renderList();
      },
    },
    PROJECT_SORTS.map((s) => h('option', { value: s.value, selected: s.value === state.sort }, s.label)),
  );

  const toolbar = h(
    'div',
    { class: 'toolbar', role: 'search' },
    h('div', { class: 'toolbar__search' }, h('label', { class: 'visually-hidden', for: searchId }, 'Search projects'), icon('search', { size: 18, className: 'toolbar__icon' }), searchInput),
    segmented,
    h('div', { class: 'toolbar__sort' }, h('label', { class: 'toolbar__label', for: sortId }, 'Sort by'), sortSelect),
  );

  /* ------------------------------------------------------------- output */
  const statsEl = h('dl', { class: 'stats' });
  const resultsInfo = h('p', { class: 'results-info', 'aria-live': 'polite' });
  const listEl = h('div', { class: 'dashboard__list' });

  function renderStats() {
    const ready = state.phase === 'ready';
    const s = ready ? workspaceStats(state.projects, today) : null;
    const stat = (label, value, alert = false) =>
      h('div', { class: ['stat', alert && 'stat--alert'] }, h('dt', { class: 'stat__label' }, label), h('dd', { class: 'stat__value tabular' }, ready ? value : '\u2013'));
    clear(statsEl);
    statsEl.append(
      stat('Active projects', s?.activeProjects),
      stat('Open tasks', s?.openTasks),
      stat('Due within a week', s?.dueSoon),
      stat('Overdue', s?.overdue, s?.overdue > 0),
    );
  }

  function renderList() {
    clear(listEl);
    if (state.phase === 'loading') {
      resultsInfo.textContent = '';
      listEl.append(skeletonCards(6), loadingText('Loading your projects…'));
      return;
    }
    if (state.phase === 'error') {
      resultsInfo.textContent = '';
      listEl.append(errorState({ message: state.error, onRetry: load }));
      return;
    }

    const visible = sortProjects(filterProjects(state.projects, { q: state.q, status: state.status }), state.sort, today);
    resultsInfo.textContent = state.projects.length ? `Showing ${visible.length} of ${state.projects.length} ${plural(state.projects.length, 'project')}` : '';

    if (!state.projects.length) {
      listEl.append(emptyState({ title: 'No projects yet', body: 'Create your first project to start tracking tasks and deadlines.', action: newProjectButton() }));
    } else if (!visible.length) {
      listEl.append(
        emptyState({
          title: 'No projects match',
          body: 'Try a different search term or status.',
          action: h(
            'button',
            {
              type: 'button',
              class: 'btn btn--secondary',
              onClick() {
                state.q = '';
                state.status = '';
                searchInput.value = '';
                segmented.querySelector('input[value=""]').checked = true;
                syncUrl();
                renderList();
                searchInput.focus();
              },
            },
            'Clear search and filters',
          ),
        }),
      );
    } else {
      listEl.append(h('ul', { class: 'grid grid--projects', 'aria-label': 'Projects' }, visible.map((p) => projectCard(p, today))));
    }
  }

  function renderAll() {
    renderStats();
    renderList();
  }

  const el = h(
    'div',
    { class: 'container page' },
    h(
      'div',
      { class: 'page__head' },
      h('div', {}, h('h1', { class: 'page__title' }, `${greeting()}, ${user?.name?.split(' ')[0] ?? 'there'}`), h('p', { class: 'page__lead' }, 'Here\u2019s where your projects stand today.')),
      newProjectButton(),
    ),
    statsEl,
    toolbar,
    resultsInfo,
    listEl,
  );

  load();
  return {
    el,
    destroy() {
      destroyed = true;
    },
  };
}

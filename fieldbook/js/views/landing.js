import { h, domId } from '../utils/dom.js';
import { DEMO_ACCOUNT } from '../constants.js';
import { navigate } from '../router.js';
import { signIn } from '../auth.js';
import { store } from '../store.js';
import { icon } from '../components/icons.js';
import { progressBar } from '../components/progress.js';
import { toast } from '../components/toast.js';

const DEMO_TASKS = [
  { label: 'Order packaging samples', done: true },
  { label: 'Photograph the six pin designs', done: true },
  { label: 'Write product copy', done: false },
  { label: 'Set up the preorder page', done: false },
  { label: 'Schedule the launch email', done: false },
];

/** The interactive hero: tick tasks and watch the same progress bar used in the app. */
function demoBoard() {
  const tasks = DEMO_TASKS.map((t) => ({ ...t }));
  const titleId = domId('demo-title');
  const caption = h('p', { class: 'demo__caption', 'aria-live': 'polite' });
  const bar = progressBar(0, { label: 'Spring product drop completion' });

  const refresh = () => {
    const done = tasks.filter((t) => t.done).length;
    bar.update(Math.round((done / tasks.length) * 100));
    caption.textContent = done === tasks.length ? 'All done. Time to launch.' : `${done} of ${tasks.length} tasks done`;
  };

  const list = h(
    'ul',
    { class: 'demo__list' },
    tasks.map((task) => {
      const id = domId('demo-task');
      return h(
        'li',
        { class: 'demo__item' },
        h(
          'label',
          { class: 'demo__label', for: id },
          h('span', { class: 'check' }, h('input', { id, type: 'checkbox', class: 'check__input', checked: task.done, onChange: (e) => { task.done = e.target.checked; refresh(); } }), h('span', { class: 'check__box', 'aria-hidden': 'true' }, icon('check', { size: 14 }))),
          h('span', { class: 'demo__text' }, task.label),
        ),
      );
    }),
  );

  refresh();
  return h(
    'section',
    { class: 'demo', 'aria-labelledby': titleId },
    h('div', { class: 'demo__head' }, h('h2', { id: titleId, class: 'demo__title' }, 'Spring product drop'), h('span', { class: 'chip chip--project-active' }, 'Active')),
    bar,
    caption,
    list,
    h('p', { class: 'demo__hint' }, 'Try it: tick a task. This is the same progress bar you get for every project.'),
  );
}

export function LandingView() {
  const user = store.get().user;
  let busy = false;

  const tryDemo = async (event) => {
    if (busy) return;
    busy = true;
    const button = event.currentTarget;
    button.disabled = true;
    button.textContent = 'Opening demo…';
    try {
      await signIn(DEMO_ACCOUNT);
      navigate('/dashboard');
    } catch (error) {
      toast(error.message, { tone: 'error' });
      button.disabled = false;
      button.textContent = 'Explore the demo';
      busy = false;
    }
  };

  const primary = user
    ? h('a', { class: 'btn btn--primary btn--lg', href: '#/dashboard' }, 'Go to your dashboard')
    : h('button', { type: 'button', class: 'btn btn--primary btn--lg', onClick: tryDemo }, 'Explore the demo');
  const secondary = user ? null : h('a', { class: 'btn btn--secondary btn--lg', href: '#/login' }, 'Sign in');

  const feature = (iconName, title, body) =>
    h('li', { class: 'feature' }, h('span', { class: 'feature__icon' }, icon(iconName, { size: 22 })), h('h3', { class: 'feature__title' }, title), h('p', {}, body));

  const step = (title, body) => h('li', { class: 'step' }, h('h3', { class: 'step__title' }, title), h('p', {}, body));

  const el = h(
    'div',
    { class: 'landing' },
    h(
      'section',
      { class: 'hero' },
      h(
        'div',
        { class: 'container hero__inner' },
        h(
          'div',
          { class: 'hero__copy' },
          h('h1', { class: 'hero__title' }, 'Know what\u2019s done, what\u2019s stuck, and what\u2019s next.'),
          h('p', { class: 'hero__lead' }, 'Fieldbook keeps every project\u2019s tasks, deadlines and progress on one page, so nobody on a small team has to ask where things stand.'),
          h('div', { class: 'hero__actions' }, primary, secondary),
        ),
        demoBoard(),
      ),
    ),
    h(
      'section',
      { class: 'section', 'aria-labelledby': 'features-title' },
      h(
        'div',
        { class: 'container' },
        h('h2', { id: 'features-title', class: 'section__title' }, 'Made for teams juggling a lot of small projects'),
        h(
          'ul',
          { class: 'features' },
          feature('layout', 'Every project at a glance', 'Progress bars and due dates on the dashboard show which projects need attention, before anyone has to ask.'),
          feature('columns', 'Tasks that move', 'Drag a task from To do to Done, or use its status menu. Progress updates the moment you do.'),
          feature('clock', 'Deadlines you can\u2019t miss', 'Overdue and due-soon work is flagged in words as well as colour, so nothing slips quietly past.'),
        ),
      ),
    ),
    h(
      'section',
      { class: 'section section--tinted', 'aria-labelledby': 'steps-title' },
      h('div', { class: 'container' }, h('h2', { id: 'steps-title', class: 'section__title' }, 'Start in three steps'), h('ol', { class: 'steps' }, step('Create a project', 'Name it, add a short description and a due date.'), step('Add tasks', 'Give each one a priority and a deadline.'), step('Move them along', 'Tick tasks off and watch the progress bar fill.'))),
    ),
    h(
      'section',
      { class: 'section cta' },
      h('div', { class: 'container cta__inner' }, h('h2', { class: 'cta__title' }, 'See it with a realistic workspace'), h('p', {}, 'The demo comes with six sample projects, including one that\u2019s running late.'), user ? h('a', { class: 'btn btn--primary btn--lg', href: '#/dashboard' }, 'Go to your dashboard') : h('button', { type: 'button', class: 'btn btn--primary btn--lg', onClick: tryDemo }, 'Explore the demo')),
    ),
  );

  return { el };
}

import { h } from '../utils/dom.js';
import { config } from '../config.js';
import { api, isMock } from '../api/client.js';
import { store } from '../store.js';
import { setTheme } from '../theme.js';
import { navigate } from '../router.js';
import { signOut } from '../auth.js';
import { confirmDialog } from '../components/dialog.js';
import { field } from '../components/field.js';
import { buildForm } from '../components/form.js';
import { icon } from '../components/icons.js';
import { toast } from '../components/toast.js';

const THEMES = [
  { value: 'system', label: 'Match my device', hint: 'Follows your operating system setting.' },
  { value: 'light', label: 'Light', hint: 'Bright surfaces with dark text.' },
  { value: 'dark', label: 'Dark', hint: 'Dim surfaces that are easier on the eyes at night.' },
];

export function SettingsView() {
  const user = store.get().user;

  const profileForm = buildForm({
    fields: { name: field({ label: 'Display name', name: 'name', value: user.name, required: true, autocomplete: 'name', maxlength: 60 }) },
    validate: (v) => (v.name.trim() ? {} : { name: 'Enter your name.' }),
    submitLabel: 'Save profile',
    onSubmit: async (values) => {
      const updated = await api.updateProfile({ name: values.name });
      store.set({ user: updated });
      toast('Profile saved.');
    },
  });

  const themeGroup = h(
    'fieldset',
    { class: 'choice-group' },
    h('legend', { class: 'visually-hidden' }, 'Theme'),
    THEMES.map((t) =>
      h(
        'label',
        { class: 'choice' },
        h('input', { type: 'radio', name: 'theme', value: t.value, checked: store.get().theme === t.value, onChange: () => setTheme(t.value) }),
        h('span', { class: 'choice__text' }, h('span', { class: 'choice__label' }, t.label), h('span', { class: 'choice__hint' }, t.hint)),
      ),
    ),
  );

  async function resetData(event) {
    const button = event.currentTarget;
    const ok = await confirmDialog({ title: 'Reset demo data?', message: 'This replaces everything with the original sample projects. Your changes will be lost.', confirmLabel: 'Reset data' });
    if (!ok) return;
    button.disabled = true;
    try {
      await api.resetData();
      toast('Demo data reset.');
    } catch (error) {
      toast(error.message, { tone: 'error' });
    } finally {
      button.disabled = false;
    }
  }

  const section = (title, ...children) => h('section', { class: 'panel' }, h('h2', { class: 'panel__title' }, title), children);

  const el = h(
    'div',
    { class: 'container page page--narrow' },
    h('h1', { class: 'page__title' }, 'Settings'),
    section('Profile', h('p', { class: 'panel__note' }, `Signed in as ${user.email}`), profileForm),
    section('Appearance', themeGroup),
    section(
      'Data',
      isMock
        ? [h('p', { class: 'panel__note' }, 'Your projects are stored in this browser only. Reset restores the six sample projects.'), h('button', { type: 'button', class: 'btn btn--danger-outline', onClick: resetData }, icon('refresh', { size: 18 }), 'Reset demo data')]
        : h('p', { class: 'panel__note' }, `Connected to ${config.apiBaseUrl}`),
    ),
    section(
      'Session',
      h('button', { type: 'button', class: 'btn btn--secondary', async onClick() { await signOut(); toast('Signed out.'); navigate('/'); } }, icon('logout', { size: 18 }), 'Sign out'),
    ),
  );
  return { el };
}

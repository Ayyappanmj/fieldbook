import { h } from '../utils/dom.js';
import { DEMO_ACCOUNT } from '../constants.js';
import { validateLogin } from '../utils/validate.js';
import { navigate } from '../router.js';
import { signIn } from '../auth.js';
import { field } from '../components/field.js';
import { buildForm } from '../components/form.js';
import { toast } from '../components/toast.js';

/** Only allow in-app redirects such as "/projects/abc" (never external URLs). */
const safeNext = (next) => (typeof next === 'string' && /^\/(?!\/)/.test(next) ? next : '/dashboard');

export function LoginView({ query }) {
  const next = safeNext(query.next);
  const fields = {
    email: field({ label: 'Email', name: 'email', type: 'email', autocomplete: 'email', required: true, placeholder: 'name@example.com' }),
    password: field({ label: 'Password', name: 'password', type: 'password', autocomplete: 'current-password', required: true }),
  };

  const finish = (user) => {
    toast(`Signed in as ${user.name}.`);
    navigate(next);
  };

  const form = buildForm({
    fields,
    validate: validateLogin,
    submitLabel: 'Sign in',
    busyLabel: 'Signing in…',
    submitClass: 'btn btn--primary btn--block',
    onSubmit: async (values) => finish(await signIn({ email: values.email.trim(), password: values.password })),
  });

  const demoButton = h(
    'button',
    {
      type: 'button',
      class: 'btn btn--secondary btn--block',
      async onClick(event) {
        const button = event.currentTarget;
        button.disabled = true;
        try {
          finish(await signIn(DEMO_ACCOUNT));
        } catch (error) {
          toast(error.message, { tone: 'error' });
          button.disabled = false;
        }
      },
    },
    'Use the demo account',
  );

  const el = h(
    'div',
    { class: 'container page page--narrow' },
    h(
      'div',
      { class: 'auth' },
      h('h1', { class: 'page__title' }, 'Sign in to Fieldbook'),
      query.next && h('p', { class: 'notice' }, 'Sign in to continue to that page.'),
      form,
      h('div', { class: 'auth__divider' }, h('span', {}, 'or')),
      demoButton,
      h('p', { class: 'auth__hint' }, 'In this demo, any valid email with a password of 6 or more characters signs you in. The demo account is ', h('code', {}, DEMO_ACCOUNT.email), ' with password ', h('code', {}, DEMO_ACCOUNT.password), '.'),
    ),
  );
  return { el };
}

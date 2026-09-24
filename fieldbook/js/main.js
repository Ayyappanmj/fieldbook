/**
 * Application entry point: wires up theme, session, header/footer and routes.
 */
import { api } from './api/client.js';
import { signOut } from './auth.js';
import { createFooter, createHeader } from './components/header.js';
import { toast } from './components/toast.js';
import { navigate, startRouter } from './router.js';
import { store } from './store.js';
import { initTheme } from './theme.js';
import { DashboardView } from './views/dashboard.js';
import { LandingView } from './views/landing.js';
import { LoginView } from './views/login.js';
import { NotFoundView } from './views/notFound.js';
import { ProjectDetailView } from './views/projectDetail.js';
import { SettingsView } from './views/settings.js';

/** Route table. `auth` routes need a session; `guestOnly` routes redirect signed-in users. */
const routes = [
  { path: '/', title: '', view: LandingView },
  { path: '/login', title: 'Sign in', view: LoginView, guestOnly: true },
  { path: '/dashboard', title: 'Dashboard', view: DashboardView, auth: true },
  { path: '/projects/:id', title: 'Project', view: ProjectDetailView, auth: true },
  { path: '/settings', title: 'Settings', view: SettingsView, auth: true },
];
const notFound = { title: 'Page not found', view: NotFoundView };

function guard(route, { path }) {
  const { user } = store.get();
  if (route.auth && !user) return { path: '/login', query: { next: path } };
  if (route.guestOnly && user) return { path: '/dashboard' };
  return null;
}

async function boot() {
  initTheme();
  store.set({ user: await api.getSession().catch(() => null) });

  const header = createHeader({
    async onSignOut() {
      await signOut();
      toast('Signed out.');
      navigate('/');
    },
  });
  document.getElementById('app-header').append(header.el);
  document.getElementById('app-footer').append(createFooter());
  store.subscribe((state) => header.update(state));

  // Skip link: hash links would trigger the router, so move focus manually.
  const main = document.getElementById('main');
  document.querySelector('.skip-link').addEventListener('click', (event) => {
    event.preventDefault();
    main.focus();
  });

  // Any 401 from the API ends the session everywhere in the same way.
  api.onUnauthorized(() => {
    store.set({ user: null });
    toast('Your session has ended. Sign in again to continue.', { tone: 'error' });
    navigate('/login');
  });

  startRouter({
    routes,
    notFound,
    guard,
    outlet: main,
    onChange: ({ path }) => store.set({ path }),
  });
  header.update(store.get());
}

boot();

/**
 * Hash-based router (#/dashboard, #/projects/abc).
 *
 * Hash routing works on any static host (including GitHub Pages) without server
 * rewrites. Each route maps to a view factory returning `{ el, destroy? }`.
 * The router also handles auth guards, document titles, scroll reset and
 * focus management so keyboard and screen-reader users land in the right place.
 */
import { buildHash, matchPath, parseHash } from './utils/path.js';

let config = null;
let current = null; // the mounted view
let firstRender = true;

/** @param {{routes: Array, outlet: HTMLElement, notFound: Function, guard?: Function, onChange?: Function}} options */
export function startRouter(options) {
  config = options;
  window.addEventListener('hashchange', resolve);
  resolve();
}

/** Go to a route. Re-resolves in place if the hash would not change. */
export function navigate(path, { replace = false, query } = {}) {
  const hash = buildHash(path, query);
  if (location.hash === hash) return resolve();
  if (replace) location.replace(hash);
  else location.hash = hash;
}

export const refresh = () => resolve();

function resolve() {
  const { routes, outlet, notFound, guard, onChange } = config;
  const { path, query } = parseHash(location.hash);

  let route = null;
  let params = {};
  for (const candidate of routes) {
    const match = matchPath(candidate.path, path);
    if (match) {
      route = candidate;
      params = match;
      break;
    }
  }
  route ??= notFound;

  const redirect = guard?.(route, { path, query });
  if (redirect) return navigate(redirect.path, { replace: true, query: redirect.query });

  current?.destroy?.();
  outlet.replaceChildren();

  const setTitle = (title) => {
    document.title = title;
    document.getElementById('route-announcer').textContent = title;
  };

  current = route.view({ params, query, setTitle });
  outlet.append(current.el);
  setTitle(route.title ? `${route.title} \u00b7 Fieldbook` : 'Fieldbook \u00b7 Project and task tracker');
  window.scrollTo(0, 0);

  // Move focus to <main> after in-app navigation (but leave first page load alone).
  if (!firstRender) outlet.focus({ preventScroll: true });
  firstRender = false;

  onChange?.({ path, query });
}

/** Route path helpers (pure, no DOM access, so they can be unit tested in Node). */

/**
 * Match a concrete path against a pattern such as '/projects/:id'.
 * Returns a params object on success, or null when the path does not match.
 */
export function matchPath(pattern, path) {
  const a = pattern.split('/').filter(Boolean);
  const b = path.split('/').filter(Boolean);
  if (a.length !== b.length) return null;
  const params = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith(':')) {
      try {
        params[a[i].slice(1)] = decodeURIComponent(b[i]);
      } catch {
        return null;
      }
    } else if (a[i] !== b[i]) {
      return null;
    }
  }
  return params;
}

/** Split '#/dashboard?q=x' into { path: '/dashboard', query: { q: 'x' } }. */
export function parseHash(hash) {
  const raw = (hash || '').replace(/^#/, '') || '/';
  const [pathPart, queryPart = ''] = raw.split('?');
  const path = '/' + pathPart.split('/').filter(Boolean).join('/');
  return { path, query: Object.fromEntries(new URLSearchParams(queryPart)) };
}

export function buildHash(path, query = {}) {
  const qs = new URLSearchParams(Object.entries(query).filter(([, v]) => v !== '' && v != null)).toString();
  return `#${path}${qs ? `?${qs}` : ''}`;
}

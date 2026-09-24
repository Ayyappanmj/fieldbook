/** A tiny observable store: enough shared state for auth, theme and route. */
export function createStore(initial) {
  let state = initial;
  const listeners = new Set();
  return {
    get: () => state,
    set(patch) {
      state = { ...state, ...patch };
      listeners.forEach((fn) => fn(state));
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

export const store = createStore({
  user: null, // { name, email } when signed in
  theme: 'system', // 'light' | 'dark' | 'system'
  path: '/', // current route path, used for aria-current in the header
});

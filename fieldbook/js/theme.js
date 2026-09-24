/**
 * Light / dark / system theme handling.
 * The resolved theme is written to <html data-theme="..."> and the CSS does the rest.
 * A tiny inline script in index.html applies it before first paint to avoid a flash.
 */
import { storage } from './utils/storage.js';
import { store } from './store.js';

const KEY = 'fieldbook:theme';
const media = window.matchMedia('(prefers-color-scheme: dark)');

const resolve = (pref) => (pref === 'system' ? (media.matches ? 'dark' : 'light') : pref);

export function applyTheme(pref = store.get().theme) {
  document.documentElement.setAttribute('data-theme', resolve(pref));
}

export function setTheme(pref) {
  storage.set(KEY, pref);
  store.set({ theme: pref });
  applyTheme(pref);
}

/** Flip between light and dark based on what is currently showing. */
export function toggleTheme() {
  setTheme(resolve(store.get().theme) === 'dark' ? 'light' : 'dark');
}

export const currentTheme = () => resolve(store.get().theme);

export function initTheme() {
  const saved = storage.get(KEY, 'system');
  store.set({ theme: saved });
  applyTheme(saved);
  media.addEventListener('change', () => store.get().theme === 'system' && applyTheme());
}

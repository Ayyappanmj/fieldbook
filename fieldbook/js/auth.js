/** Sign-in / sign-out that keep the shared store in sync with the API. */
import { api } from './api/client.js';
import { store } from './store.js';

export async function signIn(credentials) {
  const user = await api.login(credentials);
  store.set({ user });
  return user;
}

export async function signOut() {
  try {
    await api.logout();
  } finally {
    store.set({ user: null });
  }
}

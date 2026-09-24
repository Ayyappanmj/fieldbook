/**
 * Tiny wrapper around localStorage that never throws.
 * Falls back to an in-memory Map when storage is unavailable
 * (private mode, quota exceeded, or running under Node for tests).
 */
const memory = new Map();

export const storage = {
  get(key, fallback = null) {
    try {
      const raw = globalThis.localStorage?.getItem(key);
      if (raw != null) return JSON.parse(raw);
    } catch {
      /* fall through to memory */
    }
    return memory.has(key) ? memory.get(key) : fallback;
  },

  set(key, value) {
    memory.set(key, value);
    try {
      globalThis.localStorage?.setItem(key, JSON.stringify(value));
    } catch {
      /* memory copy is enough */
    }
  },

  remove(key) {
    memory.delete(key);
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};

/**
 * The single entry point the UI uses to talk to "the back end".
 *
 * It picks an adapter based on config.apiMode and wraps every call so that a
 * 401 response anywhere in the app triggers one shared "session expired" flow.
 */
import { config } from '../config.js';
import { httpAdapter } from './httpAdapter.js';
import { mockAdapter } from './mockAdapter.js';
import { ApiError } from './ApiError.js';

const adapter = config.apiMode === 'http' ? httpAdapter : mockAdapter;
const unauthorizedHandlers = new Set();

const wrap = (fn) => async (...args) => {
  try {
    return await fn(...args);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401 && fn !== adapter.login) {
      unauthorizedHandlers.forEach((handler) => handler(error));
    }
    throw error;
  }
};

export const api = Object.fromEntries(Object.entries(adapter).map(([name, fn]) => [name, wrap(fn)]));

/** Register a callback that runs whenever any request comes back 401. */
api.onUnauthorized = (handler) => {
  unauthorizedHandlers.add(handler);
  return () => unauthorizedHandlers.delete(handler);
};

export const isMock = config.apiMode !== 'http';

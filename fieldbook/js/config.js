/**
 * Runtime configuration.
 *
 * Override any value before the app loads by defining `window.FIELDBOOK_CONFIG`
 * (see the commented <script> block in index.html), e.g. to point the UI at a
 * real REST back end:
 *
 *   window.FIELDBOOK_CONFIG = { apiMode: 'http', apiBaseUrl: 'http://localhost:3000/api' };
 */
const defaults = {
  /** 'mock' keeps all data in the browser (localStorage). 'http' talks to a REST API. */
  apiMode: 'mock',
  /** Base URL of the REST API when apiMode is 'http'. */
  apiBaseUrl: 'http://localhost:3000/api',
  /** Simulated network delay for the mock API, in milliseconds. */
  mockLatencyMs: 350,
  /** localStorage key prefix. */
  storageKey: 'fieldbook:v1',
};

export const config = { ...defaults, ...(globalThis.FIELDBOOK_CONFIG || {}) };

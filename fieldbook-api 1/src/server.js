/**
 * Entry point: creates the repository (memory or Postgres, per config),
 * wires up every route, and starts listening.
 */
import http from 'node:http';
import { config } from './config.js';
import { createRouter } from './router.js';
import { createRepository } from './repositories/index.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerMeRoutes } from './routes/me.js';
import { registerProjectRoutes } from './routes/projects.js';
import { registerTaskRoutes } from './routes/tasks.js';

export async function createApp() {
  const repo = await createRepository();
  const router = createRouter();

  registerAuthRoutes(router, repo);
  registerMeRoutes(router, repo);
  registerProjectRoutes(router, repo);
  registerTaskRoutes(router, repo);

  const server = http.createServer((req, res) => {
    // A minimal CORS layer, since the front end and API are typically served
    // from different origins in development (see the front-end project's
    // FIELDBOOK_CONFIG.apiBaseUrl).
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      return res.end();
    }
    router.handle(req, res);
  });

  return { server, repo };
}

// Only auto-start when run directly (`node src/server.js`), not when
// imported by tests — tests create their own app instance per test file so
// they can run in parallel without port clashes.
if (import.meta.url === `file://${process.argv[1]}`) {
  const { server } = await createApp();
  server.listen(config.port, () => {
    console.log(`Fieldbook API listening on http://localhost:${config.port} (DB_MODE=${config.dbMode})`);
  });
}

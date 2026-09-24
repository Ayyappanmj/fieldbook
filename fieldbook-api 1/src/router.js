/**
 * A minimal HTTP router built directly on Node's built-in `http` module —
 * no Express. This mirrors the front end's own zero-dependency philosophy
 * (see scripts/serve.mjs in the front-end project): a small hand-rolled
 * router is easy to read in full, and keeps this project's only real
 * dependency (`pg`) confined to the one file that actually needs it.
 */
import { ApiError } from './errors/ApiError.js';

/** Match a concrete path against a pattern such as '/projects/:id'. */
function matchPath(pattern, path) {
  const a = pattern.split('/').filter(Boolean);
  const b = path.split('/').filter(Boolean);
  if (a.length !== b.length) return null;
  const params = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith(':')) params[a[i].slice(1)] = decodeURIComponent(b[i]);
    else if (a[i] !== b[i]) return null;
  }
  return params;
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new ApiError('The request body must be valid JSON.', 400);
  }
}

export function createRouter() {
  const routes = []; // { method, pattern, middlewares, handler }

  const register = (method) => (pattern, ...fns) => {
    const handler = fns.pop();
    routes.push({ method, pattern, middlewares: fns, handler });
  };

  const api = {
    get: register('GET'),
    post: register('POST'),
    patch: register('PATCH'),
    delete: register('DELETE'),

    async handle(req, res) {
      const url = new URL(req.url, 'http://localhost');
      const path = url.pathname.replace(/\/+$/, '') || '/';

      res.json = (status, data) => {
        const body = JSON.stringify(data);
        res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body) });
        res.end(body);
      };
      res.noContent = () => {
        res.writeHead(204);
        res.end();
      };

      const match = routes.find((r) => r.method === req.method && matchPath(r.pattern, path));
      if (!match) return res.json(404, { message: 'No such endpoint.' });

      req.params = matchPath(match.pattern, path);
      req.query = Object.fromEntries(url.searchParams);

      try {
        if (['POST', 'PATCH', 'PUT'].includes(req.method)) req.body = await readJsonBody(req);
        for (const mw of match.middlewares) await mw(req, res);
        await match.handler(req, res);
      } catch (error) {
        if (error instanceof ApiError) {
          return res.json(error.status, { message: error.message, ...(error.errors ? { errors: error.errors } : {}) });
        }
        // Never leak internal error details to the client.
        console.error('[fieldbook-api] unhandled error:', error);
        res.json(500, { message: 'Something went wrong on our end. Please try again.' });
      }
    },
  };

  return api;
}

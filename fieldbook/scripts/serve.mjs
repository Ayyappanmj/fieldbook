#!/usr/bin/env node
/**
 * Zero-dependency static file server for local development.
 *
 *   node scripts/serve.mjs          (default port 5173, override with PORT=8080)
 *
 * The app is plain ES modules, which browsers refuse to load from file://,
 * so it must be served over http. Any static server works; this one just
 * removes the need to install anything.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.md': 'text/plain; charset=utf-8',
};

export function createAppServer() {
  return createServer(async (req, res) => {
    try {
      let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      if (pathname.endsWith('/')) pathname += 'index.html';
      const file = normalize(join(root, pathname));

      // Never serve files outside the project folder.
      if (file !== root.slice(0, -1) && !file.startsWith(root)) {
        res.writeHead(403).end('Forbidden');
        return;
      }
      if (!(await stat(file)).isFile()) throw new Error('not a file');

      res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(await readFile(file));
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT) || 5173;
  createAppServer().listen(port, () => console.log(`Fieldbook is running at http://localhost:${port}`));
}

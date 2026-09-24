# Fieldbook API

The real backend for [Fieldbook](../fieldbook), built from the system
architecture plan (Project Planning & System Architecture document): a
Node.js REST API implementing the exact contract the front end's
`js/api/httpAdapter.js` already expects, backed by a swappable storage layer
(in-memory for development and testing, PostgreSQL for production).

**Zero required dependencies to run and test it.** The one real dependency,
[`pg`](https://www.npmjs.com/package/pg), is only imported when you actually
switch on PostgreSQL — the default in-memory mode needs nothing beyond
Node.js itself.

## Quick start

```bash
npm start
# → Fieldbook API listening on http://localhost:4000 (DB_MODE=memory)
```

That's it — no database, no `npm install`, no environment variables required.
It starts pre-seeded with the same demo account and six sample projects as
the front end's own mock data, so you can point the existing front end at it
immediately:

```html
<!-- in the front-end project's index.html -->
<script>
  window.FIELDBOOK_CONFIG = { apiMode: 'http', apiBaseUrl: 'http://localhost:4000' };
</script>
```

Then sign in with **demo@fieldbook.dev** / **fieldbook**, exactly as with the
mock adapter — except now every request is a real HTTP round trip to this
server, and the data lives in the server's memory (or a real database, once
you switch modes) instead of the browser's `localStorage`.

## Testing

```bash
npm test
```

25 tests, all passing, in two layers:

- **Unit tests** (`tests/unit/`) — validation rules, password hashing,
  session token signing/verification, and the in-memory repository's full
  CRUD and multi-user isolation behaviour.
- **Integration tests** (`tests/integration/`) — a real instance of this
  server, started fresh for the test run, exercised only through actual HTTP
  requests (`fetch`), covering the full auth → project → task lifecycle,
  every documented error code (400/401/404/422), and that one user's data is
  never reachable by another user's token.

This project was also verified against the real, unmodified front end: with
the front end's `apiMode` set to `'http'` and pointed at a running instance
of this server, a full browser session (sign in, load the dashboard, open a
project, create a project, add a task, reload the page, mark a task done)
was driven end-to-end with zero console or page errors, confirming the two
projects genuinely interoperate rather than merely matching on paper.

## Project structure

```
src/
  server.js               Entry point: wires the repository and routes together
  router.js                Minimal HTTP router (no Express — see "Why no framework?")
  config.js                Environment-based configuration
  constants.js             The shared demo account
  errors/ApiError.js       Thrown anywhere; the router turns it into the HTTP response
  lib/
    password.js             scrypt password hashing (Node built-in, no bcrypt needed)
    token.js                 Signed session tokens (HMAC — a JWT in spirit, no dependency)
    validate.js               Server-side validation, kept identical to the front end's rules
  repositories/
    index.js                 Picks memory or Postgres based on DB_MODE
    memoryRepository.js       Default: an in-memory implementation, fully tested
    postgresRepository.js      Production: the same interface against real PostgreSQL
    seed.js                    Demo account + six sample projects, mirroring the front end's mock data
  middleware/auth.js        Verifies the Authorization: Bearer <token> header
  routes/
    auth.js                   POST /auth/login, /auth/register, /auth/logout
    me.js                      GET/PATCH /me
    projects.js                 GET/POST /projects, GET/PATCH/DELETE /projects/:id
    tasks.js                     POST/PATCH/DELETE .../tasks[/:taskId]
tests/
  unit/                      Pure logic — no server, no network
  integration/                A real running server, driven only by fetch
schema.sql                 PostgreSQL schema matching the architecture plan's ER diagram
.env.example               Every environment variable, documented
```

## API reference

Every endpoint below matches the architecture plan's API table and the front
end's `httpAdapter.js` exactly, so pointing the existing front end at this
server requires only the one-line `FIELDBOOK_CONFIG` change shown above —
no front-end code changes.

| Method & path | Auth | Body | Returns |
|---|---|---|---|
| `POST /auth/login` | – | `{ email, password }` | `{ token, user }` |
| `POST /auth/register` | – | `{ email, password, name }` | `{ token, user }` (201) |
| `POST /auth/logout` | required | – | 204 |
| `GET /me` | required | – | current user |
| `PATCH /me` | required | `{ name }` | updated user |
| `GET /projects` | required | – | array of projects, each with nested `tasks` |
| `GET /projects/:id` | required | – | one project |
| `POST /projects` | required | `{ name, description, status, dueDate }` | created project (201) |
| `PATCH /projects/:id` | required | any of the above fields | updated project |
| `DELETE /projects/:id` | required | – | 204 |
| `POST /projects/:id/tasks` | required | `{ title, notes, status, priority, due }` | created task (201) |
| `PATCH /projects/:id/tasks/:taskId` | required | any of the above fields | updated task |
| `DELETE /projects/:id/tasks/:taskId` | required | – | 204 |

"Auth: required" means an `Authorization: Bearer <token>` header, obtained
from `/auth/login` or `/auth/register`. A missing, invalid, expired, or
revoked (logged-out) token gets a `401`. Validation failures return `422`
with `{ message, errors: { field: "message" } }`. Every project and task
route enforces per-user ownership: asking for or modifying another user's
project returns `404`, not `403` — so a stranger can't even confirm the
project exists.

## Differences from the front-end mock

The front end's `mockAdapter.js` is a browser-only stand-in and, by design,
lets *any* syntactically valid email and 6+ character password "sign in" as
a brand-new demo account — there's no real password to check. A real,
multi-user backend can't do that: this server checks a genuine password hash
and rejects unknown emails or wrong passwords with `401`. To keep the demo
experience identical, this server seeds the same **demo@fieldbook.dev /
fieldbook** account with the same six sample projects, so the front end's
existing "Explore the demo" and "Use the demo account" buttons work exactly
as before. Creating other accounts for real now goes through the new
`POST /auth/register` endpoint (not yet wired into the front-end UI, since
the current design has no sign-up screen — a natural next feature).

## Running against real PostgreSQL

The in-memory mode above is genuinely tested and safe to build against, but
resets every time the process restarts. For persistent, production storage:

```bash
npm install pg                 # not preinstalled — this is the one real dependency
createdb fieldbook
psql fieldbook -f schema.sql
cp .env.example .env           # then fill in DATABASE_URL and a real JWT_SECRET
DB_MODE=postgres node src/server.js
```

`src/repositories/postgresRepository.js` implements the exact same interface
as the in-memory repository against this schema, using parameterised queries
throughout. Every route handler is written only against that shared
interface, so switching storage engines never touches routing, validation,
or auth code. This repository could not be executed inside the sandbox this
project was built in (no `pg` package and no PostgreSQL instance available
there), so while it has been carefully written and reviewed against the
schema, it has not been run against a live database — test it against a
real PostgreSQL instance before trusting it with real data.

## Why no framework?

Like the front end's own zero-dependency static server
(`scripts/serve.mjs`), this API is built directly on Node's built-in `http`
module rather than Express — `src/router.js` is under 90 lines and easy to
read in full. This keeps the project's only genuine third-party dependency
(`pg`) confined to the one file that needs it, and means the entire
in-memory mode of the API — the mode that's actually tested here — has zero
installation step at all.

## Security notes

- Passwords are hashed with `scrypt` (Node's built-in, memory-hard KDF), a
  random salt per password, and constant-time comparison on verify.
- Session tokens are HMAC-signed and carry an expiry, but are also checked
  against a live "session" record on every request — so logging out (or a
  future "sign out everywhere") actually revokes access immediately, rather
  than only working once the token's own expiry passes.
- A basic in-memory rate limiter throttles repeated login attempts per IP;
  the architecture plan's suggested next step of backing this with Redis
  (see the architecture plan, Section 7.1) would matter once this API runs
  as more than one instance.
- `JWT_SECRET` has an insecure development default and the server refuses to
  start with that default when `NODE_ENV=production`.

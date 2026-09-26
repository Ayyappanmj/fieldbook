# Fieldbook API — API Documentation

Base URL (local development): `http://localhost:4000`

All request and response bodies are JSON. Every response has
`Content-Type: application/json; charset=utf-8`, except `204 No Content`
responses, which have no body.

## Contents

- [Authentication](#authentication)
- [Conventions](#conventions)
- [Data models](#data-models)
- [Errors](#errors)
- [Endpoints](#endpoints)
  - [Auth](#auth)
  - [Current user](#current-user)
  - [Projects](#projects)
  - [Tasks](#tasks)
- [Rate limiting](#rate-limiting)
- [curl walkthrough](#curl-walkthrough)

## Authentication

The API uses bearer session tokens, obtained from `POST /auth/login` or
`POST /auth/register`. Send the token on every other request:

```
Authorization: Bearer <token>
```

A token is a compact, HMAC-signed string (comparable in purpose to a JWT).
It carries an expiry (7 days by default) and is also checked against a live
session record on the server, so `POST /auth/logout` revokes it immediately
rather than waiting for it to expire. A missing, malformed, expired, or
revoked token gets `401 Unauthorized` on every protected endpoint.

## Conventions

- **Dates** (`dueDate`, `due`) are plain `YYYY-MM-DD` strings, or `""` for
  "no date set" — never `null`.
- **Timestamps** (`createdAt`, `updatedAt`) are ISO 8601 strings in UTC.
- **IDs** are strings (UUIDs in the PostgreSQL storage engine).
- **Partial updates**: every `PATCH` endpoint accepts any subset of the
  fields listed for it. Fields you omit are left unchanged; the full,
  merged object is validated before saving, so you cannot use a partial
  update to leave a record in an invalid state (e.g. clearing a required
  field).
- **Ownership**: every project and task belongs to exactly one user. Asking
  for or modifying a project (or its tasks) that belongs to someone else
  returns `404`, identical to the response for an ID that doesn't exist at
  all — the API never confirms that another user's data exists.

## Data models

### User
| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `email` | string | Unique. Used to sign in. |
| `name` | string | Display name. |

*(The password hash is never included in any API response.)*

### Project
| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `name` | string | 1–60 characters. |
| `description` | string | 0–280 characters. |
| `status` | string | One of `active`, `hold`, `done`. |
| `dueDate` | string | `YYYY-MM-DD`, or `""`. |
| `createdAt` | string | ISO 8601 timestamp. |
| `updatedAt` | string | ISO 8601 timestamp. Bumped whenever the project or any of its tasks changes. |
| `tasks` | Task[] | Only present on `GET /projects` and `GET /projects/:id`. |

### Task
| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `title` | string | 1–100 characters. |
| `notes` | string | 0–500 characters. |
| `status` | string | One of `todo`, `doing`, `done`. |
| `priority` | string | One of `low`, `medium`, `high`. |
| `due` | string | `YYYY-MM-DD`, or `""`. |
| `createdAt` | string | ISO 8601 timestamp. |

## Errors

Every error response has this shape:

```json
{
  "message": "Some fields need attention.",
  "errors": { "name": "Give the project a name." }
}
```

`errors` is only present for `422` field-validation failures; every other
error has just a `message`.

| Status | Meaning | When it happens |
|---|---|---|
| 400 | Bad request | The request body is not valid JSON. |
| 401 | Unauthorized | Missing/invalid/expired/revoked token; or, on `/auth/login`, wrong email/password. |
| 404 | Not found | The resource doesn't exist, or belongs to a different user. |
| 422 | Validation failed | One or more fields failed validation. See `errors` for details, field by field. |
| 429 | Too many requests | More than 10 login attempts from the same address within 15 minutes. |
| 500 | Server error | An unexpected failure. The message is generic on purpose; details are only logged server-side. |

## Endpoints

### Auth

#### `POST /auth/login`
Sign in with an existing account.

**Auth required:** No

**Body**
| Field | Type | Required | Notes |
|---|---|---|---|
| `email` | string | Yes | |
| `password` | string | Yes | 6+ characters. |

**Success — `200 OK`**
```json
{
  "token": "eyJzdWIiOiJ1c2VyLTEiLCJzaWQiOiJzZXNzaW9uLTEiLCJpYXQiOjE3Mzk...",
  "user": { "id": "u-1", "email": "demo@fieldbook.dev", "name": "Sam Rivera" }
}
```

**Errors:** `422` (bad email format / password too short), `401` (unknown
email or wrong password), `429` (too many attempts).

---

#### `POST /auth/register`
Create a new account and sign in as it in one step.

> Not currently called by the Fieldbook front end (which has no sign-up
> screen yet), but fully implemented and tested — see the project README,
> "Differences from the front-end mock".

**Auth required:** No

**Body**
| Field | Type | Required | Notes |
|---|---|---|---|
| `email` | string | Yes | Must not already be registered. |
| `password` | string | Yes | 6+ characters. |
| `name` | string | Yes | 1–60 characters. |

**Success — `201 Created`** — same shape as `POST /auth/login`.

**Errors:** `422` (bad input, or email already registered).

---

#### `POST /auth/logout`
Revoke the current session. The token used in the request immediately stops
working.

**Auth required:** Yes

**Body:** none

**Success — `204 No Content`**

**Errors:** `401`.

### Current user

#### `GET /me`
Return the signed-in user.

**Auth required:** Yes

**Success — `200 OK`**
```json
{ "id": "u-1", "email": "demo@fieldbook.dev", "name": "Sam Rivera" }
```

---

#### `PATCH /me`
Update the signed-in user's display name.

**Auth required:** Yes

**Body**
| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | Yes | Non-empty. |

**Success — `200 OK`** — the updated user, same shape as `GET /me`.

**Errors:** `422` (empty name).

### Projects

#### `GET /projects`
List every project owned by the signed-in user, newest-updated first, each
with its tasks nested inside.

**Auth required:** Yes

**Success — `200 OK`**
```json
[
  {
    "id": "p-1",
    "name": "Spring product drop",
    "description": "Ship the limited-run enamel pin collection.",
    "status": "active",
    "dueDate": "2026-10-06",
    "createdAt": "2026-09-01T09:00:00.000Z",
    "updatedAt": "2026-09-24T08:00:00.000Z",
    "tasks": [
      { "id": "t-1", "title": "Order packaging samples", "notes": "", "status": "done", "priority": "medium", "due": "2026-09-15", "createdAt": "2026-09-01T09:00:00.000Z" }
    ]
  }
]
```

---

#### `GET /projects/:id`
Get one project (with its tasks) by ID.

**Auth required:** Yes

**Path parameters:** `id` — the project ID.

**Success — `200 OK`** — one project object, same shape as an item from
`GET /projects`.

**Errors:** `404` (no such project, or it belongs to another user).

---

#### `POST /projects`
Create a new project.

**Auth required:** Yes

**Body**
| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | Yes | 1–60 characters. |
| `description` | string | No | 0–280 characters. Defaults to `""`. |
| `status` | string | No | `active` \| `hold` \| `done`. Defaults to `active`. |
| `dueDate` | string | No | `YYYY-MM-DD`. Defaults to `""`. |

**Success — `201 Created`** — the new project, with `tasks: []`.

**Errors:** `422`.

---

#### `PATCH /projects/:id`
Update a project. Accepts any subset of the `POST /projects` fields.

**Auth required:** Yes

**Success — `200 OK`** — the updated project, with its current tasks.

**Errors:** `404`, `422`.

---

#### `DELETE /projects/:id`
Delete a project and all of its tasks.

**Auth required:** Yes

**Success — `204 No Content`**

**Errors:** `404`.

### Tasks

#### `POST /projects/:id/tasks`
Add a task to a project.

**Auth required:** Yes

**Path parameters:** `id` — the parent project's ID.

**Body**
| Field | Type | Required | Notes |
|---|---|---|---|
| `title` | string | Yes | 1–100 characters. |
| `notes` | string | No | 0–500 characters. Defaults to `""`. |
| `status` | string | No | `todo` \| `doing` \| `done`. Defaults to `todo`. |
| `priority` | string | No | `low` \| `medium` \| `high`. Defaults to `medium`. |
| `due` | string | No | `YYYY-MM-DD`. Defaults to `""`. |

**Success — `201 Created`** — the new task.

**Errors:** `404` (no such project), `422`.

---

#### `PATCH /projects/:id/tasks/:taskId`
Update a task. Accepts any subset of the `POST .../tasks` fields — this is
the endpoint the front end calls when a task is dragged to a new column
(`{ "status": "doing" }`) or its status dropdown is changed.

**Auth required:** Yes

**Success — `200 OK`** — the updated task.

**Errors:** `404` (no such project or task), `422`.

---

#### `DELETE /projects/:id/tasks/:taskId`
Delete a task.

**Auth required:** Yes

**Success — `204 No Content`**

**Errors:** `404`.

## Rate limiting

`POST /auth/login` is limited to 10 attempts per IP address per 15-minute
window; further attempts get `429 Too Many Requests` until the window rolls
over. This is currently tracked in-process (see the project README, "Security
notes") — a multi-instance production deployment would back this with a
shared store such as Redis instead.

## curl walkthrough

```bash
# 1. Sign in and capture the token
TOKEN=$(curl -s -X POST http://localhost:4000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@fieldbook.dev","password":"fieldbook"}' \
  | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).token))")

# 2. List projects
curl -s http://localhost:4000/projects -H "Authorization: Bearer $TOKEN"

# 3. Create a project
curl -s -X POST http://localhost:4000/projects \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"New project","description":"Created via curl"}'

# 4. Add a task to it (replace :id with the id returned above)
curl -s -X POST http://localhost:4000/projects/:id/tasks \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"title":"First task","priority":"high"}'

# 5. Sign out (revokes the token)
curl -s -X POST http://localhost:4000/auth/logout -H "Authorization: Bearer $TOKEN"
```

# Fieldbook

A responsive project and task tracker, built as a front-end coursework
project. Fieldbook shows every project's progress, tasks and deadlines on one
page, so it's obvious at a glance what's done, what's stuck, and what's next.

**[Live demo screenshots below](#screens) · No build step · No framework · No dependencies to run it**

## Contents

- [Quick start](#quick-start)
- [What's included](#whats-included)
- [Design decisions](#design-decisions)
- [Architecture](#architecture)
- [Accessibility](#accessibility)
- [Testing](#testing)
- [Connecting a real back end](#connecting-a-real-back-end)
- [Project structure](#project-structure)
- [Development process](#development-process)
- [Known limitations](#known-limitations--if-i-had-more-time)

## Quick start

Fieldbook is plain HTML/CSS/JavaScript (ES modules) with no build step. Because
browsers block ES modules loaded from `file://`, it needs to be served over
HTTP — any static server works.

```bash
# Option 1: no dependencies at all
node scripts/serve.mjs
# → Fieldbook is running at http://localhost:5173

# Option 2: if you have Python
npm run start:python

# Option 3: any other static server (e.g. `npx serve .`, VS Code Live Server) also works
```

Then open the URL and either:

- click **Explore the demo** on the home page, or
- sign in with **demo@fieldbook.dev** / **fieldbook** on the sign-in page, or
- sign in with *any* email-shaped address and a password of 6+ characters — the mock API accepts it as a new account with an empty workspace.

All data is stored in your browser's `localStorage`. Nothing is sent to a
server. Use **Settings → Reset demo data** to restore the six sample projects
at any time.

## What's included

- **Three interconnected views** plus sign-in and settings: a **landing page**
  with a live interactive demo, a **dashboard** listing every project with
  search/filter/sort, and a **project detail** page with a three-column task
  board (To do / In progress / Done).
- **Full CRUD** on both projects and tasks: create, read, update, delete —
  with optimistic UI updates, inline validation, and an **undo** option after
  deleting a task.
- **Two ways to move a task**: native HTML5 drag-and-drop between columns, or
  an accessible `<select>` status menu on every task card (so drag-and-drop
  is never the *only* way to do something).
- **Light, dark and "match my device" themes**, persisted across visits, with
  no flash of the wrong theme on load.
- **Responsive layout** from a 320px phone up to a wide desktop screen, with a
  collapsing navigation menu below ~48rem.
- **Realistic seed data**: six sample projects with dates generated relative
  to today, so the dashboard always shows a believable mix of active,
  overdue, and completed work.

## Design decisions

The visual language is a "field notebook" theme: ink navy, a hi-vis yellow
accent, hard 2px borders, and an offset drop-shadow on the one hero element
(the interactive demo board) — deliberately avoiding the generic
cream/terracotta, soft-shadow "AI SaaS" look. Two typefaces: **Bricolage
Grotesque** for headings, **Public Sans** for everything else that needs to
stay readable at small sizes.

Colour is never the only signal. Every status uses colour *and* text *and*,
where useful, an icon (e.g. an overdue chip reads "Overdue by 2 days" with a
warning icon, not just a red dot). Progress bars use a diagonal amber stripe
while work is in progress and turn solid teal only once a project is 100%
complete, so "done" is visually distinct from "in progress" even without
reading the number.

## Architecture

Fieldbook is deliberately framework-free, to show the underlying DOM and
state-management patterns a framework like React would otherwise hide.

- **`h()` — a tiny hyperscript helper** (`js/utils/dom.js`). Every component is
  a plain function that returns a DOM node built with `h('div', {props},
  children)`. Text always becomes a text node rather than being written to
  `innerHTML`, so user-entered project and task names can't inject markup.
- **A hash router** (`js/router.js`). `#/dashboard`, `#/projects/:id`, etc.
  Hash routing needs no server-side rewrite rules, so the app runs unmodified
  on any static host (including GitHub Pages). The router also handles auth
  guards, redirect-back-after-login, document titles, and moving keyboard
  focus to `<main>` after navigation.
- **A swappable API layer** (`js/api/`). `client.js` is the only module the UI
  talks to; it delegates to either `mockAdapter.js` (an in-browser fake
  back end, backed by `localStorage`, with the same latency, validation and
  error shapes a real API would have) or `httpAdapter.js` (a real `fetch`
  based REST client). Switching between them is a one-line config change —
  see [Connecting a real back end](#connecting-a-real-back-end).
- **A tiny observable store** (`js/store.js`) holds the three pieces of state
  that need to be shared across the whole app (the signed-in user, the theme,
  the current route path). Everything else is local to the view that owns it.
- **Optimistic UI with rollback**: moving a task between columns (by drag or
  by the status `<select>`) updates the screen immediately and only rolls
  back if the API call actually fails, so the board feels instant even with
  the mock API's simulated network delay.

## Accessibility

- Every interactive element is reachable and operable by keyboard: tasks can
  be moved with the status menu (not just by dragging), dialogs trap focus
  and restore it on close, and a skip link jumps straight to `<main>`.
- Colour-coded chips always pair colour with a text label (and often an
  icon); nothing is conveyed by colour alone.
- Form fields are properly labelled and wire up `aria-describedby` for hints,
  `aria-invalid` and inline error text for validation failures, with focus
  moving to the first invalid field on submit.
- Live regions announce toast notifications, task moves and search result
  counts to screen reader users without stealing focus.
- Respects `prefers-reduced-motion` and `prefers-color-scheme`.
- Verified with keyboard-only navigation and automated checks in the e2e
  suite (see below); not independently audited with a screen reader.

## Testing

Two layers of automated tests, both using only Node's built-in test runner
(no test framework dependency beyond Playwright for the browser layer).

```bash
npm test           # unit tests — pure logic, no browser (20 tests)
npm run test:e2e   # end-to-end tests — real Chromium, no mocking (12 tests)
```

**Unit tests** (`tests/*.test.js`) cover the pure functions with no DOM
dependency: date/formatting helpers, form validation, route matching, the
project/task sorting and filtering logic, and the mock API's full CRUD and
auth behaviour (including its 401/404/422 error paths).

**End-to-end tests** (`tests/e2e/flows.e2e.mjs`) drive the actual UI in a real
Chromium browser with Playwright: signing in, the auth redirect-and-return
flow, dashboard search/filter/sort (including that state survives a reload
via the URL), the full project and task lifecycle including drag-and-drop
and undo, 404 handling, theme persistence, settings, a skip-link keyboard
check, and a responsive/phone-viewport pass that confirms nothing scrolls
sideways at 375px wide.

The e2e suite needs Playwright's Chromium build installed once:

```bash
npm install
npx playwright install chromium
npm run test:e2e
```

## Connecting a real back end

The mock API in `js/api/mockAdapter.js` can be swapped for a real REST server
without touching any view or component — they only ever call `js/api/client.js`.

1. Open `index.html` and uncomment the `FIELDBOOK_CONFIG` script block near
   the top of `<head>`, pointing `apiBaseUrl` at your server:

   ```html
   <script>
     window.FIELDBOOK_CONFIG = { apiMode: 'http', apiBaseUrl: 'http://localhost:3000/api' };
   </script>
   ```

2. That's it for the front end. `js/api/httpAdapter.js` already implements
   every method the UI calls, against these endpoints:

   | Method & path | Body | Returns |
   |---|---|---|
   | `POST /auth/login` | `{email, password}` | `{token, user}` |
   | `POST /auth/logout` | – | – |
   | `PATCH /me` | `{name}` | updated user |
   | `GET /projects` | – | array of projects (each with a `tasks` array) |
   | `GET /projects/:id` | – | one project |
   | `POST /projects` | `{name, description, dueDate, status}` | created project |
   | `PATCH /projects/:id` | any of the above fields | updated project |
   | `DELETE /projects/:id` | – | – |
   | `POST /projects/:id/tasks` | `{title, notes, status, priority, due}` | created task |
   | `PATCH /projects/:id/tasks/:taskId` | any of the above fields | updated task |
   | `DELETE /projects/:id/tasks/:taskId` | – | – |

   Errors should return a JSON body of `{message, errors?}`, where `errors`
   is an optional field-level map (`{fieldName: "message"}`) used to show
   inline validation messages on forms; `httpAdapter.js` maps HTTP status
   codes straight through, and a `401` anywhere signs the user out.

   If your API's shapes differ, `js/api/httpAdapter.js` is the *only* file
   that needs to change — adjust the paths and response mapping there and
   keep the same method names.

## Project structure

```
index.html                 App shell: fonts, theme flash-prevention, CSS, entry script
css/
  tokens.css                Design tokens (colour, type scale, spacing) — light + dark
  base.css                  Reset, focus styles, skip link, reduced-motion
  layout.css                Header/nav, footer, page and grid scaffolding
  components.css             Buttons, forms, chips, progress, cards, dialog, toasts
  views.css                  Landing, auth, dashboard, project detail, settings layout
js/
  main.js                   Boots the app: theme, session, header/footer, routes
  router.js                 Hash router: matching, guards, titles, focus management
  auth.js                   Sign-in / sign-out wired to the store
  store.js                  Tiny observable store (user, theme, current path)
  theme.js                  Light / dark / system theme resolution and persistence
  config.js                 Runtime config (mock vs. http API, latency, storage key)
  constants.js              Shared enums: task/project statuses, priorities, sorts
  api/
    client.js                Single entry point the UI calls; picks an adapter
    mockAdapter.js            In-browser fake back end (localStorage-backed)
    httpAdapter.js             Real REST client with the same method signatures
    mockData.js                Seed data generator (dates relative to "today")
    ApiError.js                 Shared error type (message, status, field errors)
  utils/                     Pure, unit-tested helpers (dom, format, validate, path, stats, storage)
  components/                Reusable UI: header, cards, forms, dialog, toast, chips, icons…
  views/                     One file per route: landing, login, dashboard, projectDetail, settings, notFound
tests/
  *.test.js                  Unit tests (Node's built-in test runner)
  e2e/flows.e2e.mjs           End-to-end tests (Playwright + Chromium)
scripts/serve.mjs           Zero-dependency static file server for local dev
```

## Development process

1. **Planned the information architecture first**: landing → sign in →
   dashboard → project detail, plus settings, decided before any code, so the
   router and auth guards could be designed around real navigation paths
   rather than retrofitted.
2. **Built the data layer before the UI**: constants, pure utility functions
   (date math, validation, sorting/filtering), and the mock API, each with
   unit tests, so the UI could be built against a trustworthy foundation and
   tested independently of the DOM.
3. **Built a small set of reusable components** (form fields, dialogs,
   chips, cards, progress indicators) before the views, so every view
   composes from the same accessible primitives instead of re-solving
   labelling and error-handling per screen.
4. **Assembled the views**, wiring components to the API and router.
5. **Styled last, against real content** — the seed data was written early
   specifically so the dashboard and task board could be designed against
   realistic project names, overdue tasks and empty states, not lorem ipsum.
6. **Wrote end-to-end tests against the finished app** and used their
   failures to find real bugs — including a URL-construction bug in the test
   harness itself that was silently causing the very first test to hang for
   the full 30-second timeout, a Playwright drag-and-drop simulation
   limitation in headless Chromium worked around with manual `DragEvent`
   dispatch, and an ambiguous text locator that also caught the dashboard's
   status *filter* button and a project's status *chip* at the same time.

## Known limitations / if I had more time

- No pagination or virtualisation on the dashboard — fine for the tens of
  projects one person or small team would have, not built for hundreds.
- No multi-user collaboration (comments, assignees, real-time updates) since
  the mock API has no concept of other users.
- No automated screen-reader audit (e.g. with NVDA/VoiceOver) — accessibility
  was built to WCAG-aligned patterns and checked with keyboard-only use and
  automated tests, but that's not a substitute for testing with real
  assistive technology.
- The mock API validates almost everything a real server would, but a real
  back end should still re-validate independently rather than trust the
  client — `httpAdapter.js` is written on that assumption.

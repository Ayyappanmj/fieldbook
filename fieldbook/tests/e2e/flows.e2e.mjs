/**
 * End-to-end tests that drive the real UI in Chromium, simulating what a person
 * does: sign in, search, create projects, add and move tasks, use the keyboard,
 * switch theme and resize to a phone.
 *
 * Setup (once):   npm install && npx playwright install chromium
 * Run:            npm run test:e2e
 */
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createAppServer } from '../../scripts/serve.mjs';

let server;
let browser;
let baseUrl;

before(async () => {
  server = createAppServer();
  await new Promise((resolve) => server.listen(0, resolve));
  baseUrl = `http://localhost:${server.address().port}`;
  browser = await chromium.launch();
});

after(async () => {
  await browser?.close();
  server?.close();
});

/** Fresh browser context (= empty localStorage) with error capture. */
async function openApp(path = '', contextOptions = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...contextOptions });
  await context.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort()); // stay offline-safe
  await context.addInitScript(() => {
    window.FIELDBOOK_CONFIG = { mockLatencyMs: 20 };
  });
  const page = await context.newPage();
  page.problems = [];
  page.on('pageerror', (error) => page.problems.push(error.message));
  page.on('console', (msg) => msg.type() === 'error' && !/Failed to load resource/.test(msg.text()) && page.problems.push(msg.text()));
  // Avoid a literal "//" in the URL: Node's URL parser treats it as a
  // protocol-relative reference, which the static server then 404s on.
  const target = path.startsWith('/') ? path.slice(1) : path;
  await page.goto(`${baseUrl}/${target}`);
  return page;
}

async function signInAsDemo(page) {
  await page.goto(`${baseUrl}/#/login`);
  await page.getByRole('button', { name: 'Use the demo account' }).click();
  await page.locator('.project-card').first().waitFor();
}

const noProblems = (page) => assert.deepEqual(page.problems, [], 'browser reported errors');

test('landing page: interactive demo board updates its progress', async () => {
  const page = await openApp();
  await page.getByRole('heading', { level: 1 }).waitFor();
  assert.match(await page.locator('.demo__caption').innerText(), /2 of 5 tasks done/);
  await page.getByLabel('Write product copy').check();
  assert.match(await page.locator('.demo__caption').innerText(), /3 of 5 tasks done/);
  assert.equal(await page.locator('.demo .progress').getAttribute('aria-valuenow'), '60');
  noProblems(page);
});

test('guard: protected routes redirect to sign in, then return to the page', async () => {
  const page = await openApp('#/projects/p-web');
  await page.getByRole('heading', { name: 'Sign in to Fieldbook' }).waitFor();
  assert.match(page.url(), /#\/login\?next=%2Fprojects%2Fp-web/);

  await page.getByRole('button', { name: 'Use the demo account' }).click();
  await page.getByRole('heading', { name: 'Website relaunch' }).waitFor();
  assert.match(page.url(), /#\/projects\/p-web$/);
  noProblems(page);
});

test('sign in form: validation, server error, success', async () => {
  const page = await openApp('#/login');
  await page.getByRole('button', { name: 'Sign in', exact: true }).last().click();
  assert.equal(await page.getByLabel('Email').getAttribute('aria-invalid'), 'true');
  assert.match(await page.locator('.field__error:visible').first().innerText(), /Enter your email/);
  assert.equal(await page.evaluate(() => document.activeElement.name), 'email', 'focus moves to first invalid field');

  await page.getByLabel('Email').fill('demo@fieldbook.dev');
  await page.getByLabel('Password').fill('not-the-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).last().click();
  await page.getByRole('alert').filter({ hasText: "don't match" }).waitFor();

  await page.getByLabel('Password').fill('fieldbook');
  await page.getByRole('button', { name: 'Sign in', exact: true }).last().click();
  await page.getByRole('heading', { name: /Sam/ }).waitFor();
  assert.match(page.url(), /#\/dashboard$/);
  noProblems(page);
});

test('dashboard: search, filter, sort and URL state', async () => {
  const page = await openApp();
  await signInAsDemo(page);
  assert.equal(await page.locator('.project-card').count(), 6);

  await page.getByLabel('Search projects').fill('web');
  await page.waitForFunction(() => document.querySelectorAll('.project-card').length === 1);
  assert.match(page.url(), /q=web/);
  assert.match(await page.locator('.results-info').innerText(), /Showing 1 of 6 projects/);

  await page.getByLabel('Search projects').fill('zzz');
  await page.getByRole('heading', { name: 'No projects match' }).waitFor();
  await page.getByRole('button', { name: 'Clear search and filters' }).click();
  await page.waitForFunction(() => document.querySelectorAll('.project-card').length === 6);

  // The segmented control is a radio group with an overlaid input, so check
  // the radio by its accessible role/name rather than clicking the label text
  // (the absolutely-positioned input intercepts pointer events on the span).
  const statusFilter = page.getByRole('group', { name: 'Filter by status' });
  await statusFilter.getByRole('radio', { name: 'On hold' }).check({ force: true });
  await page.waitForFunction(() => document.querySelectorAll('.project-card').length === 1);
  assert.match(await page.locator('.project-card').innerText(), /Customer interviews/);
  assert.match(page.url(), /status=hold/);

  await statusFilter.getByRole('radio', { name: 'All' }).check({ force: true });
  await page.getByLabel('Sort by').selectOption('name');
  assert.match(await page.locator('.project-card__title').first().innerText(), /Customer interviews/);

  // State survives a reload because it lives in the URL.
  await page.reload();
  await page.locator('.project-card').first().waitFor();
  assert.equal(await page.getByLabel('Sort by').inputValue(), 'name');
  noProblems(page);
});

test('project + task lifecycle (create, edit, move, undo delete, delete project)', async () => {
  const page = await openApp();
  await signInAsDemo(page);

  // Create a project: validation first.
  await page.getByRole('button', { name: 'New project' }).click();
  const dialog = page.getByRole('dialog', { name: 'New project' });
  await dialog.getByRole('button', { name: 'Create project' }).click();
  assert.match(await dialog.locator('.field__error:visible').innerText(), /Give the project a name/);
  await dialog.getByLabel('Name').fill('Autumn workshop series');
  await dialog.getByLabel('Description').fill('Four evening classes.');
  await dialog.getByRole('button', { name: 'Create project' }).click();
  await page.getByRole('heading', { name: 'Autumn workshop series' }).waitFor();
  await page.getByRole('heading', { name: 'No tasks yet' }).waitFor();
  assert.equal(await page.locator('.ring__value').innerText(), '0%');

  // Add a task.
  await page.getByRole('button', { name: 'Add the first task' }).click();
  const taskDialog = page.getByRole('dialog', { name: 'Add task' });
  await taskDialog.getByLabel('Task').fill('Book the hall');
  await taskDialog.getByLabel('Priority').selectOption('high');
  await taskDialog.getByRole('button', { name: 'Add task' }).click();
  const todo = page.locator('.column--todo');
  await todo.getByText('Book the hall').waitFor();

  // Tick it: moves to Done, ring hits 100%, keyboard focus stays on the checkbox.
  await page.getByLabel('Mark done: Book the hall').focus();
  await page.keyboard.press('Space');
  await page.locator('.column--done').getByText('Book the hall').waitFor();
  assert.equal(await page.locator('.ring__value').innerText(), '100%');
  assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Mark done: Book the hall');

  // Move back via the status menu (the non-drag alternative).
  await page.getByLabel('Move “Book the hall” to').selectOption('doing');
  await page.locator('.column--doing').getByText('Book the hall').waitFor();
  assert.equal(await page.locator('.ring__value').innerText(), '0%');

  // Edit.
  await page.getByRole('button', { name: 'Edit task: Book the hall' }).click();
  const edit = page.getByRole('dialog', { name: 'Edit task' });
  await edit.getByLabel('Task').fill('Book the main hall');
  await edit.getByRole('button', { name: 'Save changes' }).click();
  await page.getByText('Book the main hall').waitFor();

  // Delete + undo.
  await page.getByRole('button', { name: 'Delete task: Book the main hall' }).click();
  await page.getByRole('heading', { name: 'No tasks yet' }).waitFor();
  await page.getByRole('button', { name: 'Undo' }).click();
  await page.getByText('Book the main hall').waitFor();

  // Delete the project (confirm dialog, cancel is the default focus).
  await page.getByRole('button', { name: 'Delete project' }).click();
  const confirm = page.getByRole('dialog', { name: /Delete/ });
  assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Cancel');
  await confirm.getByRole('button', { name: 'Delete project' }).click();
  await page.getByRole('heading', { name: /Sam/ }).waitFor();
  assert.equal(await page.getByText('Autumn workshop series').count(), 0);
  noProblems(page);
});

test('drag and drop moves a task between columns', async () => {
  const page = await openApp();
  await signInAsDemo(page);
  await page.getByRole('link', { name: 'Spring product drop' }).click();
  await page.locator('.board').waitFor();
  const before = await page.locator('.column--done .task').count();

  // Playwright's dragTo() drives real mouse events, which do not reliably
  // trigger the native HTML5 drag-and-drop lifecycle in headless Chromium.
  // Dispatch the same dragstart/dragover/drop sequence a real drag fires,
  // sharing one DataTransfer, so the app's own event handlers run for real.
  await page.evaluate(({ text }) => {
    const src = [...document.querySelectorAll('[data-task-id]')].find((el) => el.textContent.includes(text));
    const dst = document.querySelector('.column--done');
    const dt = new DataTransfer();
    src.dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: dt }));
    dst.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }));
    dst.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
    src.dispatchEvent(new DragEvent('dragend', { bubbles: true, cancelable: true, dataTransfer: dt }));
  }, { text: 'Draft launch email' });

  await page.waitForFunction((n) => document.querySelectorAll('.column--done .task').length === n + 1, before);
  noProblems(page);
});

test('task search and priority filter narrow the board', async () => {
  const page = await openApp();
  await signInAsDemo(page);
  await page.getByRole('link', { name: 'Website relaunch' }).click();
  await page.locator('.board').waitFor();
  await page.getByLabel('Priority').selectOption('high');
  const titles = await page.locator('.task__title').allInnerTexts();
  assert.ok(titles.length > 0 && titles.length < 8);
  await page.getByLabel('Search tasks').fill('redirect');
  await page.waitForFunction(() => document.querySelectorAll('.task').length === 1);
  noProblems(page);
});

test('missing project shows a helpful not-found state; unknown route shows 404', async () => {
  const page = await openApp();
  await signInAsDemo(page);
  await page.goto(`${baseUrl}/#/projects/nope`);
  await page.getByRole('heading', { name: 'Project not found' }).waitFor();
  await page.goto(`${baseUrl}/#/does-not-exist`);
  await page.getByRole('heading', { name: 'Page not found' }).waitFor();
  noProblems(page);
});

test('theme: toggle applies dark mode and persists across reloads', async () => {
  const page = await openApp();
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'dark');
  await page.reload();
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'dark');
  await page.getByRole('button', { name: 'Switch to light theme' }).click();
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'light');
  noProblems(page);
});

test('settings: profile, reset data and sign out', async () => {
  const page = await openApp();
  await signInAsDemo(page);
  await page.getByRole('link', { name: 'Settings' }).click();
  await page.getByLabel('Display name').fill('Alex Kim');
  await page.getByRole('button', { name: 'Save profile' }).click();
  await page.getByText('Profile saved.').waitFor();
  assert.match(await page.locator('.avatar').innerText(), /AK/);

  await page.getByRole('button', { name: 'Reset demo data' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Reset data' }).click();
  await page.getByText('Demo data reset.').waitFor();

  await page.getByRole('button', { name: 'Sign out' }).first().click();
  await page.getByRole('heading', { level: 1, name: /what’s done/ }).waitFor();
  await page.goto(`${baseUrl}/#/dashboard`);
  await page.getByRole('heading', { name: 'Sign in to Fieldbook' }).waitFor();
  noProblems(page);
});

test('keyboard: skip link moves focus to main content', async () => {
  const page = await openApp();
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.className), 'skip-link');
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'main');
  assert.doesNotMatch(page.url(), /#main/, 'skip link must not disturb the hash router');
  noProblems(page);
});

test('responsive: phone layout has a working menu and never scrolls sideways', async () => {
  const page = await openApp('', { viewport: { width: 375, height: 800 }, hasTouch: true });
  const overflows = () => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);

  assert.equal(await overflows(), false, 'landing overflows');
  assert.equal(await page.locator('.site-nav').isVisible(), false);
  await page.getByRole('button', { name: 'Menu' }).click();
  assert.equal(await page.getByRole('button', { name: 'Menu' }).getAttribute('aria-expanded'), 'true');
  assert.equal(await page.locator('.site-nav').isVisible(), true);

  await signInAsDemo(page);
  assert.equal(await overflows(), false, 'dashboard overflows');
  await page.getByRole('link', { name: 'Spring product drop' }).click();
  await page.locator('.board').waitFor();
  assert.equal(await overflows(), false, 'project detail overflows');
  await page.getByRole('button', { name: 'Add task' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Add task' });
  const box = await dialog.boundingBox();
  assert.ok(box.x >= 0 && box.x + box.width <= 375, 'dialog fits the viewport');
  noProblems(page);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { addDays, dueInfo, formatDate, greeting, initials, nameFromEmail, parseISODate, percent, toISODate } from '../js/utils/format.js';

const today = new Date(2026, 8, 21); // 21 Sep 2026

test('parseISODate parses valid local dates and rejects invalid ones', () => {
  assert.equal(parseISODate('2026-09-21').getDate(), 21);
  assert.equal(parseISODate('2026-02-30'), null);
  assert.equal(parseISODate('21/09/2026'), null);
  assert.equal(parseISODate(''), null);
});

test('toISODate round-trips with parseISODate', () => {
  assert.equal(toISODate(parseISODate('2026-01-05')), '2026-01-05');
  assert.equal(toISODate(addDays(today, 10)), '2026-10-01');
});

test('dueInfo describes overdue, today, soon and later', () => {
  assert.deepEqual(dueInfo('2026-09-19', today), { tone: 'overdue', days: -2, label: 'Overdue by 2 days' });
  assert.equal(dueInfo('2026-09-20', today).label, 'Overdue by 1 day');
  assert.equal(dueInfo('2026-09-21', today).tone, 'today');
  assert.equal(dueInfo('2026-09-22', today).label, 'Due tomorrow');
  assert.equal(dueInfo('2026-09-26', today).label, 'Due in 5 days');
  assert.equal(dueInfo('2026-10-12', today).tone, 'later');
  assert.equal(dueInfo('', today).tone, 'none');
});

test('formatDate hides the year only when it matches today', () => {
  assert.equal(formatDate('2026-10-12', today), 'Oct 12');
  assert.equal(formatDate('2027-01-03', today), 'Jan 3, 2027');
  assert.equal(formatDate('nope', today), '');
});

test('small helpers', () => {
  assert.equal(percent(1, 3), 33);
  assert.equal(percent(0, 0), 0);
  assert.equal(initials('sam rivera'), 'SR');
  assert.equal(initials('Cher'), 'C');
  assert.equal(initials(''), '?');
  assert.equal(nameFromEmail('jo.bloggs@example.com'), 'Jo Bloggs');
  assert.equal(greeting(new Date(2026, 0, 1, 9)), 'Good morning');
  assert.equal(greeting(new Date(2026, 0, 1, 20)), 'Good evening');
});

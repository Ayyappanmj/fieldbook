/** Date and text formatting helpers. All pure functions, safe to unit test. */

/** Parse 'YYYY-MM-DD' as a *local* date (avoids the UTC off-by-one bug). */
export function parseISODate(str) {
  if (typeof str !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;
  const [y, m, d] = str.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const valid = date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
  return valid ? date : null;
}

export function toISODate(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

export function addDays(date, n) {
  const copy = startOfDay(date);
  copy.setDate(copy.getDate() + n);
  return copy;
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from, to) {
  return Math.round((startOfDay(to) - startOfDay(from)) / 86_400_000);
}

/** "Sep 30", or "Sep 30, 2027" when the year differs from today's. */
export function formatDate(str, today = new Date(), locale = 'en-US') {
  const date = parseISODate(str);
  if (!date) return '';
  const opts = { month: 'short', day: 'numeric' };
  if (date.getFullYear() !== today.getFullYear()) opts.year = 'numeric';
  return new Intl.DateTimeFormat(locale, opts).format(date);
}

export function formatDateTime(iso, locale = 'en-US') {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
}

/**
 * Describe a due date relative to today.
 * tone: 'none' | 'overdue' | 'today' | 'soon' (within 7 days) | 'later'
 */
export function dueInfo(str, today = new Date()) {
  const date = parseISODate(str);
  if (!date) return { tone: 'none', label: 'No due date', days: null };
  const days = daysBetween(today, date);
  if (days < 0) return { tone: 'overdue', days, label: `Overdue by ${-days} ${plural(-days, 'day')}` };
  if (days === 0) return { tone: 'today', days, label: 'Due today' };
  if (days === 1) return { tone: 'soon', days, label: 'Due tomorrow' };
  if (days <= 7) return { tone: 'soon', days, label: `Due in ${days} days` };
  return { tone: 'later', days, label: `Due ${formatDate(str, today)}` };
}

export const plural = (n, one, many = `${one}s`) => (n === 1 ? one : many);

export const percent = (part, total) => (total ? Math.round((part / total) * 100) : 0);

export function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export function greeting(now = new Date()) {
  const h = now.getHours();
  if (h < 5) return 'Working late';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function nameFromEmail(email = '') {
  const local = email.split('@')[0].replace(/[._-]+/g, ' ').trim();
  return local.replace(/\b\w/g, (c) => c.toUpperCase()) || 'New user';
}

/**
 * Server-side validation. Deliberately kept identical in wording and rules to
 * the front-end's js/utils/validate.js, so the two never disagree about what
 * counts as valid input — the front end's copy is for instant feedback, this
 * one is the actual authority (see the architecture plan, Section 7).
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const oneOf = (list, v) => list.includes(v);

export const PROJECT_STATUSES = ['active', 'hold', 'done'];
export const TASK_STATUSES = ['todo', 'doing', 'done'];
export const PRIORITIES = ['low', 'medium', 'high'];

/** 'YYYY-MM-DD' as a real calendar date, or null. Mirrors the front end's parseISODate. */
export function parseISODate(str) {
  if (typeof str !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;
  const [y, m, d] = str.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const valid = date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
  return valid ? date : null;
}

export function validateLogin({ email = '', password = '' }) {
  const errors = {};
  if (!email.trim()) errors.email = 'Enter your email address.';
  else if (!EMAIL_RE.test(email.trim())) errors.email = 'Enter an email like name@example.com.';
  if (!password) errors.password = 'Enter your password.';
  else if (password.length < 6) errors.password = 'Use at least 6 characters.';
  return errors;
}

export function validateRegister({ email = '', password = '', name = '' }) {
  const errors = validateLogin({ email, password });
  if (!name.trim()) errors.name = 'Enter your name.';
  else if (name.trim().length > 60) errors.name = 'Keep the name under 60 characters.';
  return errors;
}

export function validateProject({ name = '', description = '', dueDate = '', status = 'active' }) {
  const errors = {};
  if (!name.trim()) errors.name = 'Give the project a name.';
  else if (name.trim().length > 60) errors.name = 'Keep the name under 60 characters.';
  if (description.length > 280) errors.description = 'Keep the description under 280 characters.';
  if (dueDate && !parseISODate(dueDate)) errors.dueDate = 'Choose a valid date.';
  if (!oneOf(PROJECT_STATUSES, status)) errors.status = 'Choose a status from the list.';
  return errors;
}

export function validateTask({ title = '', notes = '', due = '', priority = 'medium', status = 'todo' }) {
  const errors = {};
  if (!title.trim()) errors.title = 'Describe the task in a few words.';
  else if (title.trim().length > 100) errors.title = 'Keep the title under 100 characters.';
  if (notes.length > 500) errors.notes = 'Keep notes under 500 characters.';
  if (due && !parseISODate(due)) errors.due = 'Choose a valid date.';
  if (!oneOf(PRIORITIES, priority)) errors.priority = 'Choose a priority from the list.';
  if (!oneOf(TASK_STATUSES, status)) errors.status = 'Choose a status from the list.';
  return errors;
}

export const isValid = (errors) => Object.keys(errors).length === 0;

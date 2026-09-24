/**
 * Form validation. Each validator returns an object of `{ field: message }`;
 * an empty object means the input is valid. The same rules run in the UI and in
 * the mock API, so behaviour matches what a real server would enforce.
 */
import { parseISODate } from './format.js';
import { PRIORITIES, PROJECT_STATUSES, TASK_STATUSES } from '../constants.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const oneOf = (list, v) => list.some((i) => i.value === v);

export function validateLogin({ email = '', password = '' }) {
  const errors = {};
  if (!email.trim()) errors.email = 'Enter your email address.';
  else if (!EMAIL_RE.test(email.trim())) errors.email = 'Enter an email like name@example.com.';
  if (!password) errors.password = 'Enter your password.';
  else if (password.length < 6) errors.password = 'Use at least 6 characters.';
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

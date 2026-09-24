/** Shared enumerations so labels and values live in exactly one place. */

export const TASK_STATUSES = [
  { value: 'todo', label: 'To do', empty: 'Nothing waiting. Add a task to get moving.' },
  { value: 'doing', label: 'In progress', empty: 'Nothing in progress. Drag a task here or use its status menu.' },
  { value: 'done', label: 'Done', empty: 'Finished tasks will collect here.' },
];

export const PROJECT_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'hold', label: 'On hold' },
  { value: 'done', label: 'Completed' },
];

export const PRIORITIES = [
  { value: 'high', label: 'High', weight: 3 },
  { value: 'medium', label: 'Medium', weight: 2 },
  { value: 'low', label: 'Low', weight: 1 },
];

export const PROJECT_SORTS = [
  { value: 'updated', label: 'Recently updated' },
  { value: 'name', label: 'Name (A to Z)' },
  { value: 'due', label: 'Due soonest' },
  { value: 'progress', label: 'Most complete' },
];

export const DEMO_ACCOUNT = { email: 'demo@fieldbook.dev', password: 'fieldbook' };

export const labelFor = (list, value) => list.find((i) => i.value === value)?.label ?? value;

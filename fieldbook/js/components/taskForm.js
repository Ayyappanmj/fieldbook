import { PRIORITIES, TASK_STATUSES } from '../constants.js';
import { api } from '../api/client.js';
import { validateTask } from '../utils/validate.js';
import { openDialog } from './dialog.js';
import { field } from './field.js';
import { buildForm } from './form.js';

/**
 * Create or edit a task in a modal dialog.
 * @returns {Promise<object|null>} the saved task, or null if cancelled
 */
export function openTaskDialog({ projectId, task = null, status = 'todo' }) {
  return openDialog({
    title: task ? 'Edit task' : 'Add task',
    build: ({ close }) => {
      const fields = {
        title: field({ label: 'Task', name: 'title', value: task?.title ?? '', required: true, maxlength: 100, autofocus: true, placeholder: 'e.g. Book the venue' }),
        notes: field({ label: 'Notes', name: 'notes', type: 'textarea', value: task?.notes ?? '', rows: 3 }),
        priority: field({ label: 'Priority', name: 'priority', options: PRIORITIES, value: task?.priority ?? 'medium', required: true, className: 'field--half' }),
        status: field({ label: 'Status', name: 'status', options: TASK_STATUSES, value: task?.status ?? status, required: true, className: 'field--half' }),
        due: field({ label: 'Due date', name: 'due', type: 'date', value: task?.due ?? '' }),
      };
      return buildForm({
        fields,
        validate: validateTask,
        submitLabel: task ? 'Save changes' : 'Add task',
        onCancel: () => close(null),
        onSubmit: async (values) => {
          const saved = task ? await api.updateTask(projectId, task.id, values) : await api.createTask(projectId, values);
          close(saved);
        },
        className: 'dialog__body form--two-col',
      });
    },
  });
}

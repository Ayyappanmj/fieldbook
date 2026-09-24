import { PROJECT_STATUSES } from '../constants.js';
import { api } from '../api/client.js';
import { validateProject } from '../utils/validate.js';
import { openDialog } from './dialog.js';
import { field } from './field.js';
import { buildForm } from './form.js';

/**
 * Create or edit a project in a modal dialog.
 * @returns {Promise<object|null>} the saved project, or null if cancelled
 */
export function openProjectDialog({ project = null } = {}) {
  return openDialog({
    title: project ? 'Edit project' : 'New project',
    build: ({ close }) => {
      const fields = {
        name: field({ label: 'Name', name: 'name', value: project?.name ?? '', required: true, maxlength: 60, autofocus: true, placeholder: 'e.g. Summer catalogue' }),
        description: field({ label: 'Description', name: 'description', type: 'textarea', value: project?.description ?? '', hint: 'What is this project for? Up to 280 characters.' }),
        dueDate: field({ label: 'Due date', name: 'dueDate', type: 'date', value: project?.dueDate ?? '' }),
        status: field({ label: 'Status', name: 'status', options: PROJECT_STATUSES, value: project?.status ?? 'active', required: true }),
      };
      return buildForm({
        fields,
        validate: validateProject,
        submitLabel: project ? 'Save changes' : 'Create project',
        onCancel: () => close(null),
        onSubmit: async (values) => {
          const saved = project ? await api.updateProject(project.id, values) : await api.createProject(values);
          close(saved);
        },
        className: 'dialog__body',
      });
    },
  });
}

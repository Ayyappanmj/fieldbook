import { h } from '../utils/dom.js';

/**
 * Assemble a validated, accessible form.
 *
 * - runs `validate(values)` (returns {field: message}) before submitting
 * - shows inline errors and moves focus to the first invalid field
 * - disables the submit button while `onSubmit` runs and shows server errors
 *
 * @param {{
 *   fields: Record<string, ReturnType<import('./field.js').field>>,
 *   validate: (values: Record<string,string>) => Record<string,string>,
 *   onSubmit: (values: Record<string,string>) => Promise<void>,
 *   submitLabel: string, busyLabel?: string,
 *   onCancel?: () => void, cancelLabel?: string,
 *   before?: Node, actionsBefore?: Node, submitClass?: string, className?: string
 * }} opts
 */
export function buildForm({
  fields,
  validate,
  onSubmit,
  submitLabel,
  busyLabel = 'Saving…',
  onCancel,
  cancelLabel = 'Cancel',
  before,
  actionsBefore,
  submitClass = 'btn btn--primary',
  className = '',
}) {
  const alert = h('div', { class: 'form-alert', role: 'alert', hidden: true });
  const submit = h('button', { type: 'submit', class: submitClass }, submitLabel);

  const showAlert = (message) => {
    alert.textContent = message || '';
    alert.hidden = !message;
  };

  const setBusy = (busy) => {
    submit.disabled = busy;
    submit.textContent = busy ? busyLabel : submitLabel;
    submit.setAttribute('aria-busy', String(busy));
  };

  const form = h(
    'form',
    {
      class: ['form', className],
      novalidate: true,
      async onSubmit(event) {
        event.preventDefault();
        showAlert('');
        const values = Object.fromEntries(Object.entries(fields).map(([key, f]) => [key, f.getValue()]));
        const errors = validate(values);
        Object.entries(fields).forEach(([key, f]) => f.setError(errors[key] || ''));

        const firstInvalid = Object.keys(fields).find((key) => errors[key]);
        if (firstInvalid) {
          fields[firstInvalid].input.focus();
          return;
        }

        setBusy(true);
        try {
          await onSubmit(values);
        } catch (error) {
          if (error.details) {
            Object.entries(error.details).forEach(([key, msg]) => fields[key]?.setError(msg));
            fields[Object.keys(error.details).find((k) => fields[k])]?.input.focus();
          }
          showAlert(error.message || 'Something went wrong. Try again.');
        } finally {
          setBusy(false);
        }
      },
    },
    before,
    alert,
    Object.values(fields).map((f) => f.el),
    h(
      'div',
      { class: 'form__actions' },
      actionsBefore,
      onCancel && h('button', { type: 'button', class: 'btn btn--secondary', onClick: onCancel }, cancelLabel),
      submit,
    ),
  );

  return form;
}

import { h, domId } from '../utils/dom.js';

/**
 * A labelled form control with optional hint and an inline error message.
 * Wires up for/id, aria-describedby, aria-invalid and aria-required.
 *
 * @returns {{el: HTMLElement, input: HTMLElement, name: string, getValue: () => string, setError: (msg?: string) => void}}
 */
export function field({
  label,
  name,
  type = 'text',
  value = '',
  required = false,
  hint = '',
  options = null, // [{value,label}] renders a <select>
  rows = 3, // used for type 'textarea'
  maxlength,
  autocomplete,
  placeholder,
  autofocus = false,
  className = '',
}) {
  const id = domId(name);
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  const shared = {
    id,
    name,
    class: 'control',
    'aria-required': required ? 'true' : undefined,
    'aria-describedby': hint ? `${hintId} ${errorId}` : errorId,
    autofocus,
  };

  let input;
  if (options) {
    input = h(
      'select',
      shared,
      options.map((o) => h('option', { value: o.value, selected: o.value === value }, o.label)),
    );
  } else if (type === 'textarea') {
    input = h('textarea', { ...shared, rows, maxlength }, value);
  } else {
    input = h('input', { ...shared, type, value, maxlength, autocomplete, placeholder, spellcheck: type === 'email' ? 'false' : undefined });
  }

  const error = h('p', { id: errorId, class: 'field__error', hidden: true });
  const el = h(
    'div',
    { class: ['field', className] },
    h('label', { class: 'field__label', for: id }, label, !required && h('span', { class: 'field__optional' }, ' (optional)')),
    hint && h('p', { id: hintId, class: 'field__hint' }, hint),
    input,
    error,
  );

  const setError = (message = '') => {
    error.textContent = message;
    error.hidden = !message;
    if (message) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
    el.classList.toggle('field--invalid', Boolean(message));
  };

  // Clear the message as soon as the person starts fixing it.
  input.addEventListener('input', () => setError(''));

  return { el, input, name, getValue: () => input.value, setError };
}

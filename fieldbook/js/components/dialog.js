import { h, domId } from '../utils/dom.js';
import { icon } from './icons.js';

/**
 * Modal dialog built on the native <dialog> element, which gives us a focus
 * trap, Escape-to-close, an inert background and focus restoration for free.
 *
 * @param {{title: string, build: (api: {close: (value?: any) => void}) => Node, size?: 'sm'|'md'}} opts
 * @returns {Promise<any>} resolves with the value passed to close() (null if dismissed)
 */
export function openDialog({ title, build, size = 'md' }) {
  return new Promise((resolve) => {
    const titleId = domId('dialog-title');
    let result = null;

    const dialog = h('dialog', { class: ['dialog', `dialog--${size}`], 'aria-labelledby': titleId });
    const api = {
      close(value = null) {
        result = value;
        dialog.close();
      },
    };

    dialog.append(
      h(
        'div',
        { class: 'dialog__panel' },
        h(
          'div',
          { class: 'dialog__header' },
          h('h2', { id: titleId, class: 'dialog__title' }, title),
          h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Close dialog', onClick: () => api.close(null) }, icon('x')),
        ),
        build(api),
      ),
    );

    // Clicking the backdrop (the <dialog> itself, since the panel fills it) dismisses.
    dialog.addEventListener('click', (event) => event.target === dialog && api.close(null));
    dialog.addEventListener('close', () => {
      dialog.remove();
      resolve(result);
    });

    document.body.append(dialog);
    dialog.showModal();
  });
}

/** Ask for confirmation. Resolves true only when the person confirms. */
export async function confirmDialog({ title, message, confirmLabel = 'Confirm', tone = 'danger' }) {
  const answer = await openDialog({
    title,
    size: 'sm',
    build: ({ close }) =>
      h(
        'div',
        { class: 'dialog__body' },
        h('p', { class: 'dialog__message' }, message),
        h(
          'div',
          { class: 'form__actions' },
          h('button', { type: 'button', class: 'btn btn--secondary', autofocus: true, onClick: () => close(false) }, 'Cancel'),
          h('button', { type: 'button', class: ['btn', tone === 'danger' ? 'btn--danger' : 'btn--primary'], onClick: () => close(true) }, confirmLabel),
        ),
      ),
  });
  return answer === true;
}

import { h } from '../utils/dom.js';
import { icon } from './icons.js';

/**
 * Show a short, non-blocking message. The container (#toast-region) is an
 * aria-live region, so screen readers announce new toasts politely.
 *
 * @param {string} message
 * @param {{tone?: 'info'|'success'|'error', actionLabel?: string, onAction?: Function, duration?: number}} [opts]
 */
export function toast(message, { tone = 'success', actionLabel, onAction, duration = 6000 } = {}) {
  const region = document.getElementById('toast-region');
  let timer;

  const remove = () => {
    clearTimeout(timer);
    el.remove();
  };
  const arm = () => {
    clearTimeout(timer);
    timer = setTimeout(remove, duration);
  };

  const el = h(
    'div',
    { class: ['toast', `toast--${tone}`], onMouseEnter: () => clearTimeout(timer), onMouseLeave: arm },
    icon(tone === 'error' ? 'alert' : 'check', { size: 18 }),
    h('p', { class: 'toast__message' }, message),
    actionLabel &&
      h('button', { type: 'button', class: 'toast__action', onClick: () => { remove(); onAction?.(); } }, actionLabel),
    h('button', { type: 'button', class: 'toast__close', 'aria-label': 'Dismiss message', onClick: remove }, icon('x', { size: 16 })),
  );

  region.append(el);
  arm();
  return remove;
}

import { h } from '../utils/dom.js';
import { icon } from './icons.js';

/** Empty, error and loading placeholders. Each tells the person what to do next. */

export function emptyState({ title, body, action }) {
  return h('div', { class: 'state' }, icon('folder', { size: 32, className: 'state__icon' }), h('h3', { class: 'state__title' }, title), body && h('p', { class: 'state__body' }, body), action);
}

export function errorState({ message, onRetry }) {
  return h(
    'div',
    { class: 'state state--error', role: 'alert' },
    icon('alert', { size: 32, className: 'state__icon' }),
    h('h3', { class: 'state__title' }, 'We couldn\u2019t load this'),
    h('p', { class: 'state__body' }, message),
    onRetry && h('button', { type: 'button', class: 'btn btn--secondary', onClick: onRetry }, icon('refresh', { size: 18 }), 'Try again'),
  );
}

/** Placeholder blocks shown while data loads. Hidden from assistive tech. */
export function skeletonCards(count = 3) {
  return h(
    'div',
    { class: 'grid grid--projects', 'aria-hidden': 'true' },
    Array.from({ length: count }, () =>
      h('div', { class: 'skeleton-card' }, h('span', { class: 'skeleton skeleton--title' }), h('span', { class: 'skeleton' }), h('span', { class: 'skeleton skeleton--short' }), h('span', { class: 'skeleton skeleton--bar' })),
    ),
  );
}

export const loadingText = (text = 'Loading…') => h('p', { class: 'visually-hidden', role: 'status' }, text);

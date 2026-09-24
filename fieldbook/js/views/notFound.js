import { h } from '../utils/dom.js';

export function NotFoundView() {
  return {
    el: h(
      'div',
      { class: 'container page page--narrow' },
      h('div', { class: 'state' }, h('h1', { class: 'page__title' }, 'Page not found'), h('p', { class: 'state__body' }, 'That address doesn\u2019t match anything in Fieldbook. It may have been moved or typed wrong.'), h('a', { class: 'btn btn--primary', href: '#/' }, 'Back to the home page')),
    ),
  };
}

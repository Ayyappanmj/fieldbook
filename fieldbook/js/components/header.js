import { h } from '../utils/dom.js';
import { initials } from '../utils/format.js';
import { currentTheme, toggleTheme } from '../theme.js';
import { icon, logoMark } from './icons.js';

/**
 * Site header with responsive navigation.
 * `update(state)` re-renders only the links/actions so the menu button keeps focus.
 */
export function createHeader({ onSignOut }) {
  let menuOpen = false;
  let lastPath = null;

  const toggle = h(
    'button',
    { type: 'button', class: 'nav-toggle', 'aria-expanded': 'false', 'aria-controls': 'site-nav', 'aria-label': 'Menu', onClick: () => setMenu(!menuOpen) },
    icon('menu'),
  );
  const nav = h('nav', { id: 'site-nav', class: 'site-nav', 'aria-label': 'Main' });
  const el = h(
    'header',
    { class: 'site-header' },
    h('div', { class: 'container site-header__inner' }, h('a', { class: 'brand', href: '#/' }, logoMark(30), h('span', { class: 'brand__name' }, 'Fieldbook')), toggle, nav),
  );

  function setMenu(open) {
    menuOpen = open;
    el.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.replaceChildren(icon(open ? 'x' : 'menu'));
  }

  const link = (href, text, current) => h('li', {}, h('a', { class: 'nav-link', href, 'aria-current': current ? 'page' : undefined }, text));

  function update({ user, path }) {
    if (path !== lastPath) setMenu(false);
    lastPath = path;

    const dark = currentTheme() === 'dark';
    const themeButton = h(
      'button',
      { type: 'button', class: 'icon-btn', 'aria-label': `Switch to ${dark ? 'light' : 'dark'} theme`, onClick: toggleTheme },
      icon(dark ? 'sun' : 'moon'),
    );

    nav.replaceChildren(
      user
        ? h('ul', { class: 'site-nav__links' }, link('#/dashboard', 'Dashboard', path === '/dashboard' || path.startsWith('/projects')), link('#/settings', 'Settings', path === '/settings'))
        : h('ul', { class: 'site-nav__links' }),
      h(
        'div',
        { class: 'site-nav__actions' },
        themeButton,
        user
          ? [
              h('span', { class: 'avatar', title: user.name }, h('span', { 'aria-hidden': 'true' }, initials(user.name)), h('span', { class: 'visually-hidden' }, `Signed in as ${user.name}`)),
              h('button', { type: 'button', class: 'btn btn--ghost btn--sm', onClick: onSignOut }, icon('logout', { size: 18 }), 'Sign out'),
            ]
          : h('a', { class: 'btn btn--primary btn--sm', href: '#/login' }, 'Sign in'),
      ),
    );
  }

  return { el, update };
}

export function createFooter() {
  return h(
    'div',
    { class: 'container site-footer__inner' },
    h('p', {}, 'Fieldbook is a front-end coursework project. Everything you enter is stored in this browser.'),
    h('p', {}, h('a', { href: '#/' }, 'Home'), ' \u00b7 ', h('a', { href: '#/login' }, 'Sign in')),
  );
}

import { h } from '../utils/dom.js';

const clamp = (n) => Math.max(0, Math.min(100, n));

/**
 * Horizontal progress bar. The hi-vis striped fill is Fieldbook's signature
 * "work in progress" look; it turns solid teal once everything is done.
 * The returned element has an `update(pct)` method.
 */
export function progressBar(pct, { label = 'Progress', small = false } = {}) {
  const fill = h('span', { class: 'progress__fill' });
  const el = h('div', { class: ['progress', small && 'progress--sm'], role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-label': label }, fill);
  el.update = (value) => {
    const v = clamp(value);
    el.setAttribute('aria-valuenow', String(v));
    fill.style.width = `${v}%`;
    el.classList.toggle('progress--complete', v === 100);
    fill.classList.toggle('is-empty', v === 0);
  };
  el.update(pct);
  return el;
}

/** Circular progress ring with the percentage in the middle. `update(pct)` supported. */
export function progressRing(pct, { size = 112, label = 'Completion' } = {}) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const arc = h('circle', { class: 'ring__arc', cx: 50, cy: 50, r, fill: 'none', 'stroke-width': 9, 'stroke-linecap': 'round', transform: 'rotate(-90 50 50)' });
  const text = h('span', { class: 'ring__value' });
  const el = h(
    'div',
    { class: 'ring', style: { width: `${size}px`, height: `${size}px` }, role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-label': label },
    h('svg', { viewBox: '0 0 100 100', 'aria-hidden': 'true', focusable: 'false' }, h('circle', { class: 'ring__track', cx: 50, cy: 50, r, fill: 'none', 'stroke-width': 9 }), arc),
    text,
  );
  el.update = (value) => {
    const v = clamp(value);
    arc.setAttribute('stroke-dasharray', `${(c * v) / 100} ${c}`);
    text.textContent = `${v}%`;
    el.setAttribute('aria-valuenow', String(v));
    el.classList.toggle('ring--complete', v === 100);
  };
  el.update(pct);
  return el;
}

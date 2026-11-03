export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const reveal = (order, inner) => `<g class="rv" style="--d:${order}">${inner}</g>`;

export const wire = (d, order, attrs = '') => `<path class="wire rv-draw" style="--d:${order}" pathLength="1" d="${d}"${attrs}/>`;

export const caption = (x, y, label, order) => reveal(order, `<text class="cap" x="${x}" y="${y}" text-anchor="middle">${esc(label)}</text>`);

export const packets = (id, count) => `<g class="pkts" data-pkts="${count}" data-id="${id}"></g>`;

export function pill(x, y, w, h, label, order, attrs = '') {
  const r = Math.min(h / 2, 16);
  return `<g transform="translate(${x} ${y})"${attrs}>${reveal(order, `<g class="node"><rect class="node__box" width="${w}" height="${h}" rx="${r}"/><rect class="node__hit" width="${w}" height="${h}" rx="${r}" style="opacity:0"/><text class="node__label" x="${w / 2}" y="${h / 2 + 4.5}" text-anchor="middle">${esc(label)}</text></g>`)}</g>`;
}

export function meters(list) {
  const items = list.map((m, i) => {
    const visual = m.bar
      ? '<span class="meter__bar"><i data-bar></i></span>'
      : '<svg class="meter__spark" viewBox="0 0 120 30" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path class="spark__area" data-area d="M0 0"/><path class="spark__line" data-line d="M0 0"/></svg>';
    const unit = m.unit ? `<span class="meter__unit">${esc(m.unit)}</span>` : '';
    return `<div class="meter rv-html" style="--d:${6 + i}" data-meter="${m.key}"><span class="meter__label">${esc(m.label)}</span><span class="meter__row"><span class="meter__value" data-value>${esc(m.initial || '0')}</span>${unit}</span>${visual}</div>`;
  }).join('');
  return `<div class="meters">${items}</div>`;
}

export const stage = (id, svg, foot = '') => `<figure class="stage" data-scene="${id}"><svg class="scene" viewBox="0 0 480 280" aria-hidden="true" focusable="false">${svg}</svg>${foot}</figure>`;

export const defs = () => '<svg class="defs" width="0" height="0" aria-hidden="true" focusable="false"><defs><linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="sf0"/><stop offset="1" class="sf1"/></linearGradient><linearGradient id="plot-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="pf0"/><stop offset="1" class="pf1"/></linearGradient></defs></svg>';

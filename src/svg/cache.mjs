import { esc, reveal, wire, packets, meters, stage } from './kit.mjs';

export function cache(l) {
  let cells = '';
  for (let k = 0; k < 16; k++) {
    const col = k % 4;
    const row = Math.floor(k / 4);
    const x = 184 + col * 30;
    const y = 84 + row * 30;
    cells += reveal(3 + (col + row) * 0.35, `<g class="cell" data-cell="${k}" data-x="${x}" data-y="${y}"><rect class="cell__base" x="${x}" y="${y}" width="22" height="22" rx="6"/><rect class="cell__on" x="${x}" y="${y}" width="22" height="22" rx="6" style="opacity:0"/><rect class="cell__inval" x="${x}" y="${y}" width="22" height="22" rx="6" style="opacity:0"/></g>`);
  }
  const frontend = `<g transform="translate(20 112)">${reveal(0, `<g class="node" data-fe><rect class="node__box" width="92" height="56" rx="16"/><rect class="node__hit" width="92" height="56" rx="16" style="opacity:0"/><text class="node__label" x="46" y="32.5" text-anchor="middle">${esc(l.frontend)}</text></g>`)}</g>`;
  const middleware = `<g transform="translate(160 40)">${reveal(1.5, `<g class="node"><rect class="node__box" width="160" height="200" rx="22"/><text class="node__label" x="80" y="27" text-anchor="middle">${esc(l.middleware)}</text><text class="cap" x="80" y="186" text-anchor="middle">${esc(l.store)}</text></g>`)}</g>`;
  const database = `<g transform="translate(368 104)">${reveal(4, `<g class="node" data-db><path class="node__box" d="M0 10 A46 10 0 0 1 92 10 V62 A46 10 0 0 1 0 62 Z"/><ellipse class="db__lid" cx="46" cy="10" rx="46" ry="10"/><ellipse class="db__ring" cx="46" cy="10" rx="46" ry="10" style="opacity:0"/><text class="node__label" x="46" y="46" text-anchor="middle">${esc(l.db)}</text></g>`)}</g>`;
  const wires = `${wire('M112 132 L160 132', 1)}${wire('M160 148 L112 148', 1)}${wire('M320 132 L368 132', 3.5)}${wire('M368 148 L320 148', 3.5)}`;
  const control = `<div class="ctrl rv-html" style="--d:5"><span class="ctrl__label" id="cache-strategy">${esc(l.strategy)}</span><div class="seg" role="radiogroup" aria-labelledby="cache-strategy" data-value="demand"><span class="seg__thumb" aria-hidden="true"></span><button class="seg__opt is-on" type="button" role="radio" aria-checked="true" data-mode="demand">${esc(l.demand)}</button><button class="seg__opt" type="button" role="radio" aria-checked="false" data-mode="preload" tabindex="-1">${esc(l.preload)}</button></div></div>`;
  return stage('cache', `${wires}${frontend}${middleware}${cells}${database}${packets('cap', 22)}`, control + meters([
    { key: 'hitrate', label: l.hitrate, unit: '%' },
    { key: 'latency', label: l.latency, unit: 'ms' },
    { key: 'dbload', label: l.dbload }
  ]));
}

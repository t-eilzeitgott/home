import { esc, reveal, caption, wire, pill, meters, stage } from './kit.mjs';

export function events(l) {
  const ys = [64, 140, 216];
  const producers = [l.erp, l.shop, l.partner];
  const consumers = [l.invoicing, l.warehouse, l.reporting];
  let svg = caption(230, 30, l.stream, 0);
  ys.forEach((y, i) => {
    svg += wire(`M100 ${y} L120 ${y}`, 1 + i * 0.4);
    svg += wire(`M340 ${y} L360 ${y}`, 3 + i * 0.4);
  });
  ys.forEach((y, i) => {
    svg += `<g transform="translate(120 ${y - 12})">${reveal(1.5 + i * 0.4, '<rect class="lane" width="220" height="24" rx="12"/>')}</g>`;
    svg += pill(16, y - 16, 84, 32, producers[i], 0.5 + i * 0.4, ` data-producer="${i}"`);
    svg += `<g transform="translate(360 ${y - 16})" data-consumer="${i}">${reveal(3.5 + i * 0.4, `<g class="node"><rect class="node__box" width="108" height="32" rx="16"/><rect class="node__hit" width="108" height="32" rx="16" style="opacity:0"/><circle class="node__status" cx="16" cy="16" r="3"/><text class="node__label" x="60" y="20.5" text-anchor="middle">${esc(consumers[i])}</text></g>`)}</g>`;
    svg += `<text class="badge" data-badge="${i}" x="318" y="${y - 19}" text-anchor="middle" style="opacity:0">+0</text>`;
  });
  svg += '<g class="evs" data-evs="42"></g>';
  return stage('events', svg, meters([
    { key: 'rate', label: l.rate },
    { key: 'lag', label: l.lag, unit: 'ms' },
    { key: 'lost', label: l.lost }
  ]));
}

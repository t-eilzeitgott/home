import { caption, wire, pill, packets, meters, stage } from './kit.mjs';

const pod = (gen, hidden) => `<g class="rpod" data-gen="${gen}" transform="translate(0 124)"${hidden ? ' style="opacity:0"' : ''}><rect class="node__box" width="52" height="60" rx="14"/><text class="rpod__ver" x="26" y="27" text-anchor="middle">v2.4</text><circle class="rpod__track" cx="26" cy="43" r="6"/><circle class="rpod__ring" cx="26" cy="43" r="6" pathLength="1" transform="rotate(-90 26 43)"/><circle class="rpod__dot" cx="26" cy="43" r="2.4"/></g>`;

export function rollout(l) {
  let wires = '';
  let slots = '';
  for (let i = 0; i < 6; i++) {
    const x = 44 + i * 68;
    const cx = x + 26;
    const order = 2 + Math.abs(i - 2.5) * 0.5;
    wires += wire(`M240 84 C240 108 ${cx} 100 ${cx} 124`, order, ` data-wire="${i}"`);
    slots += `<g transform="translate(${x} 0)" data-slot="${i}" data-cx="${cx}"><g class="rv" style="--d:${order + 1.5}">${pod('a', false)}${pod('b', true)}</g></g>`;
  }
  const svg = `${caption(240, 18, l.traffic, 0)}${wire('M240 26 L240 52', 0.5)}${wires}${pill(184, 52, 112, 32, l.ingress, 1)}${slots}${packets('rop', 28)}`;
  return stage('rollout', svg, meters([
    { key: 'availability', label: l.availability, unit: '%', initial: '100' },
    { key: 'errors', label: l.errors },
    { key: 'progress', label: l.progress, unit: '/ 6', initial: '6', bar: true }
  ]));
}

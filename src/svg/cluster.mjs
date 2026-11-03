import { esc, caption, wire, pill, packets, meters, stage } from './kit.mjs';

export function cluster(l) {
  let wires = '';
  let pods = '';
  for (let i = 0; i < 8; i++) {
    const x = 31 + i * 54;
    const cx = x + 20;
    const order = 2 + Math.abs(i - 3.5) * 0.5;
    wires += wire(`M240 112 C240 146 ${cx} 140 ${cx} 176`, order, ` data-wire="${i}"`);
    pods += `<g transform="translate(${x} 176)" data-slot="${i}" data-cx="${cx}"><g class="rv" style="--d:${order + 1.5}"><rect class="pod-ghost" x="0.5" y="0.5" width="39" height="55" rx="11.5"/><g class="pod" style="opacity:0"><rect class="node__box" width="40" height="56" rx="12"/><rect class="pod__fill" x="5" y="51" width="30" height="0"/><rect class="pod__level" x="5" y="50" width="30" height="2" rx="1" style="opacity:0"/><rect class="pod__heat" x="0.75" y="0.75" width="38.5" height="54.5" rx="11.25" style="opacity:0"/><rect class="pod__hit" width="40" height="56" rx="12" style="opacity:0"/><circle class="pod__dot" cx="31" cy="9" r="2.5"/></g></g></g>`;
  }
  const svg = `${caption(240, 20, l.traffic, 0)}${wire('M240 28 L240 80', 0.5)}${wires}${pill(176, 80, 128, 32, l.lb, 1)}${pods}${packets('clp', 40)}`;
  const control = `<div class="ctrl rv-html" style="--d:5"><label class="ctrl__label" for="cluster-load">${esc(l.load)}</label><input class="ctrl__range" id="cluster-load" type="range" min="0" max="100" step="1" value="30"><button class="ctrl__auto is-on" type="button" data-auto aria-pressed="true">${esc(l.auto)}</button></div>`;
  return stage('cluster', svg, control + meters([
    { key: 'rps', label: l.rps },
    { key: 'replicas', label: l.replicas, unit: '/ 8', initial: '2' },
    { key: 'p95', label: l.p95, unit: 'ms' }
  ]));
}

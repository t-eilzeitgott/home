import { esc, reveal, wire, pill, packets, meters, stage } from './kit.mjs';

const ICONS = [
  {
    art: '<path class="ic__paper" d="M13 8H47V70L42.75 74L38.5 70L34.25 74L30 70L25.75 74L21.5 70L17.25 74L13 70Z"/><rect class="ic__ink" x="19" y="15" width="22" height="4" rx="1"/><rect class="ic__ink ic__ink--f" x="22" y="22" width="16" height="2" rx="1"/><rect class="ic__ink ic__ink--m" x="18" y="30" width="14" height="2.4" rx="1"/><rect class="ic__ink ic__ink--f" x="18" y="38" width="15" height="2" rx="1"/><rect class="ic__ink ic__ink--f" x="36" y="38" width="6" height="2" rx="1"/><rect class="ic__ink ic__ink--f" x="18" y="43" width="11" height="2" rx="1"/><rect class="ic__ink ic__ink--f" x="36" y="43" width="6" height="2" rx="1"/><rect class="ic__ink ic__ink--f" x="18" y="48" width="13" height="2" rx="1"/><rect class="ic__ink ic__ink--f" x="36" y="48" width="6" height="2" rx="1"/><rect class="ic__ink ic__ink--f" x="18" y="53.4" width="24" height=".8"/><rect class="ic__ink ic__ink--m" x="18" y="58" width="10" height="3.5" rx="1"/><rect class="ic__ink" x="31" y="57.5" width="11" height="4.5" rx="1"/>',
    boxes: [[16.5, 13, 27, 8], [16, 28, 18, 6.4], [29.5, 55.5, 15, 8.5]]
  },
  {
    art: '<path class="ic__navy" d="M22 14L30 18L38 14L48 20L54 46L47.5 47.5L46 36V70H14V36L12.5 47.5L6 46L12 20Z"/><path class="ic__navy2" d="M22 14L30 27L38 14L35 13L30 21L25 13Z"/><path class="ic__seam" d="M30 27V70M19 52H25M35 52H41"/>',
    boxes: [[5, 11.5, 50, 61], [17, 38, 11, 10], [21, 11.5, 18, 17]]
  },
  {
    art: '<rect class="ic__box" x="8" y="14" width="44" height="54" rx="5"/><rect class="ic__lcd" x="13" y="23" width="34" height="13" rx="2"/><text class="ic__digit" x="30" y="32.8" text-anchor="middle">48213</text><rect class="ic__ink ic__ink--m" x="13" y="41" width="16" height="3" rx="1"/><circle class="ic__dial" cx="40" cy="50" r="5.5"/><rect class="ic__ink ic__ink--f" x="13" y="48" width="12" height="2" rx="1"/><rect class="ic__tag" x="13" y="56" width="15" height="5" rx="1.2"/>',
    boxes: [[11, 39, 20, 7], [11, 21, 38, 17], [11, 54, 19, 9]]
  }
];

function phone() {
  const shots = ICONS.map((ic, i) => `<g class="shot" data-shot="${i}" transform="translate(28.5 70) scale(.95)" style="opacity:${i ? 0 : 1}">${ic.art}</g>`).join('');
  const rows = [0, 1, 2, 3].map((i) => `<g class="ph__row" data-row="${i}" style="opacity:0"><rect class="ph__rowbg" width="62" height="14" rx="5"/><circle class="ph__dot" cx="8" cy="7" r="2.6"/><rect class="ph__bar" x="15" y="3.8" width="30" height="2.6" rx="1.3"/><rect class="ph__bar ph__bar--s" x="15" y="8.4" width="20" height="2" rx="1"/></g>`).join('');
  const body = `<g class="node" data-phone><rect class="node__box" x="18" y="50" width="78" height="180" rx="18"/><rect class="node__hit" x="18" y="50" width="78" height="180" rx="18" style="opacity:0"/><rect class="ph__notch" x="48" y="58" width="18" height="4.5" rx="2.25"/><rect class="vf" x="26" y="70" width="62" height="78" rx="9"/>${shots}<rect class="vf__flash" x="26" y="70" width="62" height="78" rx="9" style="opacity:0"/>${rows}<circle class="ph__ring" cx="57" cy="217" r="8.5"/><circle class="ph__btn" data-shutter cx="57" cy="217" r="6"/></g>`;
  return reveal(0, body);
}

function model(l) {
  const frames = ICONS.map((ic, i) => `<g data-mshot="${i}" style="opacity:0"><g transform="translate(276 50) scale(.9)">${ic.art}${ic.boxes.map(([x, y, w, h], k) => `<rect class="det" data-det="${k}" x="${x}" y="${y}" width="${w}" height="${h}" rx="2.5" style="opacity:0"/>`).join('')}</g></g>`).join('');
  const fields = l.examples.map((ex, i) => `<g data-fields="${i}">${ex.map(([k, v], r) => `<g transform="translate(346 ${54 + r * 25})"><g class="fld" data-fld="${r}" style="opacity:0"><text class="fld__k" y="8">${esc(k)}</text><text class="fld__v" y="21.5">${esc(v)}</text></g></g>`).join('')}</g>`).join('');
  const scan = '<g clip-path="url(#vis-clip)"><g data-scan style="opacity:0"><rect x="274" y="-16" width="58" height="16" fill="url(#vis-scan)"/><rect class="scan__line" x="274" y="-1" width="58" height="1.5"/></g></g>';
  const body = `<g class="node" data-model><rect class="node__box" x="262" y="22" width="200" height="112" rx="20"/><rect class="node__hit" x="262" y="22" width="200" height="112" rx="20" style="opacity:0"/><text class="vis__title" x="276" y="41">${esc(l.model)}</text><rect class="vf" x="274" y="50" width="58" height="74" rx="8"/>${frames}${scan}${fields}</g>`;
  return reveal(3, body);
}

function review(l) {
  const queue = [0, 1, 2, 3, 4].map((i) => `<rect class="q" data-q="${i}" x="${372 + i * 14}" y="221" width="10" height="10" rx="3" style="opacity:0"/>`).join('');
  const body = `<g class="node" data-review><rect class="node__box" x="262" y="210" width="100" height="32" rx="16"/><rect class="node__hit" x="262" y="210" width="100" height="32" rx="16" style="opacity:0"/><circle class="vis__glyph" cx="281" cy="222.5" r="3.2"/><path class="vis__glyph" d="M274.6 233.2a6.4 5.2 0 0 1 12.8 0Z"/><text class="node__label" x="318" y="230.5" text-anchor="middle">${esc(l.review)}</text></g>`;
  return reveal(5, body) + queue;
}

export function vision(l) {
  const defs = '<defs><clipPath id="vis-clip"><rect x="274" y="50" width="58" height="74" rx="8"/></clipPath><linearGradient id="vis-scan" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="scan0"/><stop offset="1" class="scan1"/></linearGradient></defs>';
  const wires = [
    wire('M96 132 L138 132', 1),
    wire('M138 148 L96 148', 1),
    wire('M196 124 C196 84 226 64 262 64', 2.5),
    wire('M262 104 C240 104 240 136 218 136', 2.5),
    wire('M218 150 C240 150 240 176 262 176', 4),
    wire('M204 160 C204 214 232 226 262 226', 4.5),
    wire('M312 210 L312 192', 5.5)
  ].join('');
  const saved = pill(262, 160, 100, 32, l.saved, 4.5, ' data-saved');
  const backend = pill(138, 124, 80, 36, l.backend, 1.5, ' data-backend');
  const badge = '<text class="badge badge--ok" data-badge x="372" y="181" style="opacity:0">+1</text>';
  return stage('vision', `${defs}${wires}${phone()}${backend}${model(l)}${saved}${review(l)}${badge}${packets('vsp', 10)}`, meters([
    { key: 'latency', label: l.latency, unit: 's' },
    { key: 'auto', label: l.auto, unit: '%' },
    { key: 'queue', label: l.queue }
  ]));
}

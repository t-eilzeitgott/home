const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function node(cls, x, y, w, h, label, extra = '') {
  return `<g class="node ${cls}" transform="translate(${x} ${y})"${extra}><rect width="${w}" height="${h}" rx="10"/><text x="${w / 2}" y="${h / 2 + 4.5}" text-anchor="middle">${esc(label)}</text></g>`;
}

function readout(x, y, key, unit, label, initial = '0', anchor = 'start') {
  return `<text class="ro" x="${x}" y="${y}" text-anchor="${anchor}"><tspan class="ro__v" data-v="${key}">${initial}</tspan><tspan class="ro__l">${unit ? ` ${esc(unit)}` : ''}${label ? ` ${esc(label)}` : ''}</tspan></text>`;
}

function pool(count, markup) {
  let out = '';
  for (let i = 0; i < count; i++) out += markup(i);
  return out;
}

function pod(x, y, w, h, label, attrs = '') {
  return `<g transform="translate(${x} ${y})"><g class="pod"${attrs}><rect class="pod__box" width="${w}" height="${h}" rx="10"/><rect class="pod__track" x="8" y="${h - 10}" width="${w - 16}" height="3" rx="1.5"/><rect class="pod__util" x="8" y="${h - 10}" width="${w - 16}" height="3" rx="1.5"/><text class="pod__lbl" x="${w / 2}" y="${h / 2 + 1}" text-anchor="middle">${esc(label)}</text></g></g>`;
}

export function clusterScene(l) {
  const podsX = [222, 284, 346, 408];
  const podsY = [100, 164];
  let pods = '';
  let links = '';
  for (let i = 0; i < 8; i++) {
    const x = podsX[i % 4];
    const y = podsY[Math.floor(i / 4)];
    links += `<line class="link" data-link="${i}" x1="336" y1="68" x2="${x + 24}" y2="${y}"/>`;
    pods += pod(x, y, 48, 42, l.pod, ` data-pod="${i}"`);
  }
  return `<svg class="scene scene--cluster" viewBox="0 0 480 360" data-scene="cluster" role="img" aria-label="${esc(l.lb)}">
<text class="lbl" x="24" y="48">${esc(l.load)}</text>
<path class="graph__fill" data-el="loadFill" d=""/>
<path class="graph__line" data-el="loadLine" d=""/>
<circle class="graph__dot" data-el="loadDot" r="3.5" cx="200" cy="236"/>
<rect class="graph__hit" data-el="loadHit" x="16" y="56" width="192" height="196" rx="8"/>
${links}
${node('node--lb', 268, 36, 136, 32, l.lb)}
${pods}
${readout(24, 300, 'rps', '', l.rps, '0')}
${readout(222, 300, 'replicas', '/ 8', l.replicas, '1')}
${readout(356, 300, 'p95', 'ms', l.p95, '24')}
</svg>`;
}

export function cacheScene(l) {
  let cells = '';
  for (let i = 0; i < 16; i++) {
    const x = 196 + (i % 4) * 24;
    const y = 112 + Math.floor(i / 4) * 24;
    cells += `<rect class="cell" data-cell="${i}" x="${x}" y="${y}" width="16" height="16" rx="4"/>`;
  }
  return `<svg class="scene scene--cache" viewBox="0 0 480 360" data-scene="cache" role="img" aria-label="${esc(l.middleware)}">
<line class="lane" x1="120" y1="170" x2="168" y2="170"/>
<line class="lane" x1="120" y1="190" x2="168" y2="190"/>
<line class="lane" x1="312" y1="170" x2="360" y2="170"/>
<line class="lane" x1="312" y1="190" x2="360" y2="190"/>
${node('node--fe', 24, 150, 96, 60, l.frontend)}
<g class="node node--mw" transform="translate(168 80)"><rect width="144" height="200" rx="12"/><text x="72" y="24" text-anchor="middle">${esc(l.middleware)}</text></g>
${cells}
<text class="lbl" x="240" y="234" text-anchor="middle">${esc(l.cache)}</text>
${node('node--db', 360, 150, 96, 60, l.db)}
<g class="dots">${pool(14, (i) => `<circle class="dot" data-dot="${i}" r="4.5" cx="0" cy="0"/>`)}</g>
${readout(24, 330, 'hitrate', '%', l.hitrate, '0')}
${readout(200, 330, 'p50', 'ms', l.p50, '4')}
${readout(340, 330, 'nocache', 'ms', l.nocache, '52')}
</svg>`;
}

export function rolloutScene(l) {
  const xs = [37, 107, 177, 247, 317, 387];
  let pods = '';
  xs.forEach((x, i) => {
    pods += pod(x, 120, 56, 48, 'v2.3', ` data-slot="${i}" data-gen="a"`);
    pods += pod(x, 120, 56, 48, 'v2.4', ` data-slot="${i}" data-gen="b"`);
  });
  return `<svg class="scene scene--rollout" viewBox="0 0 480 360" data-scene="rollout" role="img" aria-label="${esc(l.traffic)}">
${node('node--traffic', 192, 32, 96, 30, l.traffic)}
${pods}
<g class="dots">${pool(18, (i) => `<circle class="dot" data-dot="${i}" r="3.5" cx="0" cy="0"/>`)}</g>
${readout(37, 330, 'version', '', l.version, 'v2.3')}
${readout(170, 330, 'downtime', 'ms', l.downtime, '0')}
${readout(290, 330, 'errors', '', l.errors, '0')}
${readout(390, 330, 'ready', '', l.ready, '6')}
</svg>`;
}

export function eventsScene(l) {
  const ys = [87, 167, 247];
  let lanes = '';
  ys.forEach((y) => {
    lanes += `<line class="lane" x1="112" y1="${y}" x2="356" y2="${y}"/>`;
    for (let x = 140; x < 356; x += 28) lanes += `<line class="tick" x1="${x}" y1="${y - 3}" x2="${x}" y2="${y + 3}"/>`;
  });
  return `<svg class="scene scene--events" viewBox="0 0 480 360" data-scene="events" role="img" aria-label="${esc(l.erp)}">
${lanes}
<path class="lane lane--fan" d="M356 87 C 368 87 368 247 372 247"/>
<path class="lane lane--fan" d="M356 167 C 368 167 368 247 372 247"/>
${node('node--p', 24, 72, 80, 30, l.erp)}
${node('node--p', 24, 152, 80, 30, l.shop)}
${node('node--p', 24, 232, 80, 30, l.partner)}
${node('node--c', 372, 72, 84, 30, l.invoicing, ' data-consumer="0"')}
${node('node--c', 372, 152, 84, 30, l.warehouse, ' data-consumer="1"')}
${node('node--c', 372, 232, 84, 30, l.reporting, ' data-consumer="2"')}
<text class="lbl lbl--retry" data-el="retry" x="414" y="200" text-anchor="middle">${esc(l.retry)}</text>
<g class="dots">${pool(24, (i) => `<rect class="ev" data-ev="${i}" width="10" height="10" rx="3" x="-5" y="-5"/>`)}</g>
${readout(24, 330, 'perMinute', '', l.perMinute, '0')}
${readout(200, 330, 'lag', 'ms', l.lag, '0')}
${readout(340, 330, 'lost', '', l.lost, '0')}
</svg>`;
}

export const SCENES = { cluster: clusterScene, cache: cacheScene, rollout: rolloutScene, events: eventsScene };

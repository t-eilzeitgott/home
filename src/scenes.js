const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const place = (el, x, y) => el.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);

function traveler(el) {
  return { el, segs: [], i: 0, t: 0, busy: false };
}

function begin(tr, segs) {
  tr.segs = segs;
  tr.i = 0;
  tr.t = 0;
  tr.busy = true;
  tr.el.classList.add('is-on');
}

function finish(tr) {
  tr.busy = false;
  tr.segs = [];
  tr.el.classList.remove('is-on');
}

function advance(tr, dt) {
  while (dt > 0 && tr.i < tr.segs.length) {
    const s = tr.segs[tr.i];
    if (!s.started) {
      s.started = true;
      if (s.on) s.on(tr);
    }
    tr.t += dt;
    const hold = s.hold || 0;
    const total = hold + s.d;
    const p = s.d > 0 ? clamp((tr.t - hold) / s.d, 0, 1) : 1;
    const e = s.linear ? p : ease(p);
    let x;
    let y;
    if (s.c2) {
      const u = 1 - e;
      x = u * u * u * s.x0 + 3 * u * u * e * s.c1[0] + 3 * u * e * e * s.c2[0] + e * e * e * s.x1;
      y = u * u * u * s.y0 + 3 * u * u * e * s.c1[1] + 3 * u * e * e * s.c2[1] + e * e * e * s.y1;
    } else {
      x = lerp(s.x0, s.x1, e);
      y = lerp(s.y0, s.y1, e);
    }
    place(tr.el, x, y);
    if (tr.t >= total) {
      dt = tr.t - total;
      tr.t = 0;
      tr.i++;
      if (s.after) s.after(tr);
    } else {
      dt = 0;
    }
  }
  return tr.i >= tr.segs.length;
}

function run(svg, scene) {
  let raf = 0;
  let last = 0;
  let visible = false;
  const loop = (now) => {
    raf = 0;
    if (!visible || document.hidden) return;
    const dt = Math.min(0.05, (now - last) / 1000) || 0.016;
    last = now;
    scene.tick(dt);
    raf = requestAnimationFrame(loop);
  };
  const wake = () => {
    last = performance.now();
    if (!raf && visible && !document.hidden && !reduced) raf = requestAnimationFrame(loop);
  };
  scene.init();
  if (reduced) {
    scene.settle();
    return;
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting && e.intersectionRatio > 0.1;
      wake();
    }, { threshold: [0, 0.1, 0.5] }).observe(svg);
  } else {
    visible = true;
    wake();
  }
  document.addEventListener('visibilitychange', wake);
}

function cluster(svg, fmt) {
  const q = (s) => svg.querySelector(s);
  const pods = Array.from(svg.querySelectorAll('.pod'));
  const utils = pods.map((p) => p.querySelector('.pod__util'));
  const links = Array.from(svg.querySelectorAll('.link'));
  const line = q('[data-el="loadLine"]');
  const fill = q('[data-el="loadFill"]');
  const dot = q('[data-el="loadDot"]');
  const hit = q('[data-el="loadHit"]');
  const vRps = q('[data-v="rps"]');
  const vRep = q('[data-v="replicas"]');
  const vP95 = q('[data-v="p95"]');
  const X0 = 24;
  const X1 = 200;
  const Y0 = 68;
  const Y1 = 236;
  const N = 112;
  const STEP = 1 / 24;
  const CAP = 300;
  const samples = new Float32Array(N).fill(0.3);
  let t = 0;
  let acc = 0;
  let load = 0.3;
  let manual = -1;
  let hold = 0;
  let dragging = false;
  let replicas = 2;
  let up = 0;
  let down = 0;
  let p95 = 24;
  let ui = 1;
  const wave = (s) => clamp(0.45 + 0.28 * Math.sin(s * 0.33) + 0.17 * Math.sin(s * 0.91 + 1.3) + 0.08 * Math.sin(s * 2.7), 0.06, 1);
  const fromPointer = (e) => {
    const r = hit.getBoundingClientRect();
    if (!r.height) return;
    const y = clamp((e.clientY - r.top) / r.height, 0, 1);
    manual = clamp(1 - y, 0.04, 1);
    hold = 4;
  };
  const stop = () => { dragging = false; };
  hit.addEventListener('pointerdown', (e) => {
    dragging = true;
    try { hit.setPointerCapture(e.pointerId); } catch (x) {}
    fromPointer(e);
  });
  hit.addEventListener('pointermove', (e) => { if (dragging) fromPointer(e); });
  hit.addEventListener('pointerup', stop);
  hit.addEventListener('pointercancel', stop);
  hit.addEventListener('lostpointercapture', stop);

  function tick(dt) {
    t += dt;
    if (!dragging && hold > 0) {
      hold -= dt;
      if (hold <= 0) manual = -1;
    }
    const want = manual >= 0 ? manual : wave(t);
    load += (want - load) * (1 - Math.exp(-dt * 4));
    acc += dt;
    while (acc >= STEP) {
      acc -= STEP;
      samples.copyWithin(0, 1);
      samples[N - 1] = load;
    }
    let d = '';
    for (let i = 0; i < N; i++) {
      const x = X0 + (i / N) * (X1 - X0);
      const y = Y1 - samples[i] * (Y1 - Y0);
      d += `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    const yl = Y1 - load * (Y1 - Y0);
    d += `L${X1} ${yl.toFixed(1)}`;
    line.setAttribute('d', d);
    fill.setAttribute('d', `${d}L${X1} ${Y1}L${X0} ${Y1}Z`);
    dot.setAttribute('cy', yl.toFixed(1));
    const rps = Math.round(load * 2400);
    const target = clamp(Math.ceil(rps / CAP), 1, 8);
    if (target > replicas) {
      up += dt;
      down = 0;
      if (up > 0.3) {
        replicas++;
        up = 0;
      }
    } else if (target < replicas) {
      down += dt;
      up = 0;
      if (down > 2.4) {
        replicas--;
        down = 1.4;
      }
    } else {
      up = 0;
      down = 0;
    }
    const util = clamp(rps / (replicas * CAP), 0, 1.4);
    for (let i = 0; i < pods.length; i++) {
      const on = i < replicas;
      pods[i].classList.toggle('is-on', on);
      links[i].classList.toggle('is-on', on);
      utils[i].style.transform = `scaleX(${on ? clamp(util, 0.04, 1).toFixed(3) : 0})`;
    }
    const p95Target = 22 + Math.pow(Math.max(0, util - 0.5), 2) * 140 + (util > 1 ? 120 : 0);
    p95 += (p95Target - p95) * (1 - Math.exp(-dt * 2));
    ui += dt;
    if (ui > 0.15) {
      ui = 0;
      vRps.textContent = fmt.format(rps);
      vRep.textContent = String(replicas);
      vP95.textContent = fmt.format(Math.round(p95));
    }
  }

  return {
    init() { tick(1 / 60); },
    tick,
    settle() { for (let i = 0; i < 420; i++) tick(1 / 60); }
  };
}

function cache(svg, fmt) {
  const q = (s) => svg.querySelector(s);
  const cells = Array.from(svg.querySelectorAll('.cell'));
  const dots = Array.from(svg.querySelectorAll('.dot')).map(traveler);
  const db = q('.node--db');
  const vHit = q('[data-v="hitrate"]');
  const vP50 = q('[data-v="p50"]');
  const state = cells.map(() => ({ filled: false, ttl: 0, touch: 0, drop: 0 }));
  const outcomes = [];
  let emit = 0.2;
  let write = 7;
  let dbPulse = 0;
  let ui = 1;
  const cellPos = (k) => ({ x: 204 + (k % 4) * 24, y: 120 + Math.floor(k / 4) * 24 });
  const pickKey = () => Math.floor(16 * Math.pow(Math.random(), 1.6));

  function request() {
    const tr = dots.find((d) => !d.busy);
    if (!tr) return;
    const key = pickKey();
    const cp = cellPos(key);
    const s = state[key];
    tr.el.classList.remove('dot--hit', 'dot--miss');
    begin(tr, [
      { x0: 120, y0: 170, x1: 168, y1: 170, d: 0.28 },
      {
        x0: 168, y0: 170, x1: cp.x, y1: cp.y, d: 0.22,
        after: () => {
          s.touch = 0.25;
          const hitNow = s.filled;
          outcomes.push(hitNow ? 1 : 0);
          if (outcomes.length > 24) outcomes.shift();
          if (hitNow) {
            tr.el.classList.add('dot--hit');
            tr.segs.push(
              { x0: cp.x, y0: cp.y, x1: 168, y1: 190, d: 0.22, hold: 0.06 },
              { x0: 168, y0: 190, x1: 120, y1: 190, d: 0.28, after: () => finish(tr) }
            );
          } else {
            tr.el.classList.add('dot--miss');
            tr.segs.push(
              { x0: cp.x, y0: cp.y, x1: 312, y1: 170, d: 0.22, hold: 0.06 },
              { x0: 312, y0: 170, x1: 360, y1: 170, d: 0.26, after: () => { dbPulse = 0.3; } },
              { x0: 360, y0: 190, x1: 312, y1: 190, d: 0.26, hold: 0.24 },
              {
                x0: 312, y0: 190, x1: cp.x, y1: cp.y, d: 0.22,
                after: () => {
                  s.filled = true;
                  s.ttl = 7 + Math.random() * 7;
                  s.touch = 0.25;
                }
              },
              { x0: cp.x, y0: cp.y, x1: 168, y1: 190, d: 0.22, hold: 0.06 },
              { x0: 168, y0: 190, x1: 120, y1: 190, d: 0.28, after: () => finish(tr) }
            );
          }
        }
      }
    ]);
  }

  function tick(dt) {
    emit -= dt;
    if (emit <= 0) {
      emit = 0.38 + Math.random() * 0.16;
      request();
    }
    for (const tr of dots) if (tr.busy) advance(tr, dt);
    for (let k = 0; k < state.length; k++) {
      const s = state[k];
      if (s.filled) {
        s.ttl -= dt;
        if (s.ttl <= 0) s.filled = false;
      }
      if (s.touch > 0) s.touch -= dt;
      if (s.drop > 0) s.drop -= dt;
      cells[k].classList.toggle('is-filled', s.filled);
      cells[k].classList.toggle('is-touch', s.touch > 0);
      cells[k].classList.toggle('is-drop', s.drop > 0);
    }
    write -= dt;
    if (write <= 0) {
      write = 6 + Math.random() * 5;
      const filled = [];
      state.forEach((s, k) => { if (s.filled) filled.push(k); });
      if (filled.length) {
        const k = filled[Math.floor(Math.random() * filled.length)];
        state[k].filled = false;
        state[k].drop = 0.45;
        dbPulse = 0.35;
      }
    }
    if (dbPulse > 0) dbPulse -= dt;
    db.classList.toggle('is-pulse', dbPulse > 0);
    ui += dt;
    if (ui > 0.25) {
      ui = 0;
      const n = outcomes.length;
      const h = outcomes.reduce((a, b) => a + b, 0);
      vHit.textContent = n ? String(Math.round((100 * h) / n)) : '0';
      vP50.textContent = n ? String(Math.round((4 * h + 52 * (n - h)) / n)) : '52';
    }
  }

  return {
    init() { tick(1 / 60); },
    tick,
    settle() { for (let i = 0; i < 1200; i++) tick(1 / 60); }
  };
}

function rollout(svg, fmt) {
  const q = (s) => svg.querySelector(s);
  const centers = [37, 107, 177, 247, 317, 387].map((x) => x + 28);
  const gens = { a: [], b: [] };
  for (let i = 0; i < 6; i++) {
    gens.a.push(q(`.pod[data-slot="${i}"][data-gen="a"]`));
    gens.b.push(q(`.pod[data-slot="${i}"][data-gen="b"]`));
  }
  const dots = Array.from(svg.querySelectorAll('.dot')).map(traveler);
  const vVer = q('[data-v="version"]');
  const vReady = q('[data-v="ready"]');
  const hits = new Map();
  let live = 'a';
  let version = 3;
  let phase = 'stable';
  let wait = 2.5;
  let slot = 0;
  let emit = 0;
  let ui = 1;
  const other = () => (live === 'a' ? 'b' : 'a');
  const label = (gen, v) => gens[gen].forEach((p) => { p.querySelector('.pod__lbl').textContent = `v2.${v}`; });
  const reset = (p) => p.classList.remove('is-prep', 'is-staging', 'is-ready', 'is-live', 'is-draining', 'is-gone', 'is-hit');
  const serving = (i) => {
    const n = gens[other()][i];
    if (n.classList.contains('is-ready') && (phase === 'drain' || phase === 'swap') && slot === i) return n;
    const o = gens[live][i];
    return o.classList.contains('is-on') ? o : n;
  };

  function spawn() {
    const tr = dots.find((d) => !d.busy);
    if (!tr) return;
    const i = Math.floor(Math.random() * 6);
    const target = serving(i);
    const x = centers[i];
    const y = target.classList.contains('is-staging') ? 220 : 120;
    begin(tr, [{ x0: 240, y0: 62, x1: x, y1: y, d: 0.42, after: () => { hits.set(target, 0.18); finish(tr); } }]);
  }

  function tick(dt) {
    emit -= dt;
    if (emit <= 0) {
      emit = 0.11;
      spawn();
    }
    for (const tr of dots) if (tr.busy) advance(tr, dt);
    wait -= dt;
    if (wait <= 0) {
      const n = gens[other()][slot];
      const o = gens[live][slot];
      if (phase === 'stable') {
        phase = 'prep';
        slot = 0;
        label(other(), version + 1);
        wait = 0.05;
        gens[other()][slot].classList.add('is-on', 'is-prep');
      } else if (phase === 'prep') {
        n.classList.remove('is-prep');
        n.classList.add('is-staging');
        phase = 'stage';
        wait = 0.9;
      } else if (phase === 'stage') {
        n.classList.add('is-ready');
        phase = 'drain';
        wait = 0.55;
      } else if (phase === 'drain') {
        o.classList.add('is-draining');
        phase = 'swap';
        wait = 0.6;
      } else if (phase === 'swap') {
        o.classList.remove('is-on', 'is-draining', 'is-live');
        o.classList.add('is-gone');
        n.classList.remove('is-staging');
        n.classList.add('is-live');
        phase = 'next';
        wait = 0.55;
      } else if (phase === 'next') {
        reset(o);
        n.classList.remove('is-ready');
        slot++;
        if (slot < 6) {
          phase = 'prep';
          gens[other()][slot].classList.add('is-on', 'is-prep');
          wait = 0.05;
        } else {
          live = other();
          version++;
          phase = 'stable';
          slot = 0;
          wait = 3;
        }
      }
    }
    for (const [pod, left] of hits) {
      const v = left - dt;
      if (v <= 0) {
        hits.delete(pod);
        pod.classList.remove('is-hit');
      } else {
        hits.set(pod, v);
        pod.classList.add('is-hit');
      }
    }
    ui += dt;
    if (ui > 0.2) {
      ui = 0;
      vVer.textContent = phase === 'stable' ? `v2.${version}` : `v2.${version} → v2.${version + 1}`;
      let ready = 0;
      for (const g of ['a', 'b']) for (const p of gens[g]) if (p.classList.contains('is-on') && !p.classList.contains('is-draining') && !p.classList.contains('is-prep') && (p.classList.contains('is-live') || p.classList.contains('is-ready'))) ready++;
      vReady.textContent = String(ready);
    }
  }

  return {
    init() {
      label('a', version);
      label('b', version + 1);
      gens.a.forEach((p) => p.classList.add('is-on', 'is-live'));
      tick(1 / 60);
    },
    tick,
    settle() {
      for (let i = 0; i < 300; i++) tick(1 / 60);
    }
  };
}

function events(svg, fmt) {
  const q = (s) => svg.querySelector(s);
  const ys = [87, 167, 247];
  const evs = Array.from(svg.querySelectorAll('.ev')).map(traveler);
  const consumers = [0, 1, 2].map((i) => q(`[data-consumer="${i}"]`));
  const retryLabel = q('[data-el="retry"]');
  const vPer = q('[data-v="perMinute"]');
  const vLag = q('[data-v="lag"]');
  const vLost = q('[data-v="lost"]');
  const timers = [0.3, 0.9, 1.5];
  const pulses = new Map();
  let fails = 0;
  let nextFail = 5;
  let retryUntil = 0;
  let t = 0;
  let ui = 1;

  function pulse(node, cls, s) {
    pulses.set(node, { cls, left: s });
    node.classList.add(cls);
  }

  function deliver(tr, lane) {
    const y = ys[lane];
    const node = consumers[lane];
    const arrive = () => {
      pulse(node, 'is-pulse', 0.22);
      finish(tr);
    };
    if (lane === 1 && nextFail <= 0) {
      nextFail = 6 + Math.random() * 5;
      retryUntil = 1.0;
      fails++;
      tr.el.classList.add('ev--retry');
      pulse(node, 'is-fail', 0.5);
      tr.segs.push(
        { x0: 372, y0: y, x1: 338, y1: y, d: 0.22 },
        { x0: 338, y0: y, x1: 372, y1: y, d: 0.24, hold: 0.55, after: arrive }
      );
    } else {
      tr.segs.push({ x0: 356, y0: y, x1: 372, y1: y, d: 0.16, after: arrive });
    }
  }

  function copyTo(lane) {
    const tr = evs.find((e) => !e.busy);
    if (!tr) return;
    const y = ys[lane];
    tr.el.classList.remove('ev--retry');
    tr.el.classList.add('ev--copy');
    begin(tr, [{ x0: 356, y0: y, x1: 372, y1: 247, c1: [368, y], c2: [368, 247], d: 0.6, after: () => { pulse(consumers[2], 'is-pulse', 0.22); finish(tr); } }]);
  }

  function produce(lane) {
    const tr = evs.find((e) => !e.busy);
    if (!tr) return;
    const y = ys[lane];
    tr.el.classList.remove('ev--copy', 'ev--retry');
    begin(tr, [
      { x0: 104, y0: y, x1: 112, y1: y, d: 0.12 },
      {
        x0: 112, y0: y, x1: 356, y1: y, d: 1.7, linear: true,
        after: () => {
          if (lane < 2) copyTo(lane);
          if (lane === 1 && nextFail <= 0) {
            tr.segs.push({ x0: 356, y0: y, x1: 372, y1: y, d: 0.16, after: () => deliver(tr, lane) });
          } else {
            deliver(tr, lane);
          }
        }
      }
    ]);
  }

  function tick(dt) {
    t += dt;
    nextFail -= dt;
    if (retryUntil > 0) retryUntil -= dt;
    retryLabel.classList.toggle('is-on', retryUntil > 0);
    for (let i = 0; i < 3; i++) {
      timers[i] -= dt;
      if (timers[i] <= 0) {
        timers[i] = [0.8, 1.0, 1.3][i] + Math.random() * 0.5;
        produce(i);
      }
    }
    for (const tr of evs) if (tr.busy) advance(tr, dt);
    for (const [node, p] of pulses) {
      p.left -= dt;
      if (p.left <= 0) {
        pulses.delete(node);
        node.classList.remove(p.cls);
      }
    }
    ui += dt;
    if (ui > 0.5) {
      ui = 0;
      vPer.textContent = fmt.format(Math.round(3100 + 240 * Math.sin(t * 0.4) + 90 * Math.sin(t * 1.7)));
      vLag.textContent = fmt.format(Math.round(96 + 30 * Math.sin(t * 0.7 + 1) + (retryUntil > 0 ? 180 : 0)));
      vLost.textContent = '0';
    }
  }

  return {
    init() { tick(1 / 60); },
    tick,
    settle() { for (let i = 0; i < 300; i++) tick(1 / 60); }
  };
}

const SCENES = { cluster, cache, rollout, events };

export function start(root, lang) {
  const fmt = new Intl.NumberFormat(lang === 'de' ? 'de-DE' : 'en-US');
  for (const svg of root.querySelectorAll('.scene[data-scene]')) {
    const make = SCENES[svg.dataset.scene];
    if (make) run(svg, make(svg, fmt));
  }
}

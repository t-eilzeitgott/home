function visionScene(fig, ctx) {
  const svg = fig.querySelector('.scene');
  const pool = new Pool(svg);
  const hit = (sel) => ({ el: svg.querySelector(`${sel} .node__hit`), glow: 0 });
  const nodes = { phone: hit('[data-phone]'), backend: hit('[data-backend]'), model: hit('[data-model]'), saved: hit('[data-saved]'), review: hit('[data-review]') };
  const shots = Array.from(svg.querySelectorAll('[data-shot]'), (el, i) => ({ el, a: new Spring(i ? 0 : 1, 120, 22) }));
  const frames = Array.from(svg.querySelectorAll('[data-mshot]'), (el) => ({
    el,
    a: new Spring(0, 140, 24),
    dets: Array.from(el.querySelectorAll('.det'), (d) => ({ el: d, a: new Spring(0, 240, 24) }))
  }));
  const sets = Array.from(svg.querySelectorAll('[data-fields]'), (g) => Array.from(g.querySelectorAll('.fld'), (el) => ({ el, a: new Spring(0, 200, 24) })));
  const flash = svg.querySelector('.vf__flash');
  const scan = svg.querySelector('[data-scan]');
  const shutter = svg.querySelector('[data-shutter]');
  const rows = Array.from(svg.querySelectorAll('[data-row]'), (el) => ({ el, dot: el.querySelector('.ph__dot'), y: new Spring(205, 190, 24), a: new Spring(0, 160, 24), slot: -1, warn: false }));
  const squares = Array.from(svg.querySelectorAll('[data-q]'), (el) => ({ el, a: new Spring(0, 220, 20) }));
  const badge = { el: svg.querySelector('[data-badge]'), a: new Spring(0, 170, 24), t: 0 };
  const shutterScale = new Spring(1, 320, 18);
  const R = {
    up: line(96, 132, 138, 132),
    down: line(138, 148, 96, 148),
    toModel: new Route(196, 124, 196, 84, 226, 64, 262, 64),
    fromModel: new Route(262, 104, 240, 104, 240, 136, 218, 136),
    toSaved: new Route(218, 150, 240, 150, 240, 176, 262, 176),
    toReview: new Route(204, 160, 204, 214, 232, 226, 262, 226),
    reviewed: line(312, 210, 312, 192)
  };
  const unsureField = [2, 1, 1];
  const meters = new Meters(fig, {
    latency: { format: ctx.fixed1, spark: { min: 0 } },
    auto: { format: ctx.int, spark: { min: 70, max: 100 } },
    queue: { format: ctx.int, spark: { min: 0, max: 4 } }
  });
  let age = 0;
  let next = 0.6;
  let ex = -1;
  let job = 0;
  let flashA = 0;
  let scanT = -1;
  let current = null;
  let clearAt = -1;
  let shown = -1;
  let queue = 0;
  let reviewT = 0;
  let ok = 188;
  let all = 200;

  const glow = (name, v = 1) => { nodes[name].glow = Math.max(nodes[name].glow, v); };

  function addRow(warn) {
    for (const r of rows) {
      if (r.slot < 0) continue;
      r.slot += 1;
      if (r.slot > 2) r.slot = -1;
    }
    const r = rows.find((x) => x.slot < 0 && x.a.x < 0.05) || rows.find((x) => x.slot < 0);
    r.slot = 0;
    r.warn = warn;
    r.y.snap(146);
    r.a.snap(0);
    glow('phone', 0.8);
  }

  function resolveRow() {
    const waiting = rows.filter((r) => r.slot >= 0 && r.warn).sort((a, b) => b.slot - a.slot);
    if (waiting.length) waiting[0].warn = false;
  }

  function stored() {
    glow('saved');
    badge.t = 1.1;
  }

  function capture() {
    ex = (ex + 1) % shots.length;
    job += 1;
    const unsure = job % 4 === 3;
    flashA = 1;
    shutterScale.x = 0.78;
    shots.forEach((s, i) => s.a.set(i === ex ? 1 : 0));
    const t0 = age;
    const id = ex;
    pool.launch('data', [
      { route: R.up, d: 0.34, hold: 0.28, ease: easeOut, fadeIn: true, then: () => glow('backend', 0.8) },
      { route: R.toModel, d: 0.5, then: () => analyze(id, unsure, t0) }
    ]);
  }

  function analyze(id, unsure, t0) {
    glow('model');
    current = { id, unsure, t0, revealed: 0 };
    frames.forEach((f, i) => {
      f.a.set(i === id ? 1 : 0);
      if (i === id) f.dets.forEach((d) => { d.a.snap(0); d.el.classList.remove('is-warn'); });
    });
    show(id);
    scanT = 0;
  }

  function show(id) {
    if (shown >= 0 && shown !== id) sets[shown].forEach((f) => f.a.snap(0));
    shown = id;
    sets[id].forEach((f) => { f.a.snap(0); f.el.classList.remove('is-warn'); });
  }

  function reveal(k) {
    const c = current;
    const warn = c.unsure && k === unsureField[c.id];
    const d = frames[c.id].dets[k];
    const f = sets[c.id][k];
    d.a.set(1);
    f.a.set(1);
    d.el.classList.toggle('is-warn', warn);
    f.el.classList.toggle('is-warn', warn);
  }

  function validate(c) {
    glow('backend');
    all += 1;
    meters.set('latency', rand(1.1, 1.9));
    if (c.unsure) {
      pool.launch('warn', [{ route: R.toReview, d: 0.55, then: () => {
        queue = Math.min(squares.length, queue + 1);
        if (queue === 1) reviewT = rand(3.2, 4.4);
        glow('review');
      } }]);
      pool.launch('warn', [{ route: R.down, d: 0.38, ease: easeOut, then: () => addRow(true) }]);
    } else {
      ok += 1;
      pool.launch('req', [{ route: R.toSaved, d: 0.45, then: stored }]);
      pool.launch('req', [{ route: R.down, d: 0.38, ease: easeOut, then: () => addRow(false) }]);
    }
    meters.set('auto', (ok / all) * 100);
    clearAt = age + 1.5;
  }

  function step(dt) {
    age += dt;
    if (age >= next) {
      next = age + 4.6;
      capture();
    }
    if (scanT >= 0 && current) {
      scanT += dt;
      while (current.revealed < 3 && scanT >= 0.28 + current.revealed * 0.27) {
        reveal(current.revealed);
        current.revealed += 1;
      }
      const p = clamp(scanT / 1.05, 0, 1);
      attr(scan, 'transform', `translate(0 ${f1(50 + p * 90)})`);
      css(scan, 'opacity', (p < 1 ? Math.min(1, scanT / 0.12) : 0).toFixed(3));
      glow('model', 0.55 + 0.2 * Math.sin(scanT * 9));
      if (scanT >= 1.3) {
        scanT = -1;
        const c = current;
        pool.launch('req', [{ route: R.fromModel, d: 0.45, fadeIn: true, then: () => validate(c) }]);
      }
    }
    if (clearAt >= 0 && age >= clearAt) {
      clearAt = -1;
      if (shown >= 0) sets[shown].forEach((f) => f.a.set(0));
      frames.forEach((f) => { f.a.set(0); f.dets.forEach((d) => d.a.set(0)); });
    }
    if (queue > 0) {
      reviewT -= dt;
      if (reviewT <= 0) {
        queue -= 1;
        reviewT = rand(4.4, 5.8);
        glow('review');
        pool.launch('req', [{ route: R.reviewed, d: 0.36, fadeIn: true, then: () => { stored(); resolveRow(); } }]);
      }
    }
    pool.step(dt);
    flashA = Math.max(0, flashA - dt * 3.2);
    css(flash, 'opacity', (flashA * 0.8).toFixed(3));
    css(shutter, 'transform', `scale(${shutterScale.step(dt).toFixed(3)})`);
    for (const s of shots) css(s.el, 'opacity', clamp(s.a.step(dt), 0, 1).toFixed(3));
    for (const f of frames) {
      css(f.el, 'opacity', clamp(f.a.step(dt), 0, 1).toFixed(3));
      for (const d of f.dets) css(d.el, 'opacity', clamp(d.a.step(dt), 0, 1).toFixed(3));
    }
    if (shown >= 0) {
      for (const f of sets[shown]) {
        const a = clamp(f.a.step(dt), 0, 1);
        css(f.el, 'opacity', a.toFixed(3));
        css(f.el, 'transform', `translateX(${f1((1 - a) * 6)}px)`);
      }
    }
    for (const r of rows) {
      r.y.set(r.slot >= 0 ? 154 + r.slot * 17 : 205);
      r.a.set(r.slot >= 0 ? 1 : 0);
      attr(r.el, 'transform', `translate(26 ${f1(r.y.step(dt))})`);
      css(r.el, 'opacity', clamp(r.a.step(dt), 0, 1).toFixed(3));
      r.dot.classList.toggle('is-warn', r.warn);
    }
    squares.forEach((q, i) => {
      q.a.set(i < queue ? 1 : 0);
      const a = clamp(q.a.step(dt), 0, 1.2);
      css(q.el, 'opacity', Math.min(1, a).toFixed(3));
      css(q.el, 'transform', `scale(${(0.4 + 0.6 * a).toFixed(3)})`);
    });
    badge.t = Math.max(0, badge.t - dt);
    badge.a.set(badge.t > 0 ? 1 : 0);
    const b = clamp(badge.a.step(dt), 0, 1);
    css(badge.el, 'opacity', b.toFixed(3));
    css(badge.el, 'transform', `translateY(${f1((1 - b) * 4)}px)`);
    for (const key in nodes) {
      const n = nodes[key];
      css(n.el, 'opacity', (n.glow * 0.6).toFixed(3));
      n.glow = Math.max(0, n.glow - dt * 2.4);
    }
    meters.set('queue', queue);
    meters.step(dt);
  }

  meters.prime('latency', 1.4);
  meters.prime('auto', 94);
  meters.prime('queue', 0, undefined, true);

  return {
    step,
    settle() {
      for (let i = 0; i < 330; i++) step(1 / 30);
    }
  };
}

function cacheScene(fig, ctx) {
  const svg = fig.querySelector('.scene');
  const pool = new Pool(svg);
  const frontendHit = svg.querySelector('[data-fe] .node__hit');
  const ring = svg.querySelector('.db__ring');
  const seg = fig.querySelector('.seg');
  const options = Array.from(fig.querySelectorAll('.seg__opt'));
  const toMiddleware = line(112, 132, 160, 132);
  const toFrontend = line(160, 148, 112, 148);
  const toDatabase = line(320, 132, 368, 132);
  const fromDatabase = line(368, 148, 320, 148);
  const cells = Array.from(svg.querySelectorAll('[data-cell]'), (el, k) => {
    const cx = Number(el.dataset.x) + 11;
    const cy = Number(el.dataset.y) + 11;
    return {
      el,
      cx,
      cy,
      col: k % 4,
      row: Math.floor(k / 4),
      on: el.querySelector('.cell__on'),
      inval: el.querySelector('.cell__inval'),
      enter: new Route(160, 132, 176, 132, cx - 22, cy, cx, cy),
      leave: new Route(cx, cy, cx - 22, cy, 176, 148, 160, 148),
      down: new Route(cx, cy, cx + 22, cy, 304, 132, 320, 132),
      up: new Route(320, 148, 304, 148, cx + 22, cy, cx, cy),
      filled: false,
      marked: false,
      delay: -1,
      ttl: 0,
      ttlMax: 1,
      level: 0,
      warn: 0,
      bump: new Spring(1, 300, 20)
    };
  });
  const rank = [5, 10, 2, 13, 7, 0, 11, 14, 3, 8, 1, 12, 6, 15, 9, 4];
  const weights = rank.map((_, i) => 1 / Math.pow(i + 1, 0.9));
  const total = weights.reduce((a, b) => a + b, 0);
  const meters = new Meters(fig, {
    hitrate: { format: ctx.int, spark: { min: 0, max: 100 } },
    latency: { format: ctx.int, spark: { min: 0 } },
    dbload: { format: ctx.int, spark: { min: 0 } }
  });
  const outcomes = [];
  const queries = [];
  let mode = 'demand';
  let auto = true;
  let autoWait = 12;
  let age = 0;
  let next = 0.3;
  let write = rand(6, 8);
  let refresh = 1;
  let frontendGlow = 0;
  let databaseGlow = 0;

  function pick() {
    let r = Math.random() * total;
    for (let i = 0; i < rank.length; i++) {
      r -= weights[i];
      if (r <= 0) return cells[rank[i]];
    }
    return cells[rank[0]];
  }

  function record(hit) {
    outcomes.push({ hit, ms: hit ? rand(2.5, 5) : rand(38, 56) });
    if (outcomes.length > 24) outcomes.shift();
    if (!hit) queries.push({ at: age, weight: 1 });
  }

  function store(c) {
    c.filled = true;
    c.delay = -1;
    c.ttlMax = rand(10, 16);
    c.ttl = c.ttlMax;
    c.bump.v += 3;
  }

  function respond(p, c) {
    p.setKind('req');
    p.push(
      { route: c.leave, d: rand(0.26, 0.32) },
      { route: toFrontend, d: rand(0.22, 0.28), ease: easeOut, then: () => { frontendGlow = 1; } }
    );
  }

  function arrive(p, c) {
    c.bump.v += 2.2;
    if (c.filled) {
      record(true);
      respond(p, c);
      return;
    }
    record(false);
    p.push(
      { route: c.down, d: rand(0.3, 0.36) },
      { route: toDatabase, d: rand(0.2, 0.24), ease: easeIn, fadeOut: true, then: () => { databaseGlow = 1; } },
      { route: fromDatabase, d: rand(0.2, 0.24), hold: rand(0.2, 0.3), ease: easeOut, fadeIn: true },
      { route: c.up, d: rand(0.3, 0.36), then: (q) => { store(c); respond(q, c); } }
    );
  }

  function request() {
    const c = pick();
    pool.launch('data', [
      { route: toMiddleware, d: rand(0.24, 0.3), ease: easeOut, fadeIn: true },
      { route: c.enter, d: rand(0.28, 0.34), then: (p) => arrive(p, c) }
    ]);
  }

  function invalidate() {
    const candidates = cells.filter((c) => c.filled && !c.marked);
    if (!candidates.length) return;
    const c = candidates[Math.floor(Math.random() * candidates.length)];
    c.marked = true;
    databaseGlow = 1;
    const p = pool.launch('warn', [
      { route: fromDatabase, d: 0.26, ease: easeOut, fadeIn: true },
      {
        route: c.up,
        d: 0.36,
        then: () => {
          c.marked = false;
          if (mode === 'preload') {
            c.bump.v += 2.4;
            return;
          }
          c.filled = false;
          c.warn = 1;
          c.bump.v -= 2.4;
        }
      }
    ]);
    if (!p) c.marked = false;
  }

  function backgroundRefresh() {
    const candidates = cells.filter((c) => c.filled);
    if (!candidates.length) return;
    const c = candidates[Math.floor(Math.random() * candidates.length)];
    databaseGlow = 0.6;
    queries.push({ at: age, weight: 0.15 });
    pool.launch('data', [
      { route: fromDatabase, d: 0.24, ease: easeOut, fadeIn: true },
      { route: c.up, d: 0.34, then: () => { c.bump.v += 2; } }
    ]);
  }

  function preload() {
    databaseGlow = 1;
    for (const c of cells) {
      if (c.filled) continue;
      c.delay = 0.55 + (3 - c.col) * 0.1 + c.row * 0.04;
      if ((c.col + c.row) % 2 === 0) {
        queries.push({ at: age, weight: 0.15 });
        pool.launch('data', [
          { route: fromDatabase, d: 0.2, hold: c.delay - 0.52, ease: easeOut, fadeIn: true },
          { route: c.up, d: 0.32 }
        ]);
      }
    }
  }

  function paintMode() {
    seg.dataset.value = mode;
    for (const b of options) {
      const on = b.dataset.mode === mode;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-checked', String(on));
      b.tabIndex = on ? 0 : -1;
    }
  }

  function setMode(next) {
    if (next === mode) return;
    mode = next;
    paintMode();
    if (mode === 'preload') {
      refresh = 1.2;
      preload();
    } else {
      for (const c of cells) {
        c.delay = -1;
        if (c.filled) {
          c.ttlMax = rand(5, 12);
          c.ttl = c.ttlMax;
        }
      }
    }
  }

  function step(dt) {
    age += dt;
    if (auto && age > 1) {
      autoWait -= dt;
      if (autoWait <= 0) {
        autoWait = mode === 'demand' ? 10 : 12;
        setMode(mode === 'demand' ? 'preload' : 'demand');
      }
    }
    if (age > 0.9) {
      next -= dt;
      if (next <= 0) {
        next = rand(0.34, 0.52);
        request();
      }
      write -= dt;
      if (write <= 0) {
        write = rand(6, 9);
        invalidate();
      }
      if (mode === 'preload') {
        refresh -= dt;
        if (refresh <= 0) {
          refresh = rand(0.9, 1.3);
          backgroundRefresh();
        }
      }
    }
    pool.step(dt);
    frontendGlow = Math.max(0, frontendGlow - dt * 3);
    databaseGlow = Math.max(0, databaseGlow - dt * 2.2);
    css(frontendHit, 'opacity', (frontendGlow * 0.6).toFixed(3));
    css(ring, 'opacity', (databaseGlow * 0.9).toFixed(3));
    for (const c of cells) {
      if (c.delay >= 0) {
        c.delay -= dt;
        if (c.delay < 0) store(c);
      }
      if (c.filled && mode === 'demand') {
        c.ttl -= dt;
        if (c.ttl <= 0) {
          c.filled = false;
          c.marked = false;
        }
      }
      let fresh = 0;
      if (c.filled) fresh = mode === 'preload' ? 1 : 0.4 + 0.6 * clamp(c.ttl / c.ttlMax, 0, 1);
      c.level = approach(c.level, fresh, 6, dt);
      c.warn = Math.max(0, c.warn - dt * 1.4);
      const sc = c.bump.step(dt);
      css(c.on, 'opacity', c.level.toFixed(3));
      css(c.inval, 'opacity', (c.warn * 0.9).toFixed(3));
      attr(c.el, 'transform', Math.abs(sc - 1) < 0.002 ? '' : `translate(${c.cx} ${c.cy}) scale(${sc.toFixed(3)}) translate(${-c.cx} ${-c.cy})`);
    }
    while (queries.length && queries[0].at < age - 4) queries.shift();
    let load = 0;
    for (const q of queries) load += q.weight;
    let hits = 0;
    let sum = 0;
    for (const o of outcomes) {
      if (o.hit) hits += 1;
      sum += o.ms;
    }
    const n = outcomes.length;
    meters.set('hitrate', n ? (100 * hits) / n : 0);
    meters.set('latency', n ? sum / n : 48);
    meters.set('dbload', (load / Math.min(4, Math.max(age, 1))) * 420);
    meters.step(dt);
  }

  function quiet() {
    for (let i = 0; i < 120; i++) step(1 / 30);
    pool.hide();
  }

  function choose(next) {
    auto = false;
    setMode(next);
    if (reducedMotion) quiet();
  }

  for (const b of options) b.addEventListener('click', () => choose(b.dataset.mode));
  seg.addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
    e.preventDefault();
    choose(mode === 'demand' ? 'preload' : 'demand');
    const active = options.find((b) => b.dataset.mode === mode);
    if (active) active.focus();
  });

  meters.prime('hitrate', 0);
  meters.prime('latency', 48);
  meters.prime('dbload', 0);
  paintMode();

  return {
    step,
    settle() {
      auto = false;
      for (let i = 0; i < 600; i++) step(1 / 30);
      pool.hide();
    }
  };
}

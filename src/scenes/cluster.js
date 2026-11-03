function clusterScene(fig, ctx) {
  const svg = fig.querySelector('.scene');
  const pool = new Pool(svg);
  const capacity = 400;
  const minimum = 2;
  const entry = line(240, 30, 240, 80);
  const slots = Array.from(svg.querySelectorAll('[data-slot]'), (el) => {
    const cx = Number(el.dataset.cx);
    return {
      body: el.querySelector('.pod'),
      ghost: el.querySelector('.pod-ghost'),
      fill: el.querySelector('.pod__fill'),
      level: el.querySelector('.pod__level'),
      heat: el.querySelector('.pod__heat'),
      hit: el.querySelector('.pod__hit'),
      dot: el.querySelector('.pod__dot'),
      wire: svg.querySelector(`[data-wire="${el.dataset.slot}"]`),
      route: new Route(240, 112, 240, 146, cx, 140, cx, 176),
      on: new Spring(0, 210, 19),
      util: new Spring(0, 80, 15),
      active: false,
      ready: false,
      draining: false,
      warm: 0,
      drain: 0,
      glow: 0,
      inflight: 0,
      bias: rand(0.92, 1.08)
    };
  });
  const ranked = [3, 4, 2, 5, 1, 6, 0, 7].map((i) => slots[i]);
  const input = fig.querySelector('.ctrl__range');
  const autoButton = fig.querySelector('[data-auto]');
  const meters = new Meters(fig, {
    rps: { format: ctx.int, spark: { min: 0 } },
    replicas: { format: ctx.int, rate: 9, spark: { min: 0, max: 8.5 } },
    p95: { format: ctx.int, spark: { min: 0 } }
  });
  const burst = { wait: rand(4, 6), t: -1, amp: 0, hold: 0 };
  let age = 0;
  let clock = rand(0, 40);
  let load = 0.3;
  let manual = false;
  let manualValue = 0.3;
  let idle = 0;
  let dragging = false;
  let emitAcc = 0;
  let up = 0;
  let down = 0;
  let p95 = 32;
  let fillShown = -1;
  let valueShown = -1;

  function paint(v) {
    if (Math.abs(v - fillShown) < 0.002) return;
    fillShown = v;
    input.style.setProperty('--fill', `calc(14px + (100% - 28px) * ${v.toFixed(3)})`);
  }

  function setAuto(on) {
    manual = !on;
    idle = 0;
    autoButton.classList.toggle('is-on', on);
    autoButton.setAttribute('aria-pressed', String(on));
  }

  function autoLoad(dt) {
    clock += dt;
    let v = 0.2 + 0.32 * fbm1(clock * 0.08);
    if (burst.t < 0) {
      burst.wait -= dt;
      if (burst.wait <= 0) {
        burst.t = 0;
        burst.amp = rand(0.3, 0.48);
        burst.hold = rand(2, 3.5);
      }
    } else {
      burst.t += dt;
      const attack = 1.8;
      const release = 5;
      let env = 0;
      if (burst.t < attack) env = smoothstep(burst.t / attack);
      else if (burst.t < attack + burst.hold) env = 1;
      else if (burst.t < attack + burst.hold + release) env = 1 - smoothstep((burst.t - attack - burst.hold) / release);
      else {
        burst.t = -1;
        burst.wait = rand(9, 15);
      }
      v += burst.amp * env;
    }
    return clamp(v, 0.06, 0.97);
  }

  function activate() {
    const s = ranked.find((x) => !x.active);
    if (!s) return;
    s.active = true;
    if (s.draining) {
      s.draining = false;
      return;
    }
    s.ready = false;
    s.warm = 0.85;
    s.on.set(1);
  }

  function deactivate() {
    for (let i = ranked.length - 1; i >= 0; i--) {
      const s = ranked[i];
      if (s.active) {
        s.active = false;
        s.draining = true;
        s.drain = 0;
        return;
      }
    }
  }

  function emit() {
    let best = null;
    let bestScore = Infinity;
    for (const s of slots) {
      if (!s.active || !s.ready) continue;
      const score = s.inflight + Math.random() * 0.8;
      if (score < bestScore) {
        bestScore = score;
        best = s;
      }
    }
    if (!best) return;
    const target = best;
    target.inflight += 1;
    const p = pool.launch('req', [
      { route: entry, d: rand(0.4, 0.46), ease: linear, fadeIn: true, fadeOut: true },
      {
        route: target.route,
        d: rand(0.52, 0.64),
        ease: easeOut,
        fadeIn: true,
        then: () => {
          target.inflight = Math.max(0, target.inflight - 1);
          target.glow = 1;
        }
      }
    ]);
    if (!p) target.inflight -= 1;
  }

  function render(s, dt) {
    const on = s.on.step(dt);
    const u = clamp(s.util.step(dt), 0, 1);
    s.glow = Math.max(0, s.glow - dt * 3.5);
    const vis = clamp(on, 0, 1);
    attr(s.body, 'transform', `translate(20 28) scale(${(0.78 + 0.22 * on).toFixed(3)}) translate(-20 -28)`);
    css(s.body, 'opacity', vis.toFixed(3));
    css(s.ghost, 'opacity', (1 - vis).toFixed(3));
    css(s.wire, 'opacity', (0.28 + 0.72 * vis).toFixed(3));
    const h = 46 * u;
    const height = h.toFixed(2);
    const y = (51 - h).toFixed(2);
    const rx = Math.min(6, h / 2).toFixed(2);
    attr(s.fill, 'height', height);
    attr(s.fill, 'y', y);
    attr(s.fill, 'rx', rx);
    attr(s.level, 'y', (50 - h).toFixed(2));
    css(s.level, 'opacity', clamp(h / 3, 0, 1).toFixed(3));
    css(s.heat, 'opacity', clamp((u - 0.82) / 0.16, 0, 1).toFixed(3));
    css(s.hit, 'opacity', (s.glow * 0.55).toFixed(3));
    s.dot.classList.toggle('is-ready', s.ready);
  }

  function step(dt) {
    age += dt;
    const autoValue = autoLoad(dt);
    if (manual && !dragging) {
      idle += dt;
      if (idle > 9) setAuto(true);
    }
    load = approach(load, manual ? manualValue : autoValue, manual ? 5 : 2.4, dt);
    if (!manual) {
      const v = Math.round(load * 100);
      if (v !== valueShown) {
        valueShown = v;
        input.value = String(v);
      }
      paint(load);
    }
    const rps = load * 2400;
    const desired = clamp(Math.ceil(rps / (capacity * 0.65)), minimum, 8);
    let count = 0;
    for (const s of slots) if (s.active) count += 1;
    if (desired > count) {
      up += dt;
      down = 0;
      if (up > 0.35) {
        up = 0;
        activate();
      }
    } else if (desired < count) {
      down += dt;
      up = 0;
      if (down > 3) {
        down = 1.8;
        deactivate();
      }
    } else {
      up = 0;
      down = 0;
    }
    let serving = 0;
    count = 0;
    for (const s of slots) {
      if (s.active && !s.ready) {
        s.warm -= dt;
        if (s.warm <= 0) s.ready = true;
      }
      if (s.draining) {
        s.drain += dt;
        if ((s.drain > 0.8 && s.inflight === 0) || s.drain > 2.2) {
          s.draining = false;
          s.ready = false;
          s.on.set(0);
        }
      }
      if (s.active) count += 1;
      if (s.active && s.ready) serving += 1;
    }
    const u = rps / (Math.max(1, serving) * capacity);
    for (const s of slots) {
      s.util.set(s.active && s.ready ? clamp(u * s.bias, 0, 1.1) : 0);
      render(s, dt);
    }
    p95 = approach(p95, 15 + 11 / (1 - Math.min(u, 0.9)), 2.2, dt);
    if (age > 0.9) {
      emitAcc += dt * (4 + 13 * load);
      while (emitAcc >= 1) {
        emitAcc -= 1;
        emit();
      }
    }
    pool.step(dt);
    meters.set('rps', rps);
    meters.set('replicas', count);
    meters.set('p95', p95);
    meters.step(dt);
  }

  function quiet() {
    for (let i = 0; i < 90; i++) step(1 / 30);
    pool.hide();
    for (const s of slots) {
      s.glow = 0;
      render(s, 0);
    }
  }

  input.addEventListener('pointerdown', () => {
    dragging = true;
  });
  input.addEventListener('input', () => {
    manualValue = Number(input.value) / 100;
    valueShown = Number(input.value);
    setAuto(false);
    paint(manualValue);
    if (reducedMotion) quiet();
  });
  window.addEventListener('pointerup', () => {
    dragging = false;
  });
  window.addEventListener('pointercancel', () => {
    dragging = false;
  });
  autoButton.addEventListener('click', () => {
    setAuto(true);
    if (reducedMotion) quiet();
  });

  for (let i = 0; i < minimum; i++) {
    ranked[i].active = true;
    ranked[i].ready = true;
    ranked[i].on.snap(1);
  }
  meters.prime('rps', load * 2400);
  meters.prime('replicas', minimum);
  meters.prime('p95', p95);
  input.value = String(Math.round(load * 100));
  paint(load);
  for (const s of slots) render(s, 0);

  return {
    step,
    settle() {
      for (let i = 0; i < 300; i++) step(1 / 30);
      pool.hide();
      for (const s of slots) {
        s.glow = 0;
        render(s, 0);
      }
    }
  };
}

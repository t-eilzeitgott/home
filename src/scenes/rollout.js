function rolloutScene(fig, ctx) {
  const svg = fig.querySelector('.scene');
  const pool = new Pool(svg);
  const liveY = 124;
  const stagingY = 204;
  const entry = line(240, 26, 240, 52);
  const slots = Array.from(svg.querySelectorAll('[data-slot]'), (el) => {
    const cx = Number(el.dataset.cx);
    const pods = Array.from(el.querySelectorAll('.rpod'), (node) => ({
      node,
      label: node.querySelector('.rpod__ver'),
      ring: node.querySelector('.rpod__ring'),
      dot: node.querySelector('.rpod__dot'),
      y: new Spring(liveY, 150, 21),
      alpha: new Spring(0, 150, 24),
      scale: new Spring(1, 190, 19),
      check: 0,
      checking: false,
      ready: false
    }));
    return { current: pods[0], spare: pods[1], serving: pods[0], route: new Route(240, 84, 240, 108, cx, 100, cx, 124), inflight: 0 };
  });
  const meters = new Meters(fig, {
    availability: { format: ctx.fixed2, spark: { min: 99, max: 100.25 } },
    errors: { format: ctx.int, spark: { min: 0, max: 4 } },
    progress: { format: ctx.int, rate: 10 }
  });
  let version = 4;
  let running = false;
  let wait = 2.6;
  let index = 0;
  let phase = 0;
  let updated = 6;
  let emitAcc = 0;
  let age = 0;

  const label = (pod, v) => {
    pod.label.textContent = `v2.${v}`;
  };

  function advance() {
    if (!running) {
      running = true;
      index = 0;
      phase = 0;
      updated = 0;
      for (const s of slots) label(s.spare, version + 1);
    }
    const s = slots[index];
    if (phase === 0) {
      const fresh = s.spare;
      fresh.y.snap(stagingY);
      fresh.scale.snap(0.84).set(1);
      fresh.alpha.set(1);
      fresh.check = 0;
      fresh.checking = true;
      fresh.ready = false;
      wait = 1.2;
      phase = 1;
    } else if (phase === 1) {
      s.spare.checking = false;
      s.spare.check = 1;
      s.spare.ready = true;
      wait = 0.3;
      phase = 2;
    } else if (phase === 2) {
      s.serving = null;
      s.current.alpha.set(0.35);
      wait = 0.6;
      phase = 3;
    } else if (phase === 3) {
      s.current.alpha.set(0);
      s.current.scale.set(0.88);
      s.current.y.set(liveY - 12);
      s.spare.y.set(liveY);
      wait = 0.5;
      phase = 4;
    } else if (phase === 4) {
      const retired = s.current;
      s.current = s.spare;
      s.spare = retired;
      s.serving = s.current;
      updated += 1;
      wait = 0.35;
      phase = 5;
    } else {
      const retired = s.spare;
      retired.y.snap(stagingY);
      retired.scale.snap(1);
      retired.alpha.snap(0);
      retired.ready = false;
      retired.check = 0;
      index += 1;
      phase = 0;
      if (index >= slots.length) {
        running = false;
        version += 1;
        wait = 4.2;
      } else {
        wait = 0.15;
      }
    }
  }

  function renderPod(pod, dt) {
    const y = pod.y.step(dt);
    const a = clamp(pod.alpha.step(dt), 0, 1);
    const sc = pod.scale.step(dt);
    if (pod.checking) pod.check = Math.min(1, pod.check + dt / 1.05);
    attr(pod.node, 'transform', `translate(0 ${y.toFixed(2)}) translate(26 30) scale(${sc.toFixed(3)}) translate(-26 -30)`);
    css(pod.node, 'opacity', a.toFixed(3));
    css(pod.ring, 'strokeDashoffset', (1 - easeInOut(pod.check)).toFixed(3));
    pod.dot.classList.toggle('is-ready', pod.ready);
  }

  function emit() {
    let best = null;
    let bestScore = Infinity;
    for (const s of slots) {
      if (!s.serving) continue;
      const score = s.inflight + Math.random() * 0.8;
      if (score < bestScore) {
        bestScore = score;
        best = s;
      }
    }
    if (!best) return;
    const s = best;
    s.inflight += 1;
    const p = pool.launch('req', [
      { route: entry, d: rand(0.3, 0.34), ease: linear, fadeIn: true, fadeOut: true },
      { route: s.route, d: rand(0.46, 0.56), ease: easeOut, fadeIn: true, then: () => { s.inflight = Math.max(0, s.inflight - 1); } }
    ]);
    if (!p) s.inflight -= 1;
  }

  function step(dt) {
    age += dt;
    wait -= dt;
    if (wait <= 0) advance();
    if (age > 0.9) {
      emitAcc += dt * 9;
      while (emitAcc >= 1) {
        emitAcc -= 1;
        emit();
      }
    }
    pool.step(dt);
    for (const s of slots) {
      renderPod(s.current, dt);
      renderPod(s.spare, dt);
    }
    meters.set('availability', 100);
    meters.set('errors', 0);
    meters.set('progress', updated, updated / 6);
    meters.step(dt);
  }

  for (const s of slots) {
    s.current.y.snap(liveY);
    s.current.alpha.snap(1);
    s.current.ready = true;
    s.current.check = 1;
    label(s.current, version);
    s.spare.y.snap(stagingY);
    s.spare.alpha.snap(0);
    label(s.spare, version + 1);
    renderPod(s.current, 0);
    renderPod(s.spare, 0);
  }
  meters.prime('availability', 100, undefined, true);
  meters.prime('errors', 0, undefined, true);
  meters.prime('progress', 6, 1, true);

  return {
    step,
    settle() {
      for (let i = 0; i < 60; i++) step(1 / 30);
      pool.hide();
    }
  };
}

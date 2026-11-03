function eventsScene(fig, ctx) {
  const svg = fig.querySelector('.scene');
  const ys = [64, 140, 216];
  const startX = 130;
  const endX = 330;
  const gap = 14;
  const speed = 116;
  const producers = ys.map((_, i) => ({ hit: svg.querySelector(`[data-producer="${i}"] .node__hit`), glow: 0 }));
  const consumers = ys.map((_, i) => {
    const el = svg.querySelector(`[data-consumer="${i}"]`);
    return { node: el.querySelector('.node'), hit: el.querySelector('.node__hit'), status: el.querySelector('.node__status'), glow: 0, online: true, dim: new Spring(1, 120, 22), cooldown: 0 };
  });
  const badges = ys.map((_, i) => ({ el: svg.querySelector(`[data-badge="${i}"]`), alpha: new Spring(0, 160, 24), count: -1 }));
  const host = svg.querySelector('[data-evs]');
  const pool = [];
  for (let i = 0; i < Number(host.dataset.evs); i++) {
    const el = make('rect', { class: 'ev', x: '-5', y: '-5', width: '10', height: '10', rx: '3', style: 'opacity:0' });
    host.append(el);
    pool.push({ el, busy: false, lane: 0, x: 0, phase: 0, t: 0, alpha: 0, blocked: false });
  }
  const lanes = ys.map(() => []);
  const leaving = [];
  const rates = [1.0, 1.3, 0.8];
  const timers = [0.2, 0.6, 1.0];
  const produced = [];
  const meters = new Meters(fig, {
    rate: { format: ctx.int, spark: { min: 0 } },
    lag: { format: ctx.int, spark: { min: 0 } },
    lost: { format: ctx.int, spark: { min: 0, max: 4 } }
  });
  let age = 0;
  let outage = rand(7, 10);
  let downtime = 0;
  let lag = 18;

  function produce(i) {
    const ev = pool.find((e) => !e.busy);
    if (!ev) return;
    ev.busy = true;
    ev.lane = i;
    ev.x = 100;
    ev.phase = 0;
    ev.t = 0;
    ev.alpha = 0;
    ev.blocked = false;
    lanes[i].push(ev);
    producers[i].glow = 1;
    produced.push(age);
  }

  function moveLane(i, dt) {
    const lane = lanes[i];
    let prevX = Infinity;
    for (let j = 0; j < lane.length; j++) {
      const ev = lane[j];
      const limit = j === 0 ? endX : prevX - gap;
      if (ev.phase === 0) {
        ev.t += dt;
        const k = Math.min(1, ev.t / 0.24);
        ev.x = lerp(100, startX, easeOut(k));
        ev.alpha = k;
        ev.blocked = false;
        if (k >= 1) ev.phase = 1;
      } else {
        const free = ev.x + speed * dt;
        ev.blocked = free > limit;
        ev.x = ev.blocked ? Math.max(ev.x, approach(ev.x, limit, 14, dt)) : free;
        ev.alpha = 1;
      }
      prevX = ev.x;
    }
    const c = consumers[i];
    c.cooldown -= dt;
    const head = lane[0];
    if (head && head.phase === 1 && c.online && c.cooldown <= 0 && head.x >= endX - 0.6) {
      lane.shift();
      head.phase = 2;
      head.t = 0;
      head.blocked = false;
      leaving.push(head);
      c.cooldown = lane.length > 2 ? 0.13 : 0.02;
    }
  }

  function step(dt) {
    age += dt;
    if (age > 0.9) {
      for (let i = 0; i < 3; i++) {
        timers[i] -= dt;
        if (timers[i] <= 0) {
          timers[i] = Math.max(0.28, -Math.log(1 - Math.random()) / rates[i]);
          produce(i);
        }
      }
    }
    const warehouse = consumers[1];
    if (warehouse.online) {
      outage -= dt;
      if (outage <= 0 && age > 2) {
        warehouse.online = false;
        downtime = rand(3, 3.8);
      }
    } else {
      downtime -= dt;
      if (downtime <= 0) {
        warehouse.online = true;
        outage = rand(13, 18);
      }
    }
    for (let i = 0; i < 3; i++) moveLane(i, dt);
    for (let k = leaving.length - 1; k >= 0; k--) {
      const ev = leaving[k];
      ev.t += dt;
      const p = Math.min(1, ev.t / 0.22);
      ev.x = lerp(endX, 364, easeIn(p));
      ev.alpha = 1 - p;
      if (p >= 1) {
        ev.busy = false;
        leaving.splice(k, 1);
        consumers[ev.lane].glow = 1;
        css(ev.el, 'opacity', '0');
      }
    }
    for (const ev of pool) {
      if (!ev.busy) continue;
      const s = ev.phase === 0 ? 0.6 + 0.4 * ev.alpha : ev.phase === 2 ? 0.7 + 0.3 * ev.alpha : 1;
      attr(ev.el, 'transform', `translate(${f1(ev.x)} ${ys[ev.lane]}) scale(${s.toFixed(3)})`);
      css(ev.el, 'opacity', ev.alpha.toFixed(3));
    }
    let waitingTotal = 0;
    for (let i = 0; i < 3; i++) {
      const p = producers[i];
      p.glow = Math.max(0, p.glow - dt * 3);
      css(p.hit, 'opacity', (p.glow * 0.5).toFixed(3));
      const c = consumers[i];
      c.glow = Math.max(0, c.glow - dt * 3);
      c.dim.set(c.online ? 1 : 0.45);
      css(c.node, 'opacity', clamp(c.dim.step(dt), 0, 1).toFixed(3));
      css(c.hit, 'opacity', (c.glow * 0.6).toFixed(3));
      c.status.classList.toggle('is-down', !c.online);
      let waiting = 0;
      for (const ev of lanes[i]) if (ev.blocked) waiting += 1;
      waitingTotal += waiting;
      const b = badges[i];
      const show = waiting >= 2;
      b.alpha.set(show ? 1 : 0);
      if (show && waiting !== b.count) {
        b.count = waiting;
        b.el.textContent = `+${waiting}`;
      }
      css(b.el, 'opacity', clamp(b.alpha.step(dt), 0, 1).toFixed(3));
    }
    lag = approach(lag, 16 + 8 * fbm1(age * 0.5) + waitingTotal * 48, 3, dt);
    while (produced.length && produced[0] < age - 6) produced.shift();
    if (age > 4) meters.set('rate', (produced.length / Math.min(6, age - 0.9)) * 60 * 17);
    meters.set('lag', lag);
    meters.set('lost', 0);
    meters.step(dt);
  }

  meters.prime('rate', 3100);
  meters.prime('lag', 18);
  meters.prime('lost', 0, undefined, true);

  return {
    step,
    settle() {
      for (let i = 0; i < 240; i++) step(1 / 30);
    }
  };
}

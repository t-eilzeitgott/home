function monitorScene(fig, ctx) {
  const plot = fig.querySelector('.mon__plot svg');
  const area = plot.querySelector('[data-area]');
  const p50Path = plot.querySelector('[data-p50]');
  const p95Path = plot.querySelector('[data-p95]');
  const alert = fig.querySelector('[data-alert]');
  const alertTitle = alert.querySelector('[data-alert-title]');
  const alertDetail = alert.querySelector('[data-alert-detail]');
  const ring = fig.querySelector('[data-ring]');
  const v50 = new Readout(fig.querySelector('[data-v="p50"]'), ctx.int, 6);
  const v95 = new Readout(fig.querySelector('[data-v="p95"]'), ctx.int, 6);
  const vAvailability = new Readout(fig.querySelector('[data-v="availability"]'), ctx.fixed2, 4);
  const vBudget = new Readout(fig.querySelector('[data-v="budget"]'), ctx.fixed1, 4);
  const items = Array.from(fig.querySelectorAll('.log'), (el) => ({
    el,
    time: el.querySelector('time'),
    level: el.querySelector('.log__lvl'),
    source: el.querySelector('.log__src'),
    message: el.querySelector('.log__msg')
  }));
  const rows = [];
  const n = 56;
  const every = 0.3;
  const width = 440;
  const s50 = new Float32Array(n);
  const s95 = new Float32Array(n);
  const xs = new Float32Array(n + 1);
  const ys = new Float32Array(n + 1);
  const shift = new Spring(1, 170, 22);
  const shown = new Spring(0, 160, 26);
  let acc = 0;
  let age = 0;
  let cycle = 2;
  let p50 = 38;
  let p95 = 90;
  let phase = 'ok';
  let timer = 0;
  let logWait = 0.8;
  let sim = 9 * 3600 + 41 * 60;
  let incident = 0;
  let scaled = false;
  let detailWait = 0;
  let budget = 74.6;
  let low = false;

  const mapY = (v) => 117 - clamp(v / 360, 0, 1) * 111;
  const pad = (v) => String(v).padStart(2, '0');
  const clock = (s) => {
    const t = Math.floor(s) % 86400;
    return `${pad(Math.floor(t / 3600))}:${pad(Math.floor(t / 60) % 60)}:${pad(t % 60)}`;
  };
  const duration = (s) => {
    const m = Math.floor(s / 60);
    const r = Math.round(s % 60);
    return m ? `${m} min ${r} s` : `${r} s`;
  };
  const normal = [
    () => ['INFO', 'gateway', `GET /api/orders 200 ${randInt(9, 24)} ms`],
    () => ['INFO', 'order-service', `order ${randInt(48100, 49900)} confirmed`],
    () => ['INFO', 'checkout-api', `payment authorized in ${randInt(31, 64)} ms`],
    () => ['INFO', 'stock-sync', `${randInt(40, 180)} items synced from ERP`],
    () => ['INFO', 'invoice-service', `e-invoice ${randInt(1200, 9800)} delivered`],
    () => ['INFO', 'cache', `hit ratio ${randInt(86, 94)} %`]
  ];
  const degraded = [
    () => ['WARN', 'checkout-api', `p95 ${ctx.int(p95)} ms above 250 ms`],
    () => ['WARN', 'orders-db', `slow query on orders (${randInt(380, 520)} ms)`],
    () => ['INFO', 'gateway', `GET /api/checkout 200 ${randInt(240, 330)} ms`]
  ];

  function log(level, source, message) {
    const item = rows.length < items.length ? items[rows.length] : rows.pop();
    item.time.textContent = clock(sim);
    item.level.textContent = level;
    item.level.className = level === 'WARN' ? 'log__lvl is-warn' : 'log__lvl';
    item.source.textContent = source;
    item.message.textContent = message;
    item.el.style.transition = 'none';
    item.el.style.opacity = '0';
    item.el.style.transform = 'translateY(-12px)';
    void item.el.offsetWidth;
    item.el.style.transition = '';
    rows.unshift(item);
    rows.forEach((row, i) => {
      row.el.style.transform = `translateY(${i * 22}px)`;
      row.el.style.opacity = i < 5 ? '1' : '0';
    });
  }

  function targets() {
    let rise = 0;
    if (cycle > 8 && cycle <= 12) rise = smoothstep((cycle - 8) / 4);
    else if (cycle > 12 && cycle <= 15.5) rise = 1;
    else if (cycle > 15.5 && cycle <= 20) rise = 1 - smoothstep((cycle - 15.5) / 4.5);
    const wobble = (fbm1(age * 0.55) - 0.5) * 2;
    const jitter = (fbm1(age * 1.4 + 7) - 0.5) * 36;
    return [36 + wobble * 5 + rise * 60, 90 + wobble * 12 + rise * (200 + jitter)];
  }

  function fire() {
    phase = 'firing';
    timer = 0;
    incident = sim;
    scaled = false;
    detailWait = 0.5;
    alert.classList.remove('is-ok');
    alertTitle.textContent = alert.dataset.firing;
    alertDetail.textContent = `checkout-api, p95 ${ctx.int(p95)} ms`;
    shown.set(1);
    shift.set(0);
    log('WARN', 'alerts', 'firing: slow responses in checkout-api');
  }

  function resolve() {
    phase = 'resolved';
    timer = 0;
    alert.classList.add('is-ok');
    alertTitle.textContent = alert.dataset.resolved;
    alertDetail.textContent = `${alert.dataset.after} ${duration(sim - incident)}`;
    log('INFO', 'alerts', 'resolved: checkout-api back to normal');
  }

  function watch(dt) {
    if (phase === 'ok') {
      if (p95 > 250) {
        phase = 'pending';
        timer = 0;
      }
    } else if (phase === 'pending') {
      if (p95 <= 250) phase = 'ok';
      else if ((timer += dt) > 1) fire();
    } else if (phase === 'firing') {
      detailWait -= dt;
      if (detailWait <= 0) {
        detailWait = 0.5;
        alertDetail.textContent = `checkout-api, p95 ${ctx.int(p95)} ms`;
      }
      if (!scaled && sim - incident > 18) {
        scaled = true;
        log('INFO', 'autoscaler', 'scaled checkout-api 3 → 6');
      }
      if (p95 < 240) {
        timer += dt;
        if (timer > 1.4) resolve();
      } else {
        timer = 0;
      }
    } else if (phase === 'resolved') {
      timer += dt;
      if (timer > 3.4) {
        phase = 'ok';
        shown.set(0);
        shift.set(1);
      }
    }
  }

  function draw() {
    const dx = width / (n - 1);
    const frac = acc / every;
    for (let i = 0; i < n; i++) {
      xs[i] = (i - frac) * dx;
      ys[i] = mapY(s95[i]);
    }
    xs[n] = width;
    ys[n] = mapY(p95);
    const d95 = smoothPath(xs, ys, n + 1);
    p95Path.setAttribute('d', d95);
    area.setAttribute('d', `${d95}L${width} 120L${f1(xs[0])} 120Z`);
    for (let i = 0; i < n; i++) ys[i] = mapY(s50[i]);
    ys[n] = mapY(p50);
    p50Path.setAttribute('d', smoothPath(xs, ys, n + 1));
  }

  function step(dt) {
    age += dt;
    cycle = (cycle + dt) % 26;
    sim += dt * 12;
    const [t50, t95] = targets();
    p50 = approach(p50, t50, 3, dt);
    p95 = approach(p95, t95, 3, dt);
    acc += dt;
    while (acc >= every) {
      acc -= every;
      s50.copyWithin(0, 1);
      s95.copyWithin(0, 1);
      s50[n - 1] = p50;
      s95[n - 1] = p95;
    }
    draw();
    watch(dt);
    logWait -= dt;
    if (logWait <= 0) {
      logWait = rand(0.85, 1.35);
      const list = phase === 'firing' || phase === 'pending' ? degraded : normal;
      const [level, source, message] = list[Math.floor(Math.random() * list.length)]();
      log(level, source, message);
    }
    budget = phase === 'firing' ? budget - dt * 0.32 : Math.min(80, budget + dt * 0.02);
    css(ring, 'strokeDasharray', `${budget.toFixed(2)} 100`);
    if (low !== budget < 50) {
      low = budget < 50;
      ring.classList.toggle('is-low', low);
    }
    v50.set(p50);
    v95.set(p95);
    vAvailability.set(99.9 + budget * 0.001);
    vBudget.set(budget);
    v50.step(dt);
    v95.step(dt);
    vAvailability.step(dt);
    vBudget.step(dt);
    const a = clamp(shown.step(dt), 0, 1);
    css(alert, 'opacity', a.toFixed(3));
    css(alert, 'transform', `translateY(${(shift.step(dt) * 14).toFixed(2)}px) scale(${(0.97 + 0.03 * a).toFixed(4)})`);
  }

  s50.fill(p50);
  s95.fill(p95);
  vAvailability.snap(99.9 + budget * 0.001);
  vBudget.snap(budget);
  sim -= 40;
  log('INFO', 'gateway', 'GET /api/stages 200 12 ms');
  sim += 14;
  log('INFO', 'order-service', 'order 48213 confirmed');
  sim += 13;
  log('INFO', 'stock-sync', '126 items synced from ERP');
  sim += 13;
  draw();

  return {
    step,
    settle() {
      for (let i = 0; i < 180; i++) step(1 / 30);
    }
  };
}

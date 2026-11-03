class Readout {
  constructor(el, format, rate = 5) {
    this.el = el;
    this.format = format || ((v) => String(Math.round(v)));
    this.rate = rate;
    this.value = 0;
    this.target = 0;
    this.text = el ? el.textContent : '';
  }

  set(v) {
    this.target = v;
  }

  snap(v) {
    this.value = v;
    this.target = v;
    this.render();
  }

  step(dt) {
    this.value = approach(this.value, this.target, this.rate, dt);
    this.render();
  }

  render() {
    if (!this.el) return;
    const s = this.format(this.value);
    if (s !== this.text) {
      this.text = s;
      this.el.textContent = s;
    }
  }
}

class Spark {
  constructor(svg, opts) {
    this.line = svg.querySelector('[data-line]');
    this.area = svg.querySelector('[data-area]');
    this.n = 32;
    this.every = 0.4;
    this.values = new Float32Array(this.n);
    this.xs = new Float32Array(this.n + 1);
    this.ys = new Float32Array(this.n + 1);
    this.current = 0;
    this.acc = 0;
    this.fixedMin = opts.min;
    this.fixedMax = opts.max;
    this.lo = 0;
    this.hi = 1;
    this.primed = false;
  }

  fill(v) {
    this.values.fill(v);
    this.current = v;
    this.primed = false;
  }

  set(v) {
    this.current = v;
  }

  step(dt) {
    this.acc += dt;
    while (this.acc >= this.every) {
      this.acc -= this.every;
      this.values.copyWithin(0, 1);
      this.values[this.n - 1] = this.current;
    }
    let mn = this.current;
    let mx = this.current;
    for (let i = 0; i < this.n; i++) {
      const v = this.values[i];
      if (v < mn) mn = v;
      if (v > mx) mx = v;
    }
    let lo = this.fixedMin !== undefined ? this.fixedMin : mn;
    let hi = this.fixedMax !== undefined ? this.fixedMax : mx;
    if (this.fixedMax === undefined) hi += (hi - lo) * 0.3;
    if (this.fixedMin === undefined) lo -= (hi - lo) * 0.15;
    if (hi - lo < 1e-6) hi = lo + 1;
    if (!this.primed) {
      this.lo = lo;
      this.hi = hi;
      this.primed = true;
    } else {
      this.lo = approach(this.lo, lo, 2.5, dt);
      this.hi = approach(this.hi, hi, 2.5, dt);
    }
    this.draw();
  }

  draw() {
    const n = this.n;
    const dx = 120 / (n - 1);
    const frac = this.acc / this.every;
    const span = this.hi - this.lo;
    for (let i = 0; i < n; i++) {
      this.xs[i] = (i - frac) * dx;
      this.ys[i] = 27 - clamp((this.values[i] - this.lo) / span, 0, 1) * 24;
    }
    this.xs[n] = 120;
    this.ys[n] = 27 - clamp((this.current - this.lo) / span, 0, 1) * 24;
    const d = smoothPath(this.xs, this.ys, n + 1);
    this.line.setAttribute('d', d);
    this.area.setAttribute('d', `${d}L120 30L${f1(this.xs[0])} 30Z`);
  }
}

class Meters {
  constructor(fig, specs) {
    this.map = {};
    this.list = [];
    for (const el of fig.querySelectorAll('.meter')) {
      const spec = specs[el.dataset.meter] || {};
      const sparkEl = el.querySelector('.meter__spark');
      const m = {
        readout: new Readout(el.querySelector('[data-value]'), spec.format, spec.rate || 5),
        spark: sparkEl ? new Spark(sparkEl, spec.spark || {}) : null,
        bar: el.querySelector('[data-bar]'),
        level: new Spring(0, 140, 22),
        shown: ''
      };
      this.map[el.dataset.meter] = m;
      this.list.push(m);
    }
  }

  set(key, value, level) {
    const m = this.map[key];
    if (!m) return;
    m.readout.set(value);
    if (m.spark) m.spark.set(value);
    if (level !== undefined) m.level.set(level);
  }

  prime(key, value, level, exact = false) {
    const m = this.map[key];
    if (!m) return;
    if (exact) m.readout.snap(value);
    else m.readout.set(value);
    if (m.spark) m.spark.fill(value);
    if (level !== undefined) m.level.snap(level);
  }

  step(dt) {
    for (const m of this.list) {
      m.readout.step(dt);
      if (m.spark) m.spark.step(dt);
      if (m.bar) {
        const v = clamp(m.level.step(dt), 0, 1.04).toFixed(4);
        if (v !== m.shown) {
          m.shown = v;
          m.bar.style.transform = `scaleX(${v})`;
        }
      }
    }
  }
}

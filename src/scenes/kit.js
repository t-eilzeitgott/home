const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const SVG_NS = 'http://www.w3.org/2000/svg';
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const approach = (v, target, rate, dt) => v + (target - v) * (1 - Math.exp(-rate * dt));
const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const smoothstep = (t) => t * t * (3 - 2 * t);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeIn = (t) => t * t * t;
const linear = (t) => t;
const hash1 = (n) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const noise1 = (x) => {
  const i = Math.floor(x);
  return lerp(hash1(i), hash1(i + 1), smoothstep(x - i));
};
const fbm1 = (x) => 0.62 * noise1(x) + 0.38 * noise1(x * 2.17 + 13.7);
const f1 = (v) => v.toFixed(1);

const attr = (el, name, value) => {
  const memo = el._attrs || (el._attrs = {});
  if (memo[name] !== value) {
    memo[name] = value;
    el.setAttribute(name, value);
  }
};

const css = (el, name, value) => {
  const memo = el._styles || (el._styles = {});
  if (memo[name] !== value) {
    memo[name] = value;
    el.style[name] = value;
  }
};

const make = (name, attrs) => {
  const el = document.createElementNS(SVG_NS, name);
  for (const key in attrs) el.setAttribute(key, attrs[key]);
  return el;
};

class Spring {
  constructor(value, stiffness = 170, damping = 22) {
    this.x = value;
    this.v = 0;
    this.target = value;
    this.k = stiffness;
    this.c = damping;
  }

  set(value) {
    this.target = value;
    return this;
  }

  snap(value) {
    this.x = value;
    this.v = 0;
    this.target = value;
    return this;
  }

  step(dt) {
    const n = Math.max(1, Math.ceil(dt * 240));
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      const a = this.k * (this.target - this.x) - this.c * this.v;
      this.v += a * h;
      this.x += this.v * h;
    }
    return this.x;
  }
}

class Route {
  constructor(x0, y0, x1, y1, x2, y2, x3, y3) {
    const n = 40;
    this.n = n;
    this.pts = new Float32Array((n + 1) * 2);
    this.acc = new Float32Array(n + 1);
    let px = x0;
    let py = y0;
    let total = 0;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const u = 1 - t;
      const x = u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3;
      const y = u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3;
      if (i) total += Math.hypot(x - px, y - py);
      this.pts[i * 2] = x;
      this.pts[i * 2 + 1] = y;
      this.acc[i] = total;
      px = x;
      py = y;
    }
    this.len = total;
  }

  at(s, out) {
    const n = this.n;
    const pts = this.pts;
    if (s <= 0) {
      out[0] = pts[0];
      out[1] = pts[1];
      return out;
    }
    if (s >= this.len) {
      out[0] = pts[n * 2];
      out[1] = pts[n * 2 + 1];
      return out;
    }
    let lo = 0;
    let hi = n;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (this.acc[mid] < s) lo = mid;
      else hi = mid;
    }
    const span = this.acc[hi] - this.acc[lo] || 1;
    const f = (s - this.acc[lo]) / span;
    out[0] = lerp(pts[lo * 2], pts[hi * 2], f);
    out[1] = lerp(pts[lo * 2 + 1], pts[hi * 2 + 1], f);
    return out;
  }
}

const line = (x0, y0, x1, y1) => new Route(x0, y0, lerp(x0, x1, 1 / 3), lerp(y0, y1, 1 / 3), lerp(x0, x1, 2 / 3), lerp(y0, y1, 2 / 3), x1, y1);

function smoothPath(xs, ys, count) {
  let d = `M${f1(xs[0])} ${f1(ys[0])}`;
  for (let i = 0; i < count - 1; i++) {
    const a = i > 0 ? i - 1 : i;
    const b = i + 1;
    const c = i + 2 < count ? i + 2 : b;
    const c1x = xs[i] + (xs[b] - xs[a]) / 6;
    const c1y = ys[i] + (ys[b] - ys[a]) / 6;
    const c2x = xs[b] - (xs[c] - xs[i]) / 6;
    const c2y = ys[b] - (ys[c] - ys[i]) / 6;
    d += `C${f1(c1x)} ${f1(c1y)} ${f1(c2x)} ${f1(c2y)} ${f1(xs[b])} ${f1(ys[b])}`;
  }
  return d;
}

function mount(fig, scene) {
  let raf = 0;
  let last = 0;
  let visible = false;
  const frame = (now) => {
    raf = 0;
    if (!visible || document.hidden) return;
    const dt = Math.min(0.05, (now - last) / 1000) || 1 / 60;
    last = now;
    scene.step(dt);
    raf = requestAnimationFrame(frame);
  };
  const wake = () => {
    if (raf || !visible || document.hidden) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };
  if (reducedMotion) {
    scene.settle();
    fig.classList.remove('is-pending');
    return;
  }
  if (!('IntersectionObserver' in window)) {
    fig.classList.remove('is-pending');
    visible = true;
    wake();
    return;
  }
  new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    if (visible) fig.classList.remove('is-pending');
    wake();
  }, { threshold: 0.12 }).observe(fig);
  document.addEventListener('visibilitychange', wake);
}

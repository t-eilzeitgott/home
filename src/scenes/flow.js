class Packet {
  constructor(el) {
    this.el = el;
    this.head = el.querySelector('.pkt__head');
    this.tail = el.querySelector('.pkt__tail');
    this.grad = el.querySelector('linearGradient');
    this.busy = false;
    this.legs = [];
    this.index = 0;
    this.time = 0;
    this.kind = '';
    this.absorb = -1;
    this.lastS = 0;
    this.tailOn = false;
    this.pos = [0, 0];
    this.tmp = [0, 0];
  }

  start(kind, legs) {
    this.busy = true;
    this.legs = legs;
    this.index = 0;
    this.time = 0;
    this.absorb = -1;
    this.lastS = 0;
    this.setKind(kind);
  }

  setKind(kind) {
    if (kind === this.kind) return;
    this.kind = kind;
    this.el.setAttribute('class', `pkt pkt--${kind}`);
  }

  push(...legs) {
    for (const leg of legs) this.legs.push(leg);
  }

  stop() {
    this.busy = false;
    css(this.el, 'opacity', '0');
    this.hideTail();
  }

  hideTail() {
    if (!this.tailOn) return;
    this.tailOn = false;
    this.tail.setAttribute('d', 'M0 0');
  }

  place(scale) {
    this.head.setAttribute('transform', `translate(${f1(this.pos[0])} ${f1(this.pos[1])}) scale(${scale.toFixed(3)})`);
  }

  step(dt) {
    if (this.absorb >= 0) {
      this.absorb += dt;
      const k = 1 - this.absorb / 0.18;
      if (k <= 0) {
        this.stop();
        return;
      }
      css(this.el, 'opacity', k.toFixed(3));
      this.place(0.35 + 0.65 * k);
      this.hideTail();
      return;
    }
    this.time += dt;
    let leg = this.legs[this.index];
    while (leg && this.time >= (leg.hold || 0) + leg.d) {
      this.time -= (leg.hold || 0) + leg.d;
      leg.route.at(leg.route.len, this.pos);
      this.index += 1;
      this.lastS = 0;
      if (leg.then) leg.then(this);
      if (!this.busy) return;
      if (!this.legs[this.index] && leg.fadeOut) {
        this.stop();
        return;
      }
      leg = this.legs[this.index];
    }
    if (!leg) {
      this.absorb = 0;
      return;
    }
    const local = Math.max(0, this.time - (leg.hold || 0));
    const p = clamp(local / leg.d, 0, 1);
    const s = (leg.ease || easeInOut)(p) * leg.route.len;
    leg.route.at(s, this.pos);
    const speed = Math.abs(s - this.lastS) / Math.max(dt, 0.001);
    this.lastS = s;
    let alpha = 1;
    if (leg.fadeIn) alpha = Math.min(alpha, local / 0.12);
    if (leg.fadeOut) alpha = Math.min(alpha, (leg.d - local) / 0.12);
    alpha = clamp(alpha, 0, 1);
    css(this.el, 'opacity', alpha.toFixed(3));
    this.place(0.55 + 0.45 * alpha);
    const len = Math.min(speed * 0.045, 24, s);
    if (len < 1.5) {
      this.hideTail();
      return;
    }
    const route = leg.route;
    const t = this.tmp;
    route.at(s - len, t);
    const x0 = t[0];
    const y0 = t[1];
    let d = `M${f1(x0)} ${f1(y0)}`;
    route.at(s - len * 0.66, t);
    d += `L${f1(t[0])} ${f1(t[1])}`;
    route.at(s - len * 0.33, t);
    d += `L${f1(t[0])} ${f1(t[1])}L${f1(this.pos[0])} ${f1(this.pos[1])}`;
    this.tail.setAttribute('d', d);
    this.tailOn = true;
    this.grad.setAttribute('x1', f1(x0));
    this.grad.setAttribute('y1', f1(y0));
    this.grad.setAttribute('x2', f1(this.pos[0]));
    this.grad.setAttribute('y2', f1(this.pos[1]));
  }
}

class Pool {
  constructor(svg) {
    const host = svg.querySelector('[data-pkts]');
    const count = Number(host.dataset.pkts);
    const prefix = host.dataset.id;
    this.items = [];
    for (let i = 0; i < count; i++) {
      const g = make('g', { class: 'pkt', style: 'opacity:0' });
      const grad = make('linearGradient', { id: `${prefix}${i}`, gradientUnits: 'userSpaceOnUse', x1: '0', y1: '0', x2: '1', y2: '0' });
      grad.append(make('stop', { offset: '0', class: 'pkt__s0' }), make('stop', { offset: '1', class: 'pkt__s1' }));
      const head = make('g', { class: 'pkt__head' });
      head.append(make('circle', { class: 'pkt__halo', r: '5.2' }), make('circle', { class: 'pkt__core', r: '2.6' }));
      g.append(grad, make('path', { class: 'pkt__tail', stroke: `url(#${prefix}${i})`, d: 'M0 0' }), head);
      host.append(g);
      this.items.push(new Packet(g));
    }
  }

  launch(kind, legs) {
    for (const p of this.items) {
      if (!p.busy) {
        p.start(kind, legs);
        return p;
      }
    }
    return null;
  }

  step(dt) {
    for (const p of this.items) if (p.busy) p.step(dt);
  }

  hide() {
    for (const p of this.items) p.stop();
  }
}

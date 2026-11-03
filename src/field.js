const VERT = `#version 300 es
in vec2 a;
void main(){gl_Position=vec4(a,0.,1.);}`;

const FRAG = `#version 300 es
precision highp float;
out vec4 o;
uniform vec2 r;
uniform float t;
uniform vec2 p;
uniform float k;
uniform vec3 c1;
uniform vec3 c2;
uniform float q;
float hs(vec2 v){return fract(sin(dot(v,vec2(127.1,311.7)))*43758.5453);}
float nz(vec2 v){vec2 i=floor(v),f=fract(v);f=f*f*(3.-2.*f);return mix(mix(hs(i),hs(i+vec2(1.,0.)),f.x),mix(hs(i+vec2(0.,1.)),hs(i+vec2(1.,1.)),f.x),f.y);}
float fb(vec2 v){float a=.5,h=0.;for(int i=0;i<3;i++){h+=a*nz(v);v=v*2.03+vec2(1.7,9.2);a*=.5;}return h;}
void main(){
float m=min(r.x,r.y);
vec2 u=(gl_FragCoord.xy-.5*r)/m;
vec2 w=u*1.35;
float d=sin(t*.05)*1.8;
vec2 g=vec2(fb(w+vec2(d,0.)),fb(w+vec2(5.2,-d)));
float h=fb(w+.5*g+vec2(0.,d*.25));
vec2 e=(gl_FragCoord.xy-p)/m;
float dd=dot(e,e);
h+=k*.26*exp(-dd*20.);
float lv=h*18.;
float fr=fract(lv);
float f=min(fr,1.-fr);
float aa=fwidth(lv)*.8+.012;
float ln=1.-smoothstep(0.,aa,f);
float idx=floor(lv+.5);
float major=1.-step(.5,abs(mod(idx,4.)));
float glow=exp(-dd*6.);
float base=mix(.13,.3,major);
float al=ln*(base+glow*.45*k)*q;
al*=smoothstep(0.,.22,gl_FragCoord.y/r.y);
vec3 col=mix(c1,c2,glow*.85*k);
o=vec4(col*al,al);
}`;

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

export function start(canvas, opts = {}) {
  const gl = canvas.getContext('webgl2', {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: false,
    powerPreference: 'low-power'
  });
  if (!gl) return false;

  const reduced = !!opts.reduced;
  const coarse = matchMedia('(pointer: coarse)').matches;
  const density = Math.min(window.devicePixelRatio || 1, coarse ? 2 : 1.5);

  let prog = null;
  let loc = null;
  let w = 0;
  let h = 0;
  let raf = 0;
  let last = 0;
  let lastDraw = 0;
  let lastInput = performance.now();
  let visible = false;
  let lost = false;
  let touching = false;
  let c1 = [1, 1, 1];
  let c2 = [0.48, 0.72, 1];
  let q = 1;
  const pt = { x: -1e4, y: -1e4, tx: -1e4, ty: -1e4, k: 0, tk: 0 };

  function init() {
    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return false;
    prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const a = gl.getAttribLocation(prog, 'a');
    gl.enableVertexAttribArray(a);
    gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
    loc = {};
    for (const n of ['r', 't', 'p', 'k', 'c1', 'c2', 'q']) loc[n] = gl.getUniformLocation(prog, n);
    gl.clearColor(0, 0, 0, 0);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    return true;
  }

  function readColors() {
    const cs = getComputedStyle(canvas);
    const parse = (v, fallback) => {
      const n = v.trim().split(/\s+/).map(Number);
      return n.length === 3 && n.every((x) => x >= 0) ? n.map((x) => x / 255) : fallback;
    };
    c1 = parse(cs.getPropertyValue('--field-line'), c1);
    c2 = parse(cs.getPropertyValue('--field-accent'), c2);
    q = parseFloat(cs.getPropertyValue('--field-strength')) || 1;
  }

  function resize() {
    const nw = Math.max(1, Math.round(canvas.clientWidth * density));
    const nh = Math.max(1, Math.round(canvas.clientHeight * density));
    if (nw === w && nh === h) return;
    w = nw;
    h = nh;
    canvas.width = w;
    canvas.height = h;
    gl.viewport(0, 0, w, h);
  }

  function draw(now) {
    gl.useProgram(prog);
    gl.uniform2f(loc.r, w, h);
    gl.uniform1f(loc.t, reduced ? 0 : now / 1000);
    gl.uniform2f(loc.p, pt.x, pt.y);
    gl.uniform1f(loc.k, pt.k);
    gl.uniform3f(loc.c1, c1[0], c1[1], c1[2]);
    gl.uniform3f(loc.c2, c2[0], c2[1], c2[2]);
    gl.uniform1f(loc.q, q);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    lastDraw = now;
  }

  function running() {
    return visible && !document.hidden && !lost;
  }

  function settled() {
    return Math.abs(pt.tk - pt.k) < 0.002 && Math.abs(pt.tx - pt.x) < 0.5 && Math.abs(pt.ty - pt.y) < 0.5;
  }

  function schedule() {
    if (!raf && running()) raf = requestAnimationFrame(frame);
  }

  function frame(now) {
    raf = 0;
    if (!running()) return;
    const dt = Math.min(0.05, (now - last) / 1000) || 0.016;
    last = now;
    const calm = !touching && now - lastInput > 2500 && settled();
    if (calm && now - lastDraw < 31) {
      schedule();
      return;
    }
    const follow = 1 - Math.exp(-dt * (touching ? 24 : 12));
    pt.x += (pt.tx - pt.x) * follow;
    pt.y += (pt.ty - pt.y) * follow;
    pt.k += (pt.tk - pt.k) * (1 - Math.exp(-dt * (pt.tk > pt.k ? 10 : 4)));
    draw(now);
    if (reduced && settled()) return;
    schedule();
  }

  function kick() {
    lastInput = performance.now();
    schedule();
  }

  function aim(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const inside = clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
    if (!inside) {
      pt.tk = 0;
      kick();
      return;
    }
    pt.tx = (clientX - rect.left) * (w / rect.width);
    pt.ty = (rect.bottom - clientY) * (h / rect.height);
    if (pt.k < 0.05) {
      pt.x = pt.tx;
      pt.y = pt.ty;
    }
    pt.tk = 1;
    kick();
  }

  function release() {
    touching = false;
    pt.tk = 0;
    kick();
  }

  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'touch') aim(e.clientX, e.clientY);
  }, { passive: true });
  window.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch') aim(e.clientX, e.clientY);
  }, { passive: true });
  window.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    if (!t) return;
    touching = true;
    aim(t.clientX, t.clientY);
  }, { passive: true });
  window.addEventListener('touchmove', (e) => {
    const t = e.touches[0];
    if (t) aim(t.clientX, t.clientY);
  }, { passive: true });
  window.addEventListener('touchend', (e) => {
    if (!e.touches.length) release();
  }, { passive: true });
  window.addEventListener('touchcancel', release, { passive: true });
  document.documentElement.addEventListener('mouseleave', () => {
    pt.tk = 0;
    kick();
  });
  window.addEventListener('blur', release);
  window.addEventListener('themechange', () => {
    readColors();
    kick();
  });
  document.addEventListener('visibilitychange', () => {
    last = performance.now();
    schedule();
  });

  if (!init()) return false;
  readColors();
  resize();

  if ('ResizeObserver' in window) {
    new ResizeObserver(() => {
      resize();
      kick();
    }).observe(canvas);
  } else {
    window.addEventListener('resize', () => {
      resize();
      kick();
    });
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      last = performance.now();
      schedule();
    }).observe(canvas);
  } else {
    visible = true;
  }

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    lost = true;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  });
  canvas.addEventListener('webglcontextrestored', () => {
    lost = false;
    w = 0;
    h = 0;
    if (init()) {
      resize();
      kick();
    }
  });

  draw(performance.now());
  canvas.classList.add('is-on');
  schedule();
  return true;
}

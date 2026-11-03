const VERT = `#version 300 es
in vec2 a;
void main(){gl_Position=vec4(a,0.,1.);}`;

const FRAG = `#version 300 es
precision highp float;
precision highp int;
out vec4 o;
uniform vec2 r;
uniform float t;
uniform vec2 p;
uniform float k;
uniform float px;
uniform vec3 c1;
uniform vec3 c2;
uniform float q;
uvec2 pcg(uvec2 v){
v=v*1664525u+1013904223u;
v.x+=v.y*1664525u;v.y+=v.x*1664525u;
v^=v>>16u;
v.x+=v.y*1664525u;v.y+=v.x*1664525u;
v^=v>>16u;
return v;
}
vec2 gr(vec2 i){
uvec2 h=pcg(uvec2(ivec2(i)+ivec2(32768)));
float a=float(h.x>>8u)*(6.28318530718/16777216.);
return vec2(cos(a),sin(a));
}
float gn(vec2 x){
vec2 i=floor(x);
vec2 f=fract(x);
vec2 u=f*f*f*(f*(f*6.-15.)+10.);
float a=dot(gr(i),f);
float b=dot(gr(i+vec2(1.,0.)),f-vec2(1.,0.));
float c=dot(gr(i+vec2(0.,1.)),f-vec2(0.,1.));
float d=dot(gr(i+vec2(1.,1.)),f-vec2(1.,1.));
return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);
}
const mat2 R=mat2(.8,.6,-.6,.8);
float fbm(vec2 x){
float s=0.;
float a=.5;
for(int i=0;i<4;i++){s+=a*gn(x);x=R*x*2.03+vec2(3.1,1.7);a*=.5;}
return s;
}
void main(){
float m=min(r.x,r.y);
vec2 u=(gl_FragCoord.xy-.5*r)/m;
vec2 pu=(p-.5*r)/m;
vec2 e=u-pu;
float dd=dot(e,e);
float ang=k*.22*exp(-dd*16.);
float cs=cos(ang);
float sn=sin(ang);
vec2 w=(pu+mat2(cs,sn,-sn,cs)*e)*1.25;
float s=t*.045;
vec2 a=vec2(gn(w*.6+vec2(s*.7,-s*.4)),gn(w*.6+vec2(5.2,1.3)+vec2(-s*.5,s*.6)));
vec2 b=vec2(gn(w+a+vec2(1.7,9.2)+vec2(s*.3,s*.2)),gn(w+a+vec2(8.3,2.8)-vec2(s*.25,s*.35)));
float h=fbm(w+.75*b)*.85+.5;
h+=k*.16*exp(-dd*26.);
float lv=h*19.;
float fw=max(length(vec2(dFdx(lv),dFdy(lv))),1e-4);
float fr=fract(lv);
float dist=min(fr,1.-fr)/fw;
float major=1.-step(.5,abs(mod(floor(lv+.5),5.)));
float hw=mix(.42,.78,major)*px;
float ln=(1.-smoothstep(hw-.55,hw+.55,dist))*(1.-smoothstep(.18,.42,fw));
float glow=exp(-dd*8.)*k;
float base=mix(.11,.26,major)*mix(.8,1.15,clamp(h,0.,1.));
float al=ln*(base+glow*.42)+.02*smoothstep(.45,.95,h);
al*=q*smoothstep(0.,.22,gl_FragCoord.y/r.y);
vec3 col=mix(c1,c2,clamp(glow*1.6,0.,1.));
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
  const cap = Math.min(window.devicePixelRatio || 1, coarse ? 2 : 1.5);
  let density = cap;

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
    for (const n of ['r', 't', 'p', 'k', 'px', 'c1', 'c2', 'q']) loc[n] = gl.getUniformLocation(prog, n);
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
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    density = Math.min(cap, Math.sqrt(2.4e6 / Math.max(1, cw * ch)));
    const nw = Math.max(1, Math.round(cw * density));
    const nh = Math.max(1, Math.round(ch * density));
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
    gl.uniform1f(loc.px, density);
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
    const calm = !touching && now - lastInput > 1000;
    if (calm && now - lastDraw < 14) {
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

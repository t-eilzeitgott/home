import { esc } from './kit.mjs';

const STAR = '<svg viewBox="-10 -10 20 20"><path d="M0-10Q1.3-1.3 10 0Q1.3 1.3 0 10Q-1.3 1.3-10 0Q-1.3-1.3 0-10Z" fill="#fff"/></svg>';

const jersey = (fill, extra = '') => `<svg viewBox="0 0 64 60"><path d="M22 4 10 8 2 22l10 6 2-4v32h36V24l2 4 10-6-8-14-12-4c-2 5-6 7-10 7s-8-2-10-7z" fill="${fill}"/>${extra}<path d="M22 4c2 5 6 7 10 7s8-2 10-7" fill="none" stroke="rgba(0,0,0,.18)" stroke-width="2"/></svg>`;
const polka = jersey('#fff', '<g fill="#e5322d"><circle cx="24" cy="24" r="3.4"/><circle cx="40" cy="22" r="3.4"/><circle cx="32" cy="34" r="3.4"/><circle cx="22" cy="44" r="3.4"/><circle cx="42" cy="44" r="3.4"/><circle cx="32" cy="52" r="2.6"/></g>');
const profile = '<svg viewBox="0 0 120 56"><rect x="1" y="1" width="118" height="54" rx="14" fill="rgba(20,20,24,.82)" stroke="rgba(255,255,255,.16)"/><path d="M12 44h96" stroke="rgba(255,255,255,.12)" stroke-width="2"/><path d="M12 42 24 39l10-9 9 4 14-18 11 10 12-6 12 14 14 4" fill="none" stroke="#ff5fa2" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/><circle cx="57" cy="16" r="3.5" fill="#ffd23f"/></svg>';
const heart = (fill) => `<svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.6-9.1C.9 8.6 2.8 4.5 6.6 4.5c2.2 0 3.7 1.2 4.6 2.6.3.5 1.3.5 1.6 0 .9-1.4 2.4-2.6 4.6-2.6 3.8 0 5.7 4.1 4.2 7.4C19.5 16.4 12 21 12 21z" fill="${fill}"/><ellipse cx="7.4" cy="8.6" rx="2.4" ry="1.5" transform="rotate(-30 7.4 8.6)" fill="#fff" opacity=".55"/></svg>`;
const cloud = '<svg viewBox="0 0 64 40"><path d="M16 36h34a12 12 0 0 0 0-24 16 16 0 0 0-30-2 12 12 0 0 0-4 26z" fill="#fff" opacity=".92"/></svg>';
const flower = (fill) => `<svg viewBox="0 0 40 40"><g fill="${fill}"><circle cx="20" cy="9" r="8"/><circle cx="30.5" cy="16.6" r="8"/><circle cx="26.5" cy="29" r="8"/><circle cx="13.5" cy="29" r="8"/><circle cx="9.5" cy="16.6" r="8"/></g><circle cx="20" cy="20" r="6" fill="#ffe08a"/></svg>`;
const ring = (c) => `<svg viewBox="0 0 60 60"><circle cx="30" cy="30" r="26" fill="none" stroke="${c}" stroke-opacity=".22" stroke-width="7"/><circle cx="30" cy="30" r="22" fill="none" stroke="${c}" stroke-width="3.5"/><path d="M30 18 41 37H19z" fill="none" stroke="${c}" stroke-width="3" stroke-linejoin="round"/></svg>`;
const tri = (c) => `<svg viewBox="0 0 60 60"><path d="M30 8 54 50H6z" fill="none" stroke="${c}" stroke-opacity=".25" stroke-width="8" stroke-linejoin="round"/><path d="M30 8 54 50H6z" fill="none" stroke="${c}" stroke-width="3.5" stroke-linejoin="round"/></svg>`;
const hex = (c) => `<svg viewBox="0 0 60 60"><path d="M30 6 51 18v24L30 54 9 42V18z" fill="none" stroke="${c}" stroke-opacity=".25" stroke-width="8" stroke-linejoin="round"/><path d="M30 6 51 18v24L30 54 9 42V18z" fill="none" stroke="${c}" stroke-width="3.5" stroke-linejoin="round"/></svg>`;
const orb = (c) => `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="${c}" opacity=".18"/><circle cx="20" cy="20" r="11" fill="${c}" opacity=".35"/><circle cx="20" cy="20" r="6" fill="${c}"/><circle cx="18" cy="18" r="2" fill="#fff" opacity=".85"/></svg>`;
const lane = '<svg viewBox="0 0 120 50"><path d="M6 40c26 0 26-30 54-30s28 30 54 30" fill="none" stroke="#5a7bff" stroke-opacity=".3" stroke-width="12" stroke-linecap="round"/><path d="M6 40c26 0 26-30 54-30s28 30 54 30" fill="none" stroke="#7c9bff" stroke-width="3" stroke-linecap="round"/><path d="M6 40c26 0 26-30 54-30s28 30 54 30" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="1.2" stroke-dasharray="4 7" stroke-linecap="round"/></svg>';

const ART = {
  gruppetto: [
    [-124, -58, 66, 1.35, -12, jersey('#ffd23f')],
    [126, -50, 58, 1.2, 10, jersey('#ff5fa2')],
    [-98, 74, 48, 0.75, 8, jersey('#3ddc84')],
    [108, 80, 54, 1.55, -8, polka],
    [-168, 6, 34, 0.5, 0, jersey('#ff5a4f')],
    [0, 112, 104, 1.15, 0, profile, 0.467],
    [-56, -118, 16, 0.8, 0, STAR, 1, 'spark'],
    [156, -104, 13, 1.1, 0, STAR, 1, 'spark'],
    [176, 34, 14, 0.9, 0, STAR, 1, 'spark']
  ],
  rosenherz: [
    [-124, -56, 46, 1.3, -14, heart('#ff6fae')],
    [130, -64, 38, 0.8, 12, heart('#ffb3d5')],
    [-100, 80, 30, 0.6, 6, heart('#c9a7ff')],
    [122, 74, 52, 1.6, 10, heart('#ff4f93')],
    [-168, 4, 30, 0.5, 0, flower('#ffc2dd')],
    [164, 6, 54, 0.7, 0, cloud, 0.625],
    [-44, -122, 16, 0.8, 0, STAR, 1, 'spark'],
    [66, -118, 12, 1.1, 0, STAR, 1, 'spark'],
    [-156, -84, 13, 0.9, 0, STAR, 1, 'spark']
  ],
  neontd: [
    [-126, -54, 58, 1.3, 0, ring('#22e5ff'), 1, 'neon'],
    [128, -60, 46, 1.1, 10, tri('#ff3df2'), 1, 'neon'],
    [-104, 78, 42, 0.7, -8, hex('#8f74ff'), 1, 'neon'],
    [112, 76, 26, 1.6, 0, orb('#ff5c8a')],
    [160, 16, 18, 0.6, 0, orb('#ffb03a')],
    [-166, 8, 16, 0.45, 0, orb('#22e5ff')],
    [0, 114, 120, 1.15, 0, lane, 0.417],
    [-50, -120, 14, 0.85, 0, STAR, 1, 'spark'],
    [150, -108, 12, 1.1, 0, STAR, 1, 'spark']
  ]
};

function bit([x, y, s, d, r, inner, k = 1, kind = ''], i) {
  const cls = ['bit', d < 0.6 ? 'bit--far' : '', kind ? `bit--${kind}` : ''].filter(Boolean).join(' ');
  return `<span class="${cls}" style="--x:${x};--y:${y};--s:${s};--k:${k};--d:${d};--r:${r}deg;--i:${i}"><span class="bit__pop"><span class="bit__bob">${inner}</span></span></span>`;
}

function scene(id, iconHtml) {
  const list = ART[id].map((b, i) => ({ b, i })).sort((a, z) => a.b[3] - z.b[3]);
  const far = list.filter(({ b }) => b[3] < 0.6).map(({ b, i }) => bit(b, i)).join('');
  const near = list.filter(({ b }) => b[3] >= 0.6).map(({ b, i }) => bit(b, i)).join('');
  const center = `<span class="bit bit--icon" style="--x:0;--y:-6;--s:118;--k:1;--d:1;--r:0deg;--i:9"><span class="bit__pop"><span class="bit__bob">${iconHtml}</span></span></span>`;
  return `<span class="app__glow"></span>${far}<span class="blob"><span class="blob__pop"><i></i><i></i><b></b></span></span>${center}${near}`;
}

export function appsCarousel(ctx, icons) {
  const { site, t } = ctx;
  const p = t.projects;
  const total = site.projects.length;
  const slides = site.projects.map((pr, i) => {
    const s = p.items[pr.id];
    const label = p.position.replace('{n}', i + 1).replace('{total}', total).replace('{name}', pr.name);
    return `<article class="app app--${pr.id}" aria-roledescription="slide" aria-label="${esc(label)}">
<a class="app__stage" href="${pr.url}" tabindex="-1" aria-hidden="true"><span class="app__scene">${scene(pr.id, icons[pr.id])}</span></a>
<div class="app__info">
<h3 class="app__name">${esc(pr.name)}</h3>
<p class="app__tag">${esc(s.tagline)}</p>
<p class="app__desc">${esc(s.description)}</p>
<p class="app__meta"><span>${esc(s.platforms)}</span><span class="host">${esc(pr.host)}</span></p>
<a class="app__open" href="${pr.url}">${esc(p.open.replace('{name}', pr.name))}</a>
</div>
</article>`;
  }).join('\n');
  const aura = site.projects.map((pr) => `<i class="app--${pr.id}"></i>`).join('');
  const dots = site.projects.map((pr) => `<button type="button" aria-label="${esc(p.show.replace('{name}', pr.name))}"></button>`).join('');
  const arrow = (dir, label, d) => `<button class="apps__arrow" type="button" data-dir="${dir}" aria-label="${esc(label)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`;
  return `<div class="apps" aria-roledescription="carousel" aria-label="${esc(p.title)}">
<div class="apps__aura" aria-hidden="true">${aura}</div>
<div class="apps__rail" tabindex="0">
${slides}
</div>
<div class="apps__nav">${arrow(-1, p.previous, 'm15 6-6 6 6 6')}<div class="apps__dots">${dots}<b aria-hidden="true"></b></div>${arrow(1, p.next, 'm9 6 6 6-6 6')}</div>
</div>`;
}

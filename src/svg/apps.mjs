import { esc } from './kit.mjs';

const BAR = `<svg class="dev__bar" viewBox="0 0 393 54" aria-hidden="true"><text x="66" y="35.5" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,system-ui,sans-serif" font-size="17" font-weight="600" letter-spacing="-.3" fill="#fff">9:41</text><rect x="134.5" y="11" width="124" height="36.5" rx="18.25"/><g fill="#fff"><rect x="292.6" y="31" width="3.2" height="4.4" rx="1"/><rect x="297.4" y="28.8" width="3.2" height="6.6" rx="1"/><rect x="302.2" y="26.6" width="3.2" height="8.8" rx="1"/><rect x="307" y="24.4" width="3.2" height="11" rx="1"/><path d="M324.6 35.6 322.05 33.05A3.6 3.6 0 0 1 327.15 33.05Z"/><rect x="342.5" y="26.9" width="19.5" height="6.2" rx="1.6"/></g><g fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"><path d="M320.08 31.08A6.4 6.4 0 0 1 329.12 31.08"/><path d="M317.25 28.25A10.4 10.4 0 0 1 331.95 28.25"/></g><rect x="340.5" y="24.9" width="23.5" height="10.2" rx="3" fill="none" stroke="#fff" stroke-opacity=".4"/><rect x="365.2" y="28.3" width="1.6" height="3.4" rx=".8" fill="#fff" fill-opacity=".4"/></svg>`;

const SHOTS = {
  gruppetto: { back: 'gruppetto-ride', front: 'gruppetto-home', card: ['gruppetto-podium', 576, 369, 18] },
  rosenherz: { back: 'rosenherz-bloom', front: 'rosenherz-castle', card: ['rosenherz-goals', 576, 398, 18] },
  neontd: { back: 'neontd-worlds', front: 'neontd-battle', card: ['neontd-victory', 528, 411, 12] }
};

const img = (src, w, h) => `<img src="${src}" width="${w}" height="${h}" alt="" loading="lazy" decoding="async" draggable="false">`;

function device(root, kind, name) {
  const width = kind === 'front' ? 576 : 492;
  const height = Math.round(width * 852 / 393);
  return `<span class="dev dev--${kind}"><span class="dev__pop"><span class="dev__frame"><span class="dev__glass"><span class="dev__screen">${img(`${root}projects/shots/${name}.webp`, width, height)}${BAR}<i class="dev__home"></i></span></span></span></span></span>`;
}

function card(root, [name, width, height, radius]) {
  return `<span class="card" style="--r:${radius}"><span class="card__pop"><span class="card__in">${img(`${root}projects/shots/${name}.webp`, width, height)}</span></span></span>`;
}

function scene(root, id) {
  const s = SHOTS[id];
  return `<span class="app__glow"></span>${device(root, 'back', s.back)}${device(root, 'front', s.front)}${card(root, s.card)}`;
}

export function screenshot(origin, id) {
  return `${origin}/projects/shots/${SHOTS[id].front}.webp`;
}

export function appsCarousel(ctx, icons) {
  const { site, t, root } = ctx;
  const p = t.projects;
  const total = site.projects.length;
  const slides = site.projects.map((pr, i) => {
    const s = p.items[pr.id];
    const label = p.position.replace('{n}', i + 1).replace('{total}', total).replace('{name}', pr.name);
    return `<article class="app app--${pr.id}" aria-roledescription="slide" aria-label="${esc(label)}">
<a class="app__stage" href="${pr.url}" tabindex="-1" aria-hidden="true"><span class="app__scene">${scene(root, pr.id)}</span></a>
<div class="app__info">
<div class="app__head">
<span class="app__icon">${icons[pr.id]}</span>
<div class="app__title"><h3 class="app__name">${esc(pr.name)}</h3><p class="app__tag">${esc(s.tagline)}</p></div>
<a class="app__open" href="${pr.url}" aria-label="${esc(p.open.replace('{name}', pr.name))}">${esc(p.cta)}</a>
</div>
<p class="app__desc">${esc(s.description)}</p>
<p class="app__meta"><span>${esc(s.platforms)}</span><span class="host">${esc(pr.host)}</span></p>
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

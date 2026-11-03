import { SCENES, defs } from './scenes.mjs';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const jsonForHtml = (o) => JSON.stringify(o).replace(/</g, '\\u003c');

const GLYPHS = {
  hash: '<path d="M5 9h14M5 15h14M10 3 8 21M16 3l-2 18"/>',
  up: '<path d="M12 19V5m-7 7 7-7 7 7"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  theme: '<circle cx="12" cy="12" r="9"/><path d="M12 3v18a9 9 0 0 0 0-18z" fill="currentColor" stroke="none"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  doc: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>'
};

const glyph = (name) => `<span class="pal__glyph" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${GLYPHS[name]}</svg></span>`;
const chevron = () => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>';

function icon(ctx, project, size) {
  if (project.icon.endsWith('.svg')) return ctx.icons[project.id];
  const base = project.icon.replace(/\.webp$/, '');
  return `<img src="${ctx.root}${base}.webp" width="${size}" height="${size}" alt="" loading="lazy" decoding="async">`;
}

function boot(ctx) {
  return `(function(){var d=document.documentElement;try{var s=localStorage,m=document.querySelector('meta[name="theme-color"]');if(s.getItem("talfahrt.theme")==="light"){d.dataset.theme="light";if(m)m.content="#ffffff"}if(d.dataset.page==="home"&&!/\\/en\\/?$/.test(location.pathname)){var l=s.getItem("talfahrt.lang");if(l==="en"||(!l&&!/^de/i.test(navigator.language||"")))location.replace(d.dataset.root+"en/")}if(location.hash||sessionStorage.getItem("talfahrt.intro")||matchMedia("(prefers-reduced-motion: reduce)").matches)d.classList.add("no-intro")}catch(e){d.classList.add("no-intro")}})();`;
}

function structuredData(ctx, page) {
  const { site, t } = ctx;
  const origin = site.origin;
  const org = `${origin}/#org`;
  const website = `${origin}/#website`;
  const sameAs = site.links.filter((l) => l.url).map((l) => l.url);
  const graph = [
    {
      '@type': 'WebSite',
      '@id': website,
      url: `${origin}/`,
      name: site.brand,
      inLanguage: ['de', 'en'],
      publisher: { '@id': org }
    },
    {
      '@type': 'WebPage',
      '@id': page.url,
      url: page.url,
      name: page.title,
      description: page.description,
      inLanguage: t.lang,
      isPartOf: { '@id': website },
      about: { '@id': org }
    },
    {
      '@type': 'Organization',
      '@id': org,
      name: site.brand,
      url: `${origin}/`,
      logo: `${origin}/icons/icon-512.png`,
      description: t.profile.intro,
      email: site.email,
      knowsAbout: site.skills,
      knowsLanguage: ['de', 'en'],
      address: {
        '@type': 'PostalAddress',
        addressLocality: site.location.locality,
        addressRegion: site.location.region,
        addressCountry: site.location.country
      },
      ...(sameAs.length ? { sameAs } : {})
    },
    ...site.projects.map((p) => ({
      '@type': 'SoftwareApplication',
      name: p.name,
      url: p.url,
      applicationCategory: p.category,
      operatingSystem: p.os,
      description: t.projects.items[p.id].description,
      author: { '@id': org },
      publisher: { '@id': org }
    }))
  ];
  return { '@context': 'https://schema.org', '@graph': graph };
}

function head(ctx, page) {
  const { site, t, root } = ctx;
  const origin = site.origin;
  const hreflang = page.alternates
    ? `<link rel="alternate" hreflang="de" href="${origin}/">
<link rel="alternate" hreflang="en" href="${origin}/en/">
<link rel="alternate" hreflang="x-default" href="${origin}/">`
    : '';
  const me = site.links.filter((l) => l.url).map((l) => `<link rel="me" href="${esc(l.url)}">`).join('\n');
  return `<!doctype html>
<html lang="${page.lang}" data-theme="dark" data-page="${page.kind}" data-root="${root}" data-field="${root}${ctx.scripts.field}" data-scenes="${root}${ctx.scripts.scenes}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(page.title)}</title>
<meta name="description" content="${esc(page.description)}">
<meta name="author" content="${esc(site.brand)}">
<meta name="robots" content="${page.index ? 'index, follow, max-image-preview:large, max-snippet:-1' : 'noindex, follow'}">
<meta name="theme-color" content="#000000">
<meta name="color-scheme" content="dark light">
<link rel="canonical" href="${page.url}">
${hreflang}
${me}
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(site.brand)}">
<meta property="og:title" content="${esc(page.title)}">
<meta property="og:description" content="${esc(page.description)}">
<meta property="og:url" content="${page.url}">
<meta property="og:image" content="${origin}/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(site.brand)}">
<meta property="og:locale" content="${page.lang === 'de' ? 'de_DE' : 'en_US'}">
<meta property="og:locale:alternate" content="${page.lang === 'de' ? 'en_US' : 'de_DE'}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(page.title)}">
<meta name="twitter:description" content="${esc(page.description)}">
<meta name="twitter:image" content="${origin}/og.png">
<link rel="icon" href="${root}icons/favicon.svg" type="image/svg+xml">
<link rel="icon" href="${root}icons/icon-192.png" type="image/png" sizes="192x192">
<link rel="apple-touch-icon" href="${root}icons/apple-touch-icon.png">
<link rel="manifest" href="${root}manifest.webmanifest">
<script>${boot(ctx)}</script>
<style>${ctx.css}</style>
<script type="application/ld+json">${jsonForHtml(structuredData(ctx, page))}</script>
</head>`;
}

function header(ctx, solid) {
  const { t, root } = ctx;
  const base = ctx.kind === 'home' ? '' : root;
  const other = t.otherLang.toUpperCase();
  const otherHref = `${root}${t.otherPath}`;
  return `<header class="top${solid ? ' top--solid' : ''}" id="top">
<div class="wrap">
<a class="top__mark wordmark" href="${root}">talfahrt<span class="wordmark__dot">.</span></a>
<nav class="top__nav" aria-label="${esc(t.nav.menu)}">
<a href="${base}#projects">${esc(t.nav.projects)}</a>
<a href="${base}#architectures">${esc(t.nav.architectures)}</a>
<a href="${base}#services">${esc(t.nav.services)}</a>
<a href="${base}#profile">${esc(t.nav.profile)}</a>
<a href="${base}#contact">${esc(t.nav.contact)}</a>
</nav>
<div class="top__tools">
<button class="kbtn" type="button" data-palette aria-label="${esc(t.nav.palette)}"><kbd>⌘</kbd><kbd>K</kbd><span class="kbtn__label">${esc(t.nav.menu)}</span></button>
<a class="lang" href="${otherHref}" hreflang="${t.otherLang}" lang="${t.otherLang}" data-lang="${t.otherLang}" aria-label="${esc(t.otherLabel)}">${other}</a>
</div>
</div>
</header>`;
}

function intro() {
  const letters = 'talfahrt'.split('').map((c, i, a) => `<span style="--i:${a.length - 1 - i}">${c}</span>`).join('');
  return `<div class="intro" id="intro" aria-hidden="true">
<div class="intro__bg"></div>
<div class="intro__mark wordmark" id="introMark"><span class="intro__word">${letters}</span><span class="intro__dot wordmark__dot">.</span><span class="intro__ring"></span></div>
</div>`;
}

function hero(ctx) {
  const { t } = ctx;
  return `<section class="hero" id="hero">
<canvas class="hero__field" id="field" aria-hidden="true"></canvas>
<div class="wrap hero__inner">
<p class="hero__mark wordmark" id="heroMark" aria-label="talfahrt">talfahrt<span class="wordmark__dot">.</span></p>
<div class="hero__body">
<h1 class="hero__claim">${esc(t.hero.claim)}</h1>
<p class="hero__lede">${esc(t.hero.lede)}</p>
<div class="hero__cta">
<a class="btn btn--primary" href="#projects">${esc(t.hero.primary)}</a>
<a class="btn" href="#contact">${esc(t.hero.secondary)}</a>
</div>
</div>
</div>
</section>`;
}

function projects(ctx) {
  const { site, t } = ctx;
  const rows = site.projects.map((p) => {
    const s = t.projects.items[p.id];
    return `<li>
<a class="project" href="${p.url}">
<span class="project__icon">${icon(ctx, p, 64)}</span>
<div class="project__text">
<h3 class="project__title">${esc(p.name)} <span>${esc(s.tagline)}</span></h3>
<p class="project__desc">${esc(s.description)}</p>
<p class="project__meta"><span>${esc(s.platforms)}</span><span class="host">${esc(p.host)}</span></p>
</div>
<span class="project__go" aria-hidden="true">${chevron()}</span>
</a>
</li>`;
  }).join('\n');
  return `<section class="section" id="projects" aria-labelledby="projects-title">
<div class="wrap">
<div class="section__head">
<h2 class="section__title" id="projects-title">${esc(t.projects.title)}</h2>
<p class="section__intro">${esc(t.projects.intro)}</p>
</div>
<ul class="plist">
${rows}
</ul>
</div>
</section>`;
}

function architectures(ctx) {
  const { t } = ctx;
  const rows = t.architectures.items.map((a) => `<div class="arch__row" id="arch-${a.id}">
<div class="arch__text">
<h3>${esc(a.title)}</h3>
<p>${esc(a.text)}</p>
</div>
${SCENES[a.id](a.labels)}
</div>`).join('\n');
  return `<section class="section" id="architectures" aria-labelledby="architectures-title">
${defs()}
<div class="wrap">
<div class="section__head">
<h2 class="section__title" id="architectures-title">${esc(t.architectures.title)}</h2>
<p class="section__intro">${esc(t.architectures.intro)}</p>
</div>
<div class="arch">
${rows}
</div>
</div>
</section>`;
}

function services(ctx) {
  const { t } = ctx;
  const items = t.services.items.map((s) => `<div>
<h3>${esc(s.title)}</h3>
<p>${esc(s.text)}</p>
</div>`).join('\n');
  return `<section class="section" id="services" aria-labelledby="services-title">
<div class="wrap">
<div class="section__head">
<h2 class="section__title" id="services-title">${esc(t.services.title)}</h2>
<p class="section__intro">${esc(t.services.intro)}</p>
</div>
<div class="svc">
${items}
</div>
</div>
</section>`;
}

function profile(ctx) {
  const { t } = ctx;
  const groups = t.profile.groups.map((g) => `<div class="skills__group">
<h3 class="skills__label">${esc(g.label)}</h3>
<ul class="skills__list">${g.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
</div>`).join('\n');
  return `<section class="section profile" id="profile" aria-labelledby="profile-title">
<div class="wrap">
<div class="section__head">
<h2 class="section__title" id="profile-title">${esc(t.profile.title)}</h2>
</div>
<p class="profile__intro">${esc(t.profile.intro)}</p>
<div class="skills">
${groups}
</div>
</div>
</section>`;
}

function contact(ctx) {
  const { site, t } = ctx;
  const links = site.links.filter((l) => l.url);
  const linkRow = links.length
    ? `<div class="contact__links">${links.map((l) => `<a href="${esc(l.url)}" rel="me noopener">${esc(l.label)}</a>`).join('')}</div>`
    : '';
  return `<section class="section contact" id="contact" aria-labelledby="contact-title">
<div class="wrap">
<h2 class="contact__title" id="contact-title">${esc(t.contact.title)}</h2>
<p class="contact__text">${esc(t.contact.text)}</p>
<a class="contact__mail" href="mailto:${esc(site.email)}">${esc(site.email)}</a>
<div class="contact__row">
<a class="btn btn--primary" href="mailto:${esc(site.email)}">${esc(t.contact.write)}</a>
<button class="btn" type="button" data-copy="${esc(site.email)}" data-copied="${esc(t.contact.copied)}">${esc(t.contact.copy)}</button>
</div>
${linkRow}
</div>
</section>`;
}

function footer(ctx) {
  const { site, t, root, year } = ctx;
  const otherHref = `${root}${t.otherPath}`;
  return `<footer class="foot">
<div class="wrap">
<p class="foot__meta">© ${year} ${esc(site.brand)}</p>
<div class="foot__links">
<a href="${root}impressum/">${esc(t.footer.imprint)}</a>
<a href="${root}impressum/#datenschutz">${esc(t.footer.privacy)}</a>
<a href="${otherHref}" hreflang="${t.otherLang}" lang="${t.otherLang}" data-lang="${t.otherLang}">${esc(t.otherLabel)}</a>
<button type="button" data-theme-toggle>${esc(t.palette.items.theme)}</button>
</div>
</div>
</footer>`;
}

function palette(ctx) {
  const { site, t, root } = ctx;
  const p = t.palette;
  const otherHref = `${root}${t.otherPath}`;
  const item = (action, target, label, inner, sub, keys) => `<li class="pal__item" role="option" aria-selected="false" data-action="${action}"${target ? ` data-target="${esc(target)}"` : ''} data-keys="${esc((keys || label).toLowerCase())}">${inner}<span>${esc(label)}</span>${sub ? `<span class="pal__sub">${esc(sub)}</span>` : ''}</li>`;
  const pages = [
    item('goto', '#projects', t.nav.projects, glyph('hash')),
    item('goto', '#architectures', t.nav.architectures, glyph('hash')),
    item('goto', '#services', t.nav.services, glyph('hash')),
    item('goto', '#profile', t.nav.profile, glyph('hash')),
    item('goto', '#contact', t.nav.contact, glyph('hash')),
    item('goto', '#top', p.items.top, glyph('up'))
  ].join('\n');
  const apps = site.projects.map((pr) => item('open', pr.url, pr.name, `<span class="pal__icon" aria-hidden="true">${icon(ctx, pr, 28)}</span>`, pr.host, `${pr.name} ${t.projects.items[pr.id].tagline}`)).join('\n');
  const actions = [
    item('lang', otherHref, p.items.lang, glyph('globe'), null, `${p.items.lang} ${t.otherLabel}`),
    item('theme', '', p.items.theme, glyph('theme')),
    item('copy', site.email, p.items.copy, glyph('copy')),
    item('mail', `mailto:${site.email}`, p.items.mail, glyph('mail')),
    item('open', `${root}impressum/`, p.items.imprint, glyph('doc'))
  ].join('\n');
  return `<dialog class="pal" id="palette" aria-label="${esc(t.nav.palette)}">
<input class="pal__input" id="pal-input" type="text" placeholder="${esc(p.placeholder)}" autocomplete="off" autocapitalize="off" spellcheck="false" role="combobox" aria-expanded="true" aria-controls="pal-list" aria-autocomplete="list" aria-label="${esc(t.nav.palette)}">
<ul class="pal__list" id="pal-list" role="listbox" aria-label="${esc(t.nav.palette)}">
<li class="pal__group" role="presentation">${esc(p.groups.pages)}</li>
${pages}
<li class="pal__group" role="presentation">${esc(p.groups.projects)}</li>
${apps}
<li class="pal__group" role="presentation">${esc(p.groups.actions)}</li>
${actions}
</ul>
<p class="pal__empty" hidden>${esc(p.empty)}</p>
<div class="pal__foot">${esc(p.hint)}</div>
</dialog>`;
}

function scripts(ctx) {
  return `<script src="${ctx.root}${ctx.scripts.app}" defer></script>`;
}

export function renderHome(ctx) {
  ctx = { ...ctx, kind: 'home' };
  const { site, t } = ctx;
  const page = {
    kind: 'home',
    lang: t.lang,
    title: t.title,
    description: t.description,
    url: `${site.origin}/${t.path}`,
    index: true,
    alternates: true
  };
  return `${head(ctx, page)}
<body>
<a class="skip" href="#main">${esc(t.skip)}</a>
${intro()}
${header(ctx, false)}
<main id="main">
${hero(ctx)}
${projects(ctx)}
${architectures(ctx)}
${services(ctx)}
${profile(ctx)}
${contact(ctx)}
</main>
${footer(ctx)}
${palette(ctx)}
${scripts(ctx)}
</body>
</html>
`;
}

export function renderImprint(ctx) {
  ctx = { ...ctx, kind: 'imprint' };
  const { site, t } = ctx;
  const im = t.imprint;
  const page = {
    kind: 'imprint',
    lang: 'de',
    title: im.metaTitle,
    description: im.description,
    url: `${site.origin}/impressum/`,
    index: true,
    alternates: false
  };
  const privacy = im.privacy.map((p) => `<p>${esc(p)}</p>`).join('\n');
  return `${head(ctx, page)}
<body>
<a class="skip" href="#main">${esc(t.skip)}</a>
${header(ctx, true)}
<main id="main">
<section class="page">
<div class="wrap">
<h1 class="page__title">${esc(im.title)}</h1>
<div class="page__body">
<p class="muted">${esc(im.law)}</p>
<address>${esc(site.imprint.name)}<br>${esc(site.imprint.street)}<br>${esc(site.imprint.city)}</address>
<p>${esc(im.contactLabel)}: <a href="mailto:${esc(site.email)}">${esc(site.email)}</a></p>
<p class="muted">${esc(im.responsible)}: ${esc(site.imprint.name)}</p>
<h2 id="datenschutz">${esc(im.privacyTitle)}</h2>
${privacy}
</div>
</div>
</section>
</main>
${footer(ctx)}
${palette(ctx)}
${scripts(ctx)}
</body>
</html>
`;
}

export function renderNotFound(ctx, en) {
  ctx = { ...ctx, kind: 'notfound' };
  const { site, t } = ctx;
  const page = {
    kind: 'notfound',
    lang: 'de',
    title: `${t.notFound.title} | talfahrt`,
    description: t.notFound.text,
    url: `${site.origin}/404.html`,
    index: false,
    alternates: false
  };
  return `${head(ctx, page)}
<body>
<a class="skip" href="#main">${esc(t.skip)}</a>
${header(ctx, true)}
<main id="main">
<section class="page">
<div class="wrap notfound">
<h1 class="page__title">${esc(t.notFound.title)}</h1>
<p class="page__body">${esc(t.notFound.text)}</p>
<p class="page__body" lang="en">${esc(en.notFound.text)}</p>
<a class="btn btn--primary" href="${site.origin}/">${esc(t.notFound.back)}</a>
</div>
</section>
</main>
${footer(ctx)}
${palette(ctx)}
${scripts(ctx)}
</body>
</html>
`;
}

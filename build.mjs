import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderHome, renderImprint, renderNotFound } from './src/page.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, 'src');
const DIST = join(ROOT, 'dist');

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const read = (p) => readFileSync(p, 'utf8');
const hash = (s) => createHash('sha256').update(s).digest('hex').slice(0, 8);

function write(rel, content) {
  const p = join(DIST, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, content);
}

function build() {
  const site = readJson(join(ROOT, 'content', 'site.json'));
  const de = readJson(join(ROOT, 'content', 'de.json'));
  const en = readJson(join(ROOT, 'content', 'en.json'));
  const css = read(join(SRC, 'styles.css')).trim();
  const app = read(join(SRC, 'app.js'));
  const field = read(join(SRC, 'field.js'));
  const scenes = read(join(SRC, 'scenes.js'));
  const icons = { gruppetto: read(join(SRC, 'inline', 'gruppetto.svg')).trim() };

  rmSync(DIST, { recursive: true, force: true });
  mkdirSync(DIST, { recursive: true });
  cpSync(join(SRC, 'static'), DIST, { recursive: true });

  const scripts = { app: `assets/app.${hash(app)}.js`, field: `assets/field.${hash(field)}.js`, scenes: `assets/scenes.${hash(scenes)}.js` };
  write(scripts.app, app);
  write(scripts.field, field);
  write(scripts.scenes, scenes);

  const year = new Date().getFullYear();
  const base = { site, css, scripts, icons, year };

  write('index.html', renderHome({ ...base, t: de, root: './' }));
  write('en/index.html', renderHome({ ...base, t: en, root: '../' }));
  write('impressum/index.html', renderImprint({ ...base, t: de, root: '../' }));
  write('404.html', renderNotFound({ ...base, t: de, root: '/' }, en));
  write('sitemap.xml', sitemap(site));
  write('llms.txt', llms(site, en, de));

  const pages = ['index.html', 'en/index.html', 'impressum/index.html', '404.html'];
  for (const page of pages) {
    const html = read(join(DIST, page));
    for (const m of html.matchAll(/(?:src|href)="(\.{1,2}\/[^"#?]+)"/g)) {
      const target = resolve(join(DIST, dirname(page)), m[1]);
      const ok = existsSync(target) && (statSync(target).isFile() || existsSync(join(target, 'index.html')));
      if (!ok) throw new Error(`${page}: missing ${m[1]}`);
    }
  }
  const size = (p) => statSync(join(DIST, p)).size;
  const summary = [
    ['index.html', size('index.html')],
    ['en/index.html', size('en/index.html')],
    [scripts.app, size(scripts.app)],
    [scripts.field, size(scripts.field)],
    [scripts.scenes, size(scripts.scenes)]
  ].map(([n, s]) => `${n} ${(s / 1024).toFixed(1)} kB`).join('\n');
  console.log(summary);
}

function sitemap(site) {
  const o = site.origin;
  const alt = `<xhtml:link rel="alternate" hreflang="de" href="${o}/"/><xhtml:link rel="alternate" hreflang="en" href="${o}/en/"/><xhtml:link rel="alternate" hreflang="x-default" href="${o}/"/>`;
  const url = (loc, extra = '') => `<url><loc>${loc}</loc>${extra}</url>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${url(`${o}/`, alt)}
${url(`${o}/en/`, alt)}
${url(`${o}/impressum/`)}
</urlset>
`;
}

function llms(site, en, de) {
  const o = site.origin;
  const projects = site.projects.map((p) => {
    const s = en.projects.items[p.id];
    return `- [${p.name}](${p.url}): ${s.tagline}. ${s.description} Stack: ${s.stack}.`;
  }).join('\n');
  const services = en.services.items.map((s) => `- ${s.title}: ${s.text}`).join('\n');
  const architectures = en.architectures.items.map((a) => `- ${a.title}: ${a.text}`).join('\n');
  const facts = en.profile.facts.map((f) => `- ${f.label}: ${f.value}`).join('\n');
  const links = site.links.filter((l) => l.url).map((l) => `- ${l.label}: ${l.url}`).join('\n');
  return `# ${site.brand}

> ${en.profile.intro} ${site.brand}.dev is the home of the studio; its apps run on subdomains of it.

## About

${en.profile.intro}

${facts}

## Skills

${site.skills.join(', ')}

## Projects

${projects}

## Architectures

${architectures}

## Services

${en.services.intro}

${services}

## Contact

- Email: ${site.email}
${links}

## Pages

- [Home (German)](${o}/)
- [Home (English)](${o}/en/)
- [Imprint and privacy (German)](${o}/impressum/)

## Summary in German

${de.profile.intro}
`;
}

function serve() {
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json',
    '.webmanifest': 'application/manifest+json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.xml': 'application/xml',
    '.txt': 'text/plain; charset=utf-8'
  };
  const server = createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let file = join(DIST, p);
    if (!file.startsWith(DIST)) { res.writeHead(403); res.end(); return; }
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    if (!existsSync(file)) { file = join(DIST, '404.html'); res.statusCode = 404; }
    res.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream');
    res.end(readFileSync(file));
  });
  server.listen(4173, '127.0.0.1', () => console.log('http://127.0.0.1:4173/'));
}

build();
if (process.argv.includes('--serve')) serve();

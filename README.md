# talfahrt.dev

Site of the talfahrt brand: projects, software solutions, about and contact, in German (`/`) and English (`/en/`).

Static HTML with inlined CSS, one small script for the intro, the command palette and the theme, a WebGL2 contour field behind the hero, and five live architecture sketches with monitoring panels that only run while visible. No framework, no dependencies, no tracking.

## Structure

```
content/site.json   brand, location, email, links, projects, imprint
content/de.json     German copy
content/en.json     English copy
src/page.mjs        page templates (home, imprint, 404)
src/styles.css      design tokens and layout, inlined at build time
src/app.js          intro, palette, theme, language, copy to clipboard
src/field.js        WebGL2 contour field (loaded after the intro)
src/svg/            build-time markup of the architecture sketches and their meters
src/scenes/         runtime of the sketches (springs, packets, sparklines), bundled into one module
src/static/         CNAME, robots.txt, manifest, icons, Open Graph image, project icons
src/inline/         SVG icons inlined into the HTML
build.mjs           zero-dependency build, writes dist/
```

## Develop

```
node build.mjs           build into dist/
node build.mjs --serve   build and preview at http://127.0.0.1:4173/
```

Node 20 or newer, nothing to install. Changing copy or projects only needs edits in `content/`.

## Deploy

Every push to `main` runs `.github/workflows/deploy.yml`, which builds `dist/` and publishes it to GitHub Pages.

Repository settings → Pages: source "GitHub Actions", custom domain `talfahrt.dev`, "Enforce HTTPS" on once the certificate is issued.

## DNS (Cloudflare, proxy off / "DNS only")

| Type  | Name       | Content                          |
| ----- | ---------- | -------------------------------- |
| A     | `@`        | `185.199.108.153`                |
| A     | `@`        | `185.199.109.153`                |
| A     | `@`        | `185.199.110.153`                |
| A     | `@`        | `185.199.111.153`                |
| AAAA  | `@`        | `2606:50c0:8000::153`            |
| AAAA  | `@`        | `2606:50c0:8001::153`            |
| AAAA  | `@`        | `2606:50c0:8002::153`            |
| AAAA  | `@`        | `2606:50c0:8003::153`            |
| CNAME | `www`      | `t-eilzeitgott.github.io`        |
| CNAME | `rosenherz`| `t-eilzeitgott.github.io`        |
| CNAME | `td`       | `t-eilzeitgott.github.io`        |
| CNAME | `sattelfest` | `t-eilzeitgott.github.io`      |

`gruppetto` already points the same way. Each app repository gets its own custom domain in its Pages settings: `rosenherz.talfahrt.dev` for `lea-1`, `td.talfahrt.dev` for `td-0`, `sattelfest.talfahrt.dev` for `sattelfest`. GitHub adds the `CNAME` file to branch-based deployments itself.

## Search and AI discovery

Each page carries canonical and hreflang links, Open Graph and Twitter cards, and JSON-LD for the site, the organisation and every app. `robots.txt` allows search and AI crawlers explicitly, `sitemap.xml` lists all pages, and `llms.txt` summarises the site in plain Markdown.

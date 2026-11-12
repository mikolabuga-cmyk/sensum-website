# Sensum website

The Sensum product design studio website: a responsive static site with an animated hero, scroll-driven narrative, and selected-work portfolio.

## Run locally

Requires Python 3; no package installation or build step is needed.

```sh
cd website
python3 -m http.server 4173 --bind 127.0.0.1
```

Open http://127.0.0.1:4173/ in your browser.

## Check the site

Requires Node.js 18 or newer. From the repository root:

```sh
node --test website/tests/*.cjs
```

These automated checks cover interaction behavior, animation lifecycle, accessible fallbacks, and portfolio structure. They do not replace visual browser review.

The website source is component-based. Edit `website/components/*.html`, then rebuild and check from `website/` (Node 24):

```sh
npm ci
npm run components:build   # regenerate index.html and previews
npm run components:check   # fail on generated-output drift
npm test
npm run storybook          # component library on port 6006
```

## Structure

- `website/components/` — authoritative HTML partials; `page.html` assembles the homepage.
- `website/index.html` — generated homepage (do not edit directly).
- `website/*.css`, `website/*.js` — section styling and behavior; see `website/README.md` for the file map.
- `website/design-tokens.css` — shared color, type, spacing and motion tokens.
- `website/DESIGN-SYSTEM.md` — the live design system: color, type, icons, illustration, motion and voice.
- `website/design-system/` — public visual guide and review checklist; `website/stories/` — Storybook.
- `website/assets/` — local imagery and fonts.
- `website/tests/` — interaction and rendering-state checks.

Serve `website/` as the static document root when deploying. All asset paths are relative.

## Preview content

The portfolio and the product-image gallery currently use reference project imagery and links to the original studios. Source records are preserved in `website/assets/portfolio/references/sources.json`. These examples are placeholders and are not a claim that Sensum produced those projects. Bundled font license files remain alongside their assets.

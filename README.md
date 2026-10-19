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

## Structure

- `website/index.html` — page content and script/style loading.
- `website/styles.css` and `website/portfolio-grid.css` — page and portfolio styling.
- `website/design-tokens.css` — shared color, type, and motion tokens.
- `website/DESIGN-SYSTEM.md` — design-system foundations and usage.
- `website/assets/` — local imagery and fonts.
- `website/tests/` — interaction and rendering-state checks.

Serve `website/` as the static document root when deploying. All asset paths are relative.

## Preview content

The portfolio currently uses reference project imagery and links to the original studios. Source records are preserved in `website/assets/portfolio/references/sources.json`. These examples are placeholders and are not a claim that Sensum produced those projects. Bundled font license files remain alongside their assets.

# Sensum website

The live Sensum homepage: a static HTML/CSS/JS site with WebGL particle scenes, scroll-linked text and a component-based source. The live site is the source of truth for style, motion and voice; [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md) records it.

## Run and check

From this directory:

```sh
python3 -m http.server 4173 --bind 127.0.0.1   # preview at http://127.0.0.1:4173/
npm ci                                          # Storybook toolchain (Node 24)
npm run components:build                        # regenerate index.html and previews
npm run components:check                        # fail on generated-output drift
npm test                                        # behavioural checks (node --test)
npm run storybook                               # component library on port 6006
npm run build-storybook                         # static library in storybook/
```

Edit `components/*.html`, never `index.html`: `components/page.html` includes partials with `<!-- component:name -->` and the build writes `index.html` and `design-system/previews/*.html`.

## Page sequence

| Section | Component | Main files |
|---|---|---|
| Loader | `site-loader` | `site-loader.css`, `site-loader.js`, `vendor/thinking-orbs-engine/` |
| Header | `navigation`, `contact-button` | `styles.css`, `site.js`, `nav-scroll.js`, `logo-words.js` |
| Hero | `hero-v4`, `chat-button` | `styles.css`, `particle-field.js`, `particle-grain.js`, `hero-type.js`, `hero-words.js`, `fluid-button.js` |
| Point of view + gallery | `point-of-view`, `why-work` | `text-motion.*`, `text-reveal.js`, `why-work.*`, `why-work-orbit.js`, `why-work-surface.js`, `vendor/gsap.min.js`, `vendor/ScrollTrigger.min.js`, `vendor/three/` |
| Selected works | `selected-work`, `work-card-0…3` | `portfolio-grid.*`, `portfolio-heading.js`, `portfolio-hover.js`, `fluid-button.js` |
| What we do | `services`, `service-*`, `capabilities` | `services.css`, `services-orb.js`, `vendor/thinking-orbs/` |
| Team introduction | `team-introduction` | `text-reveal.js` |
| How we work | `how-we-work` | `how-we-work.*` |
| Why sensum? | `why-us`, `why-us-benefits` | `why-us.*`, `assets/benefits/` |
| Footer | `footer`, `chat-button` | `footer.*` |

Retained but hidden: team portraits (`team`, `team-switcher`, `particle-portrait.*`), the product-clarity photo story, the Design Team Extension service, and the hero/text-version comparison switchers. Some loaded scripts belong to earlier hero and narrative variants and are inactive under the current `data-hero-*` settings; see the archived history in the project's local `docs/website-iteration-history.md`.

## Behaviour and fallbacks

- Primary action: **Get in touch** opens an email draft to `hi@sensum.company`; it does not schedule a call.
- Reduced motion, forced colours, print, missing WebGL and missing JavaScript all keep complete, readable content.
- Canvas scenes stop offscreen and in hidden tabs; the loader always releases the page within 4 seconds.
- All asset paths are relative, so the site works under GitHub Pages' `/sensum-website/` prefix.

## Content status

Selected works and the gallery use reference project imagery from other studios, linked to their sources (`assets/portfolio/references/sources.json`). They are placeholders, not a claim that Sensum produced that work. Replace them with real, permitted Sensum cases before treating the section as evidence.

## Deployment

GitHub Actions (`.github/workflows/pages.yml`) installs, tests, builds Storybook, checks component drift and publishes the site, `design-system/guide.html` and `storybook/` to GitHub Pages on every push to `main` that touches `website/`. Review shared changes with [design-system/REVIEW-CHECKLIST.md](design-system/REVIEW-CHECKLIST.md).

Vendored libraries keep their licence files: GSAP 3.13 and ScrollTrigger, three.js, thinking-orbs. Font licences sit beside the fonts in `assets/fonts/`.

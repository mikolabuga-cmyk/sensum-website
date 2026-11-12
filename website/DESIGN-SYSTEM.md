# Sensum design system

This document records the live website. The site is the source of truth for style, motion, colour, backgrounds, typography, icons, illustration and voice. When this document, an older brand reference or a draft disagrees with the site, the site wins and this document is corrected. Last synchronised with the deployed homepage on 12 November 2026.

## Source of truth

| Source | Responsibility |
| --- | --- |
| `components/*.html` | Authoritative HTML partials, assembled from `components/page.html` |
| `tools/build-components.mjs` | Generates `index.html` and `design-system/previews/*.html` |
| `stories/*.stories.js` / `.storybook/` | HTML/Vite Storybook stories and configuration |
| `design-system/guide.html`, `guide.css`, `guide.js` | Public visual guide; colour and space swatches read live token source |
| `design-tokens.css` | Shared colour, typography, spatial and interaction roles; opt-in typography recipes |
| `styles.css` | Font loading, page rails, header, hero, narrative and CTA styling |
| `why-work.css` | Paper surface recipe and the pinned product-image gallery |
| `portfolio-grid.css` | Work-card geometry, hover treatment and responsive portfolio layout |
| `services.css` | Editorial service rows, capability columns and orb frames |
| `how-we-work.css`, `why-us.css`, `footer.css`, `site-loader.css` | Process, benefits, footer and loader |
| `text-motion.js` / `text-motion.css` | Shared letter splitting, progress mapping, easing and visual reveal |
| `particle-field.js`, `services-orb.js`, `footer.js`, `why-work.js`, `fluid-button.js` | Scene-specific particle, orb, wordmark, gallery and CTA rendering |

Stories must use production source, styles and assets. Generated pages are outputs; edit their shared source and rebuild. Actual CSS and JavaScript remain authoritative for exact values.

## Visual character

Sensum is monochrome, light and precise, with dark editorial chapters. Its graphic language is the **point**: stippled particle fields, dot orbs, dot-matrix icons and a particle wordmark. Colour comes from real product screenshots and from one bounded spectral light on the primary CTA. There is no brand accent hue, no blue field, no gradient decoration and no serif.

## Colour

The palette holds only colours that are visible on the live website. A value used solely by a hidden component lives inline in that component's CSS rather than as a token.

### Light roles

| Token | Value | Where it is visible |
| --- | --- | --- |
| `--color-section` | `#faf9f6` | Hero base, page root (`--story-background`) |
| `--color-gallery-surface` | `#f5f5f3` | Paper surface: narrative, gallery, work, why-us, footer |
| `--color-surface` | `#ffffff` | Hero reading centre, white surfaces |
| `--color-text` | `#1a2530` | Primary ink |
| `--color-text-support` | `#17283b` | Hero eyebrow and description |
| `--color-text-secondary` | `#5b676f` | Work subtitles |
| `--color-accent` | `#405d78` | Keyboard focus rings; 7% tint behind the mobile menu button. Interaction feedback only, not a brand accent |
| `--color-accent-soft` | `#aebed2` | Text selection highlight |

### Inverse roles

| Token | Value | Where it is visible |
| --- | --- | --- |
| `--color-inverse-canvas` | `#080808` | Services, team introduction, how we work, loader curtain |
| `--color-inverse-text` | `#f3f3ef` | Text on inverse surfaces |
| `--color-inverse-muted` | `#a0a0a0` | Descriptions, capabilities, step numbers |
| `--color-inverse-border` | `#303030` | Process column rules |
| `--color-inverse-active` | `#101010` | Hovered service row and selected process step |
| `--color-control-primary` | `#1b1c1e` | Primary CTA and the why-us benefits block |

Component-specific values (visible): capability rule `#3a3a3a`; why-us body text `#f2f2ff`; dark header fallback `rgb(32 32 32 / .92)` with text `#f7f7f2`; work hover label `rgb(23 23 23 / .2)` (`.55` on touch); footer wordmark `#000`; loader text gradient `#fff → #ededed → #a8adb5`.

Removed on 12 November 2026 because nothing visible used them: `--color-canvas` (`#f7f6f3`, always covered by sections), `--color-border` (`#d5dce2`), `--color-accent-wash` (`#e8eef5`), `--color-image-placeholder`, `--color-inverse-hover`, `--color-inverse-description` and `--color-white`, plus the `--canvas`, `--border` and `--blue-wash` aliases. Hidden components keep their values inline: the About menu panel (`#d5dce2`, `#e8eef5`) and team biography text (`#999`). If one of them is restored, promote its colour back to a token.

The CTA's light colours (teal `#426962` and rose `#98536c` in the CSS fallback, a spectral band in WebGL) and product screenshot colours are not general-purpose accents.

### Backgrounds

- **Hero:** a white radial reading centre (`#fff` 0–24%, fading to transparent at 100%) over `#faf9f6`, framed by a dark monochrome WebGL stipple field. The lower edge fades into the next section.
- **Paper surface** (`why-work.css`): four sections share one recipe. It layers a 4px grid of 0.55px ink dots at 8.4% opacity, three soft silver pools (`#a9aaa7`, `#c1c2bf` at low alpha) and `#f5f5f3`. Section joins fade the pools back in rather than restarting them, and the dot tile stays aligned across joins.
- **Inverse chapter:** flat `#080808`, no texture.
- Print and forced colours replace every surface with `Canvas`.

## Typography

Google Sans is the only family on the live site: a self-hosted variable font (400–700, normal and italic, optical sizing). `--font-display` and `--font-body` both resolve to it. Inter, Space Grotesk and Instrument Serif files remain in `assets/fonts/` from earlier iterations but are not loaded. Keep font licences with distributed assets. Semantic heading level is independent of visual size.

Weight rule: **400 for nearly everything**, including all section headings, the narrative and statements. Use 500 for the hero headline, work-card titles, capability headings, the CTA and the footer wordmark. Use 600 only for the header wordmark.

| Role | Desktop | Leading / tracking | Narrow layout |
| --- | --- | --- | --- |
| Hero headline (h1) | 72px, 500 | 1.1 / −.055em | 42px (≤440px), 37px (≤360px), leading 1.12 |
| Hero eyebrow | 15px, 400 | 1.5 / .025em | Same |
| Hero description | 20px, 400 | 1.75 / −.02em | Same |
| Section heading | 56px, 400 | 1.08 / −.045em | 36px at 767px |
| Narrative / team introduction | 56px, 400 | 72px / −.62px | 28px / 36px at 760px |
| Footer heading | clamp(36px, 9vw, 72px), 400 | 1.08 / −.045em | Fluid |
| Service title | clamp(32px, 3.4vw, 54px), 400 | 1.12 / −.035em | 32px |
| Process step / benefit title | 32px, 400 | 1.2 / −.025em | 24px at 480px |
| Work title | clamp(22px, 1.85vw, 28px), 500 | 1.2 / −.035em | Fluid |
| Capability heading | 16px, 500 | 1.5 | Same |
| Body / descriptions | 16px, 400 | 1.45–1.55 | Same |
| Body recipe (`.type-body`) | clamp(16px, 1.5vw, 20px), 400 | 1.45 | 15px at 767px |
| Navigation link | 15px, 400 | 1.4 | Same |
| Primary CTA | 15px, 500 | 1.4 | Same |
| Header wordmark | 30px, 600, lowercase | .95 / −.065em | 28px (≤760px), 25px (≤360px) |
| Footer wordmark | 29vw, 500, lowercase | .8 / −.065em | Fluid |
| Legal | clamp(11px, 1vw, 14px) | — | Fluid |

Use `.type-heading`, `.type-statement`, `.type-narrative`, `.type-title`, `.type-body` and `.type-label` recipes for equivalent new content. Recipes do not own margins or alignment. Live section headings override the recipe weight to 400.

## Spacing, layout and shape

Use the shared spacing scale for ordinary gaps and padding. Preserve fluid or scene-measured dimensions where geometry matters.

- Page content maximum: 1920px. Page margin: `clamp(20px, 3.333333vw, 64px)` (20px at ≤440px); gutter expands beyond the content maximum.
- Grid gap: `clamp(16px, 2.5vw, 40px)`. Section space: `clamp(72px, 8.333333vw, 160px)`.
- Radii: work media 24px; why-us block `clamp(24px, 3vw, 42px)`; nav panel 16px; base control 3px; CTA pill; focus corners 2px.
- Header: three-column grid, 96px tall (86px at 760px).
- Selected works: two independently flowing, inset columns of image-led cards; one column on mobile.
- Service rows: 300px resting minimum, 420px expanded, 56px vertical padding on desktop; normal-flow content and 40px padding at 760px.
- Capabilities: four columns, two below 900px, one below 480px.
- How we work: five flex columns (selected column grows to 2.7 shares, 520px tall); stacked two-column rows at 900px; single column at 480px.
- Why us: three columns inside the dark block; one column at 767px.
- Footer: full-height grid of contact, wordmark and legal row.

The 760px and 767px breakpoints serve different component families. Validate adjacent widths before consolidating them. Full-height scenes use `svh`/`dvh`.

## Icons

There is no icon library. Icons are small custom SVGs drawn from dots, using `currentColor` so they follow light and inverse themes.

- **Navigation glyphs:** a 5×5 dot matrix in a 20×20 viewBox, dots r .9. Active dots are at opacity 1 and inactive dots at .16. Each link has its own pattern: Works, Services, Approach (and About when visible).
- **Contact arrow:** 11 dots forming a diagonal ↗ arrow (r .95).
- **Benefit icons:** `assets/benefits/layers.svg`, `budget.svg` and `calendar.svg` are white dot drawings. They are CSS masks at rest, and `why-us.js` animates their dots.
- **Motion toggle:** simple stroked pause and filled play glyphs (the control is currently hidden).

All icons are `aria-hidden`; the adjacent text carries the meaning. New icons should follow the same dot construction and stay monochrome.

## Illustration and imagery

- **Particles, not pictures.** The hero stipple field, the service dot orbs, the team point-cloud portraits, the loader orb and the footer wordmark all render points. Each section uses one particle expression; do not stack them in one viewport or apply them to text.
- **Service orbs:** dot polyhedra from the vendored *thinking-orbs* library: cube, tetrahedron and octahedron per service, with intentionally different optical sizes. They are decorative and appear on hover or focus on desktop.
- **Product imagery:** real interface screenshots on neutral rounded mats. There is no stock photography, 3D render or abstract filler.
- **Team portraits** (hidden): registered colour, depth and silhouette maps rendered as monochrome point clouds, never a static particle image.

## Component contracts

| Component | Content and behaviour | Required review states |
| --- | --- | --- |
| Loader | Black split curtain; orb, “sensum.” and cycling words; 0–100% counter | First visit, refresh (returns to top), reduced motion, engine failure (page still releases) |
| Header | Lowercase wordmark with hover suffix, dot-matrix links, Contact with dot arrow. Hides on scroll down and returns on scroll up; 26px blur once scrolled; light text over `data-header-theme="dark"` | Light/dark surface, scrolled, hidden, keyboard, mobile menu |
| Primary CTA | `#1b1c1e` pill, white 15px label, WebGL fluid light; an anchor to the email draft | Rest, hover, pressed, focus, static/forced colours |
| Gallery | Pinned chapter: opening paragraph dissolves, four images orbit on a curved WebGL surface between two headings | Start, mid, exit, reverse, no WebGL (normal image grid), print |
| Work card | Image-led link, title and subtitle, 24px media clip, “View Project” cursor circle, fluid edge light | Rest, hover/focus, loading/failure, touch |
| Service row | Outcome left, description right, bottom-aligned; orb in the centre on desktop hover/focus | Rest, expanded, focus, mobile, static motion |
| Capabilities | Four visible categories with heading, 24px rule and list | Four/two/one columns |
| How we work | Five stages; hover, focus and click share selection; arrow, Home and End keys | Closed, selected, keyboard, stacked, no JS |
| Why us | Dark block expands from a square, then three benefits with animated dot icons | Entrance, settled, mobile, reduced motion |
| Footer | “Let’s build together”, CTA, particle wordmark, legal row | Assembling, settled, pointer, reduced motion, forced colours (plain text) |
| Text reveal | Accessible unsplit copy with decorative character spans | Start, middle, end, reverse scroll, static fallback |

### Section inventory (live order)

1. **Loader:** bounded brand introduction.
2. **Hero:** cycling eyebrow, two-line headline, description, one CTA, stipple field.
3. **Point of view + gallery:** the “AI makes it easier…” narrative, then the pinned product-image gallery with its two headings.
4. **Selected works:** four reference cards.
5. **What we do:** four service rows and four capability columns (inverse).
6. **Team introduction:** the approved statement with narrative typography (inverse).
7. **How we work:** five expanding stages (inverse).
8. **Why sensum?:** three benefits in the expanding dark block.
9. **Footer:** closing invitation and particle wordmark.

**Retained but hidden:** team portraits (Nick, Pavlo, Oleksandr), the product-clarity photo story, the Design Team Extension service row and capability column, and the hero/text-version comparison switchers. Do not reintroduce them without a request. If one is restored, review it against its contract below and the checklist.

Keep isolated section review distinct from full-page review: sticky scenes, the gallery pin and the global header need both.

## Motion system

### Feedback and transitions

| Behaviour | Value |
| --- | --- |
| Sibling de-emphasis (nav) | 220ms ease-out; inactive opacity .4 |
| Nav dot ripple | 620ms ease-in-out, per-dot stagger 27–40ms |
| Logo suffix (design / strategy / AI) | letters in 450ms `cubic-bezier(.16,1,.3,1)`, 28ms stagger, 3px blur; out 190ms |
| Header hide/show | 300ms `cubic-bezier(.22,1,.36,1)` |
| Work preview / atmosphere | 750ms `cubic-bezier(.22,1,.36,1)` |
| Service row expansion | 650ms same curve; background 600ms ease |
| Service orb visibility | 450ms opacity; 650ms transform |
| Process column | 650ms flex-grow; description 220ms fade |
| Why-us entrance | 1.1s block expansion, copy rises 6px at the end |

### Loader timeline

The loader lasts at most 4 seconds and its timing scales to fit. The orb fades in (350ms). Then the wordmark slides in (550ms, 3px blur). Then the separator dot appears and the words *design → strategy → AI* reveal letter by letter (31ms stagger). The curtain halves split up and down (800ms, `cubic-bezier(.76,0,.24,1)`). Refreshing always starts at the top of the page.

### Hero entrance

Eyebrow fades in (700ms). Headline characters resolve from a 10px blur (600ms, 23ms stagger). Description and CTA rise 6px at about 1.35s and 1.55s. The eyebrow phrase then cycles with blur-slide transitions. Reduced motion shows everything immediately.

### Letter reveal and reading stages

`SensumTextMotion` owns splitting, easing, progress and painting. Do not copy the renderer into another component.

- Letters resolve from opacity 0 to 1, 5px blur to 0, and .3em lift to 0.
- Narrative profile: viewport start .65, span .60, feather .12, damping 90ms.
- Heading base profile: start .90, span .18, feather .72, damping 130ms. Work and services headings use span .24 (25% slower) and finish at 66% viewport height.
- The narrative, team introduction, why-us heading and footer heading use the narrative profile.
- Narrative and team introduction share the sticky stage: measured reading height (85svh fallback) plus 25svh.
- Reverse scroll restores the corresponding state. Settled loops stop. Without JavaScript, the full text stays readable.

### Scenes

- **Hero particles:** the field holds, then parts around the text as it appears. The cursor raises a soft mound with a short dissolving trail. Runs at 30fps idle and full rate during interaction.
- **Gallery:** GSAP 3.13 ScrollTrigger pins one chapter (about 696vh on desktop ≥1024×760). Images advance left to right along a continuous convex cylinder. Pointer tilt is bounded and cannot replace the scroll trajectory.
- **Work cards:** cards scale in on entry, a fluid light runs along the preview edge, and the “View Project” circle follows the cursor.
- **Service orbs:** rotate only while visible and hovered or focused.
- **Footer wordmark:** dots travel to glyph samples at individual rates, react to the pointer, and recycle a few settled dots once the word is readable.
- **Primary CTA:** a slow idle breath (about 6s) with a crest that swells on hover.

Offscreen and hidden-tab rendering stops. Reduced motion resolves text, stops continuous drift and removes decorative transitions. The public pause control is hidden; system motion preferences remain supported.

## Voice

The site speaks to founders and product leaders directly and commercially.

- **Outcome first:** “From chaos to business impact”, “focus on what drives adoption, retention, and revenue”.
- **Second person and situational:** “If you know the problem you want to solve…”, “Bring clarity back to a product that feels off”.
- **Senior judgment plus AI speed:** “Senior product thinking. AI-native execution.”
- **Concrete working promises:** working code rather than only Figma, fixed budgets, a one-week free trial, less overhead.
- **Short, declarative headings.** No hype adjectives (“beautiful”, “unlock”) and no unsupported metrics.
- **Casing:** the brand is lowercase *sensum* in the wordmark, headings and legal line (sentence-initial “Sensum” in running prose is acceptable). Headings and service titles use sentence case. Capability lists and benefit titles use Title Case.
- **Primary action:** “Get in touch”. It opens an email draft to `hi@sensum.company` and does not book a call.

## Accessibility and resilience

- Preserve real text, logical heading levels and accessible names after character splitting.
- Keep a visible focus state on light and inverse surfaces. Controls need at least 44×44px targets.
- Meet AA contrast for essential text and UI. Decorative particles may be low-opacity; copy may not depend on them.
- Keep touch behaviour complete without hover. Service and process descriptions are visible on small screens.
- Supply usable reduced-motion, forced-colour and print states. A shorter animation is not a static fallback.
- Reserve media dimensions. Handle image, WebGL and texture failures without breaking copy or selection.
- Confirm no horizontal overflow at 320px, a representative phone, tablet and desktop.
- Links and asset URLs must work under GitHub Pages' `/sensum-website/` project prefix.

## Content integrity

Selected works and the gallery currently show reference projects by other studios, linked to their sources. They are placeholders. Replace them with real, permitted Sensum work before presenting them as evidence. Do not invent case studies, metrics, logos or team claims.

## Design Systems Ops

Review shared changes against this document and [the review checklist](design-system/REVIEW-CHECKLIST.md). Classify findings as **keep**, **adjust** or **remove**, with affected source and a reproducible state. When the live site changes intentionally, update this document in the same change.

For a change: identify affected roles → update shared source → add or update stories → validate static and interactive states → review the full page → record remaining limitations.

```sh
cd website
npm ci
npm run components:check  # detect generated-source drift before rebuilding
npm test
npm run storybook        # development library on port 6006
npm run build-storybook  # compose previews and build website/storybook/
```

`tools/prepare-storybook-dev.mjs` copies runtime assets to `.storybook-public/` for local Storybook. Restart Storybook after changing production assets. `tools/prepare-pages.mjs` assembles the public site and library into repository-root `_site/`, excluding dependencies and tooling.

Public routes are `/sensum-website/design-system/guide.html` and `/sensum-website/storybook/`. A story can be linked with `?path=/story/components--primary-button`. Do not claim deployed or browser-verified status without checking it.

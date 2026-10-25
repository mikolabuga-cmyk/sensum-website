# Sensum design system

This system records the approved website. Its purpose is to make future work consistent without redesigning the existing experience. Current user-approved choices take precedence over older brand references: Google Sans is the functional family, and the services and team chapters intentionally use dark surfaces.

## Source of truth

| Source | Responsibility |
| --- | --- |
| `components/*.html` | Authoritative HTML partials, assembled from `components/page.html` |
| `tools/build-components.mjs` | Generates `index.html` and `design-system/previews/*.html` |
| `stories/*.stories.js` / `.storybook/` | HTML/Vite Storybook stories and configuration |
| `design-system/guide.html`, `guide.css`, `guide.js` | Public visual guide; color and space swatches read live token source |
| `design-tokens.css` | Shared color, typography, spatial and interaction roles; opt-in typography recipes |
| `styles.css` | Base font loading, page rails, navigation, hero, narrative and photo-story layout |
| `portfolio-grid.css` | Work-card geometry, hover treatment and responsive portfolio layout |
| `services.css` | Editorial service rows, capability columns and decorative orb frames |
| `particle-portrait.css` | Team introduction, biography, portrait and member selector |
| `text-motion.js` / `text-motion.css` | Shared letter splitting, progress mapping, easing and visual reveal |
| `portfolio-heading.js` | Short-heading scroll profile for work and services |
| `text-reveal.js` | Narrative and team-statement sticky reading behavior |
| `services-orb.js` / `particle-portrait.js` | Scene-specific shape and portrait rendering |

The component and section stories must use the production source, styles and assets. A story is a view of a component, not an independent recreation. Generated pages are outputs; edit their shared source and rebuild. Storybook exposes the implementation for review; this document records its intended contract. Actual CSS and JavaScript remain authoritative for values.

## Color and visual foundations

### Light roles

| Token | Value | Intended use |
| --- | --- | --- |
| `--color-canvas` | `#f7f6f3` | Warm page foundation |
| `--color-section` | `#faf9f6` | Narrative and work sections |
| `--color-surface` | `#ffffff` | White surfaces |
| `--color-text` | `#1a2530` | Primary ink |
| `--color-text-secondary` | `#5b676f` | Secondary work copy |
| `--color-text-support` | `#17283b` | Hero supporting copy |
| `--color-border` | `#d5dce2` | Quiet light-surface boundaries |
| `--color-accent` | `#405d78` | Focus and interaction accent |
| `--color-accent-soft` | `#aebed2` | Soft selection color |
| `--color-accent-wash` | `#e8eef5` | Light accent wash |
| `--color-image-placeholder` | `#e7e6e1` | Media loading background |

Legacy variables such as `--ink`, `--canvas`, `--gutter`, and `--deep-blue` remain compatibility aliases. New work should consume the semantic source rather than create another sampled near-match.

### Inverse roles

Services and team share a near-black `#080808` canvas and warm off-white `#f3f3ef` content. Service hover uses `#181818`; row boundaries use `#303030`. Services use `#a0a0a0` for supporting copy; team descriptions and experience use `#999`. Team selectors use `#777` inactive, `#c6c6c6` hover and white selected. These differences are intentional component roles, not interchangeable grey swatches.

The primary CTA uses a `#1b1c1e` surface with a bounded spectral light treatment. Product screenshots retain their source colors. Neither the CTA's effect colors nor image colors are new general-purpose brand accents.

One atmospheric treatment should dominate each viewport. Hero particles, portfolio edge grain, service orbs and team portraits are component-specific expressions. Do not combine them on every surface or apply their canvas shaders to text.

## Typography

Google Sans is locally hosted with normal and italic variable font files. Display and body share the family; normal content uses 400, repeated headings commonly use 500, and compact emphasis may use 600. Keep font licenses with distributed assets. Semantic heading level is independent of visual size.

| Role | Desktop | Leading / tracking | Narrow layout |
| --- | --- | --- | --- |
| Hero | 72px, 500 | 1.1 / −.055em | Follow hero's responsive rules |
| Section heading | 56px | 1.08 / −.045em | 36px at 767px |
| Statement | 56px, 500 | 1.25 / −.045em | clamp(30px, 6.8vw, 48px) at 760px |
| Narrative / team introduction | 56px, 500 | 72px / −.62px | 28px / 36px at 760px |
| Work title | clamp(22px, 1.85vw, 28px), 500 | 1.2 / −.035em | Fluid scale retained |
| Service outcome | clamp(32px, 3.4vw, 54px), 400 | 1.12 / −.035em | 32px |
| Body recipe | clamp(16px, 1.5vw, 20px), 400 | 1.45 | 15px at 767px |
| Service description | 16px, 400 | 1.55 | 16px retained |
| Team description | 16px, 400 | 1.65 | 16px retained |
| Team role | 14px, 400 | 1.4 | Same |
| Team experience | 12px, uppercase | 1.5 / .055em | Same |
| Team selector | clamp(28px, 3.4vw, 54px), 400 | 1.15 / −.045em | 24px |

“Selected works” is medium 500. “What we do” is intentionally regular 400 while using the same heading size and reveal behavior. Do not normalize that approved exception. Narrative and team-introduction typography match exactly. Use `.type-heading`, `.type-statement`, `.type-narrative`, `.type-title`, `.type-body`, and `.type-label` recipes for equivalent new content; they do not own margins or alignment.

## Spacing, layout and shape

Use the shared spacing scale for ordinary gaps and padding. Preserve fluid or scene-measured dimensions where geometry matters rather than rounding every existing value to the scale.

- Page content maximum: 1920px.
- Page margin: `clamp(20px, 3.333333vw, 64px)`; gutter expands beyond the content maximum.
- Grid gap: `clamp(16px, 2.5vw, 40px)`.
- Section space: `clamp(72px, 8.333333vw, 160px)`.
- Work-media radius: 24px; CTA radius: pill; focus corners may be 2px.
- Service rows: 300px resting minimum, 420px expanded minimum, 56px vertical padding on desktop. Mobile uses normal-flow content and 40px padding.
- Capability overview: four columns, two below 900px, one below 480px.
- Team desktop: 25% biography / 50% portrait / 25% selector. Mobile changes reading arrangement and uses one column at 760px.
- Team biography: top-aligned with the portrait, 16px description; desktop description may extend to 120% of the copy rail, capped at 33.6ch. On mobile use 100% width.

The existing 760px and 767px breakpoints serve different component families. They are compatibility boundaries, not a requirement to invent two different phone sizes for future work. Validate adjacent widths before consolidating them. Intentional full-height scenes use `svh`.

## Component contracts

| Component | Content and behavior | Required review states |
| --- | --- | --- |
| Primary CTA | Pill, light label, bounded fluid light; anchor for navigation, button for actions | Rest, hover, pressed, keyboard focus, static/reduced motion |
| Navigation | Wordmark, dot-matrix links, contact action; full-width scroll blur and dark-section text switch | Light/dark surface, scrolled, menu open/closed, keyboard, mobile |
| Work card | Image-led link, title and description, 24px media clip | Rest, hover/focus, loading/failure, touch |
| Service row | Outcome left, exact description right; bottom-aligned; decorative center orb on desktop hover/focus | Rest, expanded, keyboard focus, mobile, static motion |
| Capabilities | Four visible service categories with headings, small rule and lists | Four/two/one columns |
| Team selector | Nick, Pavlo, Oleksandr; selected name stays white and uses `aria-pressed` | All members, keyboard focus, rapid switching |
| Portrait | Actual depth-based monochrome point cloud from each person's source photograph | Ready, offscreen, reduced motion, WebGL/asset failure |
| Text reveal | Accessible unsplit copy and decorative character spans | Start, middle, end, reverse scroll, static fallback |

The fifth Design Team Extension row and capability column are intentionally hidden. Do not reintroduce them when creating a showcase or new section from an old data source. Do not duplicate a visible person's name above the bio; the right-side selector already names the person.

### Section inventory

1. **Hero:** centered promise, rotating supporting line, explanation and one booking CTA, atmospheric particles. Header is shared chrome.
2. **Point of view:** the “AI makes it easier…” narrative with measured sticky reading stage.
3. **Product clarity photo story:** coordinated product/evidence composition and two statement moments.
4. **Selected works:** asymmetric image-led project grid with common heading reveal.
5. **Services:** “What we do,” four editorial outcome rows and four capability columns.
6. **Team introduction:** centered approved paragraph, matching narrative typography and scroll logic.
7. **Team portraits:** biography left, actual particle portrait center, member selector right; one-column adaptation on mobile.

Each section story must preserve its semantic heading relationship, complete copy, dependencies and fallback. Keep isolated section review distinct from full-page integration review: sticky scenes and global navigation need both.

## Motion system

### Shared feedback and media

| Behavior | Current value |
| --- | --- |
| Feedback / sibling de-emphasis | 220ms ease-out; inactive opacity .4 |
| Work preview / atmosphere | 750ms `cubic-bezier(.22, 1, .36, 1)` |
| Work preview label | 180ms opacity; 240ms scale |
| Service row expansion | 650ms same ease-out curve |
| Service background | 600ms ease |
| Service preview visibility | 450ms opacity; 650ms transform |
| Team selector color | 250ms ease |
| Header blur entrance | 300ms opacity; 26px backdrop blur |

These durations are not scroll speeds. Scroll-linked animation maps page position to progress and uses damping to smooth input.

### Letter reveal and reading stages

`SensumTextMotion` owns splitting, easing, progress and painting. Do not copy the renderer into another component.

- Letters resolve from opacity 0 to 1, 5px blur to 0, and .3em lift to 0.
- Narrative profile: viewport start .65, span .60, feather .12, damping 90ms.
- Heading base profile: start .90, span .18, feather .72, damping 130ms.
- Work and services headings apply the approved 25%-slower modifier: span `.18 / .75 = .24`, finishing at 66% viewport height. Their timing matches each other.
- Photo scene damping is 180ms. Maximum frame delta is 64ms.
- Narrative and team introduction share the sticky stage: measured reading height (85svh fallback) plus 25svh. Reduced motion removes the sticky reading hold.
- Reverse scroll restores the corresponding visual state. Settled reveal loops stop.
- Only activate hidden character states after the shared renderer initializes. Without JavaScript, retain readable full text.

### Atmospheric and geometry effects

Hero dots form a coherent moving field and preserve a quiet text zone. Portfolio edge particles are confined to the preview boundary; only the active preview runs. Services use decorative dot orbs; their approved per-service shapes and optical sizes are intentionally different. Preserve their center alignment when resizing.

Team portraits use registered color, depth and silhouette maps, never a static generated particle image. Their defaults include depth strength .7, point size .65–1.65, core noise .012, edge noise .12, noise speed .3, and limited cursor rotation (.14 horizontal / .06 vertical). Quality tiers and device-pixel-ratio caps belong to the renderer. Initial portraits are fully formed: no loading photograph flash or scattered-particle entrance. A source-photo fallback is reserved for rendering failure. Switching members preserves one rendering system and its cleanup contract.

Offscreen and hidden-tab work should stop. Reduced motion resolves text, stops continuous drift/rotation and avoids decorative transitions. The public motion button is intentionally hidden; system motion preferences remain supported.

## Accessibility and resilience

- Preserve real text, logical heading levels and accessible names after character splitting.
- Keep a visible focus state on both light and inverse surfaces; controls need at least 44×44px targets.
- Meet AA contrast for essential text and UI. Decorative particles can be low-opacity; controls and biographies cannot depend on them for legibility.
- Keep touch behavior complete without hover. Service descriptions are always visible.
- Supply usable reduced-motion, forced-color and print states. Do not equate a shorter animation with a static fallback.
- Reserve media dimensions. Handle image, WebGL and texture failures without breaking selection or copy.
- Confirm no horizontal overflow at 320px, representative mobile, tablet and desktop widths.
- Links and asset URLs must work under GitHub Pages' `/sensum-website/` project prefix.

## Design Systems Ops

The dedicated Design Systems Ops reviewer checks shared changes against this document and [the review checklist](design-system/REVIEW-CHECKLIST.md). Reviews classify findings as **keep**, **adjust**, or **remove**, with affected source and reproducible state. User-approved exceptions are recorded explicitly; they are not silently replaced by older brand guidance.

For a change: identify affected roles → update shared source → add or update stories → validate static and interactive states → review the full page → record remaining limitations. Fix shared causes before patching individual examples. Screenshot approval does not replace keyboard, reduced-motion or source-drift checks.

From the project root:

```sh
cd website
npm ci
npm run components:check  # detect generated-source drift before rebuilding
npm test
npm run storybook        # development library on port 6006
npm run build-storybook  # compose previews and build website/storybook/
```

Edit `components/*.html`, then run `npm run components:build`. The generated `index.html` remains the static homepage; isolated documents live in `design-system/previews/`. Stories frame these documents and expose width/height controls. Product Clarity includes its parent narrative, and Team Switcher includes its controlled biography/portrait, because those interactions require their parent context.

`tools/prepare-storybook-dev.mjs` copies runtime assets to `.storybook-public/` for local Storybook. Restart the Storybook command after changing production assets so the copied preview assets refresh. `tools/prepare-pages.mjs` assembles public runtime files and the library into repository-root `_site/`, excluding node_modules and tooling. The Pages workflow installs, tests, builds and deploys this artifact.

Public routes are `/sensum-website/design-system/guide.html` and `/sensum-website/storybook/`; a story can be linked with `?path=/story/components--primary-button`. Build the static Storybook before publishing; verify both the homepage and public story URL after deployment. Do not claim deployed or browser-verified status without checking it.

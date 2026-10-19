# Sensum design foundations

These foundations capture the approved homepage, rather than introduce a new visual direction. They are the starting point for future sections. The hero’s special effects and scene choreography remain component-specific.

## Sources of truth

- `design-tokens.css`: semantic colors, typography, feedback motion, image radius, and opt-in type recipes.
- `text-motion.js`: shared character splitting, progress mapping, easing, and rendering.
- `text-motion.css`: one letter opacity, blur, and lift treatment with readable reduced-motion, forced-color, and print fallbacks.
- `styles.css`: layout rails and component styles.

Load tokens and text motion CSS before component CSS. Load `text-motion.js` with `defer` before scripts that consume it. Existing short color variables (`--ink`, `--canvas`, etc.) alias semantic tokens; new components can use the semantic names directly.

## Typography

Google Sans, locally hosted, is the approved display and body family. Medium is 500; regular is 400. Font size is in CSS pixels, independent of screenshot resolution.

| Role / recipe | Desktop size | Line height | Tracking | Mobile |
| --- | --- | --- | --- | --- |
| `.type-heading` | 56px | 1.08 | −.045em | 36px |
| `.type-statement` | 56px | 1.25 | −.045em | clamp(30px, 6.8vw, 48px) |
| `.type-narrative` | 56px | 72px | −.62px | 28px / 36px |
| `.type-title` | clamp(22px, 1.85vw, 28px) | 1.2 | −.035em | Same fluid scale |
| `.type-body` | clamp(16px, 1.5vw, 20px) | 1.45 | Normal | 15px |
| `.type-label` | 14px | 1.4 | Normal | 14px |

The heading role powers “Selected works”; narrative powers “AI makes it easier…”; statement powers both messages surrounding the Sensum logo. All three are 56px on desktop. Their different leading and tracking are intentional. Existing components consume these tokens directly; recipes provide the same styles for new markup. Recipes do not set margins, alignment, or widths. Keep semantic HTML (`h2`, `p`, etc.) independent of the visual role.

Responsive breakpoints preserve the existing layout: headings/body change at 767px, narrative/statements at 760px. Narrative and message width constraints remain in their section layouts.

```html
<h2 class="type-heading">Our approach</h2>
<p class="type-body">A clear next step for your product.</p>
```

## Colors

| Token | Value | Use |
| --- | --- | --- |
| `--color-canvas` | #f7f6f3 | Base page canvas |
| `--color-section` | #faf9f6 | Warm narrative / portfolio background |
| `--color-surface` | #ffffff | White surfaces and highlights |
| `--color-text` | #1a2530 | Primary ink |
| `--color-text-secondary` | #5b676f | Case descriptions and secondary copy |
| `--color-text-support` | #17283b | Existing supporting/navigation copy |
| `--color-border` | #d5dce2 | Quiet borders |
| `--color-accent` | #405d78 | Focus and interaction accents |
| `--color-accent-soft` | #aebed2 | Selection and soft accents |
| `--color-accent-wash` | #e8eef5 | Tinted surfaces |
| `--color-image-placeholder` | #e7e6e1 | Preview loading background |

Use color roles rather than sampling another component. Decorative gradients, canvas particles, and prototype-card palettes are not yet fully tokenized. They should not become additional general-purpose text colors.

## Letter reveal

The narrative, both photo-story messages, and portfolio heading call the same `SensumTextMotion.split()` and `paint()` functions. Words stay intact across line breaks, and assistive technology receives one unsplit copy; decorative characters are hidden from it.

- Each letter smoothly resolves from opacity 0 to 1, 5px blur to 0, and .3em vertical lift to 0.
- Narrative and story messages use a 12% overlapping feather with smoothstep easing. Short headings use a 72% feather: letters begin in reading order with substantial overlap, creating a quick, continuous sweep rather than isolated typing. No CSS transition is added to the scroll-driven character values.
- Narrative uses 90ms exponential damping; short headings use 130ms to soften wheel and trackpad steps while retaining the short reveal range. A 64ms frame cap prevents large jumps after stalls.
- Narrative starts when its measured anchor reaches 65% of viewport height and completes at 5%. Short headings use the faster `tokens.heading` profile: start at 90%, complete at 72%, so the title is readable early in the section entrance.
- The photo composition retains its 180ms scene damping and its two message windows, while sharing the identical per-letter treatment.
- Scroll reversal restores the corresponding state. Settled heading/scene render loops stop; no perpetual reveal animation is required.

`SensumTextMotion.tokens` owns numeric JavaScript timing and progress constants; CSS owns visual units. Do not duplicate the feather or easing math in a new section.

To add a reveal, follow `portfolio-heading.js`: check reduced motion, forced colors, and the motion toggle; split with prefix `text-reveal`; paint a damped 0–1 progress (use `tokens.heading` for the viewport profile and its feather for short headings); only then activate `data-reveal="active"`. The generic `.text-reveal__word` / `.text-reveal__char` styles are already included. Keep content visible when scripts are unavailable. Do not repeatedly split an element on resize.

## Interaction and image styles

- Sibling de-emphasis: `--interaction-muted-opacity: .4`, with `--motion-duration-feedback: 220ms` and `--motion-ease-feedback: ease-out`. Navigation and portfolio use the same tokens; touch and forced-color modes avoid hover dimming.
- Preview zoom: `--motion-duration-preview: 750ms`, `--motion-ease-out: cubic-bezier(.22, 1, .36, 1)`.
- Preview corners: `--radius-preview: 24px`.
- Portfolio hover atmosphere: `--motion-preview-edge-blur: 11px` across the outer 15% of each side, blended into `--story-background` so the boundary dissolves into the page while the center stays sharp. On hover, a final intersected horizontal/vertical mask feathers the complete preview over 6% of each edge; the 24px rounded clip remains in place on hover, with the composite fade softening its boundary. The registered `--preview-edge-fade` property interpolates the mask on entry and exit, avoiding a hard switch. Dots, blur, and zoom share the preview easing. The hover label retains its original 180ms opacity and 240ms scale transitions, and follows the pointer directly without positional smoothing. Immediately on hover, a dense preview-edge dot field (confined to the outer 7.5% and capped at 16,000 particles and clipped to the image corners, with the hero’s subpixel mark sizes and coherent opposing currents; near-black grain at 90–100% base opacity moves at 2.5× the original flow speed and fades out at both boundaries of the band to avoid an outline) fades in with `--motion-duration-atmosphere`, aliased to the 750ms preview duration. Only the active preview animates; exit, scroll, resize, hidden tabs, pause, or preference changes cancel work. Touch, reduced-motion, forced-color, and print modes retain ordinary images.
- Reduced motion removes transforms/transitions as defined by each component. New components must supply equivalent static behavior, not merely shorten durations.

## Maintenance

Change a semantic token when changing a role across the site. Change a component style when changing only that component. Preserve the accessible copy, static fallback, responsive layout, and scroll reversal when extending motion. Keep scene-specific sequencing separate from the shared letter renderer.

Validation: `node --test website/tests/*.cjs` from the project root.

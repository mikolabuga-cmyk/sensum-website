# Sensum website

The new, section-by-section implementation. The previous `Sensum-Site-improved.html` remains an older exploration.

## Current scope

- Complete website structure, proposed content, evidence requirements, and section contracts: [content source](../docs/sensum-website-content.md).
- Section 01, Hero: implemented for review in `index.html` and `styles.css`.
- Section 02, Our point of view: one continuous reading-to-particle narrative containing both approved paragraphs in a shared sticky viewport.
- Sections 04–08: content drafted, visual implementation follows one section at a time.

The hero combines the user's NK Studio reference (https://inspiring.nk.studio/es) for the editorial headline and sequential blur reveal with Haoqi (https://haoqi.design/) for light powder-blue atmosphere and warm highlights. The latest user-supplied references set a prominent, continuous blue field: sky blue and azure with cobalt depth at the lower edges, irregular white mesh shapes that slowly stretch and merge, and a lighter reading area. The white shapes are always part of the base gradient, independently of the pointer-driven light. Ink text and a deep-blue CTA remain. The latest hover direction follows directional liquid distortion in Shopify Spring ’26’s Sidekick section: an original flow field pulls the blue/white mesh along the pointer path and gently relaxes after movement stops. Inter is now the single sans-serif family across the hero and UI, following the latest typography references. The local Google Fonts variable files provide weights 100–900 in normal and true italic styles, with automatic optical sizing. Both font files include the full Ukrainian alphabet (including Ґ, Є, І, Ї), apostrophes, and the hryvnia symbol; coverage was checked in their character maps. Regular display type, tight tracking, and restrained semibold controls establish hierarchy. The OFL license is included; older font assets remain available for archived iterations.

Semantic HTML and CSS carry the page. `site.js` handles mobile navigation, outside-click dismissal, and Escape focus restoration. `hero-mesh.js` renders an original, texture-free blue/white WebGL mesh, distorted by a small 96×64 flow field. A swept Gaussian brush adds directional displacement; semi-Lagrangian transport, diffusion, and exponential decay smooth and release it. A packed 16-bit-per-component RGBA texture preserves subtle movement without float-texture extensions. First entry begins at the actual cursor location, strength is bounded, and a stationary pointer adds no energy. Gentle lighting follows the field slope. Following the user's Agentic section recording from Shopify Spring ’26, particles now approach the viewer from a distant center. Dot density is reduced by 40% through independent seeded thinning, preserving the blue/white balance. Five staggered perspective planes carry seeded blue and white dots forward on 16-second cycles; nearby dots grow, move outward faster, and acquire short trails. Soft far/near fades hide recycling. The cursor now steers the entire background camera left/right and up/down through gentle yaw/pitch reprojection. Independent exponential damping makes direction changes smooth and returns the camera to neutral on pointer exit. Nearer dot planes gain slight extra parallax. The existing liquid field still refracts the particles together with the mesh; typography remains fixed. This replaces the inward streaks and independently drifting dots. Narrow screens naturally show fewer particles at the same visual spacing. The effect shares the mesh pause/reduced-motion behavior. A white-centered light funnel now shares the dots’ vanishing point. Seamless angular noise sampled along logarithmic radius creates broad blue folds and finer light threads that stream outward with perspective acceleration. The center remains softly white, with more saturated azure and cobalt at the periphery. All light layers inherit the same liquid refraction. Restored the stronger blue version selected by the user, with the original compact white center and no additional reading-light overlay or white top wash. The static CSS fallback matches this palette. The ambient gradient runs at 2× its original speed. Typography remains steady above it. `hero-type.js` retains the headline's sequential blur reveal (23 ms character staggering), full accessible label, and stable layout. The entrance finishes in about 2.5 seconds. Native disclosure menus and all content remain usable without JavaScript. No animation library or build step is needed.

The lower-right control pauses or resumes the background. Reduced motion, forced colors, unavailable WebGL, and context loss use the static CSS fallback. Reduced motion also presents the complete headline immediately. The renderer stops while off-screen or while the document is hidden, targets 60 frames per second during interaction and settling, returns to about 30 when idle, and caps its pixel budget. Touch input does not drive the pointer effect or intercept scrolling. Context restoration rebuilds the graphics resources.

Previous source snapshots are preserved under `docs/hero-iterations/01-blue-mesh/` `docs/hero-iterations/02-blue-glass/`, `docs/hero-iterations/03-light-webgl/`, and `docs/hero-iterations/04-dark-atmosphere/`. They are archival source snapshots, not standalone previews. The earlier generated glass image is retained as an unused historical asset; the current hero does not load it.

## Preview

From this directory:

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Open http://127.0.0.1:4173/. `index.html` can also be opened directly.

## Contact behavior

Book a call opens an email draft addressed to `hi@sensum.company`, carried over from the earlier homepage. It requests a call; it does not schedule one. A confirmed booking URL can replace this link later.

## Continue building

Keep the hero in place and append each reviewed section in `index.html`, using the content source as the working draft. Selected work comes next and requires real project assets, scope, permission, and outcomes. Do not substitute abstract imagery or fabricated case studies for this evidence.

For each section check desktop, 320 px, a representative phone, tablet, keyboard focus, 44 px touch targets, contrast, missing media, no JavaScript, and reduced motion. Preserve full content when text is enlarged.

## Point-of-view scroll reveal

`text-reveal.js` progressively enhances the single semantic paragraph. The paragraph sits in a sticky reading stage and resolves character by character through a 5px blur, opacity, and a subtle vertical offset. The visual scale and reveal follow the Espacio La Nube reference; the site retains Google Sans. The October 14 background is built entirely with CSS: a bright white field with broad, faint silver light pools. No background image is loaded. A white entry wash joins the extended hero fade without a hard color boundary. The paragraph uses Google Sans at 57px with a 72px line height and -0.62px tracking on desktop, retaining the hero title’s 500 weight and dark ink color. On narrow screens it scales to 28px with a 36px line height. Words stay intact when wrapping, and stages grow with their content on shorter screens.

The opening paragraph now shares the particle scene’s viewport instead of occupying a separate scroll panel. The reveal begins when the section top reaches 65% of the viewport height and completes at 5%, before the section reaches the top. Taller copy expands the stage naturally. Scrolling reverses the reveal. Rendering stops once it settles. Reduced motion, forced colors, the animation pause control, printing, and unavailable JavaScript show complete readable copy. The hero and navigation interactions remain independent.

## Particle story — option 2

The particle passage is part of `#our-why`, sharing a sticky viewport with the first paragraph. It uses a WebGL canvas with two passes: individually animated points and a full-screen light field. The opening text remains visible while darker charcoal points emerge and gather in the same space; it fades only when the sphere starts expanding. Scrolling gathers the points into a filled, softly feathered sphere, expands it past the viewport, and merges its dark center into a black background. Cyan, blue, violet, and amber refraction fades in at both sides from 60% to 70% of the shared scroll timeline, reaching full visibility at 70% while the particle field is still expanding. The center stays quiet for the text. Copy is centered inside a 65vw column, using the previous section’s 57px/72px Google Sans typography and -0.62px tracking. The approved value proposition is set as one continuous heading.

`story-reveal.js` coordinates the shared scene over 120svh of scroll. A broad, transparent particle root overlaps the hero’s lower 12% and spans 92% of its width, with feathered shoulders curving into the narrow stem so the flow grows out of the existing background. The hero’s lower central dots converge and stretch downward using the same eased scroll value. The ribbon remains connected throughout the text entrance and while the paragraph reaches the center. It then narrows and fades from 4% to 19% of the pinned timeline, finishing just before sphere formation begins at 20%. Ribbon geometry follows scroll with 180ms damping; individual dots drift gently along it and recycle at transparent endpoints. On arrival, the dots spread by 8–30px and soften to avoid a dark concentration at the center. Particle recycling freezes during sphere formation. Scrolling backward restores the connection. The first 20% of the pinned timeline holds the text before those seeds gather into the sphere. The remaining 80% gathers and expands the sphere before revealing the centered value proposition. The opening paragraph stays fully visible through gathering and fades between 28% and 38% of the particle timeline, as expansion begins. Both paragraphs occupy the same grid cell; the stage grows to fit whichever is taller. Scrolling reverses the transformation. Time only drives gentle point motion and slow breathing in the colored light.

The renderer uses 65,000 points on desktop and 24,000 on narrow screens, caps the framebuffer at 1.8 million pixels, and targets roughly 30fps during ambient motion. The point pass stops after expansion. Rendering stops off-screen, when hidden, or when paused. Reduced motion, unavailable WebGL, shader failure, context loss, forced colors, and print retain a readable static composition. No video, background image, or additional framework is needed.

The original image-expansion version is preserved in `docs/story-iterations/01-image-expansion/` (source snapshot only). Its procedural SVG remains available but is no longer loaded by the page.

## Paragraph animation comparison — V1 / V2

The fixed **Text animation — V1 / V2** control compares the narrative in `#our-why`. V2 is selected initially; V1 restores the original character reveal and dark sphere expansion. V2 peels the opening paragraph into grains that flow into the colored ring, completing their gathering by 62% of the pinned scroll, then reveals the dark-ink value proposition using the same character reveal from 65% to 92%. The value proposition remains fully visible through the end and exits naturally with the section. Switching preserves the current scroll position. The hero, navigation and buttons keep their existing behavior.

V2 (`text-disintegration.js`) samples the loaded font at the actual DOM character positions, retaining responsive line breaks, tracking and alignment. A texture stores both glyph alpha coverage and deterministic release times. The solid-text pass removes microscopic cells from left to right; the point pass moves those same cells through curling paths into deterministic positions on the colored ring. The grains gradually take on the ring spectrum and remain visible in the completed ring; scrolling backward returns each grain to its original glyph. There is no whole-paragraph fade or blur driving the disintegration. Formation derives from scroll progress; ambient orbit and hover displacement fade out with formation so reverse scrolling reconstructs the same original glyphs.

Locally vendored GSAP 3.13.0 and ScrollTrigger drive a scrubbed timeline. Both versions first run the original scroll-driven character reveal. V2 then holds the completed paragraph briefly at the center before disintegration uses the existing short CSS-pinned interval; no additional pin spacer or scroll distance is introduced. DOM text remains accessible throughout and visible/selectable at rest, in V1, and when reduced motion, forced colors, pause, missing dependencies or WebGL failure disables V2. Sampling is rebuilt after font loading or responsive layout changes. Rendering is event-driven during the initial reveal, then animates the visible ring; it is bounded to 48,000 desktop / 20,000 mobile particles and a 2.4-million-pixel canvas.

Vendor copyright/license headers are retained in `vendor/gsap.min.js` and `vendor/ScrollTrigger.min.js`; see [GSAP licensing](https://gsap.com/standard-license/) and [ScrollTrigger documentation](https://gsap.com/docs/v3/Plugins/ScrollTrigger/).

Run the paragraph lifecycle and sampling checks with `node --test website/tests/text-disintegration.test.cjs`. These cover mask/particle release agreement, layout sampling, reverse scrubbing, version switching, fallbacks, context recovery and particle budgets with mocked rendering. They do not replace live GPU/visual inspection.


### Centered color ring

V2 now reveals a centered coral/orange/yellow/mint/cyan ring on a light paper background. `story-color-ring.js` combines a diffused spectrum band with seeded microscopic dots and soft Gaussian edges, rasterized only on resize. Its color bed appears as the actual letter grains gather into the ring, driven by the same ScrollTrigger timeline. The existing value proposition remains centered with its same dark type and scroll reveal. The blue mesh and drifting-image gallery are no longer used. V1 remains unchanged.

The canvas caps at 1.8 million pixels and 110,000 dots, has no continuous animation loop, and is decorative. Forced colors and print hide it; static motion fallbacks retain readable text. The former gallery source remains available as an unused iteration.

The formed V2 ring has a slow particle orbit and a subtle radial breathing motion. Hovering its band gently repels nearby grains (maximum 24px); the response eases in and out, ignores touch, and leaves the central text untouched. The particle loop stops offscreen, in a hidden tab, when paused, in V1 and for reduced motion. The color-bed canvas remains static and cached.

## Photo story section

`#product-clarity` follows the shared narrative. It uses the three user-requested Lassie reference photographs (source URLs in `assets/editorial/SOURCES.md`) with original, illustrative Sensum UI cards. The working copy is “Better decisions. Stronger products.” followed by “Clarity at every step. From idea to impact.” No external performance statistic is presented as a Sensum result.

`photo-story.js` controls a CSS-sticky composition: small photos/cards scale into their positions on entry, continue with independent parallax paths, and surround a two-message crossfade. Scroll reversal reconstructs the same positions. Mobile uses smaller edge-positioned photos and cards; pause, reduced motion, forced colors, and absent JavaScript show a normal-flow layout. Animation stops when settled, hidden, or offscreen. Run `node --test website/tests/photo-story.test.cjs` for sequencing and lifecycle checks. The local preview still needs a live visual review.

## Shared design foundations

Typography, semantic colors, and letter-reveal motion now have shared tokens and recipes. See [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md) for values, responsive rules, usage, and extension guidance.

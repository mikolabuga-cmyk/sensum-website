# Curved image gallery

The existing HTML cards are the content source and accessible reading order. Desktop motion uses `why-work.js` and `why-work-surface.js`; the latter uses the existing vendored Three.js runtime, with no added package dependency.

Each 600 × 413.79 plane (1.45:1) has 96 horizontal subdivisions. Cylindrical vertex deformation preserves arc-length UVs: the center is at z=0 and the edges recede. The default radius is 850; override with `data-curvature-radius="1000"` on the section (larger means flatter; minimum 600). Rounded, 2× resolution canvas textures use decoded local images, cropped without stretching. Geometry scales uniformly to 33vw, bounded to 340–600px.

Scroll progression is a finite elliptical passage from lower left through the foreground to upper right. A 0.73-radian step and a vertical rise of 42% of image height separate neighbors. Orientation follows the ellipse tangent, making peripheral images edge-on. There is no wraparound: entry and exit leave the centered HTML heading visible behind the canvas. Images can temporarily obscure the heading.

The camera stays fixed at 1400. The six-viewport runway uses a 0.25-second GSAP scrub, with no snapping or auto advancement. Nested translation, orientation, and pointer groups compose independently. Pointer rotation adds at most ±2.5°, weighted toward the foreground; hover adds 24 depth units. Updates are coalesced per animation frame and resources disposed when the desktop media query stops matching.

Below 1024px width or 760px height, reduced motion, no JavaScript, missing WebGL, context loss, or future interactive card controls use the semantic HTML layout. Canvas is decorative and hidden from assistive technology. Do not add controls only to the texture: real HTML interaction must remain available.

Preview: `design-system/previews/why-work.html`. Storybook: Sections / Why Work With Us. Geometry coverage: `tests/why-work-curvature.test.cjs`.

The gallery currently uses six local project images as placeholders. Images are decoded before texture creation, cropped without stretching, and retained as semantic images with alt text in the responsive fallback.

Images have independent 14–18 second low-amplitude idle drift, composed with the scroll orbit and pointer offsets. Rendering pauses offscreen and in hidden tabs; reduced-motion retains the static grid. Detached planar shadows are omitted to avoid duplicate silhouettes at oblique angles.

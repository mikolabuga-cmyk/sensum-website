# Temporary hover preview content

`reference-examples.png` is the screenshot supplied by the user on 2026-10-12.
The five crops in `../../portfolio-previews.js` are example product cards from that
reference, used to demonstrate the requested particle reveal. They are not
Sensum portfolio projects or client claims.

For real case studies, add the approved preview images here and update each
manifest entry's `src`, `label`, and optional normalized `crop`. A complete image
uses `crop: [0, 0, 1, 1]`. Images are loaded once, cropped at native resolution into GPU textures, and
revealed through the existing particle coordinates. Once gathered, a continuous
image resolves over the particles for clearer UI detail; only its perimeter is
feathered. The source reference screenshot itself contains baked-in softness. Failed images are skipped;
if all images fail, the original ambient particles remain available.

Behavior: a readable preview within about two seconds of a stationary hover
(750ms dwell, 1.4-second gathering, and a gentle final settling), one image held per encounter,
shuffled next image without immediate repeats. No timed slideshow. The header,
central reading area, touch input, and reduced-motion preference are protected.

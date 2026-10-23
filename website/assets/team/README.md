# Nick — Product Strategist

Maps are derived locally from the user-supplied 640×640 photograph (black jacket, white background), restored at the user’s request. Regenerate Nick with `--person nick` for its source-specific head and upper-neck crop. The generated particle style reference is not included or sampled.

- `nick-color.webp`: monochrome luminance, not literal skin color.
- `nick-depth.webp`: relative monocular depth; white is near. This is a frontal depth surface, not a complete head scan.
- `nick-mask.webp`: head/hair/upper-neck confidence with feathered edges.
- `nick-fallback.webp`: masked original photograph for loading and unavailable WebGL.

All maps are registered 512×512 images, padded identically. Depth and mask are lossless. Keep the original photo and model weights outside the published website.

Regenerate with `website/tools/prepare-portrait.py SOURCE_PATH` in an isolated Python environment with torch, transformers, Pillow and rembg[cpu]. Uses Depth Anything V2 Small (Apache-2.0) and U2Net human segmentation. Model downloads are inbound; photo inference is local. Review the depth and silhouette whenever replacing the photo: automated monocular inference is an estimate, not measured facial geometry.

The renderer uses a single Three.js Points object. `mountParticlePortrait(host, {colorMap, depthMap, maskMap}, config)` returns `setPortrait(next)` and `destroy()`. The same UV point grid and dual map uniforms support future morphs; no team selector is introduced yet. Preserve aligned framing when preparing future portraits.

Defaults are exported as `portraitDefaults` in `particle-portrait.js` for internal tuning. Desktop uses 256² points, tablet 200², mobile 160²; DPR is capped at 1.5. Offscreen/hidden documents stop rendering. Reduced motion and the existing pause control render a static cloud. No touch gestures or device sensors are required.

Validation: desktop WebGL preview rendered 65,536 points, and pointer movement changed the Y rotation from 0 to 0.097 radians. The pause button returned rotation to zero. A 390px-wide iframe was checked for stacked layout and rendering. Geometry-tier and asset-failure tests are in `tests/particle-portrait.test.cjs`. Map alignment and foreground/nose depth checks passed. Browser frame callback diagnostics reached 120fps on this machine; this is not a cross-device GPU benchmark. Add `?portraitDebug=1` to expose point count, rotation, and frame cadence as data attributes on the portrait element during development.

Pavlo uses the supplied transparent PNG, preserving its alpha silhouette. Regenerate his aligned maps with `prepare-portrait.py SOURCE_PATH --person pavlo`. Nick and Pavlo now switch through the same point geometry; Oleksandr also uses his supplied transparent PNG, prepared with `--person oleksandr`; all three profiles have independent color, depth, mask, and fallback maps.

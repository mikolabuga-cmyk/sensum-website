/* Content deforms into the live focal point of the interactive blue mesh. */
(() => {
  const hero = document.querySelector('.hero-shell');
  const track = document.querySelector('.hero-scroll-track');
  const content = hero?.querySelector('.hero__content');
  if (!hero || !track || !content) return;
  const control = hero.querySelector('.motion-toggle');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const forced = matchMedia('(forced-colors: active)');
  const stage = document.createElement('div');
  stage.className = 'hero-content-stage';
  content.before(stage);
  stage.append(content);
  const trails = document.createElement('canvas');
  trails.className = 'hero-suction-trails';
  trails.setAttribute('aria-hidden', 'true');
  stage.prepend(trails);
  let warp = createWarpRenderer(trails);
  const ctx = warp ? null : trails.getContext('2d');
  const source = document.createElement('canvas');
  const ink = source.getContext('2d');
  let frame = 0, travel = 1, pullStart = 0, width = 1, height = 1, ratio = 1;
  let portalX = 0, portalY = 0, dirty = true;
  let sceneWidth = 1, sceneHeight = 1, stageLeft = 0, stageTop = 0;
  const clamp = value => Math.max(0, Math.min(1, value));
  const smooth = value => value * value * (3 - 2 * value);
  const enabled = () => document.documentElement.dataset.heroVariant === 'blue' && !reduced.matches && !forced.matches && control?.dataset.paused !== 'true';

  function createWarpRenderer(canvas) {
    const gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: true });
    if (!gl) return null;
    function compile(type, source) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { gl.deleteShader(shader); return null; }
      return shader;
    }
    const vertex = compile(gl.VERTEX_SHADER, `
      attribute vec2 position;
      varying vec2 uv;
      void main() { uv = position * .5 + .5; gl_Position = vec4(position, 0., 1.); }
    `);
    const fragment = compile(gl.FRAGMENT_SHADER, `
      precision highp float;
      varying vec2 uv;
      uniform sampler2D content;
      uniform vec2 size;
      uniform vec2 portal;
      uniform float progress;
      uniform float opacity;
      uniform float active;
      vec4 warped(vec2 delta, float radius, float power) {
        float r = length(delta);
        // Inverse of r' = R * (r/R)^power. Points closer to the core
        // move proportionally farther, stretching actual glyph silhouettes.
        float sourceRadius = radius * pow(max(r / radius, .000001), 1. / power);
        vec2 pixel = portal + delta * sourceRadius / max(r, .0001);
        vec2 sampleUV = pixel / size;
        if (sampleUV.x < 0. || sampleUV.x > 1. || sampleUV.y < 0. || sampleUV.y > 1.) return vec4(0.);
        vec4 color = texture2D(content, vec2(sampleUV.x, 1. - sampleUV.y));
        return vec4(color.rgb * color.a, color.a);
      }
      void main() {
        if (active < .5) { gl_FragColor = vec4(0.); return; }
        vec2 pixel = vec2(uv.x, 1. - uv.y) * size;
        vec2 delta = pixel - portal;
        float radius = length(max(portal, size - portal)) * 1.12;
        float power = 1. + .8 * progress + 2. * pow(progress, 3.) / (1.08 - progress);
        vec4 exposure = vec4(0.);
        // Trails follow the same nonlinear warp as the visible face.
        for (int i = 18; i >= 1; i--) {
          float t = float(i) / 18.;
          vec4 layer = warped(delta, radius, power + t * progress * 1.7);
          layer *= .062 * (1. - t * .82) * smoothstep(0., .16, progress);
          exposure = layer + exposure * (1. - layer.a);
        }
        vec4 face = warped(delta, radius, power);
        gl_FragColor = (face + exposure * (1. - face.a)) * opacity;
      }
    `);
    if (!vertex || !fragment) return null;
    const program = gl.createProgram();
    gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
    gl.deleteShader(vertex); gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
    gl.useProgram(program);
    const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const texture = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    const locations = Object.fromEntries(['size', 'portal', 'progress', 'opacity', 'active'].map(name => [name, gl.getUniformLocation(program, name)]));
    return {
      upload(image) { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image); },
      draw(p, alpha) {
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniform2f(locations.size, width, height); gl.uniform2f(locations.portal, portalX, portalY);
        gl.uniform1f(locations.progress, p); gl.uniform1f(locations.opacity, alpha);
        gl.uniform1f(locations.active, p > 0 && p < 1 ? 1 : 0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
    };
  }

  // Rasterize only the visible content for smooth, continuous exposure trails.
  // The actual text/button remain semantic DOM, at their original positions.
  function capture() {
    if (!ink) return;
    dirty = false;
    const bounds = content.getBoundingClientRect();
    source.width = trails.width = Math.ceil(width * ratio);
    source.height = trails.height = Math.ceil(height * ratio);
    ink.setTransform(ratio, 0, 0, ratio, 0, 0);
    const button = content.querySelector('.button');
    const box = button.getBoundingClientRect();
    ink.fillStyle = getComputedStyle(button).backgroundColor;
    ink.beginPath();
    ink.roundRect(box.left - bounds.left, box.top - bounds.top, box.width, box.height, 3);
    ink.fill();
    const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const element = node.parentElement;
      if (!node.textContent.trim() || element.closest('.sr-only, .eyebrow-sizer')) continue;
      const style = getComputedStyle(element);
      if (style.visibility === 'hidden' || style.display === 'none') continue;
      ink.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      ink.fillStyle = style.color;
      ink.textBaseline = 'alphabetic';
      const metrics = ink.measureText('Mg');
      const descent = metrics.fontBoundingBoxDescent ?? parseFloat(style.fontSize) * .22;
      let offset = 0;
      for (const letter of node.textContent) {
        range.setStart(node, offset);
        offset += letter.length;
        range.setEnd(node, offset);
        if (!letter.trim()) continue;
        const rect = range.getBoundingClientRect();
        ink.fillText(letter, rect.left - bounds.left, rect.bottom - bounds.top - descent);
      }
    }
    warp?.upload(source);
  }
  function drawTrails(p, opacity) {
    if (!ink) return;
    if (dirty) capture();
    if (warp) { warp.draw(p, opacity * smooth(clamp(p / .055))); return; }
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, trails.width, trails.height);
    if (p <= 0 || p >= 1) return;
    const strength = smooth(clamp(p / .23)) * opacity;
    const reach = .9 * smooth(clamp(p / .58));
    // Closely spaced exposures make continuous tapered streaks, rather than
    // ten distinct shrunken copies. Only this decorative trail is contracted.
    const samples = width < 600 ? 64 : 96;
    for (let i = samples; i >= 1; i--) {
      const t = i / samples;
      const scale = 1 - reach * t;
      ctx.setTransform(ratio * scale, 0, 0, ratio * scale,
        ratio * portalX * (1 - scale), ratio * portalY * (1 - scale));
      ctx.globalAlpha = strength * .024 * (1 - t * .84) * (96 / samples);
      ctx.drawImage(source, 0, 0, width, height);
    }
    ctx.globalAlpha = 1;
  }
  function measure() {
    track.dataset.suction = String(enabled());
    sceneHeight = hero.offsetHeight;
    sceneWidth = hero.offsetWidth;
    const screenHeight = Math.min(sceneHeight, innerHeight);
    pullStart = screenHeight * .5;
    // Hold the intact hero for half a screen, then preserve the full suction run.
    travel = pullStart + screenHeight * .85;
    track.style.setProperty('--scene-height', `${sceneHeight}px`);
    track.style.setProperty('--suction-travel', `${travel}px`);
    let top = 0, left = 0;
    for (let element = stage; element && element !== hero; element = element.offsetParent) {
      top += element.offsetTop;
      left += element.offsetLeft;
    }
    stageLeft = left;
    stageTop = top;
    width = stage.offsetWidth;
    height = stage.offsetHeight;
    ratio = Math.min(devicePixelRatio || 1, 1.5);
    dirty = true;
    schedule();
  }
  function update() {
    frame = 0;
    const frosted = document.documentElement.dataset.heroVariant !== 'blue';
    portalX = (frosted ? .5 : parseFloat(hero.style.getPropertyValue('--tunnel-x')) || .5) * sceneWidth - stageLeft;
    portalY = (frosted ? .48 : parseFloat(hero.style.getPropertyValue('--tunnel-y')) || .48) * sceneHeight - stageTop;
    const distance = Math.max(0, -track.getBoundingClientRect().top);
    const focused = content.querySelector(':focus-visible');
    const p = enabled() && !focused ? clamp((distance - pullStart) / Math.max(1, (travel - pullStart) * .95)) : 0;
    // Crossfade to the geometrically warped rendering without changing layout.
    const opacity = 1 - smooth(clamp((p - .64) / .36));
    const handoff = warp ? smooth(clamp(p / .055)) : 0;
    content.style.setProperty('--sink-opacity', (opacity * (1 - handoff)).toFixed(5));
    content.style.setProperty('--sink-blur', '0px');
    content.dataset.sunk = String(p >= .995);
    const pulling = String(p > 0 && p < 1);
    if (content.dataset.pulling !== pulling) content.dataset.pulling = pulling;
    drawTrails(p, opacity);
  }
  function schedule() {
    if (!frame) frame = requestAnimationFrame(update);
  }
  new MutationObserver(() => { dirty = true; schedule(); }).observe(content, { childList: true, subtree: true });
  // Follow the camera's gently moving white core while suction is visible.
  new MutationObserver(() => {
    if (content.dataset.pulling === 'true') schedule();
  }).observe(hero, { attributes: true, attributeFilter: ['style'] });
  content.addEventListener('focusin', schedule);
  content.addEventListener('focusout', schedule);
  trails.addEventListener('webglcontextlost', event => { event.preventDefault(); warp = null; schedule(); });
  trails.addEventListener('webglcontextrestored', () => { warp = createWarpRenderer(trails); dirty = true; schedule(); });
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', measure, { passive: true });
  addEventListener('pageshow', measure);
  document.addEventListener('hero-variant-change', measure);
  reduced.addEventListener('change', measure);
  forced.addEventListener('change', measure);
  new ResizeObserver(measure).observe(hero);
  new ResizeObserver(measure).observe(content);
  if (control) new MutationObserver(measure).observe(control, { attributes: true, attributeFilter: ['data-paused'] });
  document.fonts.ready.then(measure);
  measure();
})();

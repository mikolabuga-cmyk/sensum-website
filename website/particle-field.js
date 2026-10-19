/* Reference-shaped stippling. Every rendered mark is a separately displaced point. */
(() => {
  const canvas = document.querySelector('.particle-field');
  const host = document.querySelector('.hero-shell');
  const header = document.querySelector('.site-header');
  let opening = 0;
  // Start parting with the first foreground text, after its opening beat.
  const textStartsAfter = 1150;
  let introStart = performance.now(), pausedAt = null;
  const control = document.querySelector('.motion-toggle');
  if (!canvas || !host) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const forced = matchMedia('(forced-colors: active)');
  const source = new Image();
  let gl, program, buffer, uniforms, pixels;
  let resolveProgram, resolveBuffer, resolveUniforms;
  const previewSources = window.sensumPortfolioPreviews || [];
  let previewImages = [], previewTextures = [];
  let width = 0, height = 0, ratio = 1, count = 0;
  let headerClearance = 120;
  let frame = 0, previous = 0, visible = true, lost = false;
  let flowTime = 0, paintElapsed = 0;
  let x = -1000, y = -1000, tx = x, ty = y, pressure = 0, targetPressure = 0;
  let vx = 0, vy = 0, pressureVelocity = 0;
  let trailX = x, trailY = y, tailX = x, tailY = y;
  let form = 0, pendingPreview = null, settledTime = 0;
  let formationTime = 0, morphTime = 0;
  const previewMorph = 1800;
  // Start gathering gently so the image is readable around two seconds,
  // then let the last particles settle instead of snapping into a clear image.
  const previewDwell = 750, previewFormation = 1400;
  let encounterX = x, encounterY = y, lastTargetX = x, lastTargetY = y;
  const previewBag = [];
  let previewIndex = -1;
  let leanX = 0, leanY = 0;
  const selected = () => document.documentElement.dataset.heroVariant === 'frosted' && document.documentElement.dataset.heroDots !== 'hidden';
  const active = () => selected() && visible && !document.hidden && !reduced.matches && !forced.matches && control?.dataset.paused !== 'true' && !!program && !lost;
  const vertex = `
    precision highp float;
    attribute vec4 a_dot;
    uniform vec2 u_size;
    uniform vec2 u_pointer;
    uniform vec4 u_trail;
    uniform vec2 u_lean;
    uniform float u_pressure;
    uniform float u_form;
    uniform float u_headerClearance;
    uniform float u_ratio;
    uniform float u_opening;
    uniform float u_flow;
    uniform float u_motion;
    uniform float u_storyPull;
    varying float v_alpha;
    varying vec3 v_color;
    varying vec2 v_lensDirection;
    varying vec2 v_lensShape;
    varying vec2 v_previewUV;
    varying float v_previewAmount;
    float roundedBox(vec2 point, vec2 halfSize, float radius) {
      vec2 q = abs(point) - halfSize + radius;
      return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
    }
    float lightPatch(vec2 point, vec2 center, vec2 spread, float lean) {
      vec2 d = point - center;
      d.x += d.y * lean;
      d /= spread;
      return exp(-2.0 * dot(d, d));
    }
    // Compress a volume of existing marks into a softly folded cloud.
    // Retaining each mark's local coordinates preserves depth and irregular grain.
    // Compact support makes the deformation exactly neutral outside its neighborhood.
    vec3 organism(vec2 point, vec2 anchor, float reach, float phase) {
      vec2 delta = point - anchor;
      float d = length(delta);
      float q = d / reach;
      if (q >= 1.25) return vec3(0.0);
      float turn = .22 * sin(u_flow * .19 + phase) + phase * .20;
      vec2 axis = vec2(cos(turn), sin(turn));
      vec2 normal = vec2(-axis.y, axis.x);
      vec2 local = vec2(dot(delta, axis), dot(delta, normal)) / reach;
      float breath = .025 * sin(u_flow * .56 + phase);
      float fold = .16 * sin(local.x * 3.8 + u_flow * .24 + phase)
        + .055 * sin(local.y * 3.1 - u_flow * .18 + phase);
      vec2 volume = vec2(local.x * (.56 + breath)
        + .045 * sin(local.y * 3.6 + u_flow * .21 + phase),
        local.y * (.36 - breath) + fold);
      vec2 shape = (axis * volume.x + normal * volume.y) * reach;
      float influence = 1.0 - smoothstep(.12, 1.25, q);
      influence *= influence;
      return vec3((shape - delta) * influence, influence);
    }
    void main() {
      vec2 p = a_dot.xy * u_size;
      // Move the marks themselves away from the reading area as it opens.
      vec2 radial = a_dot.xy - vec2(.5, .47);
      float centerDistance = length(radial / vec2(.44, .34));
      float pull = exp(-2.0 * centerDistance * centerDistance);
      // Hold the complete field first, then part it in every direction as
      // the foreground starts appearing. Keep the movement soft and slightly asymmetric.
      p += radial * u_size * vec2(1.08, .94) * pull * u_opening * .80;
      // Coherent, opposing currents bend the stippling into slow mesh folds.
      // Anchor the perimeter and keep the same particles, avoiding grain flicker.
      vec2 uv = a_dot.xy;
      vec2 edgeDistance = min(uv, 1.0 - uv);
      float edge = smoothstep(0.0, .16, min(edgeDistance.x, edgeDistance.y));
      vec2 current = vec2(
        sin(uv.y * 7.5 + u_flow * .29) + .38 * sin(uv.x * 11.0 - u_flow * .19),
        cos(uv.x * 6.5 - u_flow * .23) + .38 * sin(uv.y * 10.0 + u_flow * .17)
      );
      float amplitude = min(38.0, min(u_size.x, u_size.y) * .055);
      // Ambient flow is already alive during the initial text-free moment.
      p += current * amplitude * edge * u_motion;
      vec2 surface = p;
      float reach = min(255.0, u_size.x * .40);
      // Keep the navigation band neutral even when a nearby hover reaches it.
      float response = clamp(u_pressure, 0.0, 1.0)
        * smoothstep(u_headerClearance, u_headerClearance + 64.0, surface.y);
      vec3 head = vec3(0.0), wake = vec3(0.0), tail = vec3(0.0);
      if (response > .0001) {
        head = organism(surface, u_pointer, reach, 0.0);
        wake = organism(surface, u_trail.xy, reach * .88, 1.8);
        tail = organism(surface, u_trail.zw, reach * .74, 3.6);
      }
      // Keep total attraction below one so overlapping clouds retain soft volume.
      vec2 gathering = head.xy * .64 + wake.xy * .23 + tail.xy * .12;
      // One softly rounded portfolio crop forms from the existing marks.
      vec2 previewSize = vec2(.62, .56);
      // Only gather dots already inside the silhouette. Never pull from the surround.
      vec2 previewDelta = surface - u_pointer;
      float sourceFocus = 1.0 - smoothstep(-.04, 0.0,
        roundedBox(previewDelta / reach, previewSize, .10));
      vec2 previewGathering = vec2(0.0);
      if (u_form > .0001) {
        // The same dots converge locally; neighboring marks retain their coverage.
        previewGathering = -previewDelta * .10 * sourceFocus;
      }
      gathering = mix(gathering, previewGathering, u_form);
      p += gathering * response;
      float life = response * max(head.z, max(wake.z * .72, tail.z * .50));
      // A broad trailing base rises into a smaller summit beside the cursor.
      // Both volumes have seamless boundaries; their asymmetry makes a soft mound.
      vec2 delta = p - u_pointer;
      float distance = length(delta);
      vec2 bodyOffset = reach * (vec2(-.13, .26) - u_lean * .18);
      vec2 bodySize = reach * vec2(.82, 1.06);
      vec2 bodyDelta = delta - bodyOffset;
      vec2 bodyUV = bodyDelta / bodySize;
      float body = max(0.0, 1.0 - dot(bodyUV, bodyUV));
      float tipReach = reach * .52;
      vec2 tipUV = delta / tipReach;
      float tip = max(0.0, 1.0 - dot(tipUV, tipUV));
      float depthResponse = response * (1.0 - .90 * u_form);
      float elevation = depthResponse * (.23 * body * body * body + .13 * tip * tip * tip);
      vec2 elevationGradient = -6.0 * depthResponse * (
        .23 * bodyDelta / (bodySize * bodySize) * body * body
        + .13 * delta / (tipReach * tipReach) * tip * tip);
      float magnification = 1.0 / (1.0 - elevation);
      p = u_pointer + delta * magnification;
      vec2 slope = elevationGradient * reach;
      vec3 surfaceNormal = normalize(vec3(-slope, 1.0));
      float surfaceLight = clamp(dot(surfaceNormal, normalize(vec3(-.45, -.60, 1.0))), 0.0, 1.0);
      // Color changes belong only to the cursor's local focus, with a feathered edge.
      float focusDistance = length(p - u_pointer) / reach;
      float movingFocus = 1.0 - smoothstep(.50, .95, focusDistance);
      vec2 previewPoint = (p - u_pointer) / reach;
      float previewDistance = roundedBox(previewPoint, previewSize, .10);
      float previewFocus = 1.0 - smoothstep(-.012, .022, previewDistance);
      life = mix(min(life, response * movingFocus), response * previewFocus * sourceFocus, u_form);
      // Preserve the original background positions and coverage outside the preview.
      float surfaceRetention = mix(1.0, sourceFocus, u_form);
      p = mix(surface, p, surfaceRetention);
      // The local projection derivative stretches each mark along the surface,
      // rather than stamping enlarged circular dots over a flat texture.
      float radialScale = magnification + dot(delta, elevationGradient)
        * magnification * magnification;
      float footprint = mix(1.0, max(magnification, radialScale), surfaceRetention);
      v_lensDirection = distance > .01 ? delta / distance : vec2(1.0, 0.0);
      v_lensShape = mix(vec2(1.0), vec2(radialScale, magnification), surfaceRetention) / footprint;
      // The lower central field stretches into the next chapter's attached
      // particle neck. Navigation and the hero's reading area stay stationary.
      float lower = smoothstep(.82,.99,uv.y)
        * (1.-smoothstep(.18,.49,abs(uv.x-.5)))*u_storyPull;
      p.x = mix(p.x,u_size.x*.5,lower*.38);
      p.y += u_size.y*.10*lower;
      gl_Position = vec4(p / u_size * vec2(2.0, -2.0) + vec2(-1.0, 1.0), 0.0, 1.0);
      gl_PointSize = a_dot.z * u_ratio * 1.16 * footprint;
      float r = length((p / u_size - vec2(.5, .47)) / vec2(.48, .38));
      float readingSpace = max(0.0, 1.0 - 1.045 * exp(-2.0 * pow(r, 4.0)));
      float previewReadability = smoothstep(.02, .60, readingSpace);
      readingSpace = mix(readingSpace, max(readingSpace, mix(.16, .36, u_form)), life);
      // Uneven, feathered pools of light interrupt the mesh's regular folds.
      // They drift with the flow and brighten the existing dots rather than
      // adding a separate, hard-edged overlay above the scene.
      vec2 lightUV = surface / u_size + current * .018 * u_motion;
      float light = .94 * lightPatch(lightUV, vec2(.14, .25), vec2(.19, .25), -.55);
      light += .66 * lightPatch(lightUV, vec2(.88, .41), vec2(.16, .30), .42);
      light += .95 * lightPatch(lightUV, vec2(.31, .83), vec2(.28, .15), -.7);
      light += .65 * lightPatch(lightUV, vec2(.79, .08), vec2(.22, .12), .25);
      float illumination = 1.0 - min(.97, light);
      // Color belongs to the particles; the surrounding surface stays white.
      float gradient = smoothstep(.42, 1.0, uv.x * .60 + uv.y * .40);
      float rightPresence = smoothstep(.64, .96, uv.x);
      gradient *= 1.0 - rightPresence * .55;
      vec3 monochrome = mix(vec3(0.0), vec3(.75), gradient);
      // Darken selected dots only; unselected particles retain their original color.
      vec2 sculpture = (p - u_pointer) / reach;
      float facing = .5 + .5 * sin(sculpture.x * 3.8 + sculpture.y * 1.4 + u_flow * .24);
      facing = mix(facing, smoothstep(.45, 1.0, surfaceLight), .70 * response);
      float sculptureTone = mix(mix(.12, .38, facing), mix(.035, .10, facing), u_form);
      v_previewUV = clamp(previewPoint / (previewSize * 2.0) + .5, 0.0, 1.0);
      // Preserve the bright reading area and soften the crop into its particle fringe.
      v_previewAmount = u_form * life * previewReadability;
      gl_PointSize = mix(gl_PointSize, 2.4 * u_ratio, v_previewAmount);
      v_color = mix(monochrome, min(monochrome, vec3(sculptureTone)), life * .95);
      float livingLight = mix(illumination, max(illumination, mix(.84, .94, u_form)), life);
      float dotInk = max(a_dot.w, u_form * life * .34);
      v_alpha = min(.97, dotInk * 1.85 * (1.0 + rightPresence * .25 + life * .65))
        * mix(1.0, readingSpace, u_opening) * livingLight;
      v_alpha = mix(v_alpha, .94, v_previewAmount);
    }
  `;
  const fragment = `
    precision mediump float;
    uniform sampler2D u_preview;
    uniform sampler2D u_nextPreview;
    uniform float u_morph;
    varying float v_alpha;
    varying vec3 v_color;
    varying vec2 v_lensDirection;
    varying vec2 v_lensShape;
    varying vec2 v_previewUV;
    varying float v_previewAmount;
    void main() {
      vec2 mark = gl_PointCoord - .5;
      // Point coordinates run top-to-bottom, matching the CSS surface axes.
      vec2 tangent = vec2(-v_lensDirection.y, v_lensDirection.x);
      float radius = length(vec2(dot(mark, v_lensDirection), dot(mark, tangent)) / max(vec2(.4), v_lensShape));
      float edge = 1.0 - smoothstep(.28, .5, radius);
      vec3 color = v_color;
      if (v_previewAmount > .001) {
        vec3 shot = texture2D(u_preview, v_previewUV).rgb;
        if (u_morph > .001) shot = mix(shot, texture2D(u_nextPreview, v_previewUV).rgb, u_morph);
        color = mix(color, shot, v_previewAmount);
      }
      gl_FragColor = vec4(color, v_alpha * edge);
    }
  `;
  // A continuous image resolves only after the dots have gathered. This removes
  // the noisy holes in UI text while retaining the animated particle fringe.
  const resolveVertex = `
    precision highp float;
    attribute vec2 a_corner;
    uniform highp vec2 u_size;
    uniform vec2 u_pointer;
    varying mediump vec2 v_uv;
    varying mediump vec2 v_position;
    void main() {
      float reach = min(255.0, u_size.x * .40);
      v_uv = a_corner * .5 + .5;
      v_position = u_pointer + a_corner * vec2(.62, .56) * reach;
      gl_Position = vec4(v_position / u_size * vec2(2.0, -2.0) + vec2(-1., 1.), 0., 1.);
    }
  `;
  const resolveFragment = `
    precision mediump float;
    uniform sampler2D u_preview;
    uniform sampler2D u_nextPreview;
    uniform float u_morph;
    uniform float u_form;
    uniform float u_pressure;
    uniform float u_headerClearance;
    uniform highp vec2 u_size;
    varying mediump vec2 v_uv;
    varying mediump vec2 v_position;
    void main() {
      vec2 q = abs(v_uv - .5) - vec2(.40);
      float boundary = length(max(q, 0.)) + min(max(q.x, q.y), 0.) - .08;
      // Only the narrow perimeter stays soft; interior pixels remain unblurred.
      float feather = 1. - smoothstep(-.025, .0, boundary);
      float r = length((v_position / u_size - vec2(.5, .47)) / vec2(.48, .38));
      float readingSpace = max(0., 1. - 1.045 * exp(-2. * pow(r, 4.)));
      float protection = smoothstep(.02, .60, readingSpace)
        * smoothstep(u_headerClearance, u_headerClearance + 64., v_position.y);
      float reveal = smoothstep(.35, .99, u_form) * clamp(u_pressure, 0., 1.);
      vec3 shot = texture2D(u_preview, v_uv).rgb;
      if (u_morph > .001) shot = mix(shot, texture2D(u_nextPreview, v_uv).rgb, u_morph);
      // Leave 20% of the underlying particle texture visible through the image.
      gl_FragColor = vec4(shot, feather * reveal * protection * .80);
    }
  `;
  function initializeResolve() {
    const vs = shader(gl.VERTEX_SHADER, resolveVertex), fs = shader(gl.FRAGMENT_SHADER, resolveFragment);
    resolveProgram = gl.createProgram();
    gl.attachShader(resolveProgram, vs); gl.attachShader(resolveProgram, fs);
    gl.bindAttribLocation(resolveProgram, 0, 'a_corner'); gl.linkProgram(resolveProgram);
    gl.deleteShader(vs); gl.deleteShader(fs);
    if (!gl.getProgramParameter(resolveProgram, gl.LINK_STATUS)) throw Error('Preview shader unavailable');
    resolveBuffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, resolveBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    resolveUniforms = Object.fromEntries(['size', 'pointer', 'preview', 'nextPreview', 'morph', 'form', 'pressure', 'headerClearance']
      .map(name => [name, gl.getUniformLocation(resolveProgram, `u_${name}`)]));
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  }
  function drawResolvedPreview(morph) {
    if (!resolveProgram || !previewImages.length || form <= .35 || pressure <= .001) return;
    gl.useProgram(resolveProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, resolveBuffer);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(resolveUniforms.size, width, height);
    gl.uniform2f(resolveUniforms.pointer, x + leanX * 12, y + leanY * 12);
    gl.uniform1i(resolveUniforms.preview, 0); gl.uniform1i(resolveUniforms.nextPreview, 1);
    gl.uniform1f(resolveUniforms.form, form); gl.uniform1f(resolveUniforms.pressure, pressure);
    gl.uniform1f(resolveUniforms.headerClearance, headerClearance); gl.uniform1f(resolveUniforms.morph, morph);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.useProgram(program); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0);
  }
  function shader(type, code) {
    const result = gl.createShader(type);
    gl.shaderSource(result, code); gl.compileShader(result);
    if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) { gl.deleteShader(result); throw Error('Particle shader unavailable'); }
    return result;
  }
  function initialize() {
    if (!pixels || program || forced.matches || !selected()) return;
    try {
      gl = canvas.getContext('webgl', { alpha: true, antialias: false, depth: false, powerPreference: 'low-power' });
      if (!gl) return;
      const vs = shader(gl.VERTEX_SHADER, vertex), fs = shader(gl.FRAGMENT_SHADER, fragment);
      program = gl.createProgram();
      gl.attachShader(program, vs); gl.attachShader(program, fs);
      gl.bindAttribLocation(program, 0, 'a_dot'); gl.linkProgram(program);
      gl.deleteShader(vs); gl.deleteShader(fs);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error('Particle program unavailable');
      gl.useProgram(program);
      buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0);
      uniforms = Object.fromEntries(['size', 'pointer', 'trail', 'lean', 'pressure', 'form', 'preview', 'nextPreview', 'morph', 'headerClearance', 'ratio', 'opening', 'flow', 'motion', 'storyPull'].map(name => [name, gl.getUniformLocation(program, `u_${name}`)]));
      gl.enable(gl.BLEND); gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.clearColor(0, 0, 0, 0);
      uploadPreviews();
      initializeResolve();
      fit();
    } catch {
      if (program) gl.deleteProgram(program);
      program = null; canvas.dataset.ready = 'false';
    }
  }
  function uploadPreviews() {
    if (!program || lost) return;
    previewTextures.forEach(texture => gl.deleteTexture(texture));
    previewTextures = (previewImages.length ? previewImages : [null]).map(image => {
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      if (image) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255,255,255,255]));
      return texture;
    });
  }
  const imageLoads = new Map();
  function loadPreview(item) {
    if (!imageLoads.has(item.src)) imageLoads.set(item.src, new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image); image.onerror = reject; image.src = item.src;
    }));
    return imageLoads.get(item.src).then(image => {
      const tile = document.createElement('canvas');
      const crop = item.crop || [0, 0, 1, 1];
      // Retain native crop detail and aspect ratio, without an extra square resample.
      const scale = Math.min(1, 1024 / Math.max(crop[2]*image.naturalWidth, crop[3]*image.naturalHeight));
      tile.width = Math.max(1, Math.round(crop[2]*image.naturalWidth*scale));
      tile.height = Math.max(1, Math.round(crop[3]*image.naturalHeight*scale));
      const ctx = tile.getContext('2d');
      ctx.drawImage(image, crop[0]*image.naturalWidth, crop[1]*image.naturalHeight,
        crop[2]*image.naturalWidth, crop[3]*image.naturalHeight, 0, 0, tile.width, tile.height);
      return tile;
    });
  }
  Promise.allSettled(previewSources.map(loadPreview)).then(results => {
    previewImages = results.filter(result => result.status === 'fulfilled').map(result => result.value);
    previewBag.length = 0; previewIndex = -1; pendingPreview = null;
    uploadPreviews();
    if (targetPressure > 0) choosePreview();
    schedule();
  });
  function fit() {
    if (!program || lost) return;
    const bounds = host.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    width = bounds.width; height = bounds.height;
    headerClearance = (header?.getBoundingClientRect().height || 96) + 24;
    ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    gl.viewport(0, 0, canvas.width, canvas.height);
    // Seeded marks move together through the field; never regenerate per frame.
    let seed = 71627;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    count = Math.min(1250000, Math.ceil(width * height * 1.2));
    const dots = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      const px = random(), verticalSample = random();
      // Move more marks downward, with an extra gradual thinning toward the upper left.
      // Inverting this normalized density ramp preserves the total particle count.
      const topDensity = .32 - .20 * Math.exp(-Math.pow(px / .40, 2));
      const bottomBias = 1 - topDensity;
      const py = (Math.sqrt(topDensity * topDensity + 4 * bottomBias * verticalSample)
        - topDensity) / (2 * bottomBias);
      const sample = (Math.min(175, Math.floor(py * 176)) * 256 + Math.min(255, Math.floor(px * 256))) * 4;
      const density = 1 - pixels[sample] / 255;
      dots[i * 4] = px; dots[i * 4 + 1] = py;
      dots[i * 4 + 2] = .45 + random() * .5;
      dots[i * 4 + 3] = Math.min(.75, density * 2.4) * (.6 + random() * .65);
    }
    gl.bufferData(gl.ARRAY_BUFFER, dots, gl.STATIC_DRAW);
    draw();
  }
  function draw() {
    if (!program || lost) return;
    const elapsed = (pausedAt ?? performance.now()) - introStart;
    const progress = reduced.matches ? 1 : Math.max(0, Math.min(1, (elapsed - textStartsAfter) / 900));
    opening = progress * progress * (3 - 2 * progress);
    gl.uniform1f(uniforms.opening, opening);
    gl.uniform1f(uniforms.flow, flowTime);
    gl.uniform1f(uniforms.motion, reduced.matches ? 0 : 1);
    gl.uniform1f(uniforms.storyPull,active() ? Number(host.style.getPropertyValue('--story-pull') || 0) : 0);
    gl.uniform2f(uniforms.size, width, height);
    gl.uniform2f(uniforms.pointer, x + leanX * 12, y + leanY * 12);
    gl.uniform2f(uniforms.lean, leanX, leanY);
    gl.uniform4f(uniforms.trail, trailX, trailY, tailX, tailY);
    gl.uniform1f(uniforms.form, previewImages.length ? form : 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, previewTextures[Math.max(0, previewIndex)]);
    gl.uniform1i(uniforms.preview, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, previewTextures[Math.max(0, pendingPreview ?? previewIndex)]);
    gl.uniform1i(uniforms.nextPreview, 1);
    gl.uniform1f(uniforms.headerClearance, headerClearance);
    const morphProgress = Math.min(1, morphTime / previewMorph);
    gl.uniform1f(uniforms.morph, morphProgress * morphProgress * (3 - 2 * morphProgress));
    gl.uniform1f(uniforms.pressure, pressure); gl.uniform1f(uniforms.ratio, ratio);
    gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.POINTS, 0, count);
    drawResolvedPreview(morphProgress * morphProgress * (3 - 2 * morphProgress));
    canvas.dataset.ready = 'true';
  }
  function tick(now) {
    frame = 0;
    if (!active()) { previous = 0; return; }
    const dt = previous ? Math.min(now - previous, 50) : 16;
    previous = now;
    // Small integration steps keep the damped spring stable at any refresh rate.
    const steps = Math.ceil(dt / 8);
    const step = dt / steps / 1000;
    for (let i = 0; i < steps; i++) {
      vx += ((tx - x) * 230 - vx * 29) * step;
      vy += ((ty - y) * 230 - vy * 29) * step;
      x += vx * step; y += vy * step;
      // A bounded directional lean makes the summit reach gently into the gesture.
      const speed = Math.hypot(vx, vy), leanScale = targetPressure / Math.max(350, speed);
      const leanEase = 1 - Math.exp(-step * 5);
      leanX += (vx * leanScale - leanX) * leanEase;
      leanY += (vy * leanScale - leanY) * leanEase;
      // Two slower followers leave a coherent, dissolving trail after a gesture.
      const trailEase = 1 - Math.exp(-step * 3.2);
      const tailEase = 1 - Math.exp(-step * 1.8);
      trailX += (x - trailX) * trailEase; trailY += (y - trailY) * trailEase;
      tailX += (trailX - tailX) * tailEase; tailY += (trailY - tailY) * tailEase;
      pressureVelocity += ((targetPressure - pressure) * 180 - pressureVelocity * 22) * step;
      pressure += pressureVelocity * step;
    }
    if (Math.abs(pressure - targetPressure) < .0001 && Math.abs(pressureVelocity) < .001) {
      pressure = targetPressure; pressureVelocity = 0;
    }
    const settled = targetPressure > 0 && Math.hypot(vx, vy) < 35 && Math.hypot(tx-x, ty-y) < 4;
    settledTime = settled ? settledTime + dt : 0;
    if (!settled) formationTime = 0;
    if (settledTime >= previewDwell && pendingPreview === null && Math.hypot(tx-encounterX, ty-encounterY) > 72) {
      choosePreview(); encounterX = tx; encounterY = ty;
    }
    // Hold one preview until a new hover encounter; retain the original gathering beat.
    if (settledTime >= previewDwell) formationTime += dt;
    const formationProgress = Math.min(1, formationTime/previewFormation);
    const formTarget = targetPressure > 0
      ? formationProgress*formationProgress*(3-2*formationProgress) : 0;
    form += (formTarget-form) * (1-Math.exp(-dt/1000*(formTarget > form ? 6 : 5)));
    if (Math.abs(formTarget-form) < .0001) form = formTarget;
    if (pendingPreview !== null) {
      morphTime += dt;
      if (morphTime >= previewMorph || form < .015) {
        previewIndex = pendingPreview; pendingPreview = null; morphTime = 0;
      }
    }
    const interacting = Math.abs(tx - x) + Math.abs(ty - y) > .1
      || Math.abs(formTarget-form) > .0001 || pendingPreview !== null
      || Math.abs(leanX) + Math.abs(leanY) > .002
      || (pressure > .01 && Math.abs(x - tailX) + Math.abs(y - tailY) > .5)
      || Math.abs(vx) + Math.abs(vy) > .5
      || Math.abs(targetPressure - pressure) > .0001 || Math.abs(pressureVelocity) > .001;
    flowTime += dt / 1000;
    paintElapsed += dt;
    // 30 fps for quiet ambient motion; full refresh while the cursor interacts.
    if (interacting || opening < 1 || paintElapsed >= 32) {
      draw();
      paintElapsed = 0;
    }
    frame = requestAnimationFrame(tick);
  }
  function schedule() { if (!frame && active()) frame = requestAnimationFrame(tick); }
  function choosePreview() {
    if (!previewImages.length) return;
    if (!previewBag.length) {
      previewBag.push(...previewImages.map((_, index) => index));
      for (let i=previewBag.length-1; i>0; i--) {
        const j=Math.floor(Math.random()*(i+1));
        [previewBag[i], previewBag[j]]=[previewBag[j], previewBag[i]];
      }
      if (previewBag.at(-1) === previewIndex) [previewBag[0], previewBag[previewBag.length-1]]=[previewBag[previewBag.length-1], previewBag[0]];
    }
    const next = previewBag.pop();
    morphTime = 0;
    if (form < .015 || pressure < .01) { previewIndex = next; pendingPreview = null; }
    else pendingPreview = next;
  }
  function leave() { targetPressure = 0; settledTime = formationTime = 0; schedule(); }
  document.addEventListener('pointermove', event => {
    if (!active() || !fine.matches || event.pointerType === 'touch') return;
    if (event.target instanceof Element && event.target.closest('.header-chrome, .site-header, a, button, summary, input, select, textarea')) { leave(); return; }
    const r = host.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) { leave(); return; }
    if (event.clientY - r.top <= headerClearance) { leave(); return; }
    tx = event.clientX - r.left; ty = event.clientY - r.top;
    if (Math.hypot(tx-lastTargetX, ty-lastTargetY) > 2) settledTime = formationTime = 0;
    lastTargetX = tx; lastTargetY = ty;
    if (targetPressure === 0) { choosePreview(); encounterX = tx; encounterY = ty; }
    if (Math.abs(pressure) < .001 && targetPressure === 0) {
      x = trailX = tailX = tx; y = trailY = tailY = ty; vx = vy = 0;
      form = settledTime = formationTime = 0;
      leanX = leanY = 0;
    }
    targetPressure = 1; schedule();
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', leave);
  host.addEventListener('pointerleave', leave);
  window.addEventListener('blur', leave);
  window.addEventListener('scroll', leave, { passive: true });
  function sync() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0; previous = 0;
    if (control?.dataset.paused === 'true') pausedAt ??= performance.now();
    else if (pausedAt !== null) { introStart += performance.now() - pausedAt; pausedAt = null; }
    initialize();
    draw();
    if (reduced.matches || !fine.matches || !selected() || !visible || document.hidden) { pressure = targetPressure = pressureVelocity = vx = vy = form = settledTime = formationTime = leanX = leanY = 0; pendingPreview = null; morphTime = 0; draw(); }
    schedule();
  }
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); lost = true; canvas.dataset.ready = 'false'; sync(); });
  canvas.addEventListener('webglcontextrestored', () => { lost = false; program = null; sync(); });
  new ResizeObserver(fit).observe(host);
  if (header) new ResizeObserver(fit).observe(header);
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }).observe(host);
  if (control) new MutationObserver(sync).observe(control, { attributes: true, attributeFilter: ['data-paused'] });
  document.addEventListener('hero-variant-change', () => {
    introStart = performance.now(); pausedAt = null;
    sync();
  });
  document.addEventListener('hero-dots-change', sync);
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', sync); fine.addEventListener('change', sync); forced.addEventListener('change', sync);
  source.onload = () => {
    const map = document.createElement('canvas'); map.width = 256; map.height = 176;
    const ctx = map.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(source, 0, 0, 256, 176);
    pixels = ctx.getImageData(0, 0, 256, 176).data;
    sync();
  };
  source.src = 'assets/backgrounds/particle-field-reference.png';
})();

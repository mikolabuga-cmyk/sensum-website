/* Original, texture-free Sensum mesh. The CSS field remains underneath as
   the no-script, reduced-motion, unsupported-GPU, and context-loss fallback. */
(() => {
  const canvas = document.querySelector('.hero-mesh');
  const shell = document.querySelector('.hero-shell');
  const motionButton = document.querySelector('.motion-toggle');
  if (!canvas || !shell || !motionButton) return;
  const stationary = canvas.dataset.stationary === 'true';

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const forcedColors = matchMedia('(forced-colors: active)');
  const vertexSource = `
    attribute vec2 a_position;
    varying vec2 v_uv;
    void main() {
      v_uv = a_position * 0.5 + 0.5;
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;
  const fragmentSource = `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
      precision highp float;
    #else
      precision mediump float;
    #endif
    varying vec2 v_uv;
    uniform vec2 u_resolution;
    uniform vec2 u_cssResolution;
    uniform vec2 u_pointer;
    uniform vec2 u_camera;
    uniform float u_time;
    uniform float u_hover;
    uniform sampler2D u_flow;

    vec2 flowAt(vec2 uv) {
      vec4 encoded = texture2D(u_flow, clamp(uv, 0.0, 1.0));
      return (vec2(dot(encoded.rg, vec2(65280.0, 255.0)),
                   dot(encoded.ba, vec2(65280.0, 255.0))) - 32768.0) / 32767.0 * 0.18;
    }

    float pool(vec2 p, vec2 center, vec2 scale) {
      vec2 d = (p - center) / scale;
      return exp(-dot(d, d) * 2.0);
    }

    float random(vec2 cell) {
      return fract(sin(dot(cell, vec2(127.1, 311.7))) * 43758.5453);
    }

    vec2 vanishingPoint() {
      return vec2(0.5, 0.48);
    }

    // Reproject the whole scene through a gently steered camera ray.
    // Procedural colors extend past the viewport, so yaw/pitch expose no edges.
    vec2 cameraUV(vec2 uv, float aspect) {
      vec2 metric = vec2(aspect, 1.0);
      vec3 ray = vec3((uv - vanishingPoint()) * metric, 1.3);
      float yaw = -u_camera.x * 0.065 * min(aspect, 1.0);
      float pitch = -u_camera.y * 0.050;
      ray = vec3(ray.x * cos(yaw) + ray.z * sin(yaw), ray.y,
                 ray.z * cos(yaw) - ray.x * sin(yaw));
      ray = vec3(ray.x, ray.y * cos(pitch) + ray.z * sin(pitch),
                 ray.z * cos(pitch) - ray.y * sin(pitch));
      return vanishingPoint() + ray.xy / ray.z * 1.3 / metric;
    }

    // Periodic angular noise has no seam where atan wraps. The tunnel wall is
    // sampled at inverse radius (perspective depth), then the camera advances
    // along it. Highlights accelerate outward instead of sliding sideways.
    float tunnelNoise(vec2 p, float circumference) {
      vec2 cell = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float a = random(vec2(mod(cell.x, circumference), cell.y));
      float b = random(vec2(mod(cell.x + 1.0, circumference), cell.y));
      float c = random(vec2(mod(cell.x, circumference), cell.y + 1.0));
      float d = random(vec2(mod(cell.x + 1.0, circumference), cell.y + 1.0));
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }

    vec3 lightTunnel(vec3 mesh, vec2 uv, float aspect) {
      vec2 delta = (uv - vanishingPoint()) * vec2(aspect, 1.0);
      float radius = length(delta);
      float angle = atan(delta.y, delta.x + 0.00001) / 6.283185 + 0.5;
      float depth = 0.58 / (radius + 0.065);
      float travel = depth + u_time * 0.72;
      float broad = tunnelNoise(vec2(angle * 18.0, travel * 0.62), 18.0);
      float fine = tunnelNoise(vec2(angle * 80.0, travel * 0.85 + 13.0), 80.0);
      float mist = tunnelNoise(vec2(angle * 7.0, travel * 0.32 + 29.0), 7.0);
      float opening = smoothstep(0.045, 0.32, radius);
      // Broad translucent folds carry the existing blue mesh into a funnel.
      // Fine highlights stay soft; no hard spokes or flashing rings.
      vec3 blue = mix(vec3(0.14, 0.43, 0.84), vec3(0.45, 0.74, 0.97), mist);
      vec3 color = mix(mesh, blue, opening * (0.20 + (1.0 - broad) * 0.27));
      float ribbons = smoothstep(0.38, 0.85, broad) * 0.48;
      float threads = smoothstep(0.62, 0.91, fine) * 0.27;
      color = mix(color, vec3(0.93, 0.98, 1.0), (ribbons + threads) * opening);
      float halo = exp(-radius * radius / 0.105);
      float core = exp(-radius * radius / 0.012);
      color = mix(color, vec3(0.995, 0.998, 1.0), clamp(halo * 0.91 + core * 0.22, 0.0, 1.0));
      return color;
    }

    // A flowing halftone surface: rounded dots grow through soft folds,
    // with an open light band around the content. No flying star streaks.
    float halftoneDots(vec2 uv) {
      vec2 warped = uv;
      warped.x += sin(uv.y * 6.3 + u_time * .18) * .023;
      warped.y += sin(uv.x * 7.0 - u_time * .15) * .018;
      vec2 pixels = warped * u_cssResolution;
      vec2 rotated = mat2(.966, -.259, .259, .966) * pixels;
      vec2 grid = rotated / 6.2;
      grid.y /= .8660254;
      float row = floor(grid.y);
      grid.x += mod(row, 2.0) * .5;
      vec2 local = fract(grid) - .5;
      local.y *= .8660254;

      vec2 field = warped;
      field.x += sin(field.y * 5.0 - u_time * .12) * .08;
      float upper = pool(field, vec2(.80, .13), vec2(.70, .62));
      float lower = pool(field, vec2(-.04, .96), vec2(.65, .52));
      float right = pool(field, vec2(1.13, .72), vec2(.35, .52));
      float density = clamp(upper + lower + right * .45, 0.0, 1.0);
      float quiet = pool(uv, vec2(.5, .47), vec2(.53, .39));
      float radius = (.075 + density * .35) * (1.0 - quiet * .90);
      float aa = .65 / 6.2;
      float shape = 1.0 - smoothstep(max(0.0, radius - aa), radius + aa, length(local));
      float headerSpace = mix(.35, 1.0, smoothstep(.04, .17, uv.y));
      return shape * (.20 + density * .58) * (1.0 - quiet * .95) * headerSpace;
    }

    vec3 meshColor(vec2 uv, float t) {
      // An uninterrupted blue field: airy sky, azure, and contained cobalt depth.
      vec2 p = uv;
      p.x += sin(p.y * 3.6 + t * 0.5) * 0.085;
      p.y += sin(p.x * 4.2 - t * 0.4) * 0.065;
      vec3 color = vec3(0.40, 0.68, 0.96);
      float azure = pool(p, vec2(-0.02 + sin(t * 0.45) * 0.10, 0.52), vec2(0.64, 0.61));
      float cobalt = pool(p, vec2(0.20 + sin(t * 0.35) * 0.10, 1.04), vec2(0.86, 0.63));
      float blue = pool(p, vec2(1.05, 0.73 + cos(t * 0.4) * 0.07), vec2(0.52, 0.78));
      color = mix(color, vec3(0.04, 0.54, 0.95), azure * 0.78);
      color = mix(color, vec3(0.12, 0.25, 0.75), cobalt * 0.94);
      color = mix(color, vec3(0.06, 0.36, 0.91), blue * 0.90);

      float readingArea = pool(uv, vec2(0.5, 0.46), vec2(0.68, 0.56));
      color = mix(color, vec3(0.58, 0.79, 0.98), readingArea * 0.46);

      // White is a pigment in the mesh itself, independent of hover lighting.
      // Coupled waves stretch unequal pools into merging, irregular soft shapes.
      vec2 whiteUV = p;
      whiteUV.x += sin(p.y * 6.4 - t * 0.38) * 0.10 + cos(p.y * 10.0 + t * 0.27) * 0.035;
      whiteUV.y += sin(p.x * 7.2 + t * 0.32) * 0.08;
      float whiteTop = pool(whiteUV, vec2(-0.02 + sin(t * 0.3) * 0.06, 0.07), vec2(0.46, 0.35));
      float whiteCrest = pool(whiteUV, vec2(0.76 + cos(t * 0.37) * 0.07, 0.15), vec2(0.36, 0.31));
      float whiteMiddle = pool(whiteUV, vec2(0.48 + sin(t * 0.41) * 0.08, 0.47 + cos(t * 0.29) * 0.06), vec2(0.19, 0.31));
      float whiteLower = pool(whiteUV, vec2(0.72 + cos(t * 0.28) * 0.08, 0.82), vec2(0.32, 0.35));
      float whiteEdge = pool(whiteUV, vec2(-0.08, 0.70 + sin(t * 0.33) * 0.09), vec2(0.28, 0.35));
      float whiteMesh = whiteTop + whiteCrest + whiteMiddle * 0.90 + whiteLower + whiteEdge * 0.90;
      color = mix(color, vec3(0.995, 0.997, 1.0), smoothstep(0.10, 0.96, whiteMesh) * 0.91);
      return color;
    }

    void main() {
      vec2 uv = vec2(v_uv.x, 1.0 - v_uv.y);
      float aspect = u_resolution.x / u_resolution.y;
      float t = u_time * 0.07; // Quiet pigment drift lets forward travel lead.
      // Advected displacement carries the existing image with the gesture.
      // No radial waves: a broad, viscous pull softly relaxes back into the mesh.
      vec2 metric = vec2(aspect, 1.0);
      vec2 flow = flowAt(uv);
      vec2 refractedUV = cameraUV(uv - flow / metric, aspect);
      vec3 color = lightTunnel(meshColor(refractedUV, t), refractedUV, aspect);
      vec2 stepUV = vec2(0.008 / aspect, 0.008);
      vec2 slope = vec2(
        length(flowAt(uv + vec2(stepUV.x, 0.0))) - length(flowAt(uv - vec2(stepUV.x, 0.0))),
        length(flowAt(uv + vec2(0.0, stepUV.y))) - length(flowAt(uv - vec2(0.0, stepUV.y)))
      );
      float light = dot(slope, vec2(-0.6, -0.8)) * 9.0;
      color = mix(color, vec3(0.99, 0.997, 1.0), clamp(light, 0.0, 0.13));
      color = mix(color, vec3(0.30, 0.52, 0.76), clamp(-light, 0.0, 0.06));
      float dots = halftoneDots(refractedUV);
      color = mix(color, vec3(.055, .22, .36), dots);
      gl_FragColor = vec4(color, 1.0);
    }
  `;

  let gl = null;
  let resources = null;
  let frame = 0;
  let previousTime = 0;
  let time = 0;
  let inView = true;
  let userPaused = false;
  let lost = false;
  let unavailable = false;
  let resizeNeeded = true;
  let maxSize = 4096;
  const pointer = { x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5, hover: 0, targetHover: 0 };
  const camera = { x: 0, y: 0 };
  const flowWidth = 96;
  const flowHeight = 64;
  let flow = new Float32Array(flowWidth * flowHeight * 2);
  let nextFlow = new Float32Array(flow.length);
  const flowPixels = new Uint8Array(flowWidth * flowHeight * 4);
  let flowEnergy = 0;
  let lastFlowX = 0.5;
  let lastFlowY = 0.5;

  // A small semi-Lagrangian field: transport, diffuse, gently decay, then
  // inject a swept Gaussian brush. CPU floats + packed 16-bit texture avoid
  // float-texture extensions and visible quantization during the long release.
  function updateFlow(dt) {
    const aspect = canvas.width / Math.max(1, canvas.height);
    let dx = (pointer.x - lastFlowX) * aspect;
    let dy = pointer.y - lastFlowY;
    const distance = Math.hypot(dx, dy);
    const limit = Math.min(1, 0.045 / Math.max(distance, 0.00001));
    dx *= limit;
    dy *= limit;
    const inject = pointer.targetHover && dt > 0;
    const decay = Math.exp(-dt * 1.45);
    const diffusion = 1 - Math.exp(-dt * 3.0);
    const segmentX = (pointer.x - lastFlowX) * aspect;
    const segmentY = pointer.y - lastFlowY;
    const segmentLength = segmentX * segmentX + segmentY * segmentY;
    let energy = 0;
    for (let y = 0; y < flowHeight; y++) {
      for (let x = 0; x < flowWidth; x++) {
        const i = (y * flowWidth + x) * 2;
        const sx = Math.max(0, Math.min(flowWidth - 1.001, x - flow[i] / aspect * dt * 1.8 * flowWidth));
        const sy = Math.max(0, Math.min(flowHeight - 1.001, y - flow[i + 1] * dt * 1.8 * flowHeight));
        const ix = Math.floor(sx), iy = Math.floor(sy);
        const fx = sx - ix, fy = sy - iy;
        const j = (iy * flowWidth + ix) * 2;
        const px = (x / (flowWidth - 1) - lastFlowX) * aspect;
        const py = y / (flowHeight - 1) - lastFlowY;
        const along = Math.max(0, Math.min(1, (px * segmentX + py * segmentY) / Math.max(segmentLength, 0.000001)));
        const bx = px - segmentX * along, by = py - segmentY * along;
        const brush = inject ? Math.exp(-(bx * bx + by * by) / 0.022) : 0;
        for (let c = 0; c < 2; c++) {
          const top = flow[j + c] * (1 - fx) + flow[j + 2 + c] * fx;
          const bottom = flow[j + flowWidth * 2 + c] * (1 - fx) + flow[j + flowWidth * 2 + 2 + c] * fx;
          const advected = top * (1 - fy) + bottom * fy;
          const average = (flow[(y * flowWidth + Math.max(0, x - 1)) * 2 + c]
            + flow[(y * flowWidth + Math.min(flowWidth - 1, x + 1)) * 2 + c]
            + flow[(Math.max(0, y - 1) * flowWidth + x) * 2 + c]
            + flow[(Math.min(flowHeight - 1, y + 1) * flowWidth + x) * 2 + c]) * 0.25;
          const value = (advected * (1 - diffusion) + average * diffusion) * decay
            + (c === 0 ? dx : dy) * brush * 1.15;
          nextFlow[i + c] = Math.max(-0.16, Math.min(0.16, value));
          energy = Math.max(energy, Math.abs(nextFlow[i + c]));
          const packed = Math.round(32768 + nextFlow[i + c] / 0.18 * 32767);
          flowPixels[(i / 2) * 4 + c * 2] = packed >> 8;
          flowPixels[(i / 2) * 4 + c * 2 + 1] = packed & 255;
        }
      }
    }
    [flow, nextFlow] = [nextFlow, flow];
    flowEnergy = energy;
    lastFlowX = pointer.x;
    lastFlowY = pointer.y;
  }
  let pointerEntered = false;

  function state(value) {
    canvas.dataset.meshState = value;
  }

  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    previousTime = 0;
  }

  function release() {
    if (!gl || !resources) return;
    gl.deleteBuffer(resources.buffer);
    gl.deleteTexture(resources.flowTexture);
    gl.deleteProgram(resources.program);
    resources = null;
  }

  function compile(type, source) {
    const shader = gl.createShader(type);
    if (!shader) throw new Error('Shader allocation failed');
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      throw new Error('Mesh shader compilation failed');
    }
    return shader;
  }

  function initialize() {
    if (resources) return true;
    let vertex;
    let fragment;
    let program;
    let buffer;
    let flowTexture;
    try {
      gl = canvas.getContext('webgl', {
        alpha: true, antialias: false, depth: false, stencil: false,
        preserveDrawingBuffer: false, powerPreference: 'low-power'
      });
      if (!gl) throw new Error('WebGL unavailable');
      vertex = compile(gl.VERTEX_SHADER, vertexSource);
      fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
      program = gl.createProgram();
      if (!program) throw new Error('Program allocation failed');
      gl.attachShader(program, vertex);
      gl.attachShader(program, fragment);
      gl.bindAttribLocation(program, 0, 'a_position');
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Mesh link failed');
      gl.useProgram(program);
      buffer = gl.createBuffer();
      if (!buffer) throw new Error('Buffer allocation failed');
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      flowTexture = gl.createTexture();
      if (!flowTexture) throw new Error('Flow texture allocation failed');
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, flowTexture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      updateFlow(0);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, flowWidth, flowHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, flowPixels);
      gl.uniform1i(gl.getUniformLocation(program, 'u_flow'), 0);
      resources = {
        program, buffer, flowTexture,
        resolution: gl.getUniformLocation(program, 'u_resolution'),
        cssResolution: gl.getUniformLocation(program, 'u_cssResolution'),
        pointer: gl.getUniformLocation(program, 'u_pointer'),
        camera: gl.getUniformLocation(program, 'u_camera'),
        time: gl.getUniformLocation(program, 'u_time'),
        hover: gl.getUniformLocation(program, 'u_hover')
      };
      maxSize = Math.min(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE), 4096);
      resizeNeeded = true;
      return true;
    } catch {
      if (gl && flowTexture) gl.deleteTexture(flowTexture);
      if (gl && buffer) gl.deleteBuffer(buffer);
      if (gl && program) gl.deleteProgram(program);
      resources = null;
      unavailable = true;
      canvas.dataset.ready = 'false';
      return false;
    } finally {
      if (gl && vertex) gl.deleteShader(vertex);
      if (gl && fragment) gl.deleteShader(fragment);
    }
  }

  function resize() {
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    const pixelBudget = width < 768 ? 700000 : 1400000;
    const ratio = Math.min(devicePixelRatio || 1, 1.5, Math.sqrt(pixelBudget / (width * height)), maxSize / width, maxSize / height);
    canvas.width = Math.max(1, Math.round(width * ratio));
    canvas.height = Math.max(1, Math.round(height * ratio));
    gl.viewport(0, 0, canvas.width, canvas.height);
    resizeNeeded = false;
  }

  function draw() {
    if (!resources || lost) return;
    if (resizeNeeded) resize();
    gl.uniform2f(resources.resolution, canvas.width, canvas.height);
    gl.uniform2f(resources.cssResolution, canvas.clientWidth, canvas.clientHeight);
    gl.uniform2f(resources.pointer, pointer.x, pointer.y);
    gl.uniform2f(resources.camera, camera.x, camera.y);
    // Share the projected white core with the content's scroll-collapse origin.
    const aspect = canvas.width / canvas.height;
    const yaw = -camera.x * .065 * Math.min(aspect, 1);
    const pitch = -camera.y * .050;
    canvas.parentElement.style.setProperty('--tunnel-x', (.5 - 1.3 * Math.tan(yaw) / aspect).toFixed(5));
    canvas.parentElement.style.setProperty('--tunnel-y', (.48 - 1.3 * Math.tan(pitch) / Math.cos(yaw)).toFixed(5));
    gl.uniform1f(resources.time, time);
    gl.uniform1f(resources.hover, pointer.hover);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, flowWidth, flowHeight, gl.RGBA, gl.UNSIGNED_BYTE, flowPixels);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (canvas.dataset.ready !== 'true') canvas.dataset.ready = 'true';
  }

  function tick(now) {
    frame = 0;
    // Forward flight stays smooth at 60 fps, including when the pointer rests.
    const interval = 15;
    if (!previousTime || now - previousTime >= interval) {
      const dt = previousTime ? Math.min((now - previousTime) / 1000, 0.08) : 0;
      previousTime = now;
      time += dt;
      const ease = 1 - Math.exp(-dt * 10);
      pointer.x += (pointer.targetX - pointer.x) * ease;
      pointer.y += (pointer.targetY - pointer.y) * ease;
      pointer.hover += (pointer.targetHover - pointer.hover) * ease;
      // Separate, slower damping lets the camera glide while liquid tracks
      // the gesture. Leaving targets neutral without injecting a fake stroke.
      const cameraEase = 1 - Math.exp(-dt * 3.5);
      const cameraX = pointer.targetHover ? (pointer.targetX - 0.5) * 2 : 0;
      const cameraY = pointer.targetHover ? (pointer.targetY - 0.5) * 2 : 0;
      camera.x += (cameraX - camera.x) * cameraEase;
      camera.y += (cameraY - camera.y) * cameraEase;
      updateFlow(dt);
      draw();
    }
    frame = requestAnimationFrame(tick);
  }

  function sync() {
    stop();
    const staticPreference = reducedMotion.matches || forcedColors.matches;
    motionButton.hidden = staticPreference || unavailable || lost;
    if (staticPreference || unavailable || lost) {
      canvas.dataset.ready = 'false';
      state(staticPreference ? 'static' : 'fallback');
      return;
    }
    if (document.documentElement.dataset.heroVariant !== 'blue') {
      state('variant-hidden');
      return;
    }
    if (document.hidden || !inView) {
      state('suspended');
      return;
    }
    if (!initialize()) {
      motionButton.hidden = true;
      state('fallback');
      return;
    }
    motionButton.hidden = false;
    if (userPaused || stationary) {
      draw();
      gl.flush();
      state(stationary ? 'stationary' : 'paused');
      return;
    }
    state('running');
    frame = requestAnimationFrame(tick);
  }

  function queueResize() {
    resizeNeeded = true;
    if ((userPaused || stationary) && resources && !lost && !reducedMotion.matches && !forcedColors.matches && inView && !document.hidden) {
      draw();
      gl.flush();
    }
  }

  shell.addEventListener('pointermove', event => {
    if (document.documentElement.dataset.heroVariant !== 'blue') return;
    if (stationary || event.pointerType === 'touch' || reducedMotion.matches || userPaused) return;
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    pointer.targetX = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
    pointer.targetY = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
    if (!pointerEntered) {
      // Avoid a fabricated trail from the center on first entry.
      pointer.x = lastFlowX = pointer.targetX;
      pointer.y = lastFlowY = pointer.targetY;
      pointerEntered = true;
    }
    pointer.targetHover = 1;
  }, { passive: true });

  shell.addEventListener('pointerleave', () => {
    pointer.targetHover = 0;
    pointerEntered = false;
  }, { passive: true });

  motionButton.addEventListener('click', () => {
    userPaused = !userPaused;
    motionButton.dataset.paused = String(userPaused);
    const label = userPaused ? 'Resume animations' : 'Pause animations';
    motionButton.setAttribute('aria-label', label);
    motionButton.title = label;
    sync();
  });

  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    lost = true;
    resources = null;
    sync();
  });
  canvas.addEventListener('webglcontextrestored', () => {
    lost = false;
    unavailable = false;
    sync();
  });
  reducedMotion.addEventListener('change', sync);
  forcedColors.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('resize', queueResize, { passive: true });
  window.addEventListener('pagehide', event => {
    stop();
    if (!event.persisted) release();
  });
  window.addEventListener('pageshow', sync);
  document.addEventListener('hero-variant-change', sync);
  const resizeObserver = new ResizeObserver(queueResize);
  resizeObserver.observe(canvas);
  const visibilityObserver = new IntersectionObserver(entries => {
    inView = entries[0].isIntersecting;
    sync();
  });
  visibilityObserver.observe(canvas);
  sync();
})();

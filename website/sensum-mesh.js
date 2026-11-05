(() => {
  const stage = document.querySelector('main');
  const heading = stage.querySelector('h1');
  const canvas = stage.querySelector('canvas');
  const ring = stage.querySelector('.ring');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false });
  if (!gl) return;

  const vertex = `
    attribute vec2 home;
    attribute vec4 grain; // diameter, brightness, depth, random phase
    attribute vec3 tint;
    uniform vec2 viewport;
    uniform float ratio, time, entrance, radius, wordHeight;
    uniform vec3 cursor; // stage coordinates and eased repulsion strength
    uniform vec2 tilt;
    varying vec3 color;
    varying float energy;
    void main() {
      float delay = grain.w * .26;
      float rise = 1. - smoothstep(delay, 1., entrance);
      float phase = grain.w * 62.83;
      vec2 position = home;
      float depth = grain.z;
      float visibility = 1.;
      if (depth > .5) {
        // Each mote leaves its own contour point, spreads, then fades before recycling.
        float age = fract(grain.w + time * (.13 + .08 * fract(phase)));
        float drift = age * age;
        position.y += wordHeight * (1.1 * drift + .22 * age);
        position.x += wordHeight * drift * (.65 * sin(phase) + .14 * sin(time + phase));
        visibility = (1. - smoothstep(.54, 1., age)) * smoothstep(0., .055, age);
        depth = age;
      } else {
        position += (1. + 5. * depth) * vec2(sin(phase + time * 1.3), cos(phase + time * 1.1));
      }
      // A slight tilt gives particles at different depths different screen velocities.
      vec2 local = (position - viewport * .5) / viewport;
      position += tilt * (3. + 12. * depth) + local * dot(local, tilt) * 18.;
      position += rise * min(viewport.y * .42, 260.) * vec2(.16 * sin(phase), .45 + grain.w);
      vec2 away = position - cursor.xy;
      float distance = length(away);
      float influence = 1. - smoothstep(0., radius * 1.85, distance);
      float push = radius * (.83 + .26 * grain.w + .18 * depth) * influence * cursor.z;
      position += away / max(.01, distance) * push;
      vec2 clip = position / viewport * 2. - 1.;
      gl_Position = vec4(clip.x, -clip.y, 0., 1.);
      gl_PointSize = max(1., grain.x * ratio);
      color = tint;
      energy = visibility * grain.y * (1. + .12 * sin(time * 1.65 + phase));
    }`;
  const fragment = `
    precision mediump float;
    varying vec3 color;
    varying float energy;
    void main() {
      vec2 offset = 2. * gl_PointCoord - 1.;
      float r2 = dot(offset, offset);
      float core = exp(-7. * r2);
      float halo = exp(-3. * r2) * (1. - smoothstep(.55, 1., r2));
      // Colored ink accumulates where the particles overlap on white.
      vec3 ink = .58 * color + vec3(.03, .04, .06);
      float coverage = clamp(energy * (.88 * core + .46 * halo), 0., 1.);
      gl_FragColor = vec4(mix(vec3(1.), ink, coverage), 1.);
    }`;

  function compile(type, code) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, code);
    gl.compileShader(shader);
    return shader;
  }
  const program = gl.createProgram();
  for (const [type, code] of [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]]) {
    const shader = compile(type, code);
    gl.attachShader(program, shader);
    gl.deleteShader(shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
  gl.useProgram(program);
  gl.enable(gl.BLEND);
  gl.clearColor(1, 1, 1, 1);
  gl.blendFunc(gl.DST_COLOR, gl.ZERO);

  const fixedBuffer = gl.createBuffer();

  function attribute(buffer, name, size, stride, offset) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    const index = gl.getAttribLocation(program, name);
    gl.enableVertexAttribArray(index);
    gl.vertexAttribPointer(index, size, gl.FLOAT, false, stride * 4, offset * 4);
  }
  attribute(fixedBuffer, 'home', 2, 9, 0);
  attribute(fixedBuffer, 'grain', 4, 9, 2);
  attribute(fixedBuffer, 'tint', 3, 9, 6);

  const uniform = Object.fromEntries(['viewport', 'ratio', 'time', 'entrance', 'radius', 'wordHeight', 'cursor', 'tilt'].map(
    name => [name, gl.getUniformLocation(program, name)]));
  let count = 0, pointer, previous, frame, elapsed = 0;
  const field = { x: 0, y: 0, strength: 0, velocity: 0, tiltX: 0, tiltY: 0 };

  function build() {
    const width = stage.clientWidth, height = stage.clientHeight;
    if (!width || !height || gl.isContextLost()) return;
    const ratio = Math.min(devicePixelRatio, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uniform.viewport, width, height);
    gl.uniform1f(uniform.ratio, ratio);

    // Rasterize only the word, at double resolution to retain the inner contours on phones.
    const mask = document.createElement('canvas');
    const ctx = mask.getContext('2d', { willReadFrequently: true });
    const style = getComputedStyle(heading);
    const measure = () => {
      ctx.font = style.fontWeight + ' ' + parseFloat(style.fontSize) * 2 + 'px ' + style.fontFamily;
      ctx.letterSpacing = parseFloat(style.letterSpacing) * 2 + 'px';
      return ctx.measureText(heading.textContent);
    };
    const ink = measure();
    mask.width = Math.ceil(ink.actualBoundingBoxLeft + ink.actualBoundingBoxRight) + 6;
    mask.height = Math.ceil(ink.actualBoundingBoxAscent + ink.actualBoundingBoxDescent) + 6;
    measure();
    ctx.fillText(heading.textContent, 3 + ink.actualBoundingBoxLeft, 3 + ink.actualBoundingBoxAscent);
    const pixels = ctx.getImageData(0, 0, mask.width, mask.height).data;
    const edges = [], fill = [];
    for (let y = 1; y < mask.height - 1; y++) {
      for (let x = 1; x < mask.width - 1; x++) {
        const index = y * mask.width + x, alpha = index * 4 + 3;
        if (pixels[alpha] < 128) continue;
        if (Math.min(pixels[alpha-4], pixels[alpha+4], pixels[alpha-mask.width*4], pixels[alpha+mask.width*4]) < 128)
          edges.push(index);
        else if (!(x % 2 || y % 2)) fill.push(index);
      }
    }

    const scale = Math.min(.5, width * .86 / mask.width);
    const wordHeight = mask.height * scale;
    const left = (width - mask.width * scale) / 2, top = (height - wordHeight) / 2;
    gl.uniform1f(uniform.radius, Math.min(78, Math.max(20, wordHeight * .37)));
    gl.uniform1f(uniform.wordHeight, wordHeight);
    let seed = 4867;
    const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
    const points = [];
    const pointScale = Math.min(1.25, Math.max(.74, wordHeight / 145));
    function sample(pool, kind) {
      const index = pool[Math.floor(random() * pool.length)];
      const x = index % mask.width, y = Math.floor(index / mask.width);
      const u = x / mask.width, v = y / mask.height;
      const middle = Math.max(0, 1 - Math.abs(v - .52) * 2.65);
      const mint = Math.max(0, Math.min(1, (v - .56) * 3.5));
      const cyan = Math.max(0, Math.min(1, (u - .36) * 4));
      const red = (1 - middle * (.38 + .58 * cyan)) * (1 - .82 * mint);
      const green = (.28 + middle * (.02 + .48 * cyan)) * (1 - mint) + mint;
      const blue = .12 + middle * .88 + mint * .43;
      const dust = kind === 'dust', edge = kind === 'edge';
      const scatter = dust ? random() ** 1.7 : 0;
      const jitter = edge ? pointScale * 2.6 : .6;
      const px = left + x * scale + (random() - .5) * (jitter);
      const py = top + y * scale + (random() - .5) * jitter;
      const diameter = pointScale * (edge ? 1.8 + 3.4 * random() : 1.35 + 1.8 * random());
      const energy = edge ? .55 + random() * .95 : (.26 + random() * .92) * (1 - .50 * scatter);
      points.push(px, py, diameter, energy, dust ? 1 : edge ? .04 : .32, random(), red, green, blue);
    }
    for (let i = 0; i < Math.min(26000, edges.length * .85); i++) sample(edges, 'edge');
    for (let i = 0; i < Math.min(7200, fill.length * .055); i++) sample(fill, 'fill');
    for (let i = 0; i < Math.min(11000, edges.length * .87); i++) sample(edges, 'dust');
    count = points.length / 9;
    gl.bindBuffer(gl.ARRAY_BUFFER, fixedBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.STATIC_DRAW);
    wake();
  }

  function draw(now) {
    frame = 0;
    if (document.hidden || gl.isContextLost() || !count) return;
    const dt = Math.min(.033, (now - (previous ?? now)) / 1000);
    previous = now;
    elapsed += dt;
    const still = reducedMotion.matches;
    if (still) elapsed = Math.max(2, elapsed);
    const follow = 1 - Math.exp(-24 * dt);
    if (pointer) {
      field.x += (pointer.x - field.x) * follow;
      field.y += (pointer.y - field.y) * follow;
    }
    const target = pointer && !still ? 1 : 0;
    field.velocity += ((target - field.strength) * 185 - field.velocity * 19) * dt;
    field.strength += field.velocity * dt;
    const tiltX = pointer ? 2 * pointer.x / stage.clientWidth - 1 : 0;
    const tiltY = pointer ? 2 * pointer.y / stage.clientHeight - 1 : 0;
    field.tiltX += (tiltX - field.tiltX) * (1 - Math.exp(-8 * dt));
    field.tiltY += (tiltY - field.tiltY) * (1 - Math.exp(-8 * dt));
    gl.uniform2f(uniform.tilt, still ? 0 : field.tiltX, still ? 0 : field.tiltY);
    gl.uniform3f(uniform.cursor, field.x, field.y, still ? 0 : field.strength);
    gl.uniform1f(uniform.time, still ? 0 : elapsed);
    gl.uniform1f(uniform.entrance, Math.min(1, elapsed / 1.55));
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, count);
    stage.dataset.ready = '';
    if (!still) wake();
  }
  function wake() {
    if (!frame && !document.hidden) frame = requestAnimationFrame(draw);
  }
  function release() {
    pointer = null;
    delete stage.dataset.pointer;
  }
  function track(event) {
    if (reducedMotion.matches || !stage.hasAttribute('data-ready')) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left, y = event.clientY - rect.top;
    if (!pointer && field.strength < .02) { field.x = x; field.y = y; }
    pointer = { x, y };
    if (event.pointerType === 'mouse') {
      stage.dataset.pointer = '';
      ring.style.transform = 'translate(' + pointer.x + 'px,' + pointer.y + 'px)';
    }
  }
  canvas.addEventListener('pointermove', track);
  canvas.addEventListener('pointerdown', track);
  canvas.addEventListener('pointerup', event => { if (event.pointerType !== 'mouse') release(); });
  for (const type of ['pointerleave', 'pointercancel']) canvas.addEventListener(type, release);
  window.addEventListener('blur', release);
  document.addEventListener('visibilitychange', () => { previous = undefined; release(); wake(); });
  reducedMotion.addEventListener('change', () => { release(); wake(); });
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    release();
    delete stage.dataset.ready;
  });
  canvas.addEventListener('webglcontextrestored', () => location.reload());
  document.fonts.ready.then(() => new ResizeObserver(build).observe(stage));
})();

(() => {
  const mark = document.querySelector('.site-footer__mark');
  if (!mark) return;
  const canvas = mark.querySelector('canvas');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const forced = matchMedia('(forced-colors: active)');
  const control = document.querySelector('.motion-toggle');
  const still = () => reduced.matches || control?.dataset.paused === 'true';
  const mask = document.createElement('canvas');
  const ink = mask.getContext('2d', { willReadFrequently: true });
  let gl, program, sizeUniform, ratioUniform, buffer;
  let homes, vertices, velocity, count, width, height, dpr;
  let visible = false, dirty = true, frame = 0, last = 0, pointer, introduced = false;

  // The reference advances each particle by 1–41 thousandths of its
  // remaining distance per 60 Hz tick, without a shared end time.
  let arrival, tickRemainder = 0, visibleSeconds = 0, spawnCredit = 0;

  function init() {
    gl = canvas.getContext('webgl', { alpha: true, depth: false, antialias: false });
    if (!gl || !ink) return false;
    program = gl.createProgram();
    const shader = (type, source) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, source);
      gl.compileShader(s);
      gl.attachShader(program, s);
      gl.deleteShader(s);
    };
    shader(gl.VERTEX_SHADER, `
      attribute vec4 particle;
      uniform vec2 viewport;
      uniform float ratio;
      varying float light;
      void main() {
        float scale = 750.0 / (750.0 - particle.z);
        vec2 xy = (particle.xy / viewport * 2.0 - 1.0) * scale;
        gl_Position = vec4(xy.x, -xy.y, 0., 1.);
        gl_PointSize = max(1., particle.w * ratio);
        light = clamp(particle.z / 70., 0., 1.);
      }`);
    shader(gl.FRAGMENT_SHADER, `
      precision mediump float;
      varying float light;
      void main() {
        float r = length(gl_PointCoord - .5) * 2.;
        float alpha = 1. - smoothstep(.55, 1., r);
        vec3 color = mix(vec3(.075,.09,.11), vec3(.25,.38,.52), light);
        gl_FragColor = vec4(color * alpha, alpha);
      }`);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return false;
    gl.useProgram(program);
    buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    const loc = gl.getAttribLocation(program, 'particle');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, 0, 0);
    sizeUniform = gl.getUniformLocation(program, 'viewport');
    ratioUniform = gl.getUniformLocation(program, 'ratio');
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    return true;
  }

  function fit() {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    dpr = Math.min(devicePixelRatio, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    mask.width = width;
    mask.height = height;
    const word = mark.querySelector('span').textContent;
    const style = getComputedStyle(mark);
    function measure(size) {
      ink.font = style.fontWeight + ' ' + size + 'px ' + style.fontFamily;
      ink.letterSpacing = (size * parseFloat(style.letterSpacing) / parseFloat(style.fontSize) || 0) + 'px';
      return ink.measureText(word);
    }
    const m = measure(100);
    const size = 100 * Math.min((mark.clientWidth-4)/(m.actualBoundingBoxLeft+m.actualBoundingBoxRight),
      (mark.clientHeight-4)/(m.actualBoundingBoxAscent+m.actualBoundingBoxDescent));
    const b = measure(size);
    ink.fillText(word, (width+b.actualBoundingBoxLeft-b.actualBoundingBoxRight)/2,
      (height+b.actualBoundingBoxAscent-b.actualBoundingBoxDescent)/2);
    const pixels = ink.getImageData(0, 0, width, height).data;
    // Sample in CSS pixels so wider lettering gains dots at the same density.
    const step = 2;
    const points = [];
    // Jitter one sample per cell: even coverage without a visible pixel grid.
    let seed = 37;
    const random = () => ((seed = Math.imul(1664525, seed) + 1013904223 >>> 0) / 4294967296);
    for (let y = 0; y < height-step; y += step) {
      for (let x = 0; x < width-step; x += step) {
        const px = x + random()*step, py = y + random()*step;
        if (pixels[4*(Math.floor(py)*width+Math.floor(px))+3] > 120)
          points.push(px, py, random(), 1.6);
      }
    }
    homes = new Float32Array(points);
    vertices = homes.slice();
    count = points.length/4;
    velocity = new Float32Array(count*3);
    for (let i=0; i<count; i++) {
      vertices[i*4+2] = 0;
    }
    gl.bufferData(gl.ARRAY_BUFFER, vertices.byteLength, gl.DYNAMIC_DRAW);
    gl.viewport(0,0,canvas.width,canvas.height);
    gl.uniform2f(sizeUniform,width,height);
    gl.uniform1f(ratioUniform,dpr);
    dirty = false;
  }

  function paint(now) {
    frame = 0;
    if (!visible || document.hidden || forced.matches || gl?.isContextLost()) return;
    if (!prepare()) return;
    if (dirty) {
      fit();
      arrival = null;
    }
    if (!introduced && count) {
      introduced = true;
      if (!still()) {
        arrival = new Float32Array(count * 3);
        tickRemainder = 1;
        last = now;
        for (let k = 0; k < vertices.length; k += 4) {
          const a = k / 4 * 3;
          arrival[a] = width - Math.floor(Math.random() * width) - homes[k];
          arrival[a+1] = height + Math.floor(Math.random() * height * 2) - homes[k+1];
          arrival[a+2] = (1 + Math.round(Math.random() * 40)) / 1000;
        }
      }
    }
    const paused = still();
    if (paused) arrival = null;
    const elapsed = last ? Math.min(.05, (now-last)/1000) : 1/60;
    const dt = Math.min(1/30, elapsed);
    last = now;
    tickRemainder += elapsed * 60;
    const ticks = Math.min(3, Math.floor(tickRemainder + 1e-8));
    tickRemainder -= ticks;
    if (!paused && count) {
      visibleSeconds += elapsed;
      // Once the letters are readable, recycle a few settled dots every frame.
      if (visibleSeconds >= 3) {
        arrival ??= new Float32Array(count * 3);
        spawnCredit += elapsed * Math.min(90, Math.max(8, count * .006));
        while (spawnCredit >= 1) {
          spawnCredit--;
          const i = Math.floor(Math.random() * count);
          const v = i * 3, k = i * 4;
          if (arrival[v+2]) continue;
          arrival[v] = (Math.random() - .5) * width * .16;
          arrival[v+1] = height * (1 + Math.random() * .25) - homes[k+1];
          arrival[v+2] = .018 + Math.random() * .014;
          velocity.fill(0, v, v + 3);
        }
      }
    }
    const radius = Math.min(110, Math.max(36, width*.075));
    const stiffness = 125, damp = Math.exp(-15*dt);
    const seconds = now / 1000;
    for (let i=0; i<count; i++) {
      const k=i*4, v=i*3;
      let x=homes[k], y=homes[k+1], z=0;
      if (!paused) {
        const seed = homes[k+2];
        const phase = seed * Math.PI * 2;
        const t = seconds * (.85 + seed * .65);
        const amplitude = Math.min(1.8, homes[k+3] * .65);
        x += amplitude * (.7 * Math.sin(t + phase) + .3 * Math.sin(t * 1.73 - phase));
        y += amplitude * (.7 * Math.cos(t * .81 - phase) + .3 * Math.sin(t * 1.31 + phase));
      }
      if (pointer && !paused) {
        const dx=x-pointer.x, dy=y-pointer.y, dist=Math.hypot(dx,dy);
        if (dist < radius) {
          const push=(1-dist/radius)**2;
          x += dx/Math.max(1,dist)*radius*push;
          y += dy/Math.max(1,dist)*radius*push;
          z = (25+40*homes[k+2])*push;
        }
      }
      if (arrival && arrival[v+2]) {
        const rate = arrival[v+2];
        for (let tick=0; tick<ticks; tick++) {
          // Center the reference’s 20px scatter around the glyph sample.
          arrival[v] += (Math.round(Math.random()*20)-10-arrival[v])*rate;
          arrival[v+1] += (Math.round(Math.random()*20)-10-arrival[v+1])*rate;
        }
        vertices[k] = x + arrival[v];
        vertices[k+1] = y + arrival[v+1];
        vertices[k+2] = z;
        if (Math.max(Math.abs(arrival[v]), Math.abs(arrival[v+1])) <= 1) arrival[v+2] = 0;
        continue;
      }
      for (let axis=0; axis<3; axis++) {
        const target=axis===0?x:axis===1?y:z, delta=target-vertices[k+axis];
        if (paused || (Math.abs(delta)<.035 && Math.abs(velocity[v+axis])<.2)) {
          vertices[k+axis]=target;
          velocity[v+axis]=0;
        } else {
          velocity[v+axis]=(velocity[v+axis]+delta*stiffness*dt)*damp;
          vertices[k+axis]+=velocity[v+axis]*dt;
        }
      }
    }
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bufferSubData(gl.ARRAY_BUFFER,0,vertices);
    gl.drawArrays(gl.POINTS,0,count);
    if (count) mark.dataset.ready='';
    if (!paused && count) wake();
  }
  function wake() {
    if (!frame && visible && !document.hidden && !forced.matches) frame=requestAnimationFrame(paint);
  }
  function release() { pointer=null; wake(); }
  function resize() { dirty=true; wake(); }
  function track(e) {
    if (still() || (e.pointerType==='touch' && !e.buttons)) return;
    const rect=canvas.getBoundingClientRect();
    pointer={x:e.clientX-rect.left,y:e.clientY-rect.top};
    wake();
  }
  mark.addEventListener('pointermove',track);
  mark.addEventListener('pointerdown',track);
  for (const event of ['pointerleave','pointerup','pointercancel']) mark.addEventListener(event,release);
  function prepare() {
    if (forced.matches || gl?.isContextLost()) return false;
    if (!program && !init()) { program = null; return false; }
    // The empty canvas can take over before the word scrolls into view.
    mark.dataset.ready = '';
    return true;
  }
  const nearby = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && prepare()) nearby.disconnect();
  }, { rootMargin: '400px' });
  nearby.observe(mark);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting && (introduced || entry.intersectionRatio >= .2);
    if (!visible) {
      cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
      if (arrival) {
        arrival = null;
        dirty = true; // Rebuild at home positions on return.
      }
    }
    release();
  }, { threshold: [0, .2] }).observe(mark);
  new ResizeObserver(resize).observe(mark);
  document.fonts.ready.then(resize);
  reduced.addEventListener('change',release);
  forced.addEventListener('change',release);
  document.addEventListener('visibilitychange',release);
  if (control) new MutationObserver(release).observe(control,{attributes:true,attributeFilter:['data-paused']});
  canvas.addEventListener('webglcontextlost',e => { e.preventDefault(); delete mark.dataset.ready; });
  canvas.addEventListener('webglcontextrestored',() => { program=null; resize(); });
})();

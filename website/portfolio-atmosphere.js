/* Dense edge-only grain starts immediately on hover. */
(() => {
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const forced = matchMedia('(forced-colors: active)');
  const control = document.querySelector('.motion-toggle');
  const previews = [...document.querySelectorAll('.portfolio-project__preview')];
  const states = new Map();
  let active = null;
  const enabled = () => fine.matches && !reduced.matches && !forced.matches && !document.hidden && control?.dataset.paused !== 'true';

  function reset(preview) {
    const state = states.get(preview);
    if (state) {
      cancelAnimationFrame(state.frame);
      state.frame = 0;
      state.running = false;
      state.lastTime = 0;
      delete state.canvas.dataset.active;
    }
    delete preview.dataset.atmosphere;
    delete preview.dataset.dots;
    if (active === preview) active = null;
  }
  function prepare(preview) {
    if (states.has(preview)) return states.get(preview);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    canvas.className = 'portfolio-project__dots';
    canvas.setAttribute('aria-hidden', 'true');
    preview.append(canvas);
    const state = { canvas, ctx, frame: 0, running: false, lastTime: 0, phase: 0, pointerX: .5, pointerY: .5, x: .5, y: .5 };
    states.set(preview, state);
    return state;
  }
  function start(preview, state) {
    if (active !== preview || !enabled()) return;
    const { width, height } = preview.getBoundingClientRect();
    if (!width || !height) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const { canvas, ctx } = state;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    // A repeatable field avoids grain flicker between hover encounters.
    let seed = 23;
    const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const count = Math.min(16000, Math.round((width + height) * 14));
    const smooth = value => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };
    const dots = Array.from({ length: count }, () => {
      const side = random() * (width + height) < width;
      const along = random(), edge = random() < .5;
      // Distribute grain through a band, rather than packing it onto the crop boundary.
      const depth = .008 + random() * .062;
      const x = side ? along : (edge ? depth : 1 - depth);
      const y = side ? (edge ? depth : 1 - depth) : along;
      // Hero's .45–.95px marks, 1.16 size multiplier and monochrome ramp.
      const gradient = smooth((x * .60 + y * .40 - .42) / .58);
      const tone = Math.round(255 * .02 * gradient * (1 - smooth((x - .64) / .32) * .55));
      const boundary = Math.min(x, 1 - x, y, 1 - y);
      const feather = smooth(boundary / .015) * (1 - smooth((boundary - .045) / .025));
      return { x, y, radius: (.45 + random() * .5) * 1.16 / 2,
        alpha: (.9 + random() * .1) * feather, color: `rgb(${tone} ${tone} ${tone})` };
    });
    state.running = true;
    preview.dataset.dots = 'active';
    canvas.dataset.active = 'true';
    function draw(time) {
      state.frame = 0;
      if (active !== preview || !enabled()) { reset(preview); return; }
      const dt = state.lastTime ? Math.min(time - state.lastTime, 48) : 16;
      state.lastTime = time;
      state.phase += dt / 1000 * 2.5;
      const ease = 1 - Math.exp(-dt / 180);
      state.x += (state.pointerX - state.x) * ease;
      state.y += (state.pointerY - state.y) * ease;
      ctx.clearRect(0, 0, width, height);
      for (const dot of dots) {
        // Use the hero's coherent opposing currents, rather than isolated orbits.
        const flow = state.phase;
        const edge = smooth(Math.min(dot.x, 1 - dot.x, dot.y, 1 - dot.y) / .16);
        const amplitude = Math.min(38, Math.min(width, height) * .055) * edge;
        const x = dot.x * width + (Math.sin(dot.y * 7.5 + flow * .29) + .38 * Math.sin(dot.x * 11 - flow * .19)) * amplitude + (state.x - .5) * 7 * edge;
        const y = dot.y * height + (Math.cos(dot.x * 6.5 - flow * .23) + .38 * Math.sin(dot.y * 10 + flow * .17)) * amplitude + (state.y - .5) * 7 * edge;
        // Keep even the moving grain inside the narrow outer band.
        const boundary = Math.min(x / width, 1 - x / width, y / height, 1 - y / height);
        const edgeFade = smooth(boundary / .012) * (1 - smooth((boundary - .055) / .02));
        if (edgeFade === 0) continue;
        ctx.globalAlpha = dot.alpha * edgeFade;
        ctx.fillStyle = dot.color;
        ctx.beginPath();
        ctx.arc(x, y, dot.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      state.frame = requestAnimationFrame(draw);
    }
    state.frame = requestAnimationFrame(draw);
  }
  function move(preview, event) {
    if (!enabled() || event.pointerType === 'touch') return;
    if (active && active !== preview) reset(active);
    const state = prepare(preview);
    if (!state) return;
    active = preview;
    preview.dataset.atmosphere = 'active';
    const box = preview.getBoundingClientRect();
    state.pointerX = Math.max(0, Math.min(1, (event.clientX - box.left) / box.width));
    state.pointerY = Math.max(0, Math.min(1, (event.clientY - box.top) / box.height));
    // Start on pointer entry; later movement only steers the existing field.
    if (!state.running) start(preview, state);
  }
  previews.forEach(preview => {
    preview.addEventListener('pointerenter', event => move(preview, event));
    preview.addEventListener('pointermove', event => move(preview, event));
    preview.addEventListener('pointerleave', () => reset(preview));
    preview.addEventListener('pointercancel', () => reset(preview));
  });
  const resetAll = () => previews.forEach(reset);
  [fine, reduced, forced].forEach(media => media.addEventListener('change', resetAll));
  ['scroll', 'resize', 'blur', 'pagehide'].forEach(event => window.addEventListener(event, resetAll, { passive: true }));
  document.addEventListener('visibilitychange', resetAll);
  if (control) new MutationObserver(resetAll).observe(control, { attributes: true, attributeFilter: ['data-paused'] });
})();

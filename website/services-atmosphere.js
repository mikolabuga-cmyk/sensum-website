/* Hero-style fine stippling, inverted for the dark services surface. */
(() => {
  const canvas = document.querySelector('.services-atmosphere');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const stage = canvas.parentElement;
  const pause = document.querySelector('.motion-toggle');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const forced = matchMedia('(forced-colors: active)');
  let width = 0, height = 0, points = [], frame = 0, last = 0, visible = false, flow = 0;
  let seed = 3417;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const enabled = () => visible && !document.hidden && !reduced.matches && !forced.matches && pause?.dataset.paused !== 'true';
  const smooth = value => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };
  function draw(dt = 0) {
    flow += dt;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#f3f3ef';
    for (const point of points) {
      // Same opposing currents, frequencies, speed and mark scale as particle-field.js.
      // Stable seeded marks move together rather than flickering or orbiting independently.
      const edge = smooth(Math.min(point.x, 1 - point.x, point.y, 1 - point.y) / .16);
      const amplitude = Math.min(38, Math.min(width, height) * .055) * edge;
      const cx = Math.sin(point.y * 7.5 + flow * .29) + .38 * Math.sin(point.x * 11 - flow * .19);
      const cy = Math.cos(point.x * 6.5 - flow * .23) + .38 * Math.sin(point.y * 10 + flow * .17);
      const x = point.x * width + cx * amplitude;
      const y = point.y * height + cy * amplitude;
      // Broad, feathered folds keep the atmosphere quiet behind service copy.
      const fold = .5 + .5 * Math.sin(point.x * 8 + point.y * 9 + cx * .5);
      const reading = 1 - .88 * Math.exp(-2 * (Math.pow((point.x - .24) / .34, 2) + Math.pow((point.y - .48) / .40, 2)));
      const feather = smooth(Math.min(x, width - x, y, height - y) / 22);
      ctx.globalAlpha = point.alpha * (.16 + .84 * fold * fold) * reading * feather;
      ctx.beginPath(); ctx.arc(x, y, point.radius, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  function tick(time) {
    frame = 0;
    if (!enabled()) return;
    if (!last || time - last >= 32) {
      draw(last ? Math.min((time - last) / 1000, .064) : 0);
      last = time;
    }
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    cancelAnimationFrame(frame); frame = 0; last = 0;
    if (reduced.matches || forced.matches) ctx.clearRect(0, 0, width, height);
    if (enabled()) frame = requestAnimationFrame(tick);
  }
  function resize() {
    const rect = stage.getBoundingClientRect();
    width = Math.max(1, rect.width); height = Math.max(1, rect.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed = 3417;
    points = Array.from({ length: Math.min(12000, Math.round(width * height / 45)) }, () => ({
      x: random(), y: random(),
      radius: (.45 + random() * .5) * 1.16 / 2, alpha: .35 + random() * .5
    }));
    if (!reduced.matches && !forced.matches) draw();
    sync();
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }).observe(stage);
  } else {
    const check = () => { const rect = stage.getBoundingClientRect(); visible = rect.bottom > 0 && rect.top < innerHeight; sync(); };
    window.addEventListener('scroll', check, { passive: true }); check();
  }
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(stage);
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('pagehide', () => { visible = false; sync(); });
  window.addEventListener('pageshow', () => { const rect = stage.getBoundingClientRect(); visible = rect.bottom > 0 && rect.top < innerHeight; sync(); });
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', sync); forced.addEventListener('change', sync);
  if (pause) new MutationObserver(sync).observe(pause, { attributes: true, attributeFilter: ['data-paused'] });
  resize();
})();

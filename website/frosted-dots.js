/* The supplied soft-dimple grid, adapted to a faint layer in the white scene. */
(() => {
  const cv = document.querySelector('.frosted-atmosphere__dots');
  const host = document.querySelector('.hero-shell');
  const control = document.querySelector('.motion-toggle');
  const ctx = cv?.getContext('2d');
  if (!ctx || !host) return;
  const GAP = 28, REACH = 160, PUSH = 54, DOT = 1;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  let w = 0, h = 0, tx = 0, ty = 0, cx = 0, cy = 0;
  let strength = 0, targetStrength = 0, frame = 0, last = 0, visible = true;
  const active = () => visible && !document.hidden && document.documentElement.dataset.heroVariant === 'azure' && control?.dataset.paused !== 'true' && !reduced.matches && fine.matches;
  function draw() {
    ctx.clearRect(0, 0, w, h);
    for (let x = GAP / 2; x < w; x += GAP) {
      for (let y = GAP / 2; y < h; y += GAP) {
        const dx = x - cx, dy = y - cy;
        const d = Math.hypot(dx, dy) || 1;
        const f = Math.max(0, 1 - d / REACH) * strength;
        const push = f * f * PUSH;
        ctx.beginPath();
        ctx.arc(x + dx / d * push, y + dy / d * push, DOT + f * 2.4, 0, Math.PI * 2);
        // A muted cool tint reads as submerged detail against white illumination.
        ctx.fillStyle = `rgba(91, 116, 132, ${.36 + f * .14})`;
        ctx.fill();
      }
    }
  }
  function tick(now) {
    frame = 0;
    if (!active()) { last = 0; return; }
    const ease = 1 - Math.pow(.85, (last ? Math.min(now - last, 50) : 16.67) / 16.67);
    last = now;
    cx += (tx - cx) * ease; cy += (ty - cy) * ease;
    strength += (targetStrength - strength) * ease;
    draw();
    if (Math.abs(tx - cx) + Math.abs(ty - cy) > .1 || Math.abs(targetStrength - strength) > .001) frame = requestAnimationFrame(tick);
    else last = 0;
  }
  function schedule() { if (!frame && active()) frame = requestAnimationFrame(tick); }
  function fit() {
    const r = host.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    w = r.width; h = r.height;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }
  function leave() { targetStrength = 0; schedule(); }
  document.addEventListener('pointermove', event => {
    if (!active() || event.pointerType === 'touch') return;
    const r = host.getBoundingClientRect();
    if (event.clientY < r.top || event.clientY > r.bottom || event.clientX < r.left || event.clientX > r.right) { leave(); return; }
    tx = event.clientX - r.left; ty = event.clientY - r.top;
    if (strength < .001) { cx = tx; cy = ty; }
    targetStrength = 1;
    schedule();
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', leave);
  function sync() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0; last = 0;
    if (reduced.matches || !fine.matches || !['frosted', 'azure'].includes(document.documentElement.dataset.heroVariant)) {
      strength = targetStrength = 0; draw();
    }
    schedule();
  }
  new ResizeObserver(fit).observe(host);
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }).observe(host);
  if (control) new MutationObserver(sync).observe(control, { attributes: true, attributeFilter: ['data-paused'] });
  document.addEventListener('hero-variant-change', sync);
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', sync);
  fine.addEventListener('change', sync);
  fit();
})();

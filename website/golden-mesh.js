/* A soft ribbon of light, with cursor-shaped control points and slow breathing. */
(() => {
  const root = document.documentElement;
  const graphic = document.querySelector('.golden-mesh');
  const host = document.querySelector('.hero-shell');
  const control = document.querySelector('.motion-toggle');
  if (!graphic || !host) return;
  const paths = [...graphic.querySelectorAll('.golden-mesh__path')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  let tx = 0, ty = 0, x = 0, y = 0, time = 0, last = 0, frame = 0, visible = true;
  // Assigned by the comparison UI, keeping this artwork independent of its slot.
  const selected = () => root.dataset.heroGraphic === 'golden';
  const active = () => selected() && visible && !document.hidden && !reduced.matches && control?.dataset.paused !== 'true';
  function paint() {
    const sway = Math.sin(time * .32) * 12;
    const lift = Math.sin(time * .23) * 9;
    const d = `M -140 ${650 + y * 24} C ${70 + x * 55} ${275 + y * 60 + sway}, ${245 + x * 65} ${245 + y * 85 + lift}, ${420 + x * 30} ${465 + y * 45} S ${735 + x * 55} ${785 + y * 75 - sway}, 1140 ${290 + y * 45}`;
    paths.forEach(path => path.setAttribute('d', d));
  }
  function tick(now) {
    frame = 0;
    if (!active()) { last = 0; return; }
    const dt = last ? Math.min((now - last) / 1000, .05) : 0;
    last = now; time += dt;
    const ease = 1 - Math.exp(-dt * 3.8);
    x += (tx - x) * ease; y += (ty - y) * ease;
    paint();
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0; last = 0;
    if (reduced.matches) { x = y = tx = ty = time = 0; paint(); }
    if (active()) frame = requestAnimationFrame(tick);
  }
  document.addEventListener('pointermove', event => {
    if (!active() || !fine.matches || event.pointerType === 'touch') return;
    const r = host.getBoundingClientRect();
    tx = Math.max(-1, Math.min(1, (event.clientX - r.left) / r.width * 2 - 1));
    ty = Math.max(-1, Math.min(1, (event.clientY - r.top) / r.height * 2 - 1));
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { tx = ty = 0; });
  document.addEventListener('hero-variant-change', sync);
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', sync);
  fine.addEventListener('change', () => { tx = ty = 0; });
  if (control) new MutationObserver(sync).observe(control, { attributes: true, attributeFilter: ['data-paused'] });
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }).observe(host);
  paint(); sync();
})();

/* A broad, diffused light behind the white surface; foreground remains untouched. */
(() => {
  const field = document.querySelector('.frosted-atmosphere');
  const hero = document.querySelector('.hero-shell');
  const control = document.querySelector('.motion-toggle');
  if (!field || !hero) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const home = { x: 50, y: 43 };
  let x = home.x, y = home.y, targetX = x, targetY = y;
  let frame = 0, previous = 0, visible = true;
  const enabled = () => visible && !document.hidden && !reduced.matches && finePointer.matches && control?.dataset.paused !== 'true' && document.documentElement.dataset.heroVariant === 'azure';
  function paint() {
    field.style.setProperty('--light-x', `${x.toFixed(3)}%`);
    field.style.setProperty('--light-y', `${y.toFixed(3)}%`);
    field.style.setProperty('--beam-x', `${((x - home.x) * .32).toFixed(3)}%`);
    field.style.setProperty('--beam-y', `${((y - home.y) * .22).toFixed(3)}%`);
  }
  function tick(now) {
    frame = 0;
    if (!enabled()) { previous = 0; return; }
    const delta = previous ? Math.min(now - previous, 50) : 16;
    previous = now;
    const ease = 1 - Math.exp(-delta / 170);
    x += (targetX - x) * ease;
    y += (targetY - y) * ease;
    paint();
    if (Math.abs(targetX - x) + Math.abs(targetY - y) > .02) frame = requestAnimationFrame(tick);
    else previous = 0;
  }
  function schedule() { if (!frame && enabled()) frame = requestAnimationFrame(tick); }
  function returnHome() { targetX = home.x; targetY = home.y; schedule(); }
  document.addEventListener('pointermove', event => {
    if (!enabled() || event.pointerType === 'touch') return;
    const bounds = hero.getBoundingClientRect();
    if (event.clientY < bounds.top || event.clientY > bounds.bottom) { returnHome(); return; }
    // Account for the light layer's overscan so its center follows the cursor.
    targetX = (8 + Math.max(0, Math.min(100, (event.clientX - bounds.left) / bounds.width * 100))) / 1.16;
    targetY = (8 + Math.max(0, Math.min(100, (event.clientY - bounds.top) / bounds.height * 100))) / 1.16;
    schedule();
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', returnHome);
  function sync() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0; previous = 0;
    field.dataset.lightPaused = String(!visible || document.hidden || reduced.matches || control?.dataset.paused === 'true' || document.documentElement.dataset.heroVariant !== 'azure');
    if (reduced.matches || !finePointer.matches) { x = targetX = home.x; y = targetY = home.y; paint(); }
    schedule();
  }
  document.addEventListener('hero-variant-change', sync);
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', sync);
  finePointer.addEventListener('change', sync);
  if (control) new MutationObserver(sync).observe(control, { attributes: true, attributeFilter: ['data-paused'] });
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }).observe(hero);
})();

(() => {
  const section = document.querySelector('.narrative');
  if (!section || section.hidden || section.dataset.openingOnly === 'true') return;
  const stage = section?.querySelector('.narrative__stage');
  if (!stage) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const forced = matchMedia('(forced-colors: active)');
  const control = document.querySelector('.motion-toggle');
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  let frame = 0, previous = 0, angle = 0, targetAngle = 0, power = 0;
  const enabled = () => section.dataset.textVersion === 'v4' && !document.hidden &&
    !reduced.matches && !forced.matches && control?.dataset.paused !== 'true';
  function render(time) {
    frame = 0;
    if (!enabled()) return;
    const box = stage.getBoundingClientRect();
    if (box.bottom < 0 || box.top > innerHeight) { previous = 0; return; }
    const progress = -section.getBoundingClientRect().top / Math.max(1, section.offsetHeight - stage.clientHeight);
    // Leave a dark beat after the background completes at 60%.
    const t = clamp((progress - .64) / .18, 0, 1);
    const targetPower = t * t * (3 - 2 * t);
    const dt = previous ? Math.min(64, time - previous) : 16;
    previous = time;
    angle += (targetAngle - angle) * (1 - Math.exp(-dt / 240));
    power += (targetPower - power) * (1 - Math.exp(-dt / 140));
    if (Math.abs(power - targetPower) < .0001) power = targetPower;
    if (Math.abs(angle - targetAngle) < .001) angle = targetAngle;
    section.style.setProperty('--flashlight-power', power.toFixed(4));
    section.style.setProperty('--flashlight-angle', `${angle.toFixed(3)}deg`);
    if (angle !== targetAngle || power !== targetPower) schedule();
    else previous = 0;
  }
  function schedule() { if (!frame && enabled()) frame = requestAnimationFrame(render); }
  function sync() {
    cancelAnimationFrame(frame); frame = 0; previous = 0;
    targetAngle = angle = 0; power = 0;
    section.style.setProperty('--flashlight-angle', '0deg');
    section.style.setProperty('--flashlight-power', '0');
    schedule();
  }
  section.addEventListener('pointermove', event => {
    if (!enabled() || event.pointerType === 'touch') return;
    const box = stage.getBoundingClientRect();
    // Aim from the fixed source toward the pointer, gently constrained so the
    // light always frames the copy. Keep all text readable outside the beam.
    targetAngle = clamp(Math.atan2(event.clientX - box.left - box.width * .5,
      Math.max(box.height * .25, box.height * 1.01 - (event.clientY - box.top))) * 180 / Math.PI, -18, 18);
    schedule();
  }, { passive: true });
  section.addEventListener('pointerleave', () => { targetAngle = 0; schedule(); });
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('pageshow', sync);
  document.addEventListener('sensum-text-version', sync);
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', sync); forced.addEventListener('change', sync);
  if (control) new MutationObserver(sync).observe(control, { attributes: true, attributeFilter: ['data-paused'] });
  window.addEventListener('pagehide', () => { cancelAnimationFrame(frame); frame = 0; });
  sync();
})();

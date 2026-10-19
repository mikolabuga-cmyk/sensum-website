(() => {
  const heading = document.querySelector('#work-heading');
  if (!heading) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const forced = matchMedia('(forced-colors: active)');
  const control = document.querySelector('.motion-toggle');
  const motion = window.SensumTextMotion;
  if (!motion) return;
  const chars = motion.split(heading, 'portfolio-heading');
  let frame = 0, current = null, lastTime = 0;
  const enabled = () => !reduced.matches && !forced.matches && control?.dataset.paused !== 'true';
  function render(time) {
    frame = 0;
    if (!enabled()) {
      delete heading.dataset.reveal;
      current = null;
      lastTime = 0;
      return;
    }
    const target = motion.viewportProgress(heading.getBoundingClientRect().top, innerHeight, motion.tokens.heading);
    const ease = motion.damping(time, lastTime, motion.tokens.heading.dampingMs);
    current = current === null ? target : current + (target - current) * ease;
    if (Math.abs(target - current) < .0001) current = target;
    heading.dataset.reveal = 'active';
    // Closely overlapping letters sweep into focus over a short scroll distance.
    motion.paint(chars, current, motion.tokens.heading.feather);
    if (current !== target) {
      lastTime = time;
      frame = requestAnimationFrame(render);
    } else lastTime = 0;
  }
  function schedule() {
    if (!frame && !document.hidden) frame = requestAnimationFrame(render);
  }
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('pageshow', schedule);
  reduced.addEventListener('change', schedule);
  forced.addEventListener('change', schedule);
  if (control) new MutationObserver(schedule).observe(control, { attributes: true, attributeFilter: ['data-paused'] });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
      lastTime = 0;
    } else schedule();
  });
  schedule();
})();

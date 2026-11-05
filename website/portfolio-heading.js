(() => {
  document.querySelectorAll('#work-heading, [data-scroll-heading]').forEach(heading => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const forced = matchMedia('(forced-colors: active)');
  const control = document.querySelector('.motion-toggle');
  const motion = window.SensumTextMotion;
  if (!motion) return;
  const chars = motion.split(heading, heading.id === 'work-heading' ? 'portfolio-heading' : 'text-reveal');
  const baseProfile = heading.dataset.scrollHeading === 'narrative' ? motion.tokens : motion.tokens.heading;
  const profile = ['work-heading', 'services-heading'].includes(heading.id)
    ? { ...baseProfile, viewportSpan: baseProfile.viewportSpan / .75 }
    : baseProfile;
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
    const top = heading.getBoundingClientRect().top;
    const lead = heading.id === 'why-us-heading' ? innerHeight * .20 : 0;
    let target = motion.viewportProgress(top - lead, innerHeight, profile);
    if (heading.id === 'footer-heading') {
      // The final heading can run out of page before reaching the usual end.
      const remainingScroll = document.documentElement.scrollHeight - innerHeight - window.scrollY;
      const availableSpan = innerHeight * profile.viewportStart - top + remainingScroll;
      const span = Math.min(innerHeight * profile.viewportSpan, availableSpan);
      // Start revealing just before the heading enters view.
      const revealStart = innerHeight * (profile.viewportStart + .45);
      target = remainingScroll <= 1 ? 1 : motion.clamp((revealStart - top) / Math.max(1, span));
    }
    const ease = motion.damping(time, lastTime, profile.dampingMs);
    current = current === null ? target : current + (target - current) * ease;
    if (Math.abs(target - current) < .0001) current = target;
    heading.dataset.reveal = 'active';
    // Closely overlapping letters sweep into focus over a short scroll distance.
    motion.paint(chars, current, profile.feather);
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
  });
})();

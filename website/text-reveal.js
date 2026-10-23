(() => {
  document.querySelectorAll('.point-of-view, [data-narrative-reveal]').forEach(section => {
  if (!section || section.hidden) return;

  const motion = window.SensumTextMotion;
  if (!motion) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const forced = matchMedia('(forced-colors: active)');
  const control = document.querySelector('.motion-toggle');
  const clamp = value => Math.max(0, Math.min(1, value));
  const opening = [...section.querySelectorAll('.point-of-view__chapter')];
  const closing = section.querySelector?.('.story-reveal__overlay');
  const scene = section.querySelector?.('.narrative__stage');
  const chapters = [...opening, ...(closing && !closing.hidden ? [closing] : [])].map(element => {
    const isClosing = element === closing;
    const paragraph = element.querySelector(isClosing ? 'h2' : '.point-of-view__text');
    const chars = motion.split(paragraph, section.hasAttribute('data-narrative-reveal') ? 'text-reveal' : 'point-of-view');
    return { element, stage: isClosing ? element : element.querySelector('.point-of-view__stage'), chars, current: null, isClosing };
  });

  let frame = 0;
  let lastTime = 0;
  let darkProgress = null;
  const enabled = () => !reduced.matches && !forced.matches && control?.dataset.paused !== 'true';

  function render(time) {
    frame = 0;
    if (!enabled() || document.hidden) return;
    const height = window.innerHeight;
    const delta = lastTime ? Math.min(time - lastTime, 64) : 16;
    const ease = motion.damping(time, lastTime);
    lastTime = time;
    let settling = false;
    const storyProgress = scene ? -section.getBoundingClientRect().top / Math.max(1, section.offsetHeight - scene.clientHeight) : 0;
    // Finish the grain dispersion at 40%, then darken before revealing white copy.
    // V4 uses a gentle, reversible 700ms color fade after the scroll trigger.
    const darkTarget = section.dataset.openingOnly === 'true' ? 0 : section.dataset.textVersion === 'v4'
      ? (storyProgress >= .44 ? 1 : 0)
      : (['v2', 'v3'].includes(section.dataset.textVersion) ? clamp((storyProgress - .44) / .16) : 0);
    if (darkProgress === null) darkProgress = darkTarget;
    else if (section.dataset.textVersion === 'v4') {
      const distance = darkTarget - darkProgress;
      darkProgress += Math.sign(distance) * Math.min(Math.abs(distance), delta / 700);
    } else darkProgress += (darkTarget - darkProgress) * ease;
    if (Math.abs(darkTarget - darkProgress) < .0001) darkProgress = darkTarget;
    else settling = true;
    const darkOpacity = section.dataset.textVersion === 'v4'
      ? darkProgress ** 3 * (darkProgress * (darkProgress * 6 - 15) + 10)
      : darkProgress * darkProgress * (3 - 2 * darkProgress);
    section.style.setProperty('--text-dark', darkOpacity.toFixed(4));
    chapters.forEach(chapter => {
      const top = chapter.element.getBoundingClientRect().top;
      // Begin as the section enters the viewport and finish just before it
      // reaches the top, leaving only a short, fully readable sticky hold.
      // V2's second paragraph enters after the background darkens at 60%. It stays resolved through the end of the pin and normal exit.
      const target = chapter.isClosing
        ? (['v2', 'v3', 'v4'].includes(section.dataset.textVersion) && section.dataset.motion === 'active'
          ? (section.dataset.textVersion === 'v4'
            ? clamp((storyProgress - .72) / .24)
            : clamp((storyProgress - .65) / .27)) : 1)
        : motion.viewportProgress(top, height);
      chapter.current = chapter.current === null ? target : chapter.current + (target - chapter.current) * ease;
      if (Math.abs(target - chapter.current) < .0001) chapter.current = target;
      else settling = true;
      motion.paint(chapter.chars, chapter.current);
    });
    if (settling) frame = requestAnimationFrame(render);
  }

  function schedule() {
    if (!frame && enabled() && !document.hidden) frame = requestAnimationFrame(render);
  }

  function measure() {
    chapters.forEach(chapter => {
      chapter.element.style.setProperty('--reading-height', `${chapter.stage.offsetHeight}px`);
    });
    schedule();
  }

  function sync() {
    cancelAnimationFrame(frame);
    frame = 0;
    lastTime = 0;
    darkProgress = null;
    section.dataset.reveal = enabled() ? 'active' : 'static';
    chapters.forEach(chapter => { chapter.current = null; });
    measure();
  }

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', measure, { passive: true });
  window.addEventListener('pageshow', sync);
  document.addEventListener('visibilitychange', sync);
  document.addEventListener('sensum-text-version', sync);
  reduced.addEventListener('change', sync);
  forced.addEventListener('change', sync);
  if (control) new MutationObserver(sync).observe(control, { attributes: true, attributeFilter: ['data-paused'] });
  new MutationObserver(sync).observe(section, { attributes: true, attributeFilter: ['data-motion'] });
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(measure);
    chapters.forEach(chapter => observer.observe(chapter.stage));
  }
  document.fonts?.ready.then(measure);
  sync();
  });
})();

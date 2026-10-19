(() => {
  'use strict';
  const section = document.querySelector('.portfolio-grid');
  if (!section) return;

  // Keep links saved from the old cover view useful after the grid replacement.
  if (['#case-workspace', '#case-focus', '#case-onboarding'].includes(location.hash)) {
    history.replaceState(null, '', `${location.pathname}${location.search}#work`);
    requestAnimationFrame(() => section.scrollIntoView({ behavior: 'instant' }));
  }

  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  if (motion.matches || !('IntersectionObserver' in window)) return;
  const animations = new Set();
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      observer.unobserve(entry.target);
      // Content is visible by default, including if scripts or animation fail.
      if (motion.matches || !entry.target.animate) continue;
      const animation = entry.target.animate([
        { opacity: .35, transform: 'translateY(28px)' },
        { opacity: 1, transform: 'translateY(0)' }
      ], { duration: 850, easing: 'cubic-bezier(.22,1,.36,1)' });
      animations.add(animation);
      animation.onfinish = () => animations.delete(animation);
    }
  }, { threshold: 0, rootMargin: '0px 0px -24px 0px' });
  section.querySelectorAll('.portfolio-project').forEach(card => observer.observe(card));
  motion.addEventListener('change', event => {
    if (!event.matches) return;
    observer.disconnect();
    animations.forEach(animation => animation.cancel());
    animations.clear();
  });
})();

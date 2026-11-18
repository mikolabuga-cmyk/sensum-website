/* Case pages: send the logo home and play product videos only while visible. */
(() => {
  // Same orb, settings and pause rules as the homepage service rows (services-orb.js).
  const orbSvg = document.querySelector('.case-orb');
  const scriptUrl = document.currentScript?.src || location.href;
  if (orbSvg) {
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const forcedColors = matchMedia('(forced-colors: active)');
    Promise.all([import(new URL('vendor/thinking-orbs/orb-core.js', scriptUrl)), import(new URL('vendor/thinking-orbs/shapes.js', scriptUrl))])
      .then(([{ mountOrb }, shapes]) => {
        const base = { state: 'using', speed: .35, density: 2.7, dotSize: .25, tilt: 31, size: 480 };
        const shape = orbSvg.dataset.orbShape;
        const orb = mountOrb(orbSvg, shape === 'cube' ? { ...base, state: 'searching', speed: .4, tilt: 22, shape: shapes.cube }
          : shape === 'tetrahedron' ? { ...base, state: 'waiting', shape: shapes.tetrahedron }
          : shape === 'octahedron' ? { ...base, state: 'compacting', shape: shapes.octahedron }
          : base);
        orb.pause();
        let visible = false;
        const sync = () => (visible && !document.hidden && !reducedMotion.matches && !forcedColors.matches ? orb.play() : orb.pause());
        new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }).observe(orbSvg.parentElement);
        document.addEventListener('visibilitychange', sync);
        reducedMotion.addEventListener('change', sync);
        forcedColors.addEventListener('change', sync);
      })
      .catch(() => { /* The statement stands on its own without the orb. */ });
  }
  const brand = document.querySelector('.site-header .brand');
  if (brand) { brand.href = '../'; brand.setAttribute('aria-label', 'Sensum, home'); }
  const videos = [...document.querySelectorAll('.case-video')];
  if (!videos.length) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  if (reduced.matches || !('IntersectionObserver' in window)) {
    // Still pictures by default; the visitor can start each video.
    videos.forEach(video => { video.controls = true; });
    return;
  }
  const observer = new IntersectionObserver(entries => {
    entries.forEach(({ target, isIntersecting }) => {
      if (isIntersecting) target.play().catch(() => { target.controls = true; });
      else target.pause();
    });
  }, { threshold: .35 });
  videos.forEach(video => observer.observe(video));
})();

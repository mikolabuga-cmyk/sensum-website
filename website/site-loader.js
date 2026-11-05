/* A bounded introduction; readiness and a timeout always release the page. */
(() => {
  const root = document.documentElement;
  const preview = location.pathname.match(/\/previews\/([^/]+)\.html$/)?.[1];
  if (preview && !['hero-v4', 'site-loader'].includes(preview)) return;
  // Start fresh at the hero instead of restoring a previous scroll or section hash.
  // Run before the reduced-motion check so this behavior does not depend on animation.
  // Set this on the outgoing history entry too, before a future refresh.
  history.scrollRestoration = 'manual';
  const navigation = performance.getEntriesByType('navigation')[0];
  const refreshing = navigation ? navigation.type === 'reload' : performance.navigation?.type === 1;
  if (!preview || refreshing || !location.hash) {
    if (location.hash) history.replaceState(history.state, '', location.pathname + location.search);
    const resetToHero = () => window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    resetToHero();
    document.addEventListener('DOMContentLoaded', resetToHero, { once: true });
    window.addEventListener('pageshow', resetToHero, { once: true });
    document.addEventListener('site-loader-ready', resetToHero, { once: true });
  }
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const duration = 4000;
  const dotRevealDelay = 1000;
  const logoRevealDuration = dotRevealDelay + 350;
  const wordSpeed = .9;
  const sequenceDuration = logoRevealDuration + 3400 / wordSpeed;
  const timeScale = duration / (sequenceDuration + 160 + 820);
  root.style.setProperty('--loader-time-scale', timeScale);
  const start = performance.now();
  root.dataset.loading = 'active';
  // Use the package's canvas engine without adding React to the static page.
  let orbEngine, orbPreset;
  import('./vendor/thinking-orbs-engine/engine.es.js').then(engine => {
    // Libraries.dev labels the breathing animation as Thinking.
    orbPreset = engine.resolvePreset('breathing', 64);
    orbEngine = engine;
  }).catch(() => { /* The wordmark and dismissal remain available if the engine fails. */ });
  let frame = 0, dismissed = false, watchdog, exitTimer;
  const release = () => {
    if (dismissed) return;
    dismissed = true;
    cancelAnimationFrame(frame);
    clearTimeout(watchdog);
    clearTimeout(exitTimer);
    delete root.dataset.loading;
    document.querySelectorAll('[data-loader-inert]').forEach(node => {
      node.inert = false;
      node.removeAttribute('data-loader-inert');
    });
    document.dispatchEvent(new Event('site-loader-ready'));
  };
  // Never leave the page behind a curtain if fonts or rendering fail.
  watchdog = setTimeout(release, duration);
  window.addEventListener('pageshow', event => { if (event.persisted) release(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') release(); });
  document.addEventListener('DOMContentLoaded', () => {
    const loader = document.querySelector('.site-loader');
    if (!loader || dismissed) { release(); return; }
    for (const node of document.body.children) {
      if (node !== loader && !node.inert) { node.inert = true; node.setAttribute('data-loader-inert', ''); }
    }
    const word = loader.querySelector('[data-loader-word]');
    const words = ['design', 'strategy', 'AI'];
    const suffix = loader.querySelector('.site-loader__suffix');
    const suffixInner = loader.querySelector('.site-loader__suffix-inner');
    const name = loader.querySelector('.site-loader__name');
    const fitSuffix = () => {
      const suffixWidth = loader.classList.contains('is-dot-ready') ? suffixInner.getBoundingClientRect().width : 0;
      suffix.style.width = `${suffixWidth}px`;
      loader.style.setProperty('--loader-text-width', `${name.getBoundingClientRect().width + suffixWidth + 1}px`);
    };
    // Animate the measured width so the centered lockup glides between words.
    fitSuffix();
    const counter = loader.querySelector('[data-loader-counter]');
    const canvas = loader.querySelector('.site-loader__orb');
    const ctx = canvas?.getContext('2d');
    const orbSize = 96;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (ctx) {
      canvas.width = Math.round(orbSize * dpr);
      canvas.height = Math.round(orbSize * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function drawOrb(elapsed) {
      if (!ctx || !orbEngine || document.hidden) return;
      ctx.clearRect(0, 0, orbSize, orbSize);
      const orb = orbEngine.MODE_FRAMES[orbPreset.mode](
        orbSize, elapsed / 1000 * orbPreset.speed * .65, orbPreset.opts);
      // White ink with depth expressed through opacity, preserving the orbit depth.
      for (const dot of orb.dots) {
        dot.a = Math.min(1, (dot.a ?? 1) * 1.35) * Math.max(.65, 1 - dot.white);
        dot.r *= 1.2;
        dot.white = 0;
      }
      orbEngine.paintFrame(ctx, orb, true);
      loader.classList.add('is-orb-ready');
    }

    // Finish the text entrance before revealing each discipline letter by letter.
    document.fonts?.ready.then(fitSuffix);
    let lastWord = -1;
    function tick(now) {
      const introElapsed = (now - start) / timeScale;
      drawOrb(introElapsed);
      if (introElapsed >= 500) loader.classList.add('is-text-ready');
      if (introElapsed >= dotRevealDelay && !loader.classList.contains('is-dot-ready')) {
        loader.classList.add('is-dot-ready');
        fitSuffix();
      }
      const wordElapsed = (introElapsed - logoRevealDuration) * wordSpeed;
      const index = Math.min(2, Math.floor(wordElapsed / 1200));
      if (wordElapsed >= 0 && index !== lastWord) {
        word.classList.remove('is-leaving');
        word.replaceChildren(...Array.from(words[index], (letter, i) => {
          const span = document.createElement('span');
          span.textContent = letter;
          span.style.setProperty('--letter', i);
          return span;
        }));
        fitSuffix();
        lastWord = index;
      }
      if (wordElapsed >= 0 && index < 2 && wordElapsed % 1200 >= 840) word.classList.add('is-leaving');
      counter.textContent = `${Math.min(99, Math.floor(introElapsed / sequenceDuration * 100))}%`;
      if (introElapsed >= sequenceDuration) {
        counter.textContent = '100%';
        exitTimer = setTimeout(() => {
          root.dataset.loading = 'leaving';
          exitTimer = setTimeout(release, 820 * timeScale);
        }, 160 * timeScale);
        return;
      }
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
  }, { once: true });
})();

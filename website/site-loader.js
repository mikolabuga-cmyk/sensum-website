/* A bounded introduction; readiness and a timeout always release the page. */
(() => {
  const root = document.documentElement;
  const preview = location.pathname.match(/\/previews\/([^/]+)\.html$/)?.[1];
  if (preview && !['hero-v4', 'site-loader'].includes(preview)) return;
  // Start fresh at the hero instead of restoring a previous scroll or section hash.
  // Run before the reduced-motion check so this behavior does not depend on animation.
  if (!preview) {
    history.scrollRestoration = 'manual';
    if (location.hash) history.replaceState(history.state, '', location.pathname + location.search);
    const resetToHero = () => window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    resetToHero();
    document.addEventListener('DOMContentLoaded', resetToHero, { once: true });
    window.addEventListener('pageshow', resetToHero);
    document.addEventListener('site-loader-ready', resetToHero, { once: true });
  }
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  root.dataset.loading = 'active';
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
  watchdog = setTimeout(release, 6500);
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
    const fitSuffix = () => { suffix.style.width = `${suffixInner.getBoundingClientRect().width}px`; };
    // Animate the measured width so the centered lockup glides between words.
    fitSuffix();
    const counter = loader.querySelector('[data-loader-counter]');
    // Finish the logo reveal before introducing the first discipline.
    const logoRevealDuration = 1050;
    const sequenceDuration = logoRevealDuration + 3400;
    const start = performance.now();
    let fontsReady = !document.fonts, lastWord = -1;
    document.fonts?.ready.then(() => { fontsReady = true; fitSuffix(); });
    function tick(now) {
      const elapsed = now - start;
      const wordElapsed = elapsed - logoRevealDuration;
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
      counter.textContent = `${Math.min(99, Math.floor(elapsed / sequenceDuration * 100))}%`;
      const ready = (fontsReady && document.readyState === 'complete') || elapsed > 4200;
      if (elapsed >= sequenceDuration && ready) {
        counter.textContent = '100%';
        exitTimer = setTimeout(() => {
          root.dataset.loading = 'leaving';
          exitTimer = setTimeout(release, 820);
        }, 160);
        return;
      }
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
  }, { once: true });
})();

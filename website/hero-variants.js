/* Temporary, removable background comparison; foreground layout is shared. */
(() => {
  const root = document.documentElement;
  const switcher = document.querySelector('.hero-variant-switcher');
  if (!switcher) return;
  const buttons = [...switcher.querySelectorAll('[data-variant]')];
  const dotsToggle = switcher.querySelector('.dots-toggle');
  let dotsVisible = true;
  function syncDots() {
    root.dataset.heroDots = dotsVisible ? 'visible' : 'hidden';
    dotsToggle.textContent = dotsVisible ? 'Hide dots' : 'Show dots';
    dotsToggle.hidden = root.dataset.heroVariant !== 'frosted';
  }
  dotsToggle.addEventListener('click', () => {
    dotsVisible = !dotsVisible;
    syncDots();
    document.dispatchEvent(new CustomEvent('hero-dots-change'));
  });
  const key = 'sensum-hero-palette';
  function select(palette) {
    root.dataset.heroVariant = 'frosted';
    root.dataset.heroGraphic = 'particles';
    root.dataset.heroPalette = ['original', 'pastel'].includes(palette) ? palette : 'original';
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.variant === root.dataset.heroPalette)));
    try { localStorage.setItem(key, root.dataset.heroPalette); } catch { /* Selection still works for this view. */ }
    syncDots();
  }
  buttons.forEach(button => button.addEventListener('click', () => select(button.dataset.variant)));
  // Match the initial HTML: an old comparison choice must not flash color on load.
  select('original');
  switcher.hidden = true;
})();

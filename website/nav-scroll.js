(() => {
  const header = document.querySelector('.header-chrome');
  if (!header) return;
  const darkSections = [...document.querySelectorAll('[data-header-theme="dark"]')];
  const headerContent = header.querySelector('.site-header');
  let previousY = Math.max(0, window.scrollY);
  let distance = 0;
  let direction = 0;
  let frame = 0;
  const show = () => { header.dataset.hidden = 'false'; };
  const isEngaged = () => header.querySelector('details[open], .menu-toggle[aria-expanded="true"], :focus-visible');
  function update() {
    frame = 0;
    // Clamp elastic overscroll at both ends to avoid false direction changes.
    const maxY = Math.max(0, document.documentElement.scrollHeight - innerHeight);
    const y = Math.max(0, Math.min(window.scrollY, maxY));
    const delta = y - previousY;
    previousY = y;
    header.dataset.scrolled = String(y > 24);
    // Measure the resting header, independent of its hide-on-scroll transform.
    const headerMidpoint = (headerContent?.offsetHeight || 96) / 2;
    header.dataset.theme = darkSections.some(section => {
      const bounds = section.getBoundingClientRect();
      return bounds.top <= headerMidpoint && bounds.bottom > headerMidpoint;
    }) ? 'dark' : 'light';
    if (y < 96 || isEngaged()) {
      show(); distance = 0; direction = 0; return;
    }
    if (Math.abs(delta) < 1) return;
    const nextDirection = Math.sign(delta);
    if (nextDirection !== direction) distance = 0;
    direction = nextDirection;
    distance += Math.abs(delta);
    if (distance >= (direction > 0 ? 18 : 8)) {
      header.dataset.hidden = String(direction > 0);
      distance = 0;
    }
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(update); }
  header.dataset.scrollNav = 'true';
  header.addEventListener('focusin', show);
  header.addEventListener('toggle', schedule, true);
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('pageshow', () => { previousY = Math.max(0, window.scrollY); show(); schedule(); });
  show(); update();
})();

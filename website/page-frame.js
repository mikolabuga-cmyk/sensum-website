/* Native scroll remains authoritative; no wheel interception or nested scroller. */
(() => {
  const root = document.documentElement;
  if (!root.hasAttribute('data-page-frame')) return;
  const page = document.querySelector('#main');
  if (!page) return;
  let frame = 0, lastOrigin = -1;
  const transitions = new Set();
  const rows = [...document.querySelectorAll('.service-panel')].map(panel => {
    const edge = document.createElement('div');
    edge.className = 'page-frame-service-edges';
    edge.setAttribute('aria-hidden', 'true');
    document.body.append(edge);
    return { panel, edge };
  });
  const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
  const resizeObserver = new ResizeObserver(schedule);
  rows.forEach(({ panel }, index) => {
    resizeObserver.observe(panel);
    // The row owns the animation. Its edge extension has no separate easing.
    const track = event => {
      if (!['background-color', 'min-height'].includes(event.propertyName)) return;
      const key = `${index}:${event.propertyName}`;
      if (event.type === 'transitionrun') transitions.add(key);
      else transitions.delete(key);
      schedule();
    };
    ['transitionrun', 'transitionend', 'transitioncancel'].forEach(type => panel.addEventListener(type, track));
  });
  function update() {
    frame = 0;
    const height = innerHeight;
    const origin = Math.max(0, scrollY) + height / 2;
    if (origin !== lastOrigin) {
      page.style.transformOrigin = `50% ${origin}px`;
      lastOrigin = origin;
    }
    const gap = (innerWidth - page.getBoundingClientRect().width) / 2;
    // Read first, then write; mirror both incoming and departing rows throughout
    // their native CSS transitions, including scrolling with a stationary mouse.
    const states = rows.map(({ panel, edge }) => {
      const bounds = panel.getBoundingClientRect();
      const top = Math.max(gap, bounds.top);
      return { edge, top, height: Math.max(0, Math.min(height - gap, bounds.bottom) - top), color: getComputedStyle(panel).backgroundColor };
    });
    states.forEach(({ edge, top, height, color }) => {
      edge.style.top = `${top}px`;
      edge.style.height = `${height}px`;
      edge.style.color = color;
    });
    if (transitions.size) schedule();
  }
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule, { passive: true });
  addEventListener('pageshow', schedule);
  update();
})();

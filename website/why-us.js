(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const control = document.querySelector('.motion-toggle');
  const iconNames = ['layers', 'budget', 'calendar'];
  document.querySelectorAll('#why-us-v3 .why-us__index').forEach((slot, index) => {
    animateBenefitIcon(slot, iconNames[index]).catch(() => {
      // The CSS mask provides the static icon if its animation cannot load.
    });
  });

  async function animateBenefitIcon(slot, name) {
    const response = await fetch(new URL('assets/benefits/' + name + '.svg', document.baseURI));
    if (!response.ok) return;
    const asset = new DOMParser().parseFromString(await response.text(), 'image/svg+xml').documentElement;
    if (asset.localName !== 'svg') return;
    const svg = document.importNode(asset, true);
    const box = svg.viewBox.baseVal;
    const motions = [];
    const duration = 5760;

    for (const dot of svg.querySelectorAll('circle')) {
      const x = (dot.cx.baseVal.value - box.x) / box.width - 0.5;
      const y = (dot.cy.baseVal.value - box.y) / box.height - 0.5;
      const distance = Math.hypot(x, y);
      const angle = Math.atan2(y, x);
      const ring = name === 'budget' && distance > 0.34;
      // Stagger by height for the layers, angle for the coin, and date row for the calendar.
      const phase = name === 'budget' ? angle / (2 * Math.PI) : y + 0.28 * x;
      const dx = ring ? -12 * Math.sin(angle) : 3 * Math.sin(angle);
      const dy = ring ? 12 * Math.cos(angle) : name === 'layers' ? 11 : 5;
      dot.style.transformBox = 'fill-box';
      dot.style.transformOrigin = 'center';
      const motion = dot.animate([
        { transform: 'translate(0, 0) scale(0.88)', opacity: 0.65 },
        { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(1.18)', opacity: 1 },
        { transform: 'translate(0, 0) scale(0.88)', opacity: 0.65 }
      ], { duration, iterations: Infinity, easing: 'ease-in-out', delay: -(1 + phase) * duration });
      motion.pause();
      motions.push(motion);
    }
    svg.setAttribute('aria-hidden', 'true');
    slot.replaceChildren(svg);
    slot.classList.add('has-particles');
    let visible = false;
    function syncMotion() {
      const active = visible && !document.hidden && !reduced.matches && control?.dataset.paused !== 'true';
      for (const motion of motions) {
        if (active) motion.play();
        else motion.pause();
      }
    }
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      syncMotion();
    }).observe(slot);
    document.addEventListener('visibilitychange', syncMotion);
    reduced.addEventListener('change', syncMotion);
    if (control) new MutationObserver(syncMotion).observe(control, { attributes: true, attributeFilter: ['data-paused'] });
  }

  if (reduced.matches || control?.dataset.paused === 'true') return;

  document.querySelectorAll('.why-us__benefits').forEach(panel => {
    function finish() {
      delete panel.dataset.entrance;
      observer.disconnect();
      pauseObserver.disconnect();
      reduced.removeEventListener('change', finish);
      panel.removeEventListener('animationend', onAnimationEnd);
    }
    function onAnimationEnd(event) {
      if (event.animationName === 'benefit-expand' || (panel.classList.contains('why-us__benefits--cta') && event.animationName === 'benefit-copy')) finish();
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      panel.dataset.entrance = 'playing';
      observer.disconnect();
    }, { threshold: .15 });
    const pauseObserver = new MutationObserver(() => {
      if (control.dataset.paused === 'true') finish();
    });
    if (control) pauseObserver.observe(control, { attributes: true, attributeFilter: ['data-paused'] });
    reduced.addEventListener('change', finish);
    panel.addEventListener('animationend', onAnimationEnd);
    panel.dataset.entrance = 'waiting';
    observer.observe(panel);
  });
})();

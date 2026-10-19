(() => {
  'use strict';
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const previews = document.querySelectorAll('.portfolio-project__preview');
  const reset = preview => {
    preview.dataset.hoverActive = 'false';
    preview.dataset.hoverTracking = 'false';
    const label = preview.querySelector('.portfolio-project__hover');
    label?.style.removeProperty('left');
    label?.style.removeProperty('top');
  };

  previews.forEach(preview => {
    const label = preview.querySelector('.portfolio-project__hover');
    if (!label) return;
    const update = event => {
      if (!finePointer.matches || event.pointerType === 'touch') return;
      preview.dataset.hoverActive = 'true';
      if (reducedMotion.matches) return;
      const bounds = preview.getBoundingClientRect();
      // Keep the pill fully inside the preview, including at its corners.
      const insetX = Math.min(bounds.width / 2, 66);
      const insetY = Math.min(bounds.height / 2, 28);
      const x = Math.max(insetX, Math.min(bounds.width - insetX, event.clientX - bounds.left));
      const y = Math.max(insetY, Math.min(bounds.height - insetY, event.clientY - bounds.top));
      label.style.left = `${x}px`;
      label.style.top = `${y}px`;
      preview.dataset.hoverTracking = 'true';
    };
    preview.addEventListener('pointerenter', update);
    preview.addEventListener('pointermove', update);
    preview.addEventListener('pointerleave', () => reset(preview));
    preview.addEventListener('pointercancel', () => reset(preview));
  });
  const resetAll = () => previews.forEach(reset);
  finePointer.addEventListener('change', resetAll);
  reducedMotion.addEventListener('change', resetAll);
  window.addEventListener('blur', resetAll);
  window.addEventListener('scroll', resetAll, { passive: true });
})();

/* Accessible, layout-stable cycling words; shares the hero's motion control. */
(() => {
  const eyebrow = document.querySelector('.hero__eyebrow');
  const control = document.querySelector('.motion-toggle');
  const content = document.querySelector('.hero__content');
  if (!eyebrow || !control) return;
  const phrases = eyebrow.dataset.phrases?.split('|') || ['SaaS platforms', 'AI products', 'Mobile Apps'];
  const prefixCopy = eyebrow.dataset.prefix || 'Senior team for';
  const fullCopy = eyebrow.textContent.trim();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let index = 0, timer = 0, visible = true, built = false, running = false, word;
  function build() {
    eyebrow.replaceChildren();
    const accessible = document.createElement('span');
    accessible.className = 'sr-only'; accessible.textContent = fullCopy;
    const visual = document.createElement('span');
    visual.className = 'eyebrow-visual'; visual.setAttribute('aria-hidden', 'true');
    const prefix = document.createElement('span'); prefix.textContent = prefixCopy;
    const slot = document.createElement('span'); slot.className = 'eyebrow-slot';
    phrases.forEach(text => {
      const sizer = document.createElement('span');
      sizer.className = 'eyebrow-sizer';
      for (const letter of text) {
        const span = document.createElement('span');
        span.textContent = letter === ' ' ? '\u00a0' : letter;
        sizer.append(span);
      }
      slot.append(sizer);
    });
    word = document.createElement('span'); word.className = 'eyebrow-word';
    slot.append(word); visual.append(prefix, slot); eyebrow.append(accessible, visual);
    built = true; render('');
  }
  function render(phase) {
    const letters = [...phrases[index]].map((letter, i) => {
      const span = document.createElement('span'); span.textContent = letter === ' ' ? '\u00a0' : letter;
      span.style.setProperty('--i', i); return span;
    });
    word.replaceChildren(...letters); word.dataset.phase = phase;
  }
  function cycle() {
    word.dataset.phase = 'out';
    timer = setTimeout(() => {
      index = (index + 1) % phrases.length; render('in');
      timer = setTimeout(cycle, 3400);
    }, 620);
  }
  function sync() {
    const enabled = !reduced.matches;
    if (!enabled) {
      clearTimeout(timer); running = false; built = false;
      eyebrow.textContent = fullCopy; return;
    }
    if (!built) build();
    const shouldRun = !document.hidden && visible && control.dataset.paused !== 'true' && content?.dataset.pulling !== 'true';
    if (shouldRun === running) return;
    clearTimeout(timer); running = shouldRun; render('');
    if (running) timer = setTimeout(cycle, 3400);
  }
  new MutationObserver(sync).observe(control, { attributes: true, attributeFilter: ['hidden', 'data-paused'] });
  if (content) new MutationObserver(sync).observe(content, { attributes: true, attributeFilter: ['data-pulling'] });
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }).observe(eyebrow);
  reduced.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  sync();
})();

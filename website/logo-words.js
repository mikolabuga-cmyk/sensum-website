/* Keep the home mark steady; reveal a cycling suffix on hover or focus. */
(() => {
  const brand = document.querySelector('.brand');
  if (!brand) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const reveal = document.createElement('span');
  reveal.className = 'brand-reveal';
  reveal.setAttribute('aria-hidden', 'true');
  brand.append(reveal);
  const words = ['design', 'strategy', 'AI'];
  let timer, index = 0, active = false, hovered = false, focused = false;
  function showWord() {
    reveal.replaceChildren();
    const word = document.createElement('span');
    word.className = 'brand-reveal__word';
    [...`.${words[index]}`].forEach((letter, i) => {
      const char = document.createElement('span');
      char.textContent = letter;
      char.style.setProperty('--letter', i);
      word.append(char);
    });
    reveal.append(word);
    if (reduced.matches) return;
    timer = setTimeout(() => {
      word.classList.add('is-leaving');
      timer = setTimeout(() => {
        index = (index + 1) % words.length;
        showWord();
      }, 360);
    }, 1450);
  }
  function sync() {
    const next = hovered || focused;
    if (next === active) return;
    active = next;
    clearTimeout(timer);
    brand.classList.toggle('brand--revealing', active);
    if (active) { index = 0; showWord(); }
  }
  brand.addEventListener('pointerenter', e => {
    if (fine.matches && e.pointerType === 'mouse') { hovered = true; sync(); }
  });
  brand.addEventListener('pointerleave', () => { hovered = false; sync(); });
  brand.addEventListener('focus', () => { focused = true; sync(); });
  brand.addEventListener('blur', () => { focused = false; sync(); });
  window.addEventListener('blur', () => { hovered = focused = false; sync(); });
  reduced.addEventListener('change', () => { clearTimeout(timer); if (active) showWord(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { hovered = focused = false; sync(); }
  });
})();

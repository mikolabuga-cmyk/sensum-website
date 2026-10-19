/* Keep a complete accessible heading while its visual letters resolve in order. */
(() => {
  const hero = document.querySelector('.hero');
  const heading = document.querySelector('#hero-heading');
  if (!hero || !heading || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  heading.setAttribute('aria-label', [...heading.children].map(line => line.textContent).join(' '));
  const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);
  let index = 0;

  for (const node of textNodes) {
    const fragment = document.createDocumentFragment();
    for (const part of node.textContent.split(/(\s+)/)) {
      if (!part) continue;
      if (/^\s+$/.test(part)) {
        fragment.append(document.createTextNode(part));
        index++;
        continue;
      }
      const word = document.createElement('span');
      word.className = 'hero-word';
      for (const letter of part) {
        const character = document.createElement('span');
        character.className = 'hero-char';
        character.textContent = letter;
        character.style.setProperty('--char-index', index++);
        word.append(character);
      }
      fragment.append(word);
    }
    node.replaceWith(fragment);
  }
  for (const line of heading.children) line.setAttribute('aria-hidden', 'true');
  let finishTimer;
  // Option 2 gives its particle graphic an opening beat before foreground text.
  const finish = () => { clearTimeout(finishTimer); hero.classList.remove('hero--entering'); };
  function enter() {
    finish();
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const delay = document.documentElement.dataset.heroGraphic === 'particles' ? 1150 : 0;
    hero.style.setProperty('--intro-delay', `${delay}ms`);
    void hero.offsetWidth;
    hero.classList.add('hero--entering');
    finishTimer = setTimeout(finish, delay + Math.max(2500, 800 + index * 23));
  }
  enter();
  document.addEventListener('hero-variant-change', () => {
    if (document.documentElement.dataset.heroGraphic === 'particles') enter();
    else finish();
  });
  hero.addEventListener('focusin', finish);
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', finish);
})();

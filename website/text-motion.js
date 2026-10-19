/* Shared scroll-letter motion. Scene sequencing belongs to each section. */
(() => {
  const tokens = Object.freeze({
    feather: .12, dampingMs: 90, sceneDampingMs: 180,
    viewportStart: .65, viewportSpan: .60,
    heading: Object.freeze({ viewportStart: .90, viewportSpan: .18, feather: .72, dampingMs: 130 }),
    maxFrameMs: 64, initialFrameMs: 16, epsilon: .0001
  });
  const clamp = value => Math.max(0, Math.min(1, value));
  const smoothstep = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
  const viewportProgress = (top, height, profile = tokens) => clamp((height * profile.viewportStart - top) / Math.max(1, height * profile.viewportSpan));
  const damping = (time, lastTime, duration = tokens.dampingMs) =>
    1 - Math.exp(-(lastTime ? Math.min(Math.max(0, time - lastTime), tokens.maxFrameMs) : tokens.initialFrameMs) / duration);
  function split(element, prefix) {
    const text = element.textContent;
    const accessible = document.createElement('span');
    accessible.className = 'sr-only';
    accessible.textContent = text;
    const visual = document.createElement('span');
    visual.setAttribute('aria-hidden', 'true');
    const chars = [];
    text.split(/(\s+)/).forEach(token => {
      if (/^\s+$/.test(token)) { visual.append(document.createTextNode(token)); return; }
      const word = document.createElement('span');
      word.className = `${prefix}__word`;
      Array.from(token).forEach(letter => {
        const char = document.createElement('span');
        char.className = `${prefix}__char`;
        char.textContent = letter;
        word.append(char);
        chars.push({ element: char, value: -1 });
      });
      visual.append(word);
    });
    element.replaceChildren(accessible, visual);
    return chars;
  }
  function paint(chars, progress, feather = tokens.feather) {
    chars.forEach((char, index) => {
      const start = index / Math.max(1, chars.length - 1) * (1 - feather);
      const value = Number(smoothstep((progress - start) / feather).toFixed(4));
      if (value !== char.value) {
        char.element.style.setProperty('--reveal', value);
        char.value = value;
      }
    });
  }
  window.SensumTextMotion = Object.freeze({ tokens, clamp, smoothstep, viewportProgress, damping, split, paint });
})();

(() => {
 const cards = [...document.querySelectorAll('.work-v2__card')];
 if (!cards.length) return;
 const reduced = matchMedia('(prefers-reduced-motion: reduce)');
 let frame = 0;
 const clamp = value => Math.max(0, Math.min(1, value));
 function render() {
  frame = 0;
  const positions = cards.map(card => card.parentElement.getBoundingClientRect());
  cards.forEach((card, i) => {
   const rect = positions[i];
   const entering = clamp((innerHeight - rect.top) / (innerHeight * .55));
   const leaving = clamp(-rect.top / Math.max(1,rect.height));
   card.style.setProperty('--work-scale', reduced.matches ? 1 : 1 - .03 * (1-entering) - .03 * leaving);
  });
 }
 const schedule = () => { if (!frame) frame = requestAnimationFrame(render); };
 addEventListener('scroll', schedule, {passive:true});
 addEventListener('resize', schedule, {passive:true});
 reduced.addEventListener('change', schedule);
 cards.forEach(card => card.addEventListener('pointermove', event => {
  if (event.pointerType === 'touch') return;
  const rect = card.getBoundingClientRect();
  card.style.setProperty('--cursor-x', `${(event.clientX-rect.left)/rect.width*100}%`);
  card.style.setProperty('--cursor-y', `${(event.clientY-rect.top)/rect.height*100}%`);
 }));
 render();
})();

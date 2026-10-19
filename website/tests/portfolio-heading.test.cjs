const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync('website/text-motion.js', 'utf8') + '\n' + fs.readFileSync('website/portfolio-heading.js', 'utf8');
function setup(reduced = false) {
  const chars = [], events = {}, queue = new Map();
  let top = 950, time = 0, id = 0, mutation;
  const element = () => ({ dataset: {}, children: [], append(child) { this.children.push(child); }, setAttribute() {}, style: { setProperty(key, value) { this[key] = value; } } });
  const heading = Object.assign(element(), { textContent: 'Selected works', getBoundingClientRect: () => ({ top }), replaceChildren(...children) { this.children = children; } });
  const control = element();
  vm.runInNewContext(source, {
    document: { hidden: false, querySelector: s => s === '#work-heading' ? heading : control, createTextNode: text => ({ textContent: text }), createElement: () => { const el = element(); chars.push(el); return el; }, addEventListener() {} },
    window: { addEventListener: (name, fn) => { events[name] = fn; } },
    innerHeight: 1000,
    matchMedia: query => ({ matches: query.includes('reduced') && reduced, addEventListener() {} }),
    requestAnimationFrame: fn => { queue.set(++id, fn); return id; },
    cancelAnimationFrame: id => queue.delete(id),
    MutationObserver: class { constructor(fn) { mutation = fn; } observe() {} }
  });
  const flush = () => { for (let i = 0; queue.size && i < 500; i++) { const callbacks = [...queue.values()]; queue.clear(); time += 16; callbacks.forEach(fn => fn(time)); } assert.equal(queue.size, 0); };
  flush();
  return { heading, control, chars: chars.filter(c => c.className === 'portfolio-heading__char'), scroll(y) { top = y; events.scroll(); flush(); }, pause() { control.dataset.paused = 'true'; mutation(); flush(); } };
}
test('heading reveals overlapping letters in reading order over a short entrance and reverses with scrolling', () => {
  const h = setup();
  const values = () => h.chars.map(c => Number(c.style['--reveal']));
  assert.ok(values().every(v => v === 0));
  h.scroll(810);
  assert.ok(values().every(v => v > 0 && v < 1));
  assert.ok(new Set(values()).size > 1);
  assert.ok(values().every((value, index, all) => !index || value < all[index - 1]));
  h.scroll(720);
  assert.ok(values().every(v => v === 1));
  h.scroll(950);
  assert.ok(values().every(v => v === 0));
  assert.equal(h.heading.children[0].textContent, 'Selected works');
});
test('reduced motion and pause leave the heading static and readable', () => {
  assert.equal(setup(true).heading.dataset.reveal, undefined);
  const h = setup();
  h.pause();
  assert.equal(h.heading.dataset.reveal, undefined);
});

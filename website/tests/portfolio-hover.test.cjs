const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function setup({ fine = true, reduced = false } = {}) {
  const events = {}, windowEvents = {};
  const label = { style: { removeProperty(key) { delete this[key]; } } };
  const preview = {
    dataset: {}, querySelector: () => label,
    getBoundingClientRect: () => ({ left: 100, top: 200, width: 400, height: 225 }),
    addEventListener: (name, callback) => { events[name] = callback; }
  };
  const media = [fine, reduced].map(matches => ({ matches, addEventListener(_name, fn) { this.change = fn; } }));
  let index = 0;
  vm.runInNewContext(fs.readFileSync('website/portfolio-hover.js', 'utf8'), {
    matchMedia: () => media[index++], document: { querySelectorAll: () => [preview] },
    window: { addEventListener: (name, fn) => { windowEvents[name] = fn; } }
  });
  return { events, windowEvents, label, preview, media };
}
test('the hover label tracks within image bounds and restores the pointer on exit', () => {
  const h = setup();
  h.events.pointerenter({ pointerType: 'mouse', clientX: 101, clientY: 201 });
  assert.equal(h.label.style.left, '66px');
  assert.equal(h.label.style.top, '28px');
  h.events.pointermove({ pointerType: 'mouse', clientX: 499, clientY: 424 });
  assert.equal(h.label.style.left, '334px');
  assert.equal(h.label.style.top, '197px');
  assert.equal(h.preview.dataset.hoverTracking, 'true');
  h.events.pointerleave();
  assert.equal(h.preview.dataset.hoverTracking, 'false');
  assert.equal(h.preview.dataset.hoverActive, 'false');
});
test('touch and reduced motion never enable a moving custom cursor', () => {
  for (const options of [{ fine: false }, { reduced: true }]) {
    const h = setup(options);
    h.events.pointerenter({ pointerType: 'mouse', clientX: 300, clientY: 300 });
    assert.notEqual(h.preview.dataset.hoverTracking, 'true');
    assert.equal(h.label.style.left, undefined);
  }
  const h = setup();
  h.events.pointerenter({ pointerType: 'touch', clientX: 300, clientY: 300 });
  assert.notEqual(h.preview.dataset.hoverActive, 'true');
});
test('scroll, focus loss and motion preference changes reset the hover state', () => {
  const h = setup();
  for (const reset of [h.windowEvents.scroll, h.windowEvents.blur, h.media[1].change]) {
    h.events.pointerenter({ pointerType: 'mouse', clientX: 300, clientY: 300 });
    reset();
    assert.equal(h.preview.dataset.hoverTracking, 'false');
    assert.equal(h.label.style.left, undefined);
  }
});

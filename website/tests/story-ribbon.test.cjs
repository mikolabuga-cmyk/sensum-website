const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync(require('node:path').join(__dirname, '../story-reveal.js'), 'utf8');

function setup({ reduced = false, noGL = false } = {}) {
  let top = 400, time = 0, id = 0;
  const frames = new Map(), events = {}, values = {}, uniforms = {}, draws = [];
  const style = { setProperty: (key, value) => { values[key] = value; } };
  const gl = new Proxy({
    createProgram: () => ({}), createShader: () => ({}), createBuffer: () => ({}),
    getShaderParameter: () => true, getProgramParameter: () => true,
    getUniformLocation: (_, name) => name, getAttribLocation: () => 0,
    uniform1f: (name, value) => { uniforms[name] = value; },
    drawArrays: mode => draws.push(mode), clear: () => draws.push('clear'),
  }, { get: (obj, key) => key in obj ? obj[key] : key === key.toUpperCase() ? key : () => {} });
  const canvas = { dataset: {}, addEventListener() {}, getContext: () => noGL ? null : gl };
  const stage = { clientWidth: 1000, clientHeight: 800 };
  const section = {
    dataset: { openingOnly: 'true', textVersion: 'v4' }, style, offsetHeight: 1480,
    querySelector: s => s.includes('canvas') ? canvas : stage,
    getBoundingClientRect: () => ({ top, bottom: top + 1480 }),
  };
  const control = { dataset: {} }, hero = { style };
  const document = {
    hidden: false, addEventListener() {},
    querySelector: s => s === '.story-reveal' ? section : s === '.hero-shell' ? hero : control,
  };
  const window = { innerHeight: 800, devicePixelRatio: 1, addEventListener: (name, fn) => { events[name] = fn; } };
  vm.runInNewContext(source, {
    document, window, Float32Array,
    matchMedia: q => ({ matches: reduced && q.includes('reduced'), addEventListener() {} }),
    MutationObserver: class { observe() {} },
    requestAnimationFrame: fn => { frames.set(++id, fn); return id; },
    cancelAnimationFrame: key => frames.delete(key),
  });
  const tick = () => { const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(time += 40)); };
  return { section, canvas, values, uniforms, draws, frames, tick,
    scroll(y) { top = y; events.scroll(); for (let i = 0; i < 160; i++) tick(); } };
}

test('opening ribbon uses a transparent canvas, follows scroll, settles and reverses', () => {
  const h = setup(); h.tick();
  assert.equal(h.section.dataset.ribbonMotion, 'active');
  assert.equal(h.section.dataset.motion, undefined, 'does not restore the hidden second scene');
  assert.ok(h.draws.includes('clear')); assert.ok(h.draws.includes('POINTS'));
  assert.ok(!h.draws.includes('TRIANGLES'), 'no white or dark background plane');
  assert.equal(h.uniforms.u_progress, 0, 'never expands into a sphere');
  h.scroll(-300); assert.equal(h.uniforms.u_handoff, 1); assert.equal(h.frames.size, 0);
  h.scroll(300); assert.equal(h.uniforms.u_handoff, 0);
  assert.ok(Number(h.values['--story-pull']) > 0, 'hero reconnects on reverse scroll');
  assert.ok(h.frames.size > 0, 'dots keep moving while the line is visible');
});

test('ribbon remains static for reduced motion or missing WebGL', () => {
  for (const options of [{ reduced: true }, { noGL: true }]) {
    const h = setup(options);
    assert.equal(h.section.dataset.ribbonMotion, 'static');
    assert.equal(h.frames.size, 0);
  }
});

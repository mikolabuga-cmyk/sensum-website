const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('website/portfolio-grid.js', 'utf8');

function setup({ reduced = false, observer = true, hash = '#work' } = {}) {
  const cards = Array.from({ length: 6 }, () => ({ animate() {
    const animation = { cancel() { this.cancelled = true; } };
    played.push(animation);
    return animation;
  } }));
  const played = [], observed = [], unobserved = [];
  let callback, change, disconnected = false, replacement, scrolled = false;
  const section = { querySelectorAll: () => cards, scrollIntoView: () => { scrolled = true; } };
  const context = {
    document: { querySelector: () => section },
    location: { hash, pathname: '/', search: '?preview=1' },
    history: { replaceState: (_a, _b, path) => { replacement = path; } },
    requestAnimationFrame: fn => fn(),
    matchMedia: () => ({ matches: reduced, addEventListener: (_name, fn) => { change = fn; } }),
    window: observer ? { IntersectionObserver: true } : {},
    IntersectionObserver: class {
      constructor(fn) { callback = fn; }
      observe(card) { observed.push(card); }
      unobserve(card) { unobserved.push(card); }
      disconnect() { disconnected = true; }
    }
  };
  vm.runInNewContext(source, context);
  return { cards, played, observed, unobserved, callback, change,
    get disconnected() { return disconnected; }, get replacement() { return replacement; }, get scrolled() { return scrolled; } };
}

test('cards animate on entry only, without hiding unobserved content', () => {
  const h = setup();
  assert.equal(h.observed.length, 6);
  h.callback([{ target: h.cards[0], isIntersecting: false }]);
  assert.equal(h.played.length, 0);
  h.callback([{ target: h.cards[0], isIntersecting: true }]);
  assert.equal(h.played.length, 1);
  assert.deepEqual(h.unobserved, [h.cards[0]]);
});

test('reduced motion and missing observers leave a fully usable static grid', () => {
  assert.equal(setup({ reduced: true }).observed.length, 0);
  assert.equal(setup({ observer: false }).observed.length, 0);
  const h = setup();
  h.callback([{ target: h.cards[0], isIntersecting: true }]);
  h.change({ matches: true });
  assert.equal(h.disconnected, true);
  assert.equal(h.played[0].cancelled, true);
});

test('saved cover links lead to the new portfolio without opening a modal', () => {
  for (const hash of ['#case-workspace', '#case-focus', '#case-onboarding']) {
    const h = setup({ hash });
    assert.equal(h.replacement, '/?preview=1#work');
    assert.equal(h.scrolled, true);
  }
  assert.equal(setup().replacement, undefined);
});

test('four selected projects keep original links, local previews, and independent-column reading order', () => {
  const html = fs.readFileSync('website/index.html', 'utf8');
  const projects = JSON.parse(fs.readFileSync('website/assets/portfolio/references/sources.json', 'utf8'));
  assert.equal(projects.length, 6);
  const selected = ['ibm', 'cashee', 'seed', 'nova'];
  assert.equal((html.match(/class="portfolio-project__link"/g) || []).length, 4);
  const sectionStart = html.indexOf('<section class="portfolio-grid"');
  const section = html.slice(sectionStart, html.indexOf('</section>', sectionStart));
  const columns = section.split(/<div class="portfolio-grid__column /).slice(1);
  assert.deepEqual(columns.map(column => (column.match(/<article /g) || []).length), [2, 2]);
  assert.deepEqual([...section.matchAll(/references\/(\w+)\.jpg/g)].map(match => match[1]), selected);
  for (const project of projects.filter(project => selected.includes(project.id))) {
    assert.ok(html.includes(`href="${project.url}"`));
    assert.ok(fs.statSync(`website/assets/portfolio/references/${project.id}.jpg`).size > 1000);
  }
  assert.ok(!html.includes('portfolio-shelf'));
  assert.ok(!html.includes('portfolio-view'));
});

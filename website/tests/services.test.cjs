const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
test('four visible service rows retain accessible copy and decorative orbs', () => {
  const html = fs.readFileSync('website/index.html', 'utf8');
  const section = html.match(/<section class="services-stack"[\s\S]*?<\/section>/)[0];
  assert.equal((section.match(/<article /g) || []).length, 5);
  assert.equal((section.match(/<h3 /g) || []).length, 10);
  assert.equal((section.match(/class="service-panel__description"/g) || []).length, 5);
  assert.ok(!/<(?:details|canvas|button)\b/.test(section));
  const orbs = section.match(/<svg\b[^>]*>/g) || [];
  assert.equal(orbs.length, 4);
  assert.ok(orbs.every(orb => orb.includes('aria-hidden="true"')));
  const articles = section.match(/<article\b[^>]*>/g);
  assert.equal(articles.filter(article => !article.includes(' hidden')).length, 4);
  assert.ok(articles.find(article => article.includes('service-extension')).includes(' hidden'));
});

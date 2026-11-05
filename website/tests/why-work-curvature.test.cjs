const { test } = require('node:test');
const assert = require('node:assert/strict');

const load = () => import('../why-work-surface.js');
test('card vertices lie on a continuous convex cylinder with landscape proportions', async () => {
  const { curvedCardGeometry, CARD_WIDTH, CARD_HEIGHT, DEFAULT_RADIUS } = await load();
  const mesh = curvedCardGeometry();
  const positions = mesh.attributes.position;
  assert.ok(positions.count > 1000);
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), z = positions.getZ(i);
    assert.ok(z <= 0);
    assert.ok(Math.abs(x*x + (z + DEFAULT_RADIUS)**2 - DEFAULT_RADIUS**2) < .04);
  }
  assert.equal(positions.getZ(48), 0);
  assert.ok(positions.getZ(0) < -40);
  assert.ok(Math.abs(mesh.attributes.normal.getX(0)) > .3);
  const chordRatio = (mesh.boundingBox.max.x - mesh.boundingBox.min.x) / CARD_HEIGHT;
  assert.ok(chordRatio >= 1.4 && chordRatio <= 1.5);
  assert.equal(CARD_WIDTH / CARD_HEIGHT, 1.45);
  mesh.dispose();
});
test('changing radius adjusts depth without changing vertical proportions or UVs', async () => {
  const { curvedCardGeometry, CARD_HEIGHT } = await load();
  const stronger = curvedCardGeometry(650), flatter = curvedCardGeometry(1400);
  assert.ok(stronger.attributes.position.getZ(0) < flatter.attributes.position.getZ(0));
  assert.ok(Math.abs(stronger.boundingBox.max.y - stronger.boundingBox.min.y - CARD_HEIGHT) < .001);
  assert.deepEqual(stronger.attributes.uv.array, flatter.attributes.uv.array);
  stronger.dispose(); flatter.dispose();
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const load = () => import('../why-work-orbit.js');
test('each image advances left to right and reaches the foreground in source order', async () => {
  const { cardOrbitPose: pose } = await load();
  for (let index=0; index<6; index++) {
    const center=(index+1.8)/8.6;
    const before=pose(center-.05,index,6,600,120);
    const front=pose(center,index,6,600,120);
    const after=pose(center+.05,index,6,600,120);
    assert.ok(before.x<front.x && front.x<after.x);
    assert.ok(before.y>front.y && front.y>after.y);
    assert.ok(before.z<front.z && after.z<front.z);
    assert.ok(Math.abs(front.x)<1e-10 && Math.abs(front.rotationY)<1e-10);
    assert.ok(before.rotationY<0 && after.rotationY>0);
  }
});
test('finite sequence has no wrapped last image at entry or first image at exit', async () => {
  const { cardOrbitPose: pose } = await load();
  assert.equal(pose(0,5,6,600,120).opacity,0);
  assert.equal(pose(1,0,6,600,120).opacity,0);
  assert.ok(pose(0,0,6,600,120).opacity > 0);
  for (const count of [5,6]) {
    const last = count - 1;
    assert.ok(pose(.95,last,count,600,120).opacity > 0);
    for (const progress of [.98,1]) {
      for (let index=0; index<count; index++) {
        assert.equal(pose(progress,index,count,600,120).opacity,0);
      }
    }
  }
});
test('orbit is continuous, deterministic, elliptical and limits prominent images', async () => {
  const { cardOrbitPose: pose } = await load();
  for (let i=0;i<=1000;i++) {
    const progress=i/1000;
    let prominent=0;
    for (let index=0;index<6;index++) {
      const p=pose(progress,index,6,600,120);
      assert.ok(Math.abs((p.x/600)**2+((p.z+600)/600)**2-1)<1e-10);
      assert.deepEqual(p,pose(progress,index,6,600,120));
      if(p.opacity>.8) prominent++;
      if(i) {
        const previous=pose((i-1)/1000,index,6,600,120);
        assert.ok(Math.abs(p.x-previous.x)<4);
        assert.ok(Math.abs(p.rotationY-previous.rotationY)<.4);
        assert.ok(Math.abs(p.opacity-previous.opacity)<.03);
      }
    }
    assert.ok(prominent<=4);
  }
});
test('pointer rotation is bounded and cannot replace the scroll trajectory', async () => {
  const { cardOrbitPose, cardPointerPose } = await load();
  const orbit = cardOrbitPose(.1,0,6,530,100), copy={...orbit};
  assert.equal(cardPointerPose({x:1,y:0},1).rotationY,2.5);
  assert.ok(cardPointerPose({x:1,y:0},.4).rotationY<2.5);
  assert.equal(cardPointerPose({x:0,y:0},1).rotationY,0);
  assert.deepEqual(orbit,copy);
});
test('idle float is smooth, bounded and independent without modifying orbit progress', async () => {
  const { cardFloatPose } = await load();
  for (let index=0;index<6;index++) {
    for(let time=0;time<40;time+=.1) {
      const p=cardFloatPose(time,index), next=cardFloatPose(time+.016,index);
      assert.ok(Math.abs(p.x)<=3 && Math.abs(p.y)<=10 && Math.abs(p.z)<=4);
      assert.ok(Math.abs(p.rotationY)<=.8);
      assert.ok(Math.abs(next.y-p.y)<.11);
      assert.ok(Math.abs(p.y + cardFloatPose(time,index+1).y)<1e-10);
      assert.ok(Object.values(cardFloatPose(time,index,0)).every(v=>v===0));
    }
  }
  assert.notDeepEqual(cardFloatPose(3,0),cardFloatPose(3,1));
});

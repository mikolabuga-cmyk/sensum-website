const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function setup() {
  const node = () => ({ children: [], attributes: {}, style: { setProperty(k,v) { this[k]=v; } }, append(child) { this.children.push(child); }, replaceChildren(...children) { this.children=children; }, setAttribute(k,v) { this.attributes[k]=v; } });
  const context = { window: {}, document: { createElement: node, createTextNode: textContent => ({ textContent }) } };
  vm.runInNewContext(fs.readFileSync('website/text-motion.js','utf8'), context);
  return { motion: context.window.SensumTextMotion, node };
}
test('splitting keeps unsplit accessible copy, whitespace, and complete words', () => {
  const {motion,node}=setup(), el=node();
  el.textContent='Better  decisions.\nStronger products.';
  const chars=motion.split(el,'text-reveal');
  assert.equal(el.children[0].textContent,el.textContent);
  assert.equal(el.children[1].attributes['aria-hidden'],'true');
  assert.equal(el.children[1].children[1].textContent,'  ');
  assert.equal(el.children[1].children[3].textContent,'\n');
  assert.equal(chars.map(c=>c.element.textContent).join(''),'Betterdecisions.Strongerproducts.');
});
test('all text roles share identical monotonic, reversible letter values', () => {
  const {motion,node}=setup();
  const roles=['point-of-view','photo-story','portfolio-heading'].map(prefix=>{
    const el=node();el.textContent='Selected works';return motion.split(el,prefix);
  });
  for (const progress of [0,.2,.5,.8,1,.8,.5,.2,0]) {
    roles.forEach(chars=>motion.paint(chars,progress));
    const values=roles.map(chars=>Array.from(chars,c=>c.value));
    assert.deepEqual(values[0],values[1]);assert.deepEqual(values[1],values[2]);
    assert.ok(values[0].every((v,i,a)=>v>=0&&v<=1&&(!i||v<=a[i-1])));
  }
});
test('scroll mapping and damping stay bounded without overshoot', () => {
  const {motion}=setup();
  assert.equal(motion.viewportProgress(650,1000),0);
  assert.equal(motion.viewportProgress(350,1000),.5);
  assert.equal(motion.viewportProgress(50,1000),1);
  assert.equal(motion.viewportProgress(-100,1000),1);
  let current=0;
  for(let i=1;i<=100;i++) {
    current+=(1-current)*motion.damping(i*16,(i-1)*16);
    assert.ok(current>=0&&current<=1);
  }
  assert.ok(current>.999);
  assert.equal(motion.damping(10000,100),motion.damping(164,100));
});

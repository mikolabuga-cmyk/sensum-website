const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('website/particle-portrait.js','utf8').replace(/^import.*\n/,'').replaceAll('export ','');
const context={THREE:{BufferGeometry:class{constructor(){this.attributes={};}setAttribute(k,v){this.attributes[k]=v;}},BufferAttribute:class{constructor(array,itemSize){this.array=array;this.itemSize=itemSize;}}},document:{querySelector:()=>null,querySelectorAll:()=>[]},Float32Array,Math};
vm.createContext(context);vm.runInContext(source,context);
test('quality tiers build deterministic, jittered UV grids with valid map coordinates',()=>{
 for(const count of [160,200,256]){
  const a=context.makeGeometry(count).attributes,b=context.makeGeometry(count).attributes;
  assert.equal(a.position.array.length,count*count*3);
  assert.deepEqual(a.position.array,b.position.array);
  assert.ok(a.uv.array.every(v=>v>0&&v<1));
  assert.ok(a.aSeed.array.every(v=>v>=0&&v<1));
  assert.ok(a.position.array.every(Number.isFinite));
 }
});
test('loading failure keeps the fallback and releases the WebGL renderer',async()=>{
 let disposed=false;const host={dataset:{}};
 context.matchMedia=()=>({matches:false});
 context.THREE.TextureLoader=class{loadAsync(){return Promise.reject(new Error('missing'));}};
 context.THREE.WebGLRenderer=class{dispose(){disposed=true;}};
 context.console={warn(){}};
 assert.equal(await context.mountParticlePortrait(host,{}),null);
 assert.equal(host.dataset.status,'fallback');assert.equal(disposed,true);
});

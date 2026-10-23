const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function setup({reduced=false,forced=false,available=true}={}) {
  const frames=new Map(),events={},media=[];let id=0,intersection,pauseChange;
  const ctx={dots:[],clearRect(){this.dots=[];},setTransform(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fill(){},arc(x,y){this.dots.push([x,y]);}};
  const stage={getBoundingClientRect:()=>({width:1200,height:600,top:100,bottom:700})};
  const canvas={parentElement:stage,getContext:()=>available?ctx:null};
  const pause={dataset:{}};
  const doc={hidden:false,querySelector:s=>s==='.services-atmosphere'?canvas:pause,addEventListener:(k,f)=>events[k]=f};
  const context={document:doc,window:{devicePixelRatio:3,IntersectionObserver:true,addEventListener:(k,f)=>events[k]=f},matchMedia:q=>{const m={matches:q.includes('reduced')?reduced:forced,addEventListener:(k,f)=>m.change=f};media.push(m);return m;},requestAnimationFrame:f=>{frames.set(++id,f);return id;},cancelAnimationFrame:i=>frames.delete(i),IntersectionObserver:class{constructor(f){intersection=f;}observe(){}},MutationObserver:class{constructor(f){pauseChange=f;}observe(){}}};
  vm.runInNewContext(fs.readFileSync('website/services-atmosphere.js','utf8'),context);
  return {ctx,canvas,frames,doc,events,media,show(v){intersection([{isIntersecting:v}]);},pause(){pause.dataset.paused='true';pauseChange();},tick(t){const callbacks=[...frames.values()];frames.clear();callbacks.forEach(f=>f(t));}};
}
test('service particles drift within bounds at capped resolution only while visible',()=>{
 const h=setup();assert.equal(h.frames.size,0);assert.equal(h.canvas.width,2400);assert.ok(h.ctx.dots.length>0 && h.ctx.dots.length<=12000);
 h.show(true);h.tick(10);const first=JSON.stringify(h.ctx.dots);h.tick(50);assert.notEqual(JSON.stringify(h.ctx.dots),first);
 assert.ok(h.ctx.dots.every(([x,y])=>x>=0&&x<1200&&y>=0&&y<600));h.show(false);assert.equal(h.frames.size,0);
});
test('pause, hidden page, reduced motion, and forced colors stop background work',()=>{
 for(const stop of [h=>h.pause(),h=>{h.doc.hidden=true;h.events.visibilitychange();},h=>{h.media[0].matches=true;h.media[0].change();},h=>h.events.pagehide()]) {
  const h=setup();h.show(true);h.tick(10);stop(h);assert.equal(h.frames.size,0);
 }
 for(const options of [{reduced:true},{forced:true}]){const h=setup(options);h.show(true);assert.equal(h.frames.size,0);assert.equal(h.ctx.dots.length,0);}
 assert.equal(setup({available:false}).frames.size,0);
});

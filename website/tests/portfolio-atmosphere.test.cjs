const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function setup({fine=true,reduced=false,forced=false,canvas=true}={}) {
  const timers=new Map(), frames=new Map(), events={}, docEvents={};let id=0, observer;
  const ctx={setTransform(){},clearRect(){},beginPath(){},arc(x,y){this.count=(this.count||0)+1;const edge=Math.min(x/600,1-x/600,y/340,1-y/340);assert.ok(edge>0&&edge<.075);},fill(){}};
  const previews=Array.from({length:2},()=>({dataset:{},events:{},children:[],getBoundingClientRect:()=>({left:0,top:0,width:600,height:340}),append(el){this.children.push(el);},addEventListener(name,fn){this.events[name]=fn;}}));
  const media=[fine,reduced,forced].map(matches=>({matches,addEventListener(_,fn){this.change=fn;}}));let mi=0;
  const control={dataset:{}};
  const document={body:{children:[],append(el){this.children.push(el);}},hidden:false,querySelector:()=>control,querySelectorAll:()=>previews,createElement:()=>({dataset:{},getContext:()=>canvas?ctx:null,setAttribute(){}}),addEventListener(name,fn){docEvents[name]=fn;}};
  vm.runInNewContext(fs.readFileSync('website/portfolio-atmosphere.js','utf8'),{
    document,window:{innerWidth:1070,innerHeight:988,devicePixelRatio:3,addEventListener(name,fn){events[name]=fn;}},matchMedia:()=>media[mi++],
    setTimeout(fn,delay){timers.set(++id,{fn,delay});return id;},clearTimeout(id){timers.delete(id);},requestAnimationFrame(fn){frames.set(++id,fn);return id;},cancelAnimationFrame(id){frames.delete(id);},
    MutationObserver:class{constructor(fn){observer=fn;}observe(){}}
  });
  const pointer=(index=0,type='pointerenter',pointerType='mouse')=>previews[index].events[type]({clientX:300,clientY:170,pointerType});
  const dwell=()=>{const callbacks=[...timers.values()];timers.clear();callbacks.forEach(({fn})=>fn());};
  const tick=time=>{const callbacks=[...frames.values()];frames.clear();callbacks.forEach(fn=>fn(time));};
  return{previews,media,control,document,events,docEvents,timers,frames,pointer,dwell,tick,ctx,pause(){control.dataset.paused='true';observer();}};
}
test('dense dots start immediately, stay in the outer band, and only one preview runs',()=>{
  const h=setup();h.pointer();
  assert.equal(h.previews[0].dataset.atmosphere,'active');
  assert.equal(h.frames.size,1);assert.equal(h.timers.size,0);
  assert.equal(h.previews[0].dataset.dots,'active');
  h.pointer(0,'pointermove');assert.equal(h.timers.size,0);assert.equal(h.frames.size,1);
  h.dwell();h.tick(16);
  assert.equal(h.previews[0].dataset.dots,'active');assert.ok(h.ctx.count>10000);assert.equal(h.frames.size,1);
  assert.equal(h.previews[0].children[0].width,1200);
  assert.equal(h.previews[0].children[0].height,680);
  assert.equal(h.previews[0].children[0].dataset.active,'true');
  assert.equal(h.document.body.children.length,0);
  h.pointer(1);assert.equal(h.previews[0].dataset.dots,undefined);
  assert.equal(h.previews[0].children[0].dataset.active,undefined);assert.equal(h.frames.size,1);
  h.dwell();assert.equal(h.previews[1].dataset.dots,'active');
  h.previews[1].events.pointerleave();assert.equal(h.frames.size,0);assert.equal(h.timers.size,0);
});
test('touch, accessibility settings and unavailable canvas retain the ordinary preview',()=>{
  for(const options of [{fine:false},{reduced:true},{forced:true},{canvas:false}]){
    const h=setup(options);h.pointer();h.dwell();assert.equal(h.previews[0].dataset.atmosphere,undefined);assert.equal(h.frames.size,0);
  }
  const h=setup();h.pointer(0,'pointerenter','touch');assert.equal(h.timers.size,0);
});
test('scroll, visibility, pause and preference changes cancel pending and running work',()=>{
  for(const trigger of [h=>h.events.scroll(),h=>h.events.resize(),h=>h.events.blur(),h=>h.events.pagehide(),h=>h.docEvents.visibilitychange(),h=>h.pause(),h=>h.media[1].change(),h=>h.previews[0].events.pointercancel()]){
    for(const running of [false,true]){
      const h=setup();h.pointer();if(running){h.dwell();h.tick(16);}trigger(h);
      assert.equal(h.frames.size,0);assert.equal(h.timers.size,0);assert.equal(h.previews[0].dataset.atmosphere,undefined);assert.equal(h.previews[0].dataset.dots,undefined);
    }
  }
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
test('row orbs mount lazily and stop work offscreen, when paused, or with reduced motion', () => {
  const visuals = Array.from({length:5},()=>({dataset:{}}));
  visuals.forEach(svg => {
    svg.parentElement = { querySelector: () => svg };
    svg.panel = { addEventListener(key, fn) { this[key] = fn; }, contains: () => false };
    svg.closest = () => svg.panel;
  });
  const control = {dataset:{}};
  const mounted = [], events = {}, media = [];
  let intersection, pauseChanged;
  const doc = {hidden:false,querySelectorAll:()=>visuals,querySelector:()=>control,addEventListener:(key,fn)=>events[key]=fn};
  const source = fs.readFileSync('website/services-orb.js','utf8').replace(/^import[^\n]+\n/gm,'');
  vm.runInNewContext(source, {
    cube: {}, document:doc,window:{addEventListener:(key,fn)=>events[key]=fn},
    matchMedia:query=>{const m={matches:query.includes('hover'),addEventListener:(_,fn)=>m.change=fn};media.push(m);return m;},
    IntersectionObserver:class {constructor(fn){intersection=fn;}observe(){}},
    MutationObserver:class {constructor(fn){pauseChanged=fn;}observe(){}},
    mountOrb:svg=>{const orb={svg,running:true,pause(){this.running=false;},play(){this.running=true;},destroy(){this.running=false;this.dead=true;}};mounted.push(orb);return orb;}
  });
  assert.equal(mounted.length,0);
  intersection([{target:visuals[0].parentElement,isIntersecting:true}]);
  assert.equal(mounted.length,0);
  visuals[0].panel.pointerenter();
  assert.equal(mounted.length,1);assert.equal(mounted[0].running,true);
  visuals[0].panel.pointerleave();assert.equal(mounted[0].running,false);
  visuals[0].panel.focusin();assert.equal(mounted[0].running,true);
  visuals[0].panel.focusout({relatedTarget:null});assert.equal(mounted[0].running,false);
  visuals[1].panel.pointerenter();
  intersection([{target:visuals[0].parentElement,isIntersecting:false},{target:visuals[1].parentElement,isIntersecting:true}]);
  assert.equal(mounted[0].running,false);assert.equal(mounted[1].running,true);
  control.dataset.paused='true';pauseChanged();assert.ok(mounted.every(o=>!o.running));
  control.dataset.paused='false';pauseChanged();assert.equal(mounted[1].running,true);
  doc.hidden=true;events.visibilitychange();assert.ok(mounted.every(o=>!o.running));
  doc.hidden=false;events.visibilitychange();
  media[0].matches=true;media[0].change();assert.ok(mounted.every(o=>!o.running));
  assert.equal(mounted.filter(o=>!o.dead).length,1);
  media[0].matches=false;media[0].change();assert.equal(mounted.at(-1).running,true);
  events.pagehide();assert.ok(mounted.every(o=>!o.running));
});

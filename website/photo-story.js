(() => {
  const section = document.querySelector('.photo-story');
  if (!section) return;
  const motion = window.SensumTextMotion;
  if (!motion) return;
  const stage = section.querySelector('.photo-story__stage');
  const narrative = section.closest('.narrative');
  const shared = () => narrative?.dataset.openingParticles === 'active';
  const items = [...section.querySelectorAll('[data-float]')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const forced = matchMedia('(forced-colors: active)');
  const control = document.querySelector('.motion-toggle');
  const messages = [...section.querySelectorAll('.photo-story__message')]
    .map(message => motion.split(message, 'photo-story'));
  const paths = {
    flowers: [-3, 10, 3, -5, .34], window: [-9, 14, 5, 7, .40],
    keyboard: [7, 15, -5, -3, .37], direction: [-6, 6, 3, -2, .31],
    review: [10, 9, -4, 3, .32], outcomes: [4, 16, -6, -4, .36]
  };
  const orbits = new Map();
  const clamp = n => Math.max(0, Math.min(1, n));
  const smooth = (a,b,n) => { const t=clamp((n-a)/(b-a));return t*t*(3-2*t); };
  const arrive = (a,b,n) => { const t=clamp((n-a)/(b-a));return t*t*t*(t*(t*6-15)+10); };
  const enabled = () => !reduced.matches && !forced.matches && control?.dataset.paused !== 'true';
  let frame=0,lastTime=0,current=null;
  function measureOrbits() {
    const rx=stage.clientWidth/2, ry=stage.clientHeight/2;
    if (!rx || !ry) return;
    for (const item of items) {
      // Measure untransformed layout so resizing and reverse scrolling never
      // accumulate offsets. Elliptical orbits keep the reading area open.
      orbits.set(item, {
        x:(item.offsetLeft+item.offsetWidth/2-rx)/rx,
        y:(item.offsetTop+item.offsetHeight/2-ry)/ry, rx, ry
      });
    }
  }
  function render(time) {
    frame=0;
    if (!enabled() || document.hidden) return;
    const inStory=shared();
    const box=(inStory?narrative:section).getBoundingClientRect();
    const height=stage.clientHeight;
    if (box.bottom<0 || box.top>innerHeight) { lastTime=0;current=null;return; }
    // The entrance begins before the sticky hold; the final state is held on exit.
    // The glyph grains finish at ~60svh. Immediately grow the photos into
    // that same pinned frame, then keep drifting around the two messages.
    const target=inStory
      ? clamp((-box.top-innerHeight*.60)/(innerHeight*1.30))
      : clamp((height*.72-box.top)/(section.offsetHeight-height+height*.72));
    // Smooth even the first wheel tick after resting; initialization still
    // restores the exact scroll position without an entrance replay.
    const ease=motion.damping(time, lastTime, motion.tokens.sceneDampingMs);
    lastTime=time;
    current=current===null?target:current+(target-current)*ease;
    if (Math.abs(target-current)<.0001) current=target;
    const enter=smooth(.02,.28,current), drift=smooth(.28,.94,current);
    section.style.setProperty('--photo-enter', smooth(0,.20,current).toFixed(4));
    const change=smooth(.56,.70,current);
    section.style.setProperty('--photo-first', (1-change).toFixed(4));
    section.style.setProperty('--photo-second', smooth(.66,.80,current).toFixed(4));
    section.style.setProperty('--photo-shift', `${(change*-22).toFixed(2)}px`);
    messages.forEach((chars, index) => {
      const progress = index === 0 ? clamp(current/.28) : clamp((current-.66)/.22);
      motion.paint(chars, progress);
    });
    // Like the reference, rotate the arrangement clockwise, countering any
    // image tilt by translating each center along its orbit instead.
    const angle=(-38+48*smooth(0,.88,current))*Math.PI/180;
    const cos=Math.cos(angle), sin=Math.sin(angle);
    for (const [index,item] of items.entries()) {
      const [x,y,dx,dy,scale]=paths[item.dataset.float];
      const start=index*.008;
      const arrival=inStory?arrive(start,.40+start,current):enter;
      const size=inStory?.72+.28*arrival:scale+(1-scale)*arrival;
      // Let a substantial fragment emerge softly, rather than ballooning
      // from a point. The same scroll position always yields the same pose.
      if(inStory) item.style.opacity=arrive(start,.18+start,current).toFixed(4);
      else item.style.removeProperty('opacity');
      const orbit=orbits.get(item);
      if (inStory && orbit) {
        const px=(orbit.x*cos-orbit.y*sin-orbit.x)*orbit.rx;
        const py=(orbit.x*sin+orbit.y*cos-orbit.y)*orbit.ry;
        item.style.transform=`translate3d(${px.toFixed(3)}px,${py.toFixed(3)}px,0) scale(${size.toFixed(4)})`;
      } else {
        const px=x*(1-arrival)+dx*drift, py=y*(1-arrival)+dy*drift;
        item.style.transform=`translate3d(${px.toFixed(3)}vw,${py.toFixed(3)}svh,0) scale(${size.toFixed(4)})`;
      }
    }
    if (current!==target) schedule();else lastTime=0;
  }
  function schedule() { if (!frame && enabled() && !document.hidden) frame=requestAnimationFrame(render); }
  function sync() {
    cancelAnimationFrame(frame);frame=0;lastTime=0;current=null;
    section.dataset.motion=enabled()?'active':'static';
    measureOrbits();
    if (!enabled()) {
      items.forEach(item=>{item.style.removeProperty('transform');item.style.removeProperty('opacity');});
      ['--photo-first','--photo-second','--photo-shift','--photo-enter'].forEach(name=>section.style.removeProperty(name));
    }
    schedule();
  }
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',sync,{passive:true});
  window.addEventListener('pageshow',sync);
  document.addEventListener('visibilitychange',sync);
  reduced.addEventListener('change',sync);forced.addEventListener('change',sync);
  if(control)new MutationObserver(sync).observe(control,{attributes:true,attributeFilter:['data-paused']});
  if(narrative)new MutationObserver(sync).observe(narrative,{attributes:true,attributeFilter:['data-opening-particles']});
  if ('ResizeObserver' in window) {
    const observer=new ResizeObserver(()=>{measureOrbits();schedule();});
    observer.observe(stage);
    items.forEach(item=>observer.observe(item));
  }
  window.addEventListener('pagehide',()=>{cancelAnimationFrame(frame);frame=0;});
  sync();
})();

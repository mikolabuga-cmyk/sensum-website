/* Hover-only visual cursor gravity. Native hit-testing and links remain unchanged. */
(() => {
  const enabled = matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) and (forced-colors: none)');
  const previews = [...document.querySelectorAll('.portfolio-project__preview')];
  if (!previews.length) return;
  // Rasterize a compact arrow locally; no platform cursor asset is bundled.
  const raster = document.createElement('canvas');
  raster.width = 48; raster.height = 64;
  const ctx = raster.getContext('2d');
  if (!ctx) return;
  ctx.scale(2,2);
  ctx.beginPath();ctx.moveTo(2,2);ctx.lineTo(2,24);ctx.lineTo(8,18);
  ctx.lineTo(13,28);ctx.lineTo(17,26);ctx.lineTo(12,16);ctx.lineTo(21,16);ctx.closePath();
  ctx.lineJoin='round';ctx.lineWidth=2;ctx.strokeStyle='#fff';ctx.fillStyle='#080808';ctx.stroke();ctx.fill();
  const cursor = document.createElement('canvas');
  cursor.width=200;cursor.height=200;cursor.setAttribute('aria-hidden','true');
  const paint=cursor.getContext('2d');
  if(!paint)return;
  cursor.className='portfolio-gravity-cursor';cursor.hidden=true;document.body.append(cursor);
  let active=null,frame=0,last=0,mouseX=0,mouseY=0,pullX=0,pullY=0,targetX=0,targetY=0;
  const stop=()=>{
    active?.classList.remove('portfolio-gravity-active');active=null;
    document.documentElement.classList.remove('portfolio-gravity-near');
    cursor.hidden=true;cancelAnimationFrame(frame);frame=last=0;
    pullX=pullY=targetX=targetY=0;
  };
  // Texture each small triangle separately: the arrow bends rather than rotating
  // as a rigid image. Its tip remains at the true pointer/click location.
  const triangle=(src,dst)=>{
    const [a,b,c]=src,[p,q,r]=dst;
    const det=(b[0]-a[0])*(c[1]-a[1])-(c[0]-a[0])*(b[1]-a[1]);
    const A=((q[0]-p[0])*(c[1]-a[1])-(r[0]-p[0])*(b[1]-a[1]))/det;
    const B=((q[1]-p[1])*(c[1]-a[1])-(r[1]-p[1])*(b[1]-a[1]))/det;
    const C=((r[0]-p[0])*(b[0]-a[0])-(q[0]-p[0])*(c[0]-a[0]))/det;
    const D=((r[1]-p[1])*(b[0]-a[0])-(q[1]-p[1])*(c[0]-a[0]))/det;
    paint.save();paint.beginPath();paint.moveTo(...p);paint.lineTo(...q);paint.lineTo(...r);paint.closePath();paint.clip();
    paint.transform(A,B,C,D,p[0]-A*a[0]-C*a[1],p[1]-B*a[0]-D*a[1]);
    paint.drawImage(raster,0,0,24,32);paint.restore();
  };
  const renderCursor=()=>{
    paint.setTransform(2,0,0,2,0,0);paint.clearRect(0,0,100,100);
    const warp=([u,v])=>{
      const weight=Math.min(1,Math.hypot(u-2,v-2)/27);
      return [40+u-2+pullX*weight*weight,40+v-2+pullY*weight*weight];
    };
    for(let y=0;y<32;y+=4)for(let x=0;x<24;x+=4){
      const a=[x,y],b=[x+4,y],c=[x+4,y+4],d=[x,y+4];
      triangle([a,b,c],[warp(a),warp(b),warp(c)]);
      triangle([a,c,d],[warp(a),warp(c),warp(d)]);
    }
    cursor.style.transform=`translate3d(${mouseX-40}px,${mouseY-40}px,0)`;
  };
  const draw=time=>{
    frame=0;if(!active)return;
    const ease=1-Math.exp(-Math.min(40,last?time-last:16)/85);last=time;
    pullX+=(targetX-pullX)*ease;pullY+=(targetY-pullY)*ease;
    renderCursor();
    if(Math.abs(targetX-pullX)+Math.abs(targetY-pullY)>.01)frame=requestAnimationFrame(draw);
    else last=0;
  };
  window.addEventListener('pointermove',event=>{
    if(!enabled.matches || event.pointerType!=='mouse' || document.hidden){stop();return;}
    const hit=previews.map(preview=>({preview,rect:preview.getBoundingClientRect()})).find(({rect:r})=>
      event.clientX>=r.left-36 && event.clientX<=r.right+36 && event.clientY>=r.top-36 && event.clientY<=r.bottom+36);
    if(!hit){stop();return;}
    if(active!==hit.preview){stop();active=hit.preview;active.classList.add('portfolio-gravity-active');cursor.hidden=false;}
    document.documentElement.classList.add('portfolio-gravity-near');
    mouseX=event.clientX;mouseY=event.clientY;
    const r=hit.rect,dx=r.left+r.width/2-mouseX,dy=r.top+r.height/2-mouseY;
    const length=Math.hypot(dx,dy);
    const outside=Math.hypot(Math.max(r.left-mouseX,0,mouseX-r.right),Math.max(r.top-mouseY,0,mouseY-r.bottom));
    const proximity=Math.max(0,1-outside/36);
    const strength=22*proximity*Math.min(1,length/60);
    targetX=dx/Math.max(1,length)*strength;targetY=dy/Math.max(1,length)*strength;
    renderCursor();if(!frame)frame=requestAnimationFrame(draw);
  },{passive:true});
  enabled.addEventListener('change',stop);
  window.addEventListener('scroll',stop,{passive:true});window.addEventListener('blur',stop);
  document.documentElement.addEventListener('pointerleave',stop);
  window.addEventListener('pointercancel',stop);
  document.addEventListener('visibilitychange',stop);document.addEventListener('keydown',stop);
})();

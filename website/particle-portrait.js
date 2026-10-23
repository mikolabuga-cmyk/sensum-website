import * as THREE from './vendor/three/three.module.min.js';

export const portraitDefaults = Object.freeze({
  depthStrength: .7, pointSizeMin: .65, pointSizeMax: 1.65,
  coreNoise: .012, edgeNoise: .12, noiseFrequency: 1.6, noiseSpeed: .3,
  maxRotationY: .14, maxRotationX: .06, focusRange: .6
});

const vertexShader = `
uniform sampler2D uColorA, uDepthA, uMaskA, uColorB, uDepthB, uMaskB;
uniform float uTime, uTransition, uDepthStrength, uMinSize, uMaxSize;
uniform float uCoreNoise, uEdgeNoise, uNoiseFrequency, uNoiseSpeed, uDpr, uMotion;
uniform float uFocusRange, uPointerActive, uIdentity;
uniform vec2 uPointer;
attribute float aSeed;
varying float vAlpha, vBrightness, vBlur;
// Analytic curl of a smooth periodic vector potential: bounded and divergence-free.
vec3 curlField(vec3 p) {
  return vec3(-sin(p.y)-cos(p.z), -sin(p.z)-cos(p.x), -sin(p.x)-cos(p.y)) * .5;
}
void main() {
  float mask = mix(texture2D(uMaskA, uv).r, texture2D(uMaskB, uv).r, uTransition);
  float depth = mix(texture2D(uDepthA, uv).r, texture2D(uDepthB, uv).r, uTransition);
  float light = mix(texture2D(uColorA, uv).r, texture2D(uColorB, uv).r, uTransition);
  float visible = smoothstep(.025, .65, mask);
  float edge = 1. - smoothstep(.35, .95, mask);
  vec3 p = vec3(position.xy, (depth-.5)*uDepthStrength);
  float chaos = sin(uTransition*3.14159265)*.10*uMotion;
  // Keep most points anchored to facial detail. A sparse veil moves independently
  // around that surface, carrying the hero field's opposing, coherent currents.
  float veil = smoothstep(.81, .98, aSeed);
  float phase = aSeed*6.2831853;
  float clock = uTime*uNoiseSpeed;
  vec3 flow = curlField(p*uNoiseFrequency*3. + clock + phase);
  vec3 current = vec3(
    sin(p.y*7.5+clock*.97)+.38*sin(p.x*11.-clock*.63),
    cos(p.x*6.5-clock*.77)+.38*sin(p.y*10.+clock*.57),
    sin(p.y*5.+clock*.8+phase)
  );
  p += current * mix(uCoreNoise,uEdgeNoise,max(edge,veil))*uMotion;
  p += flow * chaos;
  // Scatter actual portrait samples, never a flat image or a separate star layer.
  p.xy += normalize(p.xy+vec2(.001)) * veil * (.08+.14*edge);
  p.z += veil*sin(phase)*.22;
  float local = 1.-smoothstep(0., .22, distance(p.xy,uPointer));
  p.z += local*local*.018*uPointerActive*uMotion;
  // The portrait is fully formed from its first rendered frame.
  vec3 scattered = vec3(sin(phase*13.7), cos(phase*9.3), sin(phase*7.1))
    * vec3(1.25,1.35,.65);
  p = mix(scattered*.65, p, uIdentity);
  vec4 view = modelViewMatrix*vec4(p,1.);
  // Focal surface is centered on the face, not a screen-space blur pass.
  vBlur = smoothstep(.10,uFocusRange,abs(view.z+3.0));
  float variance = mix(.75,1.2,aSeed);
  gl_PointSize = mix(uMinSize,uMaxSize,pow(light,1.3))*variance*uDpr;
  gl_PointSize *= mix(1.,1.4,vBlur)*visible*(3.0 / max(.5,-view.z));
  vAlpha = visible*mix(.08,1.,pow(light,.85))*mix(1.,.45,vBlur);
  vAlpha *= mix(1.,.55,veil);
  vBrightness = mix(.45,1.,pow(light,.65));
  gl_Position = projectionMatrix*view;
}
`;
const fragmentShader = `
precision highp float;
varying float vAlpha, vBrightness, vBlur;
void main(){
 float d=length(gl_PointCoord-.5);
 float alpha=(1.-smoothstep(mix(.34,.10,vBlur),.5,d))*vAlpha;
 if(alpha<.015) discard;
 gl_FragColor=vec4(vec3(min(1.,vBrightness*1.30)),alpha);
}`;

function makeGeometry(count) {
  const position = new Float32Array(count*count*3);
  const uv = new Float32Array(count*count*2);
  const seed = new Float32Array(count*count);
  let random = 713;
  const rand = () => { random=(1664525*random+1013904223)>>>0; return random/4294967296; };
  for(let y=0;y<count;y++) for(let x=0;x<count;x++) {
    const i=y*count+x, u=(x+.5+(rand()-.5)*.7)/count, v=(y+.5+(rand()-.5)*.7)/count;
    uv[i*2]=u; uv[i*2+1]=v;
    position[i*3]=(u-.5)*2.8; position[i*3+1]=(v-.5)*2.8;
    seed[i]=rand();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(position,3));
  g.setAttribute('uv',new THREE.BufferAttribute(uv,2));
  g.setAttribute('aSeed',new THREE.BufferAttribute(seed,1));
  return g;
}

export async function mountParticlePortrait(host, portrait, config={}) {
  const settings={...portraitDefaults,...config};
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const coarse=matchMedia('(hover: none)');
  const loader=new THREE.TextureLoader();
  const load = async data => {
    const results=await Promise.allSettled(['colorMap','depthMap','maskMap'].map(k=>loader.loadAsync(data[k])));
    if(results.some(r=>r.status==='rejected')) {
      results.forEach(r=>{if(r.status==='fulfilled')r.value.dispose();});
      throw new Error('Portrait map unavailable');
    }
    return results.map(r=>{r.value.colorSpace=THREE.NoColorSpace; return r.value;});
  };
  let renderer;
  try { renderer=new THREE.WebGLRenderer({alpha:true,antialias:false,powerPreference:'low-power'}); }
  catch { host.dataset.status='fallback'; return null; }
  let maps;
  try { maps=await load(portrait); }
  catch(error) { renderer.dispose(); host.dataset.status='fallback'; console.warn(error.message); return null; }
  const scene=new THREE.Scene(), camera=new THREE.PerspectiveCamera(48,1,.1,10);
  camera.position.z=3;
  const uniforms={};
  const value=(k,v)=>uniforms[k]={value:v};
  ['A','B'].forEach(s=>['Color','Depth','Mask'].forEach((type,i)=>value('u'+type+s,maps[i])));
  Object.entries({uTime:0,uTransition:0,uDepthStrength:settings.depthStrength,
    uMinSize:settings.pointSizeMin,uMaxSize:settings.pointSizeMax,uCoreNoise:settings.coreNoise,
    uEdgeNoise:settings.edgeNoise,uNoiseFrequency:settings.noiseFrequency,uNoiseSpeed:settings.noiseSpeed,
    uIdentity:1,uDpr:1,uMotion:reduced.matches?0:1,uFocusRange:settings.focusRange,uPointerActive:0}).forEach(([k,v])=>value(k,v));
  value('uPointer',new THREE.Vector2(9,9));
  const material=new THREE.ShaderMaterial({uniforms,vertexShader,fragmentShader,transparent:true,depthWrite:false});
  const tier=innerWidth<600?160:innerWidth<1000?200:256;
  const points=new THREE.Points(makeGeometry(tier),material); points.frustumCulled=false; scene.add(points);
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5)); uniforms.uDpr.value=renderer.getPixelRatio();
  renderer.domElement.setAttribute('aria-hidden','true'); host.append(renderer.domElement);
  let visible=false, frame=0, time=0, last=0, disposed=false, lost=false;
  let targetX=0,targetY=0, transition=null, generation=0;
  const debug=new URLSearchParams(location.search).has('portraitDebug');
  let sampleStart=0,sampleFrames=0;
  if(debug)host.dataset.points=String(tier*tier);
  const motionControl=document.querySelector('.motion-toggle');
  const paused=()=>reduced.matches || motionControl?.dataset.paused==='true';
  const draw=()=>renderer.render(scene,camera);
  function stop(){cancelAnimationFrame(frame);frame=0;last=0;}
  function tick(now){
    frame=0;if(disposed||lost||!visible||document.hidden)return;
    const dt=last?Math.min((now-last)/1000,.05):0;last=now;
    const still=paused();uniforms.uMotion.value=still?0:1;
    if(!still)time+=dt;
    uniforms.uTime.value=time;
    if(transition){
      transition.elapsed=still?1.4:transition.elapsed+dt;
      const t=Math.min(1,transition.elapsed/1.4);uniforms.uTransition.value=t*t*(3-2*t);
      if(t===1){maps.forEach(t=>t.dispose());maps=transition.maps;
        ['Color','Depth','Mask'].forEach((k,i)=>uniforms['u'+k+'A'].value=maps[i]);
        uniforms.uTransition.value=0;transition=null;}
    }
    const damp=1-Math.exp(-5*dt);
    const identity=1;
    uniforms.uIdentity.value=still?identity:THREE.MathUtils.lerp(uniforms.uIdentity.value,identity,damp);
    const y=still?0:(coarse.matches?0:targetY)+Math.sin(time*.31)*.065;
    const x=still?0:targetX+Math.sin(time*.23)*.018;
    points.rotation.y=still?0:THREE.MathUtils.lerp(points.rotation.y,y,damp);
    points.rotation.x=still?0:THREE.MathUtils.lerp(points.rotation.x,x,damp);
    draw();host.dataset.status='ready';
    if(debug){
      sampleFrames++;
      if(!sampleStart)sampleStart=now;
      if(now-sampleStart>2000){host.dataset.fps=String(Math.round(sampleFrames*1000/(now-sampleStart)));sampleStart=now;sampleFrames=0;}
      host.dataset.rotation=points.rotation.y.toFixed(3);
    }
    if(!still || transition)frame=requestAnimationFrame(tick);else last=0;
  }
  function start(){if(!frame&&!disposed&&!lost&&visible&&!document.hidden)frame=requestAnimationFrame(tick);}
  function resize(){const r=host.getBoundingClientRect();visible=r.bottom>0&&r.top<innerHeight;renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();start();}
  const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(host);
  const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible)start();else stop();},{rootMargin:'0px'});observer.observe(host);
  function pointer(event){if(coarse.matches||paused())return;const r=host.getBoundingClientRect();
    const x=THREE.MathUtils.clamp((event.clientX-r.left)/r.width*2-1,-1,1), y=THREE.MathUtils.clamp((event.clientY-r.top)/r.height*2-1,-1,1);
    targetY=x*settings.maxRotationY;targetX=y*settings.maxRotationX;
    uniforms.uPointer.value.set(x*1.5*camera.aspect,-y*1.5);uniforms.uPointerActive.value=1;start();}
  function leave(){targetX=targetY=0;uniforms.uPointerActive.value=0;}
  function visibility(){if(document.hidden)stop();else start();}
  function preference(){stop();start();}
  const pauseObserver=new MutationObserver(preference);if(motionControl)pauseObserver.observe(motionControl,{attributes:true,attributeFilter:['data-paused']});
  host.addEventListener('portraitchange',preference);
  host.addEventListener('pointermove',pointer);host.addEventListener('pointerleave',leave);
  reduced.addEventListener('change',preference);document.addEventListener('visibilitychange',visibility);
  const contextLost=e=>{e.preventDefault();lost=true;stop();host.dataset.status='fallback';};
  const contextRestored=()=>{lost=false;start();};
  renderer.domElement.addEventListener('webglcontextlost',contextLost);renderer.domElement.addEventListener('webglcontextrestored',contextRestored);
  resize();
  draw();
  host.dataset.status='ready';
  start();
  return {
    async setPortrait(next){const token=++generation;const loaded=await load(next);
      if(disposed||token!==generation){loaded.forEach(t=>t.dispose());return;}
      // Finish an in-flight morph before replacing its target, keeping a single point system.
      if(transition){maps.forEach(t=>t.dispose());maps=transition.maps;['Color','Depth','Mask'].forEach((k,i)=>uniforms['u'+k+'A'].value=maps[i]);}
      ['Color','Depth','Mask'].forEach((k,i)=>uniforms['u'+k+'B'].value=loaded[i]);
      uniforms.uTransition.value=0;transition={maps:loaded,elapsed:0};start();},
    destroy(){disposed=true;generation++;stop();observer.disconnect();resizeObserver.disconnect();pauseObserver.disconnect();
      host.removeEventListener('portraitchange',preference);
      host.removeEventListener('pointermove',pointer);host.removeEventListener('pointerleave',leave);
      reduced.removeEventListener('change',preference);document.removeEventListener('visibilitychange',visibility);
      maps.forEach(t=>t.dispose());transition?.maps.forEach(t=>t.dispose());points.geometry.dispose();material.dispose();renderer.dispose();renderer.domElement.remove();}
  };
}

const host=document.querySelector('[data-particle-portrait]');
let portraitController;
const portraitMaps = key => ({
  colorMap:`assets/team/${key}-color.webp?v=20261023-nick-restored`,
  depthMap:`assets/team/${key}-depth.webp?v=20261023-nick-restored`,
  maskMap:`assets/team/${key}-mask.webp?v=20261023-nick-restored`
});
async function selectPortrait(key) {
  const hasPhoto=['nick','pavlo','oleksandr'].includes(key);
  host.setAttribute('aria-label',hasPhoto?`Interactive monochrome particle portrait of ${{nick:'Nick',pavlo:'Pavlo',oleksandr:'Oleksandr'}[key]}, Product Strategist`:'Abstract animated particle cloud');
  if(hasPhoto){
    host.querySelector('.particle-portrait__fallback').src=`assets/team/${key}-fallback.webp?v=20261023-nick-restored`;
    if(portraitController) {
      try {await portraitController.setPortrait(portraitMaps(key));}
      catch(error) { console.warn('Portrait switch unavailable',error); host.dataset.status='fallback'; }
    }
  }
  host.dispatchEvent(new Event('portraitchange'));
}
if(host){
  host.dataset.status='waiting';
  let started=false;
  async function initialize(){
    if(started)return;
    const rect=host.getBoundingClientRect();
    if(rect.bottom< -400 || rect.top>innerHeight+400)return;
    started=true;startObserver.disconnect();window.removeEventListener('scroll',initialize);
    host.dataset.status='loading';
    try {
      const initial=host.dataset.member || 'nick';
      portraitController=await mountParticlePortrait(host,portraitMaps(initial));
      const selected=host.dataset.member || 'nick';
      if(selected!==initial)await selectPortrait(selected);
    }
    catch(error){host.dataset.status='fallback';console.warn('Portrait unavailable',error);}
  }
  const startObserver=new IntersectionObserver(initialize,{rootMargin:'400px'});
  startObserver.observe(host);
  window.addEventListener('scroll',initialize,{passive:true});
  requestAnimationFrame(initialize);
}

// Each biography has its own aligned photo, depth map, and silhouette.
const members = {
  nick: {name:'Nick', experience:'8 YEARS EXPERIENCE', description:'He has led product strategy, UX, branding, design systems, and AI-driven product initiatives across <strong>20+ projects</strong>, working with startups and large international organizations across fintech, healthcare, agtech, enterprise software, and AI.'},
  pavlo: {name:'Pavlo', experience:'14+ YEARS EXPERIENCE', description:'14+ years of design commercial experience. Visual design, product design, preproject discoveries and design teams leadership'},
  oleksandr: {name:'Oleksandr', experience:'15 YEARS EXPERIENCE', description:'15 years of professional experience in Product Design and certified UX Manager through the Norman Nielsen group.'}
};
document.querySelectorAll('[data-team-member]').forEach(button=>{
  button.addEventListener('click',()=>{
    const key=button.dataset.teamMember, member=members[key];
    document.querySelector('#team-name').textContent=member.name;
    document.querySelector('.team-portrait__role').textContent='Product Strategist';
    document.querySelector('.team-portrait__experience').textContent=member.experience;
    document.querySelector('.team-portrait__description').innerHTML=member.description;
    document.querySelectorAll('[data-team-member]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
    host.dataset.member=key;
    selectPortrait(key);
  });
});

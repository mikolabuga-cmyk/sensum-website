/* A continuous particle trail from the hero → soft sphere → prismatic light.
   Scroll controls the transformation; time only adds gentle ambient motion. */
(() => {
  const section = document.querySelector('.story-reveal');
  if (!section || section.hidden) return;
  const openingOnly = section.dataset.openingOnly === 'true';
  const stage = section.querySelector('.story-reveal__stage');
  const canvas = section.querySelector('.story-reveal__canvas');
  const control = document.querySelector('.motion-toggle');
  const hero = document.querySelector('.hero-shell');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const forced = matchMedia('(forced-colors: active)');
  const clamp = value => Math.max(0, Math.min(1, value));
  const smooth = value => { const x = clamp(value); return x * x * (3 - 2 * x); };
  let gl, field, points, quad, cloud;
  let ready = false, lost = false, frame = 0, previous = 0, elapsed = 0, paintElapsed = 0;
  let width = 0, height = 0, ratio = 1, travel = 1, count = 0, current = 0, sequence = null;
  let entry = 0, lead = 0, flowTime = 0;
  let handoff = 0;
  let lastText = '';

  const fieldVertex = `
    attribute vec2 a_position;
    varying vec2 v_uv;
    void main() { v_uv = a_position * .5 + .5; gl_Position = vec4(a_position, 0., 1.); }
  `;
  const fieldFragment = `
    precision highp float;
    varying vec2 v_uv;
    uniform vec2 u_size;
    uniform float u_time, u_progress, u_radius, u_lead, u_edgeGlow;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
      return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),
        mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);
    }
    float band(float radius, float center, float width) {
      float d = (radius-center)/width; return exp(-d*d*2.);
    }
    void main() {
      vec2 uv = vec2(v_uv.x, 1.-v_uv.y);
      uv.y = (uv.y*(u_size.y+u_lead)-u_lead)/u_size.y;
      vec2 px = (uv-.5)*u_size;
      float dist = length(px);
      float fill = smoothstep(.28,.59,u_progress);
      float volume = 1.-smoothstep(u_radius*.75,u_radius*1.12,dist);
      float dark = mix(volume*fill,1.,smoothstep(.61,.73,u_progress));
      // The starting white field picks up the preceding section's pale edge.
      vec3 paper = vec3(1.);
      vec3 color = mix(paper,vec3(.003,.005,.008),dark);

      // Elliptical spectral bands show only on the sides. They remain soft,
      // with a dark reading plane through the middle and no gradient rotation.
      float breathing = .009*sin(u_time*.33);
      vec2 q = vec2((uv.x-.5)/.49,(uv.y-.52)/.56);
      float warp = (noise(uv*vec2(4.,3.)+vec2(u_time*.035,-u_time*.024))-.5)*.045;
      float r = length(q)+warp+breathing;
      float side = pow(abs(q.x)/max(length(q),.001),5.);
      float vertical = exp(-pow((uv.y-.53)/.33,2.));
      float reading = mix(.12,1.,smoothstep(.22,.40,abs(uv.x-.5)));
      vec3 light = vec3(0.);
      light += vec3(.72,.21,.055)*band(r,.71,.095);
      light += vec3(.92,.62,.22)*band(r,.755,.060);
      light += vec3(.22,.72,.61)*band(r,.795,.058);
      light += vec3(.065,.48,.86)*band(r,.84,.072);
      light += vec3(.20,.10,.47)*band(r,.92,.10);
      // A much fainter outer refraction adds depth to the two main arcs.
      light += vec3(.10,.24,.34)*band(r,1.10,.13)*.52;
      light *= side*vertical*reading*(.68+.05*sin(u_time*.27+uv.y*5.));
      // Resolve the reference's side colors by 70% of the shared scroll,
      // while the expanding particle field is still transitioning to black.
      color += light*u_edgeGlow;
      float grain = (hash(floor(uv*u_size))-.5)*.006;
      float alpha = step(0.,uv.y);
      gl_FragColor = vec4(clamp(color+grain,0.,1.)*alpha,alpha);
    }
  `;
  const pointVertex = `
    precision highp float;
    attribute vec4 a_seed;
    uniform vec2 u_size;
    uniform float u_time, u_progress, u_radius, u_ratio, u_entry, u_lead, u_flow, u_handoff;
    varying float v_alpha;
    void main() {
      float gather = smoothstep(0.,.26,u_progress);
      float angle = a_seed.z*6.2831853;
      float depth = a_seed.w*2.-1.;
      float radial = pow(fract(a_seed.x*17.31+a_seed.y*29.67),.333333);
      float ring = sqrt(max(0.,1.-depth*depth));
      vec3 sphere = vec3(cos(angle)*ring,sin(angle)*ring,depth)*radial;
      float spin = u_time*.055;
      sphere.xz = mat2(cos(spin),-sin(spin),sin(spin),cos(spin))*sphere.xz;
      float breath = 1.+.018*sin(u_time*.65+sphere.y*3.);
      vec2 formed = sphere.xy*u_radius*breath;
      formed += vec2(sin(angle*3.+u_time*.22),cos(angle*2.-u_time*.18))*u_radius*.014;
      // A broad root overlaps the hero's lower field. Keep the neck attached
      // until late in the descent, then pinch it gradually rather than spawn
      // a detached segment. Scroll shapes the ribbon; dots drift inside it.
      // Recycling occurs only at its feathered, invisible endpoints.
      float t = fract(a_seed.y+u_flow*.035);
      float detach = u_handoff;
      float head = mix(.10,1.,u_entry);
      float tail = head*detach;
      float along = mix(tail,head,t);
      float envelope = sin(along*3.14159265);
      float bend = sin(along*5.2)*envelope*min(u_size.x*.14,150.);
      float root = u_size.x*.46*(1.-detach*.90);
      float neck = 12.+16.*envelope+9.*sin(t*6.2831853+u_entry*2.);
      float rootWeight = pow(1.-smoothstep(0.,.68,t),2.);
      float rootSeed = a_seed.x*2.-1.;
      float offset = mix((a_seed.x+a_seed.z+a_seed.w-1.5)*neck,rootSeed*root,rootWeight);
      vec2 trail = vec2(bend+offset,mix(-u_size.y*.5-u_lead,0.,along));
      // Feathered shoulders sweep down from both sides into the narrow stem.
      trail.y -= pow(abs(rootSeed),1.6)*u_lead*.65*rootWeight;
      float arrival = smoothstep(.60,1.,u_entry);
      trail += vec2(sin(u_flow*.55+angle),cos(u_flow*.43+angle))*1.8;
      // Let the last dots diffuse instead of collapsing into a dark speck.
      trail += vec2(cos(angle),sin(angle))*(8.+a_seed.x*22.)*arrival;
      vec2 position = mix(trail,formed,gather);
      float feather = 1.-smoothstep(.64,1.,length(sphere.xy));
      float depthLight = .52+.48*(sphere.z*.5+.5);
      float trailAlpha = .21*smoothstep(0.,.12,t)*(1.-smoothstep(.86,1.,t));
      trailAlpha *= 1.-smoothstep(.14,.23,a_seed.w);
      trailAlpha *= smoothstep(0.,.10,u_entry)*(1.-u_handoff);
      trailAlpha *= 1.-smoothstep(.65,1.,abs(rootSeed))*rootWeight;
      trailAlpha *= mix(1.,.35,arrival);
      v_alpha = mix(trailAlpha,.82*feather*depthLight,gather);
      v_alpha *= 1.-smoothstep(.45,.73,u_progress);
      float size = mix(.85,1.35+.45*(sphere.z*.5+.5),gather);
      gl_PointSize = max(1.,size*u_ratio);
      float y = 1.-2.*(position.y+u_size.y*.5+u_lead)/(u_size.y+u_lead);
      gl_Position = vec4(position.x/u_size.x*2.,y,0.,1.);
    }
  `;
  const pointFragment = `
    precision mediump float;
    varying float v_alpha;
    void main() {
      float edge = 1.-smoothstep(.24,.5,length(gl_PointCoord-.5));
      gl_FragColor = vec4(.035,.045,.05,v_alpha*edge);
    }
  `;

  function program(vertexSource, fragmentSource, uniformNames) {
    const shaders = [];
    const result = gl.createProgram();
    try {
      for (const [type, source] of [[gl.VERTEX_SHADER, vertexSource], [gl.FRAGMENT_SHADER, fragmentSource]]) {
        const shader = gl.createShader(type); shaders.push(shader);
        gl.shaderSource(shader, source); gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw Error('Story shader unavailable');
        gl.attachShader(result, shader);
      }
      gl.linkProgram(result);
      if (!gl.getProgramParameter(result, gl.LINK_STATUS)) throw Error('Story shader link unavailable');
      return { program: result, uniforms: Object.fromEntries(uniformNames.map(name => [name, gl.getUniformLocation(result, `u_${name}`)])) };
    } catch (error) { gl.deleteProgram(result); throw error; }
    finally { shaders.forEach(shader => gl.deleteShader(shader)); }
  }

  function initialize() {
    canvas.dataset.ready = 'false';
    field = program(fieldVertex, fieldFragment, ['size','time','progress','radius','lead','edgeGlow']);
    points = program(pointVertex, pointFragment, ['size','time','progress','radius','ratio','entry','lead','flow','handoff']);
    field.position = gl.getAttribLocation(field.program,'a_position');
    points.position = gl.getAttribLocation(points.program,'a_seed');
    quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,quad);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    cloud = gl.createBuffer(); count = 0; ready = true;
  }

  function buildCloud() {
    const nextCount = width <= 760 ? 24000 : 65000;
    if (nextCount === count) return;
    count = nextCount;
    const data = new Float32Array(count*4);
    let seed = 1979;
    for (let i = 0; i < data.length; i++) {
      seed = (Math.imul(seed,1664525)+1013904223) >>> 0;
      data[i] = seed / 4294967296;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER,cloud); gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
  }

  const enabled = () => ready && !lost && !reduced.matches && !forced.matches && control?.dataset.paused !== 'true';
  function uniforms(target, radius) {
    const u = target.uniforms;
    gl.uniform2f(u.size,width,height); gl.uniform1f(u.time,elapsed);
    gl.uniform1f(u.progress,current); gl.uniform1f(u.radius,radius);
    gl.uniform1f(u.lead,lead);
  }

  function paint() {
    const startRadius = Math.min(width,height)*.32;
    const endRadius = Math.hypot(width,height)*.75;
    const radius = startRadius+(endRadius-startRadius)*smooth((current-.25)/.44);
    gl.viewport(0,0,canvas.width,canvas.height);
    if (openingOnly) {
      // Draw only the connecting dots over the shared warm section surface.
      gl.clearColor(0,0,0,0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    } else {
    gl.disable(gl.BLEND); gl.useProgram(field.program); uniforms(field,radius);
    gl.uniform1f(field.uniforms.edgeGlow,smooth(((sequence ?? 0)-.60)/.10));
    gl.bindBuffer(gl.ARRAY_BUFFER,quad); gl.enableVertexAttribArray(field.position);
    gl.vertexAttribPointer(field.position,2,gl.FLOAT,false,0,0); gl.drawArrays(gl.TRIANGLES,0,6);
    gl.disableVertexAttribArray(field.position);
    }
    if (current < .73) {
      gl.enable(gl.BLEND); gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(points.program); uniforms(points,radius); gl.uniform1f(points.uniforms.ratio,ratio);
      gl.uniform1f(points.uniforms.entry,entry);
      gl.uniform1f(points.uniforms.flow,flowTime);
      gl.uniform1f(points.uniforms.handoff,handoff);
      gl.bindBuffer(gl.ARRAY_BUFFER,cloud); gl.enableVertexAttribArray(points.position);
      gl.vertexAttribPointer(points.position,4,gl.FLOAT,false,0,0); gl.drawArrays(gl.POINTS,0,count);
      gl.disableVertexAttribArray(points.position);
    }
    canvas.dataset.ready = 'true';
  }

  function draw(time) {
    frame = 0;
    if (!enabled() || document.hidden) return;
    const rect = section.getBoundingClientRect();
    if (rect.bottom <= 0 || rect.top-lead >= window.innerHeight) {
      hero?.style?.setProperty('--story-pull','0'); previous = 0; return;
    }
    const dt = previous ? Math.min(time-previous,50) : 16;
    previous = time; elapsed += dt/1000; paintElapsed += dt;
    // The reading and particle scenes share this viewport. The opening copy
    // stays visible as the dots gather, then dissolves as the sphere expands.
    const target = clamp(-rect.top/travel);
    sequence = sequence === null ? target : sequence+(target-sequence)*(1-Math.exp(-dt/105));
    if (Math.abs(target-sequence)<.0001) sequence = target;
    const textVersion2 = ['v2', 'v3', 'v4'].includes(section.dataset.textVersion);
    const storyProgress = clamp((sequence-.20)/.80);
    // V2 keeps the connecting ribbon, but never grows the sphere/dark plane.
    current = openingOnly || textVersion2 ? 0 : storyProgress;
    // Keep the connection through the complete text entrance and centered hold.
    // Fade in the existing lead-in, finishing just before the sphere gathers.
    handoff = smooth((sequence-.04)/.15);
    // Hold particle identities during sphere formation; the stream is already
    // invisible here, so its endpoint recycling cannot disturb the morph.
    if (current === 0) flowTime += dt/1000;
    const entryTarget = smooth((window.innerHeight-rect.top)/window.innerHeight);
    entry += (entryTarget-entry)*(1-Math.exp(-dt/180));
    if (Math.abs(entryTarget-entry)<.0001) entry = entryTarget;
    // Pull the source field toward the root using this same eased progress.
    hero?.style?.setProperty('--story-pull',(smooth(entry/.45)*(1-handoff)).toFixed(4));
    section.style.setProperty('--story-opening',(1-smooth((storyProgress-.28)/.10)).toFixed(4));
    section.style.setProperty('--story-field',(smooth(entry/.30)*(textVersion2 ? 1-smooth((sequence-.16)/.08) : 1)).toFixed(4));
    // Text waits for a dark reading plane, then resolves without a hard cut.
    const text = smooth((current-.71)/.19).toFixed(4);
    if (text !== lastText) { section.style.setProperty('--story-text',text); lastText = text; }
    if (paintElapsed >= (sequence === target ? 32 : 15)) { paint(); paintElapsed = 0; }
    if (!openingOnly || handoff < 1 || sequence !== target) frame = requestAnimationFrame(draw);
  }

  function schedule() {
    if (!frame && enabled() && !document.hidden) frame = requestAnimationFrame(draw);
  }

  function measure() {
    width = stage.clientWidth; height = stage.clientHeight;
    if (!width || !height) return;
    lead = Math.min(height,window.innerHeight)*.12;
    section.style.setProperty('--story-lead',`${lead}px`);
    section.style.setProperty('--story-stage-height',`${height}px`);
    travel = openingOnly ? window.innerHeight*.85 : Math.max(1,section.offsetHeight-height);
    // Limit the fragment workload independently of display pixel density.
    ratio = Math.min(window.devicePixelRatio || 1,1.5,Math.sqrt(1800000/(width*(height+lead))));
    const w = Math.max(1,Math.round(width*ratio)), h = Math.max(1,Math.round((height+lead)*ratio));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    if (ready && !lost) buildCloud();
    paintElapsed = 100; schedule();
  }

  function sync() {
    cancelAnimationFrame(frame); frame = 0; previous = 0; current = 0; sequence = null;
    if (openingOnly) section.dataset.ribbonMotion = enabled() ? 'active' : 'static';
    else section.dataset.motion = enabled() ? 'active' : 'static';
    if (!enabled()) hero?.style?.setProperty('--story-pull','0');
    measure();
  }

  canvas.addEventListener('webglcontextlost',event => {
    event.preventDefault(); lost = true; ready = false; canvas.dataset.ready = 'false'; sync();
  });
  canvas.addEventListener('webglcontextrestored',() => {
    lost = false;
    try { initialize(); } catch { ready = false; }
    sync();
  });
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',measure,{passive:true});
  window.addEventListener('pageshow',sync);
  document.addEventListener('visibilitychange',sync);
  reduced.addEventListener('change',sync); forced.addEventListener('change',sync);
  if (control) new MutationObserver(sync).observe(control,{attributes:true,attributeFilter:['data-paused']});
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    observer.observe(section);
  }
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) schedule();
    else { hero?.style?.setProperty('--story-pull','0'); cancelAnimationFrame(frame); frame = 0; previous = 0; }
  }).observe(canvas);
  try {
    gl = canvas.getContext('webgl',{alpha:true,depth:false,antialias:false,powerPreference:'low-power'});
    if (gl) initialize();
  } catch { ready = false; }
  sync();
})();

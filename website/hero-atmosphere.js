/* Soft lighting over a shallow curved surface. Render only on resize or reveal. */
(() => {
  const canvas = document.querySelector('.hero-atmosphere');
  if (!canvas) return;
  const gl = canvas.getContext('webgl', { alpha: false, depth: false, antialias: false, powerPreference: 'low-power' });
  if (!gl) return;
  let program;
  function shader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw Error('Atmosphere shader unavailable');
    return shader;
  }
  function init() {
    const vertex = shader(gl.VERTEX_SHADER, `attribute vec2 position; varying vec2 uv;
      void main(){ uv=position*.5+.5; gl_Position=vec4(position,0.,1.); }`);
    const fragment = shader(gl.FRAGMENT_SHADER, `precision highp float; varying vec2 uv;
      float pool(vec2 p, vec2 c, vec2 s) { vec2 d=(p-c)/s; return exp(-dot(d,d)*2.); }
      float surface(vec2 p) {
        return .20*sin(p.x*2.8+p.y*.9) + .11*cos(p.y*3.6-p.x*1.3)
          + .16*pool(p,vec2(.85,.74),vec2(.8,.6));
      }
      void main(){
        vec2 p=vec2(uv.x,1.-uv.y);
        float e=.003;
        vec2 slope=vec2(surface(p+vec2(e,0.))-surface(p-vec2(e,0.)),
          surface(p+vec2(0.,e))-surface(p-vec2(0.,e)))/(2.*e);
        vec3 normal=normalize(vec3(-slope,1.));
        float diffuse=dot(normal,normalize(vec3(-.35,-.45,1.)));
        float shade=.065*(1.-diffuse);
        shade+=.235*pool(p,vec2(-.08,-.12),vec2(.58,.72));
        shade+=.185*pool(p,vec2(1.12,.61),vec2(.54,.91));
        shade+=.195*pool(p,vec2(.19,1.15),vec2(.82,.60));
        shade+=.065*pool(p,vec2(.69,-.30),vec2(.83,.56));
        float glow=pool(p,vec2(.49,.46),vec2(.72,.64));
        shade*=1.-.98*glow;
        // Match the next section's #faf9f6 paper, keeping a pure-white core.
        float bloom=.080*pool(p,vec2(.50,.47),vec2(.54,.48));
        float light=smoothstep(.06,.78,glow+bloom-shade*.20);
        vec3 paper=vec3(250.,249.,246.)/255.;
        gl_FragColor=vec4(mix(paper,vec3(1.),light),1.);
      }`);
    program = gl.createProgram(); gl.attachShader(program,vertex); gl.attachShader(program,fragment);
    gl.linkProgram(program); gl.deleteShader(vertex); gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program,gl.LINK_STATUS)) throw Error('Atmosphere link unavailable');
    gl.useProgram(program);
    const buffer=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    const position=gl.getAttribLocation(program,'position'); gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
  }
  function draw() {
    if (!program || gl.isContextLost() || document.documentElement.dataset.heroVariant !== 'frosted') return;
    const bounds=canvas.parentElement.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    // Broad lighting needs no high-DPI framebuffer or continuous render loop.
    canvas.width=Math.ceil(bounds.width); canvas.height=Math.ceil(bounds.height);
    gl.viewport(0,0,canvas.width,canvas.height); gl.drawArrays(gl.TRIANGLES,0,6);
    canvas.dataset.ready='true';
  }
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();canvas.dataset.ready='false';});
  canvas.addEventListener('webglcontextrestored',()=>{try{init();draw();}catch{canvas.dataset.ready='false';}});
  try { init(); new ResizeObserver(draw).observe(canvas.parentElement); document.addEventListener('hero-variant-change',draw); draw(); }
  catch { canvas.dataset.ready='false'; }
})();

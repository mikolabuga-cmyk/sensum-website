import * as THREE from './vendor/three/three.module.min.js';

export const CARD_WIDTH = 600;
export const CARD_HEIGHT = CARD_WIDTH / 1.45;
export const DEFAULT_RADIUS = 850;

// Arc-length UVs preserve local text proportions. Center stays at z=0;
// both edges recede, so this remains convex through every object rotation.
export function curvedCardGeometry(radius = DEFAULT_RADIUS) {
  radius = Math.max(CARD_WIDTH, Number(radius) || DEFAULT_RADIUS);
  const geometry = new THREE.PlaneGeometry(CARD_WIDTH, CARD_HEIGHT, 96, 12);
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    positions.setXYZ(i, Math.sin(x / radius) * radius, positions.getY(i), (Math.cos(x / radius) - 1) * radius);
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function textureFor(card) {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH * 2;
  canvas.height = Math.ceil(CARD_HEIGHT * 2);
  const ctx = canvas.getContext('2d');
  ctx.scale(2, 2);
  const style = getComputedStyle(card);
  ctx.save();
  ctx.beginPath(); ctx.roundRect(0, 0, CARD_WIDTH, CARD_HEIGHT, 20); ctx.clip();
  ctx.fillStyle = style.backgroundColor; ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  const image = card.querySelector('img');
  if (!image?.naturalWidth) throw new Error('Gallery image unavailable; keep the HTML fallback.');
  // Cover without stretching. The same source and crop are used by the HTML fallback.
  const scale = Math.max(CARD_WIDTH / image.naturalWidth, CARD_HEIGHT / image.naturalHeight);
  const width = image.naturalWidth * scale, height = image.naturalHeight * scale;
  ctx.drawImage(image, (CARD_WIDTH - width) / 2, (CARD_HEIGHT - height) / 2, width, height);
  ctx.restore();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createCardSurfaces(host, cards, onContextLost) {
  // Images and the muted film become visual textures. Interactive content
  // retains the normal HTML layout instead of becoming inert texture pixels.
  if (cards.some(card => card.querySelector('a,button,input,select,textarea,[tabindex]'))) return null;
  let renderer;
  const owned = [];
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    const world = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 1, 10000);
    camera.position.z = 1400;
    const radius = Number(host.closest('.why-work').dataset.curvatureRadius) || DEFAULT_RADIUS;
    const geometry = curvedCardGeometry(radius); owned.push(geometry);
    let viewportWidth = 1, viewportHeight = 1, cardScale = 1;
    const surfaces = cards.map((card, index) => {
      const texture = textureFor(card); owned.push(texture);
      texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, alphaTest: .015, side: THREE.DoubleSide }); owned.push(material);
      const video = card.querySelector('video');
      let videoTexture, videoUniforms;
      if (video) {
        videoTexture = new THREE.VideoTexture(video);
        videoTexture.colorSpace = THREE.SRGBColorSpace;
        videoTexture.generateMipmaps = false;
        owned.push(videoTexture);
        videoUniforms = {
          cardExtent: { value: new THREE.Vector2(CARD_WIDTH, CARD_HEIGHT) },
          cardRadius: { value: 20 },
        };
        material.defines = { USE_UV: '' };
        material.onBeforeCompile = shader => {
          Object.assign(shader.uniforms, videoUniforms);
          shader.fragmentShader = 'uniform vec2 cardExtent; uniform float cardRadius;\n' + shader.fragmentShader;
          shader.fragmentShader = shader.fragmentShader.replace('#include <alphatest_fragment>', `
            vec2 edge = abs((vUv - .5) * cardExtent) - cardExtent * .5 + cardRadius;
            float distanceToEdge = length(max(edge, 0.)) + min(max(edge.x, edge.y), 0.) - cardRadius;
            diffuseColor.a *= 1. - smoothstep(-.75, .25, distanceToEdge);
            #include <alphatest_fragment>
          `);
        };
      }
      const cardGeometry = video ? geometry.clone() : geometry;
      if (video) owned.push(cardGeometry);
      const mesh = new THREE.Mesh(cardGeometry, material); mesh.userData.cardIndex = index;
      if (video) mesh.frustumCulled = false; // Its geometry flattens during expansion.
      const group = new THREE.Group();
      const rotation = new THREE.Group();
      const interaction = new THREE.Group();
      interaction.add(mesh);
      rotation.add(interaction);
      group.add(rotation);
      world.add(group);
      return { group, rotation, interaction, mesh, video, texture, videoTexture, videoUniforms, expansion: -1 };
    });
    const canvas = renderer.domElement;
    canvas.className = 'why-work__canvas';
    canvas.setAttribute('aria-hidden', 'true');
    host.append(canvas);
    const raycaster = new THREE.Raycaster();
    const lost = event => { event.preventDefault(); onContextLost(); };
    canvas.addEventListener('webglcontextlost', lost);
    return {
      resize(width, height) {
        viewportWidth = width; viewportHeight = height;
        renderer.setSize(width, height, false);
        const scale = Math.max(340, Math.min(width * .33, 600)) / CARD_WIDTH;
        cardScale = scale;
        surfaces.forEach(surface => { surface.interaction.scale.setScalar(scale); surface.expansion = -1; });
        camera.aspect = width / height;
        camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(height / 2800));
        camera.updateProjectionMatrix();
      },
      expand(index, progress) {
        const surface = surfaces[index];
        if (!surface.video || surface.expansion === progress) return;
        surface.expansion = progress;
        surface.mesh.scale.set(
          THREE.MathUtils.lerp(1, viewportWidth / (CARD_WIDTH * cardScale), progress),
          THREE.MathUtils.lerp(1, viewportHeight / (CARD_HEIGHT * cardScale), progress), 1);
        const positions = surface.mesh.geometry.attributes.position;
        const original = geometry.attributes.position;
        for (let i = 0; i < positions.count; i++) {
          const flatX = (surface.mesh.geometry.attributes.uv.getX(i) - .5) * CARD_WIDTH;
          positions.setXYZ(i, THREE.MathUtils.lerp(original.getX(i), flatX, progress), original.getY(i), original.getZ(i) * (1 - progress));
        }
        positions.needsUpdate = true;
        surface.videoUniforms.cardExtent.value.set(CARD_WIDTH * cardScale * surface.mesh.scale.x, CARD_HEIGHT * cardScale * surface.mesh.scale.y);
        surface.videoUniforms.cardRadius.value = 20 * cardScale * (1 - progress);
      },
      set(index, pose, pointer) {
        const { group, rotation, interaction, mesh } = surfaces[index];
        group.position.set(pose.x, -pose.y, pose.z);
        rotation.rotation.set(-pose.rotationX * Math.PI / 180, pose.rotationY * Math.PI / 180, -pose.rotationZ * Math.PI / 180);
        interaction.position.set(pointer.x, -pointer.y, pointer.z);
        interaction.rotation.set(-pointer.rotationX * Math.PI / 180, pointer.rotationY * Math.PI / 180, 0);
        group.visible = pose.opacity > .001;
        mesh.material.opacity = pose.opacity;
      },
      draw() {
        for (const surface of surfaces) {
          const { video, videoTexture, mesh } = surface;
          if (!video || !surface.group.visible || video.readyState < 2) continue;
          // Upload decoded video frames directly, without a canvas readback/redraw.
          if (mesh.material.map !== videoTexture) {
            mesh.material.map = videoTexture;
            mesh.material.needsUpdate = true;
          }
          const ratio = (CARD_WIDTH * mesh.scale.x) / (CARD_HEIGHT * mesh.scale.y);
          const sourceRatio = video.videoWidth / video.videoHeight;
          const repeatX = Math.min(1, ratio / sourceRatio);
          const repeatY = Math.min(1, sourceRatio / ratio);
          videoTexture.repeat.set(repeatX, repeatY);
          videoTexture.offset.set((1 - repeatX) / 2, (1 - repeatY) / 2);
        }
        renderer.render(world, camera);
      },
      hit(x, y) {
        raycaster.setFromCamera(new THREE.Vector2(x, -y), camera);
        const hits = raycaster.intersectObjects(surfaces.filter(s => s.group.visible && s.mesh.material.opacity > .7).map(s => s.mesh));
        return hits[0]?.object.userData.cardIndex ?? -1;
      },
      dispose() {
        canvas.removeEventListener('webglcontextlost', lost);
        owned.forEach(resource => resource.dispose());
        renderer.dispose(); canvas.remove();
      },
    };
  } catch (error) {
    owned.forEach(resource => resource.dispose());
    renderer?.dispose(); renderer?.domElement.remove();
    console.warn('Curved benefit cards unavailable; using accessible HTML cards.', error);
    return null;
  }
}

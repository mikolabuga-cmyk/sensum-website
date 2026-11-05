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
  ctx.beginPath(); ctx.roundRect(0, 0, CARD_WIDTH, CARD_HEIGHT, 20); ctx.clip();
  ctx.fillStyle = style.backgroundColor; ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  const image = card.querySelector('img');
  if (!image?.naturalWidth) throw new Error('Gallery image unavailable; keep the HTML fallback.');
  // Cover without stretching. The same source and crop are used by the HTML fallback.
  const scale = Math.max(CARD_WIDTH / image.naturalWidth, CARD_HEIGHT / image.naturalHeight);
  const width = image.naturalWidth * scale, height = image.naturalHeight * scale;
  ctx.drawImage(image, (CARD_WIDTH - width) / 2, (CARD_HEIGHT - height) / 2, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createCardSurfaces(host, cards, onContextLost) {
  // These surfaces currently contain only images. Future controls
  // retain their live DOM interaction instead of becoming inert texture pixels.
  if (cards.some(card => card.querySelector('a,button,input,select,textarea,[tabindex]'))) return null;
  let renderer;
  const owned = [];
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    const world = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 1, 10000);
    camera.position.z = 1400;
    const radius = Number(host.closest('.why-work').dataset.curvatureRadius) || DEFAULT_RADIUS;
    const geometry = curvedCardGeometry(radius); owned.push(geometry);
    const surfaces = cards.map((card, index) => {
      const texture = textureFor(card); owned.push(texture);
      texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, alphaTest: .015, side: THREE.DoubleSide }); owned.push(material);
      const mesh = new THREE.Mesh(geometry, material); mesh.userData.cardIndex = index;
      const group = new THREE.Group();
      const rotation = new THREE.Group();
      const interaction = new THREE.Group();
      interaction.add(mesh);
      rotation.add(interaction);
      group.add(rotation);
      world.add(group);
      return { group, rotation, interaction, mesh };
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
        renderer.setSize(width, height, false);
        const scale = Math.max(340, Math.min(width * .33, 600)) / CARD_WIDTH;
        surfaces.forEach(({ interaction }) => interaction.scale.setScalar(scale));
        camera.aspect = width / height;
        camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(height / 2800));
        camera.updateProjectionMatrix();
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
      draw() { renderer.render(world, camera); },
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

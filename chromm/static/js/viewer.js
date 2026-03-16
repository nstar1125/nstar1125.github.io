import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

console.log('[viewer] THREE loaded:', !!THREE);
console.log('[viewer] GLTFLoader loaded:', !!GLTFLoader);

const container = document.getElementById('viewer-canvas');
console.log('[viewer] container:', container, container?.clientWidth, container?.clientHeight);
const slider = document.getElementById('viewer-slider');
const frameLabel = document.getElementById('viewer-frame-label');
const playBtn = document.getElementById('viewer-play-btn');

const TOTAL_FRAMES = 30;
const FPS = 10;
let currentFrame = 0;
let isPlaying = false;
let intervalId = null;
const frames = [];

// --- Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

// --- Camera ---
const camera = new THREE.PerspectiveCamera(
  50,
  container.clientWidth / container.clientHeight,
  0.1,
  1000
);

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(window.devicePixelRatio);
container.appendChild(renderer.domElement);

// --- Lights ---
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 3.0);
scene.add(hemiLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 3.0);
dirLight.position.set(5, 10, 7);
scene.add(dirLight);
const frontLight = new THREE.DirectionalLight(0xffffff, 2.0);
frontLight.position.set(0, 0, -5);
scene.add(frontLight);

// --- Controls ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// --- Load frames ---
const loader = new GLTFLoader();

function padFrame(n) {
  return String(n).padStart(4, '0');
}

let loadedCount = 0;

for (let i = 0; i < TOTAL_FRAMES; i++) {
  const url = './static/data/fencing/frame_' + padFrame(i) + '.glb';
  loader.load(
    url,
    (gltf) => {
      const root = gltf.scene;

      // Process children
      root.traverse((node) => {
        if (node.isMesh) {
          node.geometry.computeVertexNormals();
          const hasColor = !!node.geometry.attributes.color;
          node.material = new THREE.MeshStandardMaterial({
            vertexColors: hasColor,
            color: hasColor ? 0xffffff : 0xff9966,
            roughness: 0.4,
            metalness: 0.0,
            side: THREE.DoubleSide,
          });
        }
        if (node.isPoints) {
          node.material.size = 0.05;
          node.material.sizeAttenuation = true;
        }
      });

      root.visible = (i === 0);
      frames[i] = root;
      scene.add(root);
      loadedCount++;

      // Fit camera on first frame
      if (i === 0) {
        const box = new THREE.Box3().setFromObject(root);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const dist = maxDim / (2 * Math.tan((camera.fov * Math.PI) / 360));
        controls.target.copy(center);
        camera.position.set(center.x, center.y + 2, center.z - dist * 1.2);
        controls.update();
      }
    },
    undefined,
    (err) => { console.error('Failed to load frame ' + i, err); }
  );
}

// --- Frame control ---
function showFrame(idx) {
  if (frames[currentFrame]) frames[currentFrame].visible = false;
  if (frames[idx]) frames[idx].visible = true;
  currentFrame = idx;
  slider.value = idx;
  frameLabel.textContent = idx + ' / ' + (TOTAL_FRAMES - 1);
}

function togglePlay() {
  isPlaying = !isPlaying;
  if (isPlaying) {
    playBtn.innerHTML = '\u23F8';
    intervalId = setInterval(() => {
      let next = (currentFrame + 1) % TOTAL_FRAMES;
      showFrame(next);
    }, 1000 / FPS);
  } else {
    playBtn.innerHTML = '\u25B6';
    clearInterval(intervalId);
  }
}

playBtn.addEventListener('click', togglePlay);

slider.addEventListener('input', (e) => {
  if (isPlaying) togglePlay();
  showFrame(parseInt(e.target.value));
});

// --- Resize ---
window.addEventListener('resize', () => {
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
});

// --- Render loop ---
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

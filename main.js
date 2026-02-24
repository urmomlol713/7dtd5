import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.171.0/build/three.module.js';
import { PointerLockControls } from 'https://cdn.jsdelivr.net/npm/three@0.171.0/examples/jsm/controls/PointerLockControls.js';

console.log("main.js loaded");

// Scene basics
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x88ccff);
scene.fog = new THREE.FogExp2(0x88ccff, 0.00025);

const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 2000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Initial render so we see sky color immediately
renderer.render(scene, camera);

const controls = new PointerLockControls(camera, document.body);

const blocker = document.getElementById('blocker');
const instructions = document.getElementById('instructions');

instructions.addEventListener('click', () => {
  console.log("User clicked – attempting lock");
  controls.lock();
});

controls.addEventListener('lock', () => {
  console.log("Pointer locked successfully");
  blocker.style.display = 'none';
});

controls.addEventListener('unlock', () => {
  console.log("Pointer unlocked");
  blocker.style.display = 'block';
  instructions.style.display = '';
});

// Lighting (brighter at start for debug)
scene.add(new THREE.AmbientLight(0xffffff, 0.8)); // ← increased for visibility
const sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.position.set(50, 100, 50);
scene.add(sun);

// Constants
const CHUNK_SIZE = 16;
const WORLD_HEIGHT = 64;
const VIEW_DISTANCE = 5;
const chunks = new Map();

const BLOCK_TYPES = [
  { name: "Air",   color: 0x000000, solid: false },
  { name: "Dirt",  color: 0xa0522d, solid: true  },
  { name: "Grass", color: 0x4caf50, solid: true  },
  { name: "Stone", color: 0x777777, solid: true  },
  { name: "Wood",  color: 0x8b5a2b, solid: true  },
  { name: "Leaves",color: 0x228B22, solid: true  }
];

let selectedType = 2; // Grass

// Simple noise
function noise(x, z) {
  return Math.sin(x * 0.05) * 0.5 + Math.sin(z * 0.07) * 0.5 + 1;
}

// Generate one chunk
function generateChunk(cx, cz) {
  const key = `${cx},${cz}`;
  if (chunks.has(key)) return;
  console.log(`Generating chunk ${key}`);

  const group = new THREE.Group();
  group.position.set(cx * CHUNK_SIZE, 0, cz * CHUNK_SIZE);
  scene.add(group);
  chunks.set(key, group);

  for (let lx = 0; lx < CHUNK_SIZE; lx++) {
    for (let lz = 0; lz < CHUNK_SIZE; lz++) {
      const wx = cx * CHUNK_SIZE + lx;
      const wz = cz * CHUNK_SIZE + lz;
      const h = Math.floor(noise(wx, wz) * 12 + 8);

      for (let y = 0; y < h; y++) {
        let type = (y < h - 4) ? 3 : (y < h - 1) ? 1 : 2; // stone / dirt / grass
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(1, 1, 1),
          new THREE.MeshStandardMaterial({ color: BLOCK_TYPES[type].color })
        );
        mesh.position.set(lx, y, lz);
        mesh.castShadow = mesh.receiveShadow = true;
        group.add(mesh);
      }
    }
  }
}

// Force starter chunks so something is visible immediately
generateChunk(0, 0);
generateChunk(-1, 0);
generateChunk(0, -1);
generateChunk(1, 0);
generateChunk(0, 1);

// Input
const keys = {};
document.addEventListener('keydown', e => { keys[e.code] = true; });
document.addEventListener('keyup',   e => { keys[e.code] = false; });

// Movement in loop
function updateMovement() {
  if (!controls.isLocked) return;

  const direction = new THREE.Vector3();
  controls.getDirection(direction);

  const side = new THREE.Vector3().crossVectors(direction, new THREE.Vector3(0,1,0));

  let speed = keys.ShiftLeft ? 0.25 : 0.12;

  if (keys.KeyW) controls.moveForward(speed);
  if (keys.KeyS) controls.moveForward(-speed);
  if (keys.KeyA) controls.moveRight(-speed);
  if (keys.KeyD) controls.moveRight(speed);
  if (keys.Space) camera.position.y += speed;
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  updateMovement();

  if (controls.isLocked) {
    const px = Math.floor(camera.position.x / CHUNK_SIZE);
    const pz = Math.floor(camera.position.z / CHUNK_SIZE);

    for (let dx = -VIEW_DISTANCE; dx <= VIEW_DISTANCE; dx++) {
      for (let dz = -VIEW_DISTANCE; dz <= VIEW_DISTANCE; dz++) {
        generateChunk(px + dx, pz + dz);
      }
    }
  }

  renderer.render(scene, camera);
}
animate();

// Resize
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

camera.position.set(8, 20, 8);
console.log("Scene setup complete – open console (F12) to see logs");

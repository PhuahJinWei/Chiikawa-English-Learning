import * as THREE from 'three';

/**
 * The stage's soft meadow: a sky that fades from sky blue to the app's cream paper at the horizon, a pale green
 * ground, a few far hills and clouds, and little picture-book flowers and grass tufts round the friends. Everything
 * is unlit (the friends are drawn in flat colour too), cheap to draw (about eight draw calls), and fades into the
 * horizon by the scene's fog.
 */

export const STAGE_COLOURS = {
  /** Top of the sky: a soft sky blue. */
  skyTop: new THREE.Color('#A9DCF2'),
  /** The horizon: the app's cream paper, a touch cooler, so the ground melts into it. */
  horizon: new THREE.Color('#F7F5EA'),
  /** The ground where the friends stand, and further off. */
  groundNear: '#CFE8B2',
  groundFar: '#E4F0D2',
  hills: ['#CBE5BE', '#D8EDCB', '#C3E0C4'],
  ink: '#66432F',
  blush: '#F6BFCB',
};

/** Seeded random, so the meadow looks the same every time. */
function random(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function skyDome(): THREE.Mesh {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uTop: { value: STAGE_COLOURS.skyTop.clone() },
      uHorizon: { value: STAGE_COLOURS.horizon.clone() },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uTop;
      uniform vec3 uHorizon;
      varying vec3 vDir;
      void main() {
        // Blue within the few degrees above the horizon the stage's camera sees.
        float t = smoothstep(0.015, 0.17, vDir.y);
        gl_FragColor = vec4(mix(uHorizon, uTop, t), 1.0);
        #include <colorspace_fragment>
      }
    `,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(90, 32, 16), material);
  dome.renderOrder = -10;
  dome.frustumCulled = false;
  return dome;
}

/** The ground: a wide disc, green under the friends, paler further off, then the fog takes it into the horizon. */
function ground(): THREE.Mesh {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d')!;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, STAGE_COLOURS.groundNear);
  grad.addColorStop(0.18, STAGE_COLOURS.groundNear);
  grad.addColorStop(0.55, STAGE_COLOURS.groundFar);
  grad.addColorStop(1, '#' + STAGE_COLOURS.horizon.getHexString());
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  const disc = new THREE.Mesh(new THREE.CircleGeometry(60, 48), new THREE.MeshBasicMaterial({ map }));
  disc.rotation.x = -Math.PI / 2;
  disc.renderOrder = -5;
  return disc;
}

/** Far rounded hills, as the backgrounds of the picture books have them. */
function hills(): THREE.Group {
  const group = new THREE.Group();
  const shapes: [number, number, number, number, number][] = [
    // x, z, width, height, depth: low, so the sky shows above them.
    [-17, -44, 26, 3.2, 10],
    [8, -52, 34, 4.4, 12],
    [27, -40, 18, 2.4, 8],
  ];
  shapes.forEach(([x, z, w, h, d], i) => {
    const hill = new THREE.Mesh(
      new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: STAGE_COLOURS.hills[i % STAGE_COLOURS.hills.length] }),
    );
    hill.scale.set(w / 2, h, d / 2);
    hill.position.set(x, -0.2, z);
    group.add(hill);
  });
  return group;
}

/** Draws one cell of the little-things atlas: a grass tuft, or a flower on a short stem. */
function drawCell(g: CanvasRenderingContext2D, cell: number, kind: 'tuft' | 'tuft2' | 'flower' | 'flowerPink'): void {
  const s = 128;
  g.save();
  g.translate(cell * s, 0);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  if (kind === 'tuft' || kind === 'tuft2') {
    const blades = kind === 'tuft' ? [-26, -8, 12, 28] : [-18, 4, 22];
    g.strokeStyle = kind === 'tuft' ? '#8CC47A' : '#9ACF86';
    g.lineWidth = 9;
    for (const dx of blades) {
      g.beginPath();
      g.moveTo(64 + dx * 0.35, 124);
      g.quadraticCurveTo(64 + dx * 0.6, 90, 64 + dx, 58 + Math.abs(dx) * 0.4);
      g.stroke();
    }
  } else {
    // Stem and a leaf.
    g.strokeStyle = '#7DB86D';
    g.lineWidth = 7;
    g.beginPath();
    g.moveTo(64, 126);
    g.lineTo(64, 64);
    g.stroke();
    g.fillStyle = '#8CC47A';
    g.beginPath();
    g.ellipse(76, 100, 13, 6, -0.6, 0, Math.PI * 2);
    g.fill();
    // Five round petals with the pen's line, and a yellow middle.
    const petal = kind === 'flower' ? '#FFFFFF' : STAGE_COLOURS.blush;
    g.fillStyle = petal;
    g.strokeStyle = STAGE_COLOURS.ink;
    g.lineWidth = 4;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      g.beginPath();
      g.arc(64 + Math.cos(a) * 17, 50 + Math.sin(a) * 17, 13, 0, Math.PI * 2);
      g.fill();
      g.stroke();
    }
    g.fillStyle = '#FFD86B';
    g.beginPath();
    g.arc(64, 50, 11, 0, Math.PI * 2);
    g.fill();
    g.stroke();
  }
  g.restore();
}

/**
 * Flowers and grass tufts standing on the ground round the friends, all in one mesh (upright quads facing the
 * camera's side, which hardly turns), cut out of one small atlas.
 */
function littleThings(): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const g = canvas.getContext('2d')!;
  (['tuft', 'tuft2', 'flower', 'flowerPink'] as const).forEach((kind, i) => drawCell(g, i, kind));
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;

  const rand = random(7);
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  let n = 0;
  const put = (x: number, z: number, size: number, cell: number) => {
    const half = size / 2;
    const u0 = cell / 4 + 0.004;
    const u1 = (cell + 1) / 4 - 0.004;
    positions.push(x - half, 0, z, x + half, 0, z, x + half, size, z, x - half, size, z);
    uvs.push(u0, 0, u1, 0, u1, 1, u0, 1);
    indices.push(n, n + 1, n + 2, n, n + 2, n + 3);
    n += 4;
  };
  let placed = 0;
  for (let tries = 0; placed < 40 && tries < 800; tries++) {
    // Near the friends, where the ground is seen: in front of them, and beside them. (Further back, on the pale
    // ground, they seemed to float.)
    const x = (rand() * 2 - 1) * 3.4;
    const z = -1.6 + rand() * 4.2;
    // Not where the friends stand, nor just behind them (seen from the camera, those would seem to grow out of them).
    if (Math.abs(x) < 1.45 && z < 0.75) continue;
    const flower = rand() < 0.34;
    const cell = flower ? (rand() < 0.5 ? 2 : 3) : rand() < 0.5 ? 0 : 1;
    const size = flower ? 0.16 + rand() * 0.06 : 0.12 + rand() * 0.07;
    put(x, z, size, cell);
    placed++;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map, alphaTest: 0.5, side: THREE.DoubleSide }));
  return mesh;
}

/** A few soft clouds far off. */
function clouds(): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const g = canvas.getContext('2d')!;
  g.fillStyle = '#FFFFFF';
  const puffs: [number, number, number][] = [
    [70, 82, 34],
    [112, 64, 44],
    [160, 74, 36],
    [196, 88, 26],
    [128, 92, 40],
  ];
  for (const [x, y, r] of puffs) {
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  const geometry = new THREE.BufferGeometry();
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const spots: [number, number, number, number][] = [
    // x, y, z, width: a few degrees above the horizon, where the stage's camera sees sky.
    [-10, 6.2, -62, 9],
    [9, 7.6, -66, 11],
    [27, 5.4, -60, 7],
  ];
  spots.forEach(([x, y, z, w], i) => {
    const h = w / 2;
    positions.push(x - w / 2, y - h / 2, z, x + w / 2, y - h / 2, z, x + w / 2, y + h / 2, z, x - w / 2, y + h / 2, z);
    uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
    const k = i * 4;
    indices.push(k, k + 1, k + 2, k, k + 2, k + 3);
  });
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  const material = new THREE.MeshBasicMaterial({ map, transparent: true, opacity: 0.92, depthWrite: false, fog: false });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = -8;
  return mesh;
}

export interface Backdrop {
  readonly group: THREE.Group;
  readonly fog: THREE.Fog;
  readonly background: THREE.Color;
  dispose(): void;
}

export function buildBackdrop(): Backdrop {
  const group = new THREE.Group();
  group.add(skyDome(), ground(), hills(), clouds(), littleThings());
  return {
    group,
    fog: new THREE.Fog(STAGE_COLOURS.horizon.clone(), 16, 62),
    background: STAGE_COLOURS.horizon.clone(),
    dispose() {
      group.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.geometry.dispose();
        const material = mesh.material as THREE.Material & { map?: THREE.Texture | null };
        material.map?.dispose();
        material.dispose();
      });
    },
  };
}

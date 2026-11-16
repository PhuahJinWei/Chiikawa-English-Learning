import * as THREE from 'three';

/**
 * The stage's meadow, after the fields of the Chiikawa anime: a wide yellow-green field dotted with little grass
 * marks, clover and tiny flowers; a band of round, bumpy trees at the foot of soft grey-mauve mountains; a pale blue
 * sky with a few outlined clouds; and a big round tree at each side. Each shape has a light line in a darker shade of
 * its own colour, as the anime's backgrounds do (the friends keep their ink-brown line).
 *
 * All of it is painted once, at start-up, into a few small canvases, and drawn unlit like the friends: seven draw
 * calls, no fog, nothing recomputed per frame. The far pieces are placed by angle above the horizon, so they sit
 * the same way whatever the stage's shape: the camera looks 4 degrees down with a 26-degree lens, so the horizon is
 * about a third of the way down the stage, with about 9 degrees of sky above it.
 */

export const STAGE_COLOURS = {
  /** Top of the sky, and the pale sky low down behind the mountains. */
  skyTop: new THREE.Color('#A3D7F0'),
  horizon: new THREE.Color('#EAF5F0'),
  /** The field: fresher under the friends, paler towards the trees on the horizon. */
  meadowNear: '#C3E19C',
  meadowFar: '#D4EAB6',
  grass: '#8DC071',
  clover: '#A8D286',
  cloud: '#FFFFFF',
  cloudShade: '#DCEAF3',
  cloudLine: '#A6BFD0',
  mountainFar: '#CDC8DA',
  mountainFarLine: '#ABA3BD',
  mountainNear: '#B7B1C8',
  mountainNearLine: '#918AA6',
  tree: '#93C47A',
  treeShade: '#7FB268',
  treeLight: '#B2D995',
  treeLine: '#5F9150',
  trunk: '#B48A63',
  trunkLine: '#7C5B40',
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

type Pen = CanvasRenderingContext2D;

function paper(width: number, height: number): [HTMLCanvasElement, Pen] {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const g = canvas.getContext('2d')!;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  return [canvas, g];
}

/**
 * A texture from a painted canvas. Cut-out pictures are uploaded premultiplied, so their edges blend cleanly at a
 * distance (otherwise the clear pixels round them would darken the edges as the picture gets smaller).
 */
function texture(canvas: HTMLCanvasElement, cutOut: boolean): THREE.CanvasTexture {
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  map.premultiplyAlpha = cutOut;
  return map;
}

/** A smooth line through `points` (curving through the midpoints between them), open or closed. */
function smoothPath(g: Pen, points: [number, number][], closed: boolean): void {
  g.beginPath();
  if (closed) {
    const last = points[points.length - 1];
    g.moveTo((last[0] + points[0][0]) / 2, (last[1] + points[0][1]) / 2);
    points.forEach((p, i) => {
      const next = points[(i + 1) % points.length];
      g.quadraticCurveTo(p[0], p[1], (p[0] + next[0]) / 2, (p[1] + next[1]) / 2);
    });
    g.closePath();
    return;
  }
  g.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length - 1; i++) {
    const [x, y] = points[i];
    const [nx, ny] = points[i + 1];
    g.quadraticCurveTo(x, y, (x + nx) / 2, (y + ny) / 2);
  }
  const end = points[points.length - 1];
  g.lineTo(end[0], end[1]);
}

/**
 * A puffy outline (a cloud, a tree's crown): bumps round an ellipse, meeting in little notches. `flat` flattens the
 * bottom by that share of the height, as a cloud's base.
 */
function puff(g: Pen, cx: number, cy: number, rx: number, ry: number, bumps: number, rand: () => number, flat = 0): void {
  const floor = cy + ry * (1 - flat);
  const joints: [number, number][] = [];
  const turn = rand() * Math.PI * 2;
  for (let i = 0; i < bumps; i++) {
    const a = turn + ((i + (rand() - 0.5) * 0.4) / bumps) * Math.PI * 2;
    joints.push([cx + Math.cos(a) * rx, Math.min(floor, cy + Math.sin(a) * ry)]);
  }
  g.beginPath();
  g.moveTo(joints[0][0], joints[0][1]);
  for (let i = 0; i < bumps; i++) {
    const [x0, y0] = joints[i];
    const [x1, y1] = joints[(i + 1) % bumps];
    const mx = (x0 + x1) / 2;
    const my = (y0 + y1) / 2;
    const chord = Math.hypot(x1 - x0, y1 - y0);
    const onFloor = flat > 0 && y0 >= floor - 0.5 && y1 >= floor - 0.5;
    // Push the bend away from the middle: a full bump, or hardly any along a flat base.
    const out = onFloor ? chord * 0.04 : chord * (0.42 + rand() * 0.22);
    const dx = mx - cx;
    const dy = my - cy;
    const d = Math.hypot(dx, dy) || 1;
    g.quadraticCurveTo(mx + (dx / d) * out, my + (dy / d) * out, x1, y1);
  }
  g.closePath();
}

// ── The sky ──────────────────────────────────────────────────────────────────────────────────────────────────────

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
        // Pale behind the mountains, blue by the top of the stage (about 9 degrees up).
        float t = smoothstep(0.02, 0.16, vDir.y);
        gl_FragColor = vec4(mix(uHorizon, uTop, t), 1.0);
        #include <colorspace_fragment>
      }
    `,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(150, 32, 16), material);
  dome.renderOrder = -10;
  dome.frustumCulled = false;
  return dome;
}

/** A few small clouds with a soft blue line and a shaded base, high in the strip of sky above the mountains. */
function clouds(): THREE.Mesh {
  const [canvas, g] = paper(1024, 128);
  const rand = random(31);
  for (let i = 0; i < 4; i++) {
    const cx = i * 256 + 128;
    const rx = 92 - i * 9;
    const ry = 34 - (i % 2) * 6;
    puff(g, cx, 66, rx, ry, 6 + (i % 2), rand, 0.38);
    g.fillStyle = STAGE_COLOURS.cloud;
    g.fill();
    g.save();
    g.clip();
    const shade = g.createLinearGradient(0, 62, 0, 100);
    shade.addColorStop(0, 'rgba(220, 234, 243, 0)');
    shade.addColorStop(1, STAGE_COLOURS.cloudShade);
    g.fillStyle = shade;
    g.fillRect(cx - 128, 40, 256, 88);
    g.restore();
    g.strokeStyle = STAGE_COLOURS.cloudLine;
    g.lineWidth = 3;
    g.stroke();
  }
  const map = texture(canvas, true);
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  // x, y, width, picture: far behind the mountains, 6 to 8 degrees above the horizon.
  const spots: [number, number, number, number][] = [
    [-24, 9.4, 10, 0],
    [-5, 10.6, 8, 2],
    [13, 9.0, 11, 1],
    [33, 10.2, 8.5, 3],
    [-44, 10.0, 9, 1],
  ];
  const z = -74;
  spots.forEach(([x, y, w, cell], i) => {
    const h = w / 2;
    positions.push(x - w / 2, y - h / 2, z, x + w / 2, y - h / 2, z, x + w / 2, y + h / 2, z, x - w / 2, y + h / 2, z);
    uvs.push(cell / 4, 0, (cell + 1) / 4, 0, (cell + 1) / 4, 1, cell / 4, 1);
    indices.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3);
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  const material = new THREE.MeshBasicMaterial({ map, transparent: true, premultipliedAlpha: true, depthWrite: false, fog: false });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = -9;
  return mesh;
}

// ── The horizon: mountains and the tree line, one long painting ─────────────────────────────────────────────────────

/** The painting's place: 60 m off, 160 m wide, from just under the ground to above the highest peak (metres). */
const PANORAMA = { width: 160, bottom: -0.5, top: 7, z: -60 };

/** A ridge of peaks across the panorama: soft triangles, rounded off at the tops and in the valleys. */
function ridge(rand: () => number, base: number, peaks: [number, number, number][]): [number, number][] {
  const half = PANORAMA.width / 2;
  const raw: number[] = [];
  const xs: number[] = [];
  for (let x = -half; x <= half; x += 0.25) {
    let h = base;
    for (const [cx, height, width] of peaks) {
      const t = Math.abs(x - cx) / width;
      if (t < 1) h = Math.max(h, base + height * Math.pow(1 - t, 1.35));
    }
    xs.push(x);
    raw.push(h + (rand() - 0.5) * 0.05);
  }
  // Round off the tops and valleys a little.
  return xs.map((x, i) => {
    let sum = 0;
    let n = 0;
    for (let k = -3; k <= 3; k++) {
      const v = raw[i + k];
      if (v !== undefined) {
        sum += v;
        n++;
      }
    }
    return [x, sum / n];
  });
}

function panorama(): THREE.Mesh {
  const W = 4096;
  const H = 256;
  const [canvas, g] = paper(W, H);
  const half = PANORAMA.width / 2;
  const px = (x: number) => ((x + half) / PANORAMA.width) * W;
  const py = (y: number) => ((PANORAMA.top - y) / (PANORAMA.top - PANORAMA.bottom)) * H;
  const unit = W / PANORAMA.width;
  const rand = random(17);

  const range = (line: [number, number][], fill: string, stroke: string, width: number) => {
    const pts = line.map(([x, y]) => [px(x), py(y)] as [number, number]);
    g.beginPath();
    g.moveTo(pts[0][0], H);
    pts.forEach(([x, y]) => g.lineTo(x, y));
    g.lineTo(pts[pts.length - 1][0], H);
    g.closePath();
    g.fillStyle = fill;
    g.fill();
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.strokeStyle = stroke;
    g.lineWidth = width;
    g.stroke();
  };

  /** A crease running down from a peak, as the anime draws a mountain's folds. */
  const creases = (peaks: [number, number, number][], base: number, stroke: string) => {
    g.strokeStyle = stroke;
    g.lineWidth = 2;
    g.globalAlpha = 0.55;
    for (const [cx, height, width] of peaks) {
      const side = rand() < 0.5 ? -1 : 1;
      const top = base + height - 0.35;
      const pts: [number, number][] = [];
      for (let k = 0; k <= 4; k++) {
        const f = k / 4;
        pts.push([px(cx + side * width * 0.12 * f + (rand() - 0.5) * 0.15), py(top - height * 0.45 * f)]);
      }
      smoothPath(g, pts, false);
      g.stroke();
    }
    g.globalAlpha = 1;
  };

  // Far range: pale, many peaks, up to about 4.5 degrees above the horizon (half the sky the stage shows).
  const farPeaks: [number, number, number][] = [];
  for (let x = -half - 4; x < half + 8; x += 7 + rand() * 7) farPeaks.push([x, 1.2 + rand() * 1.6, 5 + rand() * 5]);
  range(ridge(rand, 3.0, farPeaks), STAGE_COLOURS.mountainFar, STAGE_COLOURS.mountainFarLine, 2.5);
  creases(farPeaks, 3.0, STAGE_COLOURS.mountainFarLine);
  // Near range: lower, wider, a shade darker.
  const nearPeaks: [number, number, number][] = [];
  for (let x = -half - 2; x < half + 8; x += 10 + rand() * 9) nearPeaks.push([x, 0.9 + rand() * 1.4, 6 + rand() * 6]);
  range(ridge(rand, 1.8, nearPeaks), STAGE_COLOURS.mountainNear, STAGE_COLOURS.mountainNearLine, 2.5);
  creases(nearPeaks, 1.8, STAGE_COLOURS.mountainNearLine);

  // The tree line along the foot of the mountains: round crowns, outlined only along the top.
  const crowns: [number, number, number][] = [];
  for (let x = -half; x < half + 1; x += 0.8 + rand() * 0.6) crowns.push([x, 0.75 + rand() * 0.5, 0.48 + rand() * 0.34]);
  g.strokeStyle = STAGE_COLOURS.treeLine;
  g.lineWidth = 5;
  for (const [x, y, r] of crowns) {
    g.beginPath();
    g.arc(px(x), py(y), r * unit, 0, Math.PI * 2);
    g.stroke();
  }
  g.fillStyle = STAGE_COLOURS.tree;
  for (const [x, y, r] of crowns) {
    g.beginPath();
    g.arc(px(x), py(y), r * unit, 0, Math.PI * 2);
    g.fill();
  }
  const foot = g.createLinearGradient(0, py(1.0), 0, py(0));
  foot.addColorStop(0, STAGE_COLOURS.tree);
  foot.addColorStop(1, STAGE_COLOURS.treeShade);
  g.fillStyle = foot;
  g.fillRect(0, py(1.0), W, H - py(1.0));
  // A light touch on some crowns, where the sun falls.
  g.strokeStyle = STAGE_COLOURS.treeLight;
  g.lineWidth = 3;
  for (const [x, y, r] of crowns) {
    if (rand() < 0.45) continue;
    g.beginPath();
    g.arc(px(x - r * 0.15), py(y + r * 0.1), r * unit * 0.55, Math.PI * 1.1, Math.PI * 1.55);
    g.stroke();
  }

  const map = texture(canvas, true);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(PANORAMA.width, PANORAMA.top - PANORAMA.bottom),
    new THREE.MeshBasicMaterial({ map, transparent: true, premultipliedAlpha: true, depthWrite: false, fog: false }),
  );
  mesh.position.set(0, (PANORAMA.top + PANORAMA.bottom) / 2, PANORAMA.z);
  mesh.renderOrder = -8;
  return mesh;
}

// ── The field ────────────────────────────────────────────────────────────────────────────────────────────────────

/** How much ground one copy of the field's little marks covers (metres); a second, larger copy hides the repeat. */
const TILE = 2.4;
const TILE_2 = 3.9;

/**
 * The field's little marks on the field colour, one tile that repeats: short pairs of grass strokes, clover leaves,
 * and tiny flowers in white, pink and yellow. The ground adds each mark's difference from the field colour, so the
 * same tile serves the fresher near field and the paler far one, and the marks fade into the field with distance.
 */
function fieldMarks(): THREE.CanvasTexture {
  const S = 512;
  const [canvas, g] = paper(S, S);
  g.fillStyle = STAGE_COLOURS.meadowNear;
  g.fillRect(0, 0, S, S);
  const rand = random(5);
  /** Draws at (x, y) and, near an edge, again on the far side, so the tile joins up when it repeats. */
  const wrap = (x: number, y: number, r: number, paint: (x: number, y: number) => void) => {
    for (const ox of [-S, 0, S]) {
      for (const oy of [-S, 0, S]) {
        const X = x + ox;
        const Y = y + oy;
        if (X > -r && X < S + r && Y > -r && Y < S + r) paint(X, Y);
      }
    }
  };
  // Faint lighter patches, so the field is not one flat colour up close.
  g.fillStyle = 'rgba(214, 236, 182, 0.55)';
  for (let i = 0; i < 9; i++) {
    const r = 30 + rand() * 40;
    wrap(rand() * S, rand() * S, r, (x, y) => {
      g.beginPath();
      g.ellipse(x, y, r * 1.5, r * 0.8, 0, 0, Math.PI * 2);
      g.fill();
    });
  }
  // Grass marks: two or three short strokes.
  g.strokeStyle = STAGE_COLOURS.grass;
  g.lineWidth = 2.6;
  for (let i = 0; i < 46; i++) {
    const strokes = rand() < 0.3 ? 3 : 2;
    const h = 11 + rand() * 6;
    wrap(rand() * S, rand() * S, 20, (x, y) => {
      for (let k = 0; k < strokes; k++) {
        const dx = (k - (strokes - 1) / 2) * 5;
        g.beginPath();
        g.moveTo(x + dx, y);
        g.lineTo(x + dx * 1.35 + (rand() - 0.5) * 1.5, y - h + Math.abs(dx) * 0.3);
        g.stroke();
      }
    });
  }
  // Clover: three round leaves.
  for (let i = 0; i < 7; i++) {
    const r = 4 + rand() * 1.5;
    wrap(rand() * S, rand() * S, 14, (x, y) => {
      g.fillStyle = STAGE_COLOURS.clover;
      g.strokeStyle = STAGE_COLOURS.grass;
      g.lineWidth = 1.6;
      for (let k = 0; k < 3; k++) {
        const a = -Math.PI / 2 + (k * Math.PI * 2) / 3;
        g.beginPath();
        g.arc(x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.9, r, 0, Math.PI * 2);
        g.fill();
        g.stroke();
      }
    });
  }
  // Tiny flowers.
  const flowers: [string, string, number][] = [
    ['#FFFFFF', '#FFE38A', 9],
    ['#F7AFC1', '#FFE38A', 6],
    ['#FFE07A', '#F5B84F', 5],
    ['#F59C86', '#FFE38A', 2],
  ];
  for (const [petal, middle, count] of flowers) {
    for (let i = 0; i < count; i++) {
      const r = 3.6 + rand() * 1.4;
      wrap(rand() * S, rand() * S, 10, (x, y) => {
        g.fillStyle = petal;
        g.beginPath();
        g.arc(x, y, r, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = middle;
        g.beginPath();
        g.arc(x, y, r * 0.38, 0, Math.PI * 2);
        g.fill();
      });
    }
  }
  const map = texture(canvas, false);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = 8;
  return map;
}

/** The ground: the field's colour, fresher near the friends, with its little marks, up to the tree line. */
function ground(marks: THREE.Texture): THREE.Mesh {
  const near = new THREE.Color(STAGE_COLOURS.meadowNear);
  const material = new THREE.ShaderMaterial({
    fog: false,
    uniforms: {
      uMarks: { value: marks },
      uNear: { value: near },
      uFar: { value: new THREE.Color(STAGE_COLOURS.meadowFar) },
      uTileBase: { value: near.clone() },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMarks;
      uniform vec3 uNear;
      uniform vec3 uFar;
      uniform vec3 uTileBase;
      varying vec3 vWorld;
      void main() {
        float far = smoothstep(-2.0, -42.0, vWorld.z);
        vec3 colour = mix(uNear, uFar, far);
        vec3 a = texture2D(uMarks, vWorld.xz / ${TILE.toFixed(2)}).rgb - uTileBase;
        vec3 b = texture2D(uMarks, vWorld.xz / ${TILE_2.toFixed(2)} + vec2(0.37, 0.61)).rgb - uTileBase;
        colour += (a + b * 0.7) * (1.0 - 0.55 * far);
        gl_FragColor = vec4(clamp(colour, 0.0, 1.0), 1.0);
        #include <colorspace_fragment>
      }
    `,
  });
  // From behind the camera to just past the tree line.
  const depth = 12 - PANORAMA.z + 1;
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(260, depth), material);
  plane.rotation.x = -Math.PI / 2;
  plane.position.set(0, 0, 12 - depth / 2);
  plane.renderOrder = -7;
  return plane;
}

// ── Big trees at the sides ────────────────────────────────────────────────────────────────────────────────────────

/** A big round tree: a puffy crown on a short trunk, with a darker underside, a few leaf marks and a light top. */
function drawTree(g: Pen, cx: number, size: number, seed: number): void {
  const rand = random(seed);
  // The bumps reach about a tenth of the size past this oval: the crown stays inside its picture.
  const crownY = size * 0.42;
  const rx = size * 0.4;
  const ry = size * 0.31;
  // Trunk, flaring at the foot.
  g.beginPath();
  g.moveTo(cx - size * 0.07, size * 0.6);
  g.quadraticCurveTo(cx - size * 0.06, size * 0.88, cx - size * 0.13, size * 0.985);
  g.lineTo(cx + size * 0.13, size * 0.985);
  g.quadraticCurveTo(cx + size * 0.06, size * 0.88, cx + size * 0.07, size * 0.6);
  g.closePath();
  g.fillStyle = STAGE_COLOURS.trunk;
  g.fill();
  g.strokeStyle = STAGE_COLOURS.trunkLine;
  g.lineWidth = 4;
  g.stroke();
  // Crown.
  puff(g, cx, crownY, rx, ry, 11, rand, 0.12);
  g.fillStyle = STAGE_COLOURS.tree;
  g.fill();
  g.save();
  g.clip();
  const under = g.createLinearGradient(0, crownY, 0, crownY + ry * 1.1);
  under.addColorStop(0, 'rgba(127, 178, 104, 0)');
  under.addColorStop(1, STAGE_COLOURS.treeShade);
  g.fillStyle = under;
  g.fillRect(cx - rx * 1.6, crownY - ry, rx * 3.2, ry * 2.4);
  // Light bumps on the upper left.
  g.strokeStyle = STAGE_COLOURS.treeLight;
  g.lineWidth = 6;
  for (let i = 0; i < 4; i++) {
    const a = Math.PI * (1.1 + i * 0.13);
    const x = cx + Math.cos(a) * rx * 0.62;
    const y = crownY + Math.sin(a) * ry * 0.62;
    g.beginPath();
    g.arc(x, y, size * 0.06, Math.PI * 1.05, Math.PI * 1.75);
    g.stroke();
  }
  // Leaf marks: little curved strokes.
  g.strokeStyle = STAGE_COLOURS.treeShade;
  g.lineWidth = 4;
  for (let i = 0; i < 14; i++) {
    const a = rand() * Math.PI * 2;
    const d = Math.sqrt(rand()) * 0.75;
    const x = cx + Math.cos(a) * rx * d;
    const y = crownY + Math.sin(a) * ry * d;
    g.beginPath();
    g.arc(x, y, size * 0.03, Math.PI * 0.15, Math.PI * 0.85);
    g.stroke();
  }
  g.restore();
  // The line round the crown: the same bumps again (the same seed), drawn over the shading.
  puff(g, cx, crownY, rx, ry, 11, random(seed), 0.12);
  g.strokeStyle = STAGE_COLOURS.treeLine;
  g.lineWidth = 5;
  g.stroke();
}

function trees(): THREE.Mesh {
  const [canvas, g] = paper(1024, 512);
  drawTree(g, 256, 512, 11);
  drawTree(g, 768, 512, 23);
  const map = texture(canvas, true);
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  // x, z, height, picture: off to each side, so they frame the friends in a lesson's wide band and still peek in at
  // the edges of Today's taller scene, without standing behind the friends.
  const spots: [number, number, number, number][] = [
    [-6.8, -22, 3.4, 0],
    [9.0, -30, 3.0, 1],
  ];
  spots.forEach(([x, z, h, cell], i) => {
    const w = h;
    positions.push(x - w / 2, 0, z, x + w / 2, 0, z, x + w / 2, h, z, x - w / 2, h, z);
    uvs.push(cell / 2, 0, (cell + 1) / 2, 0, (cell + 1) / 2, 1, cell / 2, 1);
    indices.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3);
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({ map, transparent: true, premultipliedAlpha: true, depthWrite: false, fog: false }),
  );
  mesh.renderOrder = -6;
  return mesh;
}

// ── Little things round the friends ──────────────────────────────────────────────────────────────────────────────

type Little = 'tuft' | 'clover' | 'pink' | 'dandelion';

/** Draws one cell of the little-things atlas: a grass tuft, a white clover, a pink flower or a dandelion. */
function drawLittle(g: Pen, cell: number, kind: Little): void {
  const s = 128;
  g.save();
  g.translate(cell * s, 0);
  if (kind === 'tuft') {
    // Three blades, each a thin leaf with a darker line.
    for (const [dx, h, lean] of [
      [-16, 46, -0.35],
      [2, 62, 0.05],
      [18, 42, 0.4],
    ] as const) {
      const base = 64 + dx;
      const tipX = base + lean * 40;
      g.beginPath();
      g.moveTo(base - 6, 126);
      g.quadraticCurveTo(base - 4, 126 - h * 0.5, tipX, 126 - h);
      g.quadraticCurveTo(base + 4, 126 - h * 0.5, base + 6, 126);
      g.closePath();
      g.fillStyle = '#9BCF7E';
      g.fill();
      g.strokeStyle = STAGE_COLOURS.treeLine;
      g.lineWidth = 3;
      g.stroke();
    }
  } else {
    // Stem and a leaf.
    g.strokeStyle = '#78B162';
    g.lineWidth = 6;
    g.beginPath();
    g.moveTo(64, 126);
    g.quadraticCurveTo(60, 96, 64, 66);
    g.stroke();
    if (kind === 'clover') {
      // A trefoil leaf by the stem, and a white pompom head.
      g.fillStyle = STAGE_COLOURS.clover;
      g.strokeStyle = STAGE_COLOURS.treeLine;
      g.lineWidth = 2.5;
      for (let k = 0; k < 3; k++) {
        const a = -Math.PI / 2 + (k * Math.PI * 2) / 3;
        g.beginPath();
        g.arc(86 + Math.cos(a) * 9, 104 + Math.sin(a) * 9, 9, 0, Math.PI * 2);
        g.fill();
        g.stroke();
      }
      puff(g, 64, 50, 24, 22, 10, random(3), 0);
      g.fillStyle = '#FFFFFF';
      g.fill();
      g.strokeStyle = '#B8C9A6';
      g.lineWidth = 3;
      g.stroke();
      g.strokeStyle = '#D6E2C8';
      g.lineWidth = 2;
      for (let k = 0; k < 5; k++) {
        g.beginPath();
        g.arc(52 + k * 6, 44 + (k % 2) * 8, 5, Math.PI * 0.2, Math.PI * 0.8);
        g.stroke();
      }
    } else {
      g.fillStyle = '#8CC47A';
      g.beginPath();
      g.ellipse(78, 100, 13, 6, -0.6, 0, Math.PI * 2);
      g.fill();
      const pink = kind === 'pink';
      const petal = pink ? '#F7B3C4' : '#FFD95E';
      const line = pink ? '#DE8CA2' : '#D9AE3C';
      if (pink) {
        // Five round petals and a yellow middle.
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
          g.beginPath();
          g.arc(64 + Math.cos(a) * 16, 50 + Math.sin(a) * 16, 12, 0, Math.PI * 2);
          g.fillStyle = petal;
          g.fill();
          g.strokeStyle = line;
          g.lineWidth = 3;
          g.stroke();
        }
        g.fillStyle = '#FFE38A';
        g.beginPath();
        g.arc(64, 50, 10, 0, Math.PI * 2);
        g.fill();
      } else {
        // A dandelion: a round, ragged yellow head.
        puff(g, 64, 50, 26, 24, 14, random(9), 0);
        g.fillStyle = petal;
        g.fill();
        g.strokeStyle = line;
        g.lineWidth = 3;
        g.stroke();
        g.strokeStyle = '#F2C445';
        g.lineWidth = 2.5;
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2;
          g.beginPath();
          g.moveTo(64 + Math.cos(a) * 6, 50 + Math.sin(a) * 6);
          g.lineTo(64 + Math.cos(a) * 16, 50 + Math.sin(a) * 16);
          g.stroke();
        }
      }
    }
  }
  g.restore();
}

/**
 * Tufts and flowers standing on the ground round the friends, all in one mesh (upright quads facing the camera's
 * side, which hardly turns), cut out of one small atlas.
 */
function littleThings(): THREE.Mesh {
  const [canvas, g] = paper(512, 128);
  (['tuft', 'clover', 'pink', 'dandelion'] as const).forEach((kind, i) => drawLittle(g, i, kind));
  const map = texture(canvas, false);

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
    // Near the friends, where the ground is seen: in front of them, and beside them.
    const x = (rand() * 2 - 1) * 3.4;
    const z = -1.6 + rand() * 4.2;
    // Not where the friends stand, nor just behind them (seen from the camera, those would seem to grow out of them).
    if (Math.abs(x) < 1.45 && z < 0.75) continue;
    const roll = rand();
    const cell = roll < 0.55 ? 0 : roll < 0.75 ? 1 : roll < 0.9 ? 2 : 3;
    const size = cell === 0 ? 0.12 + rand() * 0.07 : 0.15 + rand() * 0.06;
    put(x, z, size, cell);
    placed++;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  return new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map, alphaTest: 0.5, side: THREE.DoubleSide }));
}

export interface Backdrop {
  readonly group: THREE.Group;
  readonly fog: THREE.Fog;
  readonly background: THREE.Color;
  dispose(): void;
}

export function buildBackdrop(): Backdrop {
  const group = new THREE.Group();
  const marks = fieldMarks();
  group.add(skyDome(), clouds(), panorama(), ground(marks), trees(), littleThings());
  return {
    group,
    // Nothing here is fogged: the far pieces are painted in their own hazy colours. The scene keeps a fog that
    // starts beyond the meadow, for anything else that may ever stand far off.
    fog: new THREE.Fog(STAGE_COLOURS.horizon.clone(), 80, 200),
    background: STAGE_COLOURS.horizon.clone(),
    dispose() {
      marks.dispose();
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

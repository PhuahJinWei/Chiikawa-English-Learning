// The app's hand-drawn outlines (PLAN.md section 6): every frame is drawn once, here, as a small SVG, and the app
// lays it around buttons, cards and bubbles with CSS border-image. Nothing is drawn while the app runs: no SVG
// filters, which iPhone Safari would redo on every scroll and animation frame.
//
// A frame is a nine-slice picture: the four corners keep their size, and the straight parts between them stretch or
// shrink to fit the element. So the pen's wobble lives where stretching cannot spoil it: in the corners, which are
// drawn 1:1, and as one gentle bow along the top and bottom edges. The sides are straight, because on a short element
// (a one-line bubble) their middle shrinks to a few pixels, and any wobble there would turn into a notch.
//
// The line is ink brown, about 3px, a little thicker towards the bottom right and in the corners. It always covers
// the element's own clean edge: its outer side lies just outside that edge (the frame reaches out with
// border-image-outset) and its inner side well inside, so the element's fill never shows outside the line. Buttons
// also get their hard shadow drawn here, in the same shape, so a press can shrink it.
//
//   npm run sketch     (writes src/app/sketch.css; tests/sketch.test.ts fails while it is out of date)

const INK = '#66432f';
const STAMP = '#e0607a';
const WHITE = '#ffffff';
/** How far the frame reaches outside the element (CSS border-image-outset). */
export const PAD = 2;

/**
 * Line styles, in CSS pixels. `width` is the average thickness; `lean` adds to the bottom and right and takes from
 * the top and left; `corner` thickens the middle of each corner; `vary` is the pen's own unevenness; the line's outer
 * side lies `outside` beyond the element's edge, give or take `wobble`.
 */
export const LOOKS = {
  // Buttons, bubbles, the main cards.
  thick: { width: 3.3, lean: 0.45, corner: 0.3, vary: 0.3, outside: 0.8, wobble: 0.55 },
  // Small controls (round buttons, toggles, highlighted words): a little lighter, so they do not turn into blots.
  medium: { width: 2.9, lean: 0.35, corner: 0.25, vary: 0.25, outside: 0.75, wobble: 0.45 },
  // Lists, sections of a page, ordinary word blocks.
  thin: { width: 2.2, lean: 0.3, corner: 0.2, vary: 0.22, outside: 0.7, wobble: 0.45 },
};

/** Corner radii as [horizontal, vertical] for the top-left, top-right, bottom-right and bottom-left corners. */
const R = {
  card: [
    [26, 23],
    [21, 28],
    [28, 21],
    [23, 26],
  ],
  // Smaller than a card's: a one-line bubble is short, and corner pieces taller than half of it would make the browser
  // shrink the whole frame (and the tail would no longer meet its line).
  bubble: [
    [22, 18],
    [18, 21],
    [22, 17],
    [19, 20],
  ],
  btn: [
    [20, 18],
    [17, 21],
    [21, 17],
    [18, 20],
  ],
  row: [
    [17, 15],
    [14, 16],
    [16, 14],
    [15, 17],
  ],
  ctl: [
    [15, 13],
    [13, 15],
    [14, 12],
    [12, 14],
  ],
  // Small enough that the smallest word blocks (in list rows, about 28px tall) need no shrinking.
  word: [
    [13, 11],
    [11, 13],
    [13, 10],
    [11, 12],
  ],
  pill: [
    [15, 15],
    [15, 15],
    [15, 15],
    [15, 15],
  ],
  ring: [
    [22, 22],
    [22, 22],
    [22, 22],
    [22, 22],
  ],
};

/**
 * Nine-slice frames. `w` × `h` is the size the picture is drawn at: about the narrowest element that wears it, so the
 * bows mostly stretch (a bow squeezed into a few pixels would look like a bump). `bow` is off for small things, whose
 * edges are short. `shadow` is the depth of a button's hard shadow. Frames that share a seed share their wobble, so
 * a pressed button keeps its outline and only its shadow changes.
 */
export const FRAMES = [
  { name: 'card', w: 160, h: 70, radii: R.card, look: 'thick', seed: 11, bow: true },
  { name: 'card-soft', w: 160, h: 70, radii: R.card, look: 'thin', seed: 12, bow: true },
  // A speech bubble: a card without the bows, so its tail (drawTail) meets a level line wherever it points.
  { name: 'bubble', w: 160, h: 60, radii: R.bubble, look: 'thick', seed: 13 },
  { name: 'btn', w: 120, h: 56, radii: R.btn, look: 'thick', seed: 21, bow: true, shadow: 3 },
  { name: 'btn-soft', w: 120, h: 56, radii: R.btn, look: 'thick', seed: 21, bow: true, shadow: 2 },
  { name: 'btn-down', w: 120, h: 56, radii: R.btn, look: 'thick', seed: 21, bow: true, shadow: 1 },
  { name: 'row', w: 120, h: 50, radii: R.row, look: 'thin', seed: 31, bow: true },
  { name: 'ctl', w: 70, h: 40, radii: R.ctl, look: 'medium', seed: 41 },
  { name: 'pill', w: 52, h: 32, radii: R.pill, look: 'medium', seed: 51 },
  { name: 'ring', w: 46, h: 46, radii: R.ring, look: 'medium', seed: 61 },
  { name: 'word', w: 60, h: 36, radii: R.word, look: 'thin', seed: 71 },
  { name: 'word-hi', w: 60, h: 36, radii: R.word, look: 'medium', seed: 72 },
];

/** The CSS border-radius that matches each set of corners, so an element's fill sits inside its frame. */
export const RADII = { card: R.card, bubble: R.bubble, btn: R.btn, row: R.row, ctl: R.ctl, word: R.word };

// ── Drawing ──────────────────────────────────────────────────────────────────────────────────────────────────────

/** A small seeded random generator (mulberry32): the same frames on every run. */
function random(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A smooth wobble along a line of length `length`, between -1 and 1: a few sine waves of about the given wavelengths.
 * On a closed line each wave fits a whole number of times, so the line meets itself where it started.
 */
function wobble(rand, length, waves, closed = true) {
  const parts = waves.map(([wavelength, amp]) => ({
    k: closed ? Math.max(1, Math.round(length / wavelength)) : length / wavelength,
    amp,
    phase: rand() * Math.PI * 2,
  }));
  const total = parts.reduce((sum, p) => sum + p.amp, 0);
  return (s) => parts.reduce((sum, p) => sum + p.amp * Math.sin((2 * Math.PI * p.k * s) / length + p.phase), 0) / total;
}

const DEG = Math.PI / 180;

/**
 * Samples straight lines and elliptical arcs into points, each with its outward normal, which part it belongs to and
 * how far along that part it is (`u`, 0..1).
 */
function sample(segments, { edgeStep = 8, arcStep = 2.5 } = {}) {
  const pts = [];
  segments.forEach((seg, part) => {
    if (seg.line) {
      const [x0, y0, x1, y1, nx, ny] = seg.line;
      const len = Math.hypot(x1 - x0, y1 - y0);
      if (len < 1e-6) return;
      const n = Math.max(1, Math.ceil(len / edgeStep));
      for (let i = 0; i < n; i++) {
        pts.push({ x: x0 + ((x1 - x0) * i) / n, y: y0 + ((y1 - y0) * i) / n, nx, ny, part, arc: false, u: i / n });
      }
    } else {
      const [cx, cy, rx, ry, a0, a1] = seg.arc;
      const len = Math.abs(a1 - a0) * Math.sqrt((rx * rx + ry * ry) / 2);
      const n = Math.max(2, Math.ceil(len / arcStep));
      for (let i = 0; i < n; i++) {
        const a = a0 + ((a1 - a0) * i) / n;
        const nx = Math.cos(a) / rx;
        const ny = Math.sin(a) / ry;
        const m = Math.hypot(nx, ny);
        pts.push({ x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a), nx: nx / m, ny: ny / m, part, arc: true, u: i / n });
      }
    }
  });
  return pts;
}

/** Adds each point's distance along the line; returns the whole length (closed: back to the first point). */
function measure(pts, closed) {
  let s = 0;
  pts.forEach((p, i) => {
    if (i) s += Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y);
    p.s = s;
  });
  return closed ? s + Math.hypot(pts[0].x - pts.at(-1).x, pts[0].y - pts.at(-1).y) : s;
}

/** A rounded rectangle's outline (0..w, 0..h), clockwise from the top edge. */
function roundedRect(w, h, [tl, tr, br, bl]) {
  return sample([
    { line: [tl[0], 0, w - tr[0], 0, 0, -1] },
    { arc: [w - tr[0], tr[1], tr[0], tr[1], -90 * DEG, 0] },
    { line: [w, tr[1], w, h - br[1], 1, 0] },
    { arc: [w - br[0], h - br[1], br[0], br[1], 0, 90 * DEG] },
    { line: [w - br[0], h, bl[0], h, 0, 1] },
    { arc: [bl[0], h - bl[1], bl[0], bl[1], 90 * DEG, 180 * DEG] },
    { line: [0, h - bl[1], 0, tl[1], -1, 0] },
    { arc: [tl[0], tl[1], tl[0], tl[1], 180 * DEG, 270 * DEG] },
  ]);
}

/**
 * The ink band along a line: for each point, where its outer side lies (`outside` the clean edge) and its `width`.
 * The pen's unevenness rises and falls inside each corner (none where a corner meets a straight edge, so the edges
 * can stretch); top and bottom edges between `bow[0]` and `bow[1]` (x) get one gentle bow each. `taper` (0..1)
 * thins the ends of an open line.
 */
function band(pts, length, rand, look, { closed = true, taper = () => 1, bow = null } = {}) {
  const out = wobble(rand, length, [[45, 1], [26, 0.5]], closed);
  const thick = wobble(rand, length, [[38, 1], [20, 0.5]], closed);
  // One bow per top or bottom edge: a hump, tipped a little one way, in place and in thickness.
  const sign = () => (rand() < 0.5 ? -1 : 1);
  const bows = new Map();
  for (const p of pts) {
    if (p.arc || p.ny === 0 || bows.has(p.part)) continue;
    const a1 = sign() * (0.55 + 0.25 * rand());
    const a2 = sign() * 0.3 * rand();
    const c1 = sign() * (0.5 + 0.5 * rand());
    const c2 = sign() * 0.5 * rand();
    bows.set(p.part, { a1, a2, c1, c2 });
  }
  return pts.map((p) => {
    const win = p.arc ? Math.sin(Math.PI * p.u) : 0;
    let bowOut = 0;
    let bowWidth = 0;
    if (bow && !p.arc && p.ny !== 0) {
      const v = (p.x - bow[0]) / (bow[1] - bow[0]);
      if (v > 0 && v < 1) {
        const b = bows.get(p.part);
        bowOut = b.a1 * Math.sin(Math.PI * v) + b.a2 * Math.sin(2 * Math.PI * v);
        bowWidth = b.c1 * Math.sin(Math.PI * v) + b.c2 * Math.sin(2 * Math.PI * v);
      }
    }
    const outside = look.outside + look.wobble * (win * out(p.s) + bowOut);
    const lean = p.nx * 0.6 + p.ny * 0.8;
    const corner = 2 * Math.abs(p.nx * p.ny);
    const width =
      (look.width + look.lean * lean + look.corner * corner + look.vary * (win * thick(p.s) + bowWidth)) * taper(p.s);
    return {
      ...p,
      outside,
      width,
      ox: p.x + p.nx * outside,
      oy: p.y + p.ny * outside,
      ix: p.x - p.nx * (width - outside),
      iy: p.y - p.ny * (width - outside),
    };
  });
}

/** A number in tenths of a pixel, as short as SVG allows ("-.5", "12", "3.4"). */
function num(tenths) {
  const v = tenths / 10;
  const s = String(Math.abs(v)).replace(/^0\./, '.');
  return (v < 0 ? '-' : '') + s;
}

/** A closed polygon as compact SVG path data: one absolute point, then relative steps on a 0.1px grid. */
function polygon(points) {
  let px = 0;
  let py = 0;
  const nums = [];
  let d = '';
  points.forEach(([x, y], i) => {
    const rx = Math.round(x * 10);
    const ry = Math.round(y * 10);
    if (i === 0) d += `M${num(rx)},${num(ry)}l`;
    else nums.push(num(rx - px), num(ry - py));
    px = rx;
    py = ry;
  });
  return (d + nums.join(',') + 'z').replace(/,-/g, '-');
}

const svg = (w, h, body) =>
  `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>${body}</svg>`;

/** A data: URL for CSS, encoding only what must be (much smaller than base64). */
const dataUrl = (s) =>
  `url("data:image/svg+xml,${s.replace(/%/g, '%25').replace(/#/g, '%23').replace(/</g, '%3C').replace(/>/g, '%3E').replace(/ /g, '%20')}")`;

/** One nine-slice frame: the picture, and the border-image values that lay it around an element 1:1. */
export function drawFrame({ w, h, radii, look, seed, bow = false, shadow = 0 }) {
  const W = w + 2 * PAD;
  const H = h + 2 * PAD + shadow;
  // Each corner piece holds its whole curve and a pixel more, and at least 2px of straight edge is left between
  // them: a middle piece of no size cannot stretch, and would leave a gap on a larger element.
  const s = Math.min(PAD + Math.ceil(Math.max(...radii.flat())) + 1, Math.floor((Math.min(W, h + 2 * PAD) - 2) / 2));
  const rand = random(seed);
  const pts = roundedRect(w, h, radii);
  const length = measure(pts, true);
  const line = band(pts, length, rand, LOOKS[look], { bow: bow ? [s - PAD, w - (s - PAD)] : null });
  const at = (x, y) => [x + PAD, y + PAD];
  let body = `<path fill='${INK}' fill-rule='evenodd' d='${polygon(line.map((p) => at(p.ox, p.oy)))}${polygon(line.map((p) => at(p.ix, p.iy)).reverse())}'/>`;
  if (shadow) {
    // The hard shadow: the outline's lower half, moved down. Its top edge tucks 1px under the line, so no seam shows.
    const low = line.filter((p) => p.ny > 0.02);
    const top = low.map((p) => at(p.ox - p.nx, p.oy - p.ny));
    const bottom = low.map((p) => at(p.ox, p.oy + shadow)).reverse();
    body += `<path fill='${INK}' d='${polygon([...top, ...bottom])}'/>`;
  }
  const slice = [s, s, s + shadow, s];
  const picture = svg(W, H, body);
  return {
    svg: picture,
    line,
    slice,
    size: [W, H],
    css: `${dataUrl(picture)} ${slice.join(' ')} / ${slice.map((v) => `${v}px`).join(' ')} / ${PAD}px ${PAD}px ${PAD + shadow}px ${PAD}px`,
  };
}

/**
 * The top edge of a page panel (and the tour's sheet): a line over the top with its rounded corners, thinning out as
 * it turns down the sides, as a pen stroke ends. Only the top row of the nine slices is used.
 */
export function drawEdge() {
  const r = 26;
  const w = 400;
  const side = r + 4;
  const rand = random(81);
  const pts = sample([
    { arc: [r, r, r, r, 180 * DEG, 270 * DEG] },
    { line: [r, 0, w - r, 0, 0, -1] },
    { arc: [w - r, r, r, r, 270 * DEG, 360 * DEG] },
  ]);
  pts.push({ x: w, y: r, nx: 1, ny: 0, part: 2, arc: true, u: 1 });
  const length = measure(pts, false);
  const turn = (r * Math.PI) / 2;
  const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
  const taper = (s) => 0.1 + 0.9 * ease(Math.min(s, length - s) / (turn * 0.85));
  const line = band(pts, length, rand, LOOKS.thick, { closed: false, taper, bow: [side, w - side] });
  const H = PAD + r + 4;
  const at = (x, y) => [x, y + PAD];
  const body = `<path fill='${INK}' d='${polygon([...line.map((p) => at(p.ox, p.oy)), ...line.map((p) => at(p.ix, p.iy)).reverse()])}'/>`;
  const picture = svg(w, H, body);
  return {
    svg: picture,
    line,
    css: `${dataUrl(picture)} ${H} ${side} 0 ${side} / ${H}px ${side}px 0 ${side}px / ${PAD}px 0 0 0`,
  };
}

/** Points along a cubic Bézier curve, each with its direction's left-hand normal. */
function bezier([p0, p1, p2, p3], n) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    const x = u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0];
    const y = u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1];
    const dx = 3 * u * u * (p1[0] - p0[0]) + 6 * u * t * (p2[0] - p1[0]) + 3 * t * t * (p3[0] - p2[0]);
    const dy = 3 * u * u * (p1[1] - p0[1]) + 6 * u * t * (p2[1] - p1[1]) + 3 * t * t * (p3[1] - p2[1]);
    const m = Math.hypot(dx, dy) || 1;
    out.push({ x, y, nx: -dy / m, ny: dx / m, t });
  }
  return out;
}

/** A stroke of varying width along a curve, as a filled outline. */
function stroke(curve, widthAt) {
  const left = curve.map((p) => [p.x + (p.nx * widthAt(p.t)) / 2, p.y + (p.ny * widthAt(p.t)) / 2]);
  const right = curve.map((p) => [p.x - (p.nx * widthAt(p.t)) / 2, p.y - (p.ny * widthAt(p.t)) / 2]);
  return polygon([...left, ...right.reverse()]);
}

/**
 * A speech bubble's tail, pointing up (Bubble.svelte turns it over for a tail that points down). The bubble's edge is
 * at y = 16. The white inside covers the bubble's own line between the two sides; each side bends level and runs on
 * along that line, thinning out inside it, so the join shows no step. TAIL_REACH is how far it reaches either way
 * from its middle: Bubble.svelte keeps it that far clear of the bubble's rounded corners.
 */
export const TAIL_REACH = 16;
export function drawTail() {
  const W = 2 * TAIL_REACH;
  const H = 23;
  const tip = [15.4, 1.8];
  const level = 16.7;
  // Each side: the curve from the tip, then a straight run along the bubble's line (t from 1 to 2).
  const side = (curve, runTo) => {
    const end = curve.at(-1);
    const dir = Math.sign(runTo - end.x);
    const run = [1, 2, 3, 4, 5].map((i) => ({ x: end.x + ((runTo - end.x) * i) / 5, y: level, nx: 0, ny: dir, t: 1 + i / 5 }));
    return [...curve, ...run];
  };
  const leftCurve = bezier([tip, [13.9, 8.4], [10.6, level], [6.6, level]], 14);
  const rightCurve = bezier([tip, [16.9, 8.4], [20.8, level], [25, level]], 14);
  const inside = polygon([
    ...leftCurve.map((p) => [p.x, p.y]),
    [8.2, H],
    [23.6, H],
    ...rightCurve.map((p) => [p.x, p.y]).reverse(),
  ]);
  const width = (t) => (t <= 1 ? 2.3 + 0.8 * t : 3.1 - 2.2 * (t - 1));
  // Two paths: the sides wind opposite ways, and in one path their overlap at the tip would cancel out.
  const body =
    `<path fill='${WHITE}' d='${inside}'/>` +
    `<path fill='${INK}' d='${stroke(side(leftCurve, 1.6), width)}'/>` +
    `<path fill='${INK}' d='${stroke(side(rightCurve, W - 1.6), width)}'/>` +
    `<circle fill='${INK}' cx='${tip[0]}' cy='${tip[1]}' r='1.25'/>`;
  return { svg: svg(W, H, body), css: dataUrl(svg(W, H, body)), size: [W, H] };
}

/** A rubber-stamp ring, inked unevenly, drawn just inside a circle of the given size (as a background picture). */
export function drawStamp(size, look, seed) {
  const rand = random(seed);
  const c = size / 2;
  const n = Math.ceil((Math.PI * size) / 2.5);
  const length = Math.PI * size;
  const inset = wobble(rand, length, [[70, 1], [35, 0.5]]);
  const ink = wobble(rand, length, [[60, 1], [28, 0.6], [16, 0.3]]);
  const outer = [];
  const inner = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const s = (i / n) * length;
    const ro = c - look.inside - look.wobble * (1 + inset(s)) * 0.5;
    const ri = ro - (look.width + look.vary * ink(s));
    outer.push([c + ro * Math.cos(a), c + ro * Math.sin(a)]);
    inner.push([c + ri * Math.cos(a), c + ri * Math.sin(a)]);
  }
  const body = `<path fill='${STAMP}' fill-rule='evenodd' d='${polygon(outer)}${polygon(inner.reverse())}'/>`;
  return { svg: svg(size, size, body), css: dataUrl(svg(size, size, body)) };
}

export const STAMPS = {
  stamp: { size: 104, look: { width: 4.3, vary: 1, inside: 0.3, wobble: 0.9 }, seed: 91 },
  'stamp-sm': { size: 32, look: { width: 2.4, vary: 0.45, inside: 0.2, wobble: 0.6 }, seed: 92 },
};

const radius = (corners) =>
  `${corners.map(([x]) => `${x}px`).join(' ')} / ${corners.map(([, y]) => `${y}px`).join(' ')}`;

/** The whole generated stylesheet. */
export function buildSketchCss() {
  const lines = [
    '/* Generated by tools/sketch/sketch.mjs (npm run sketch). Do not edit: change the tool and run it again.',
    '   Hand-drawn frames for border-image (see the tool for how they are drawn) and the corner radii that match them. */',
    ':root {',
  ];
  for (const [name, corners] of Object.entries(RADII)) lines.push(`  --r-${name}: ${radius(corners)};`);
  for (const f of FRAMES) lines.push(`  --frame-${f.name}: ${drawFrame(f).css};`);
  lines.push(`  --frame-edge: ${drawEdge().css};`);
  lines.push(`  --tail: ${drawTail().css};`);
  for (const [name, s] of Object.entries(STAMPS)) lines.push(`  --${name}: ${drawStamp(s.size, s.look, s.seed).css};`);
  lines.push('}', '');
  return lines.join('\n');
}

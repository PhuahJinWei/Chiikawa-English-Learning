import type { Face, FriendId, Gesture, Mark, ScreenPoint, StageApi } from '../stage/types.ts';
import { FRIENDS } from './friends.ts';

/**
 * A flat 2D stage: soft round friends drawn on a canvas. Used while the 3D stage loads, and as the fallback if 3D
 * cannot start on the phone (the lessons work the same either way, only the friends are simpler).
 */
interface Flat {
  id: FriendId;
  x: number;
  hop: number;
  face: Face | null;
  mark: { kind: Mark; until: number } | null;
  gesture: Gesture | null;
  gestureEnd: number;
  resolve: (() => void) | null;
  talking: boolean;
}

const ONE_SHOT: Partial<Record<Gesture, number>> = { wave: 1.6, hop: 1.0, cheer: 1.4, bow: 1.4, startled: 1.0, nod: 1.0, shake: 1.0 };
const MARKS: Record<Mark, string> = { exclaim: '!', question: '?', zzz: 'z', note: '♪', heart: '♥' };

export function createFlatStage(): StageApi {
  let canvas: HTMLCanvasElement | null = null;
  let g: CanvasRenderingContext2D | null = null;
  let cast: Flat[] = [];
  let raf = 0;
  let paused = false;
  let w = 0;
  let h = 0;
  const frameCbs = new Set<() => void>();

  const size = () => Math.min(w / (cast.length + 0.6), h * 0.42);
  const ground = () => h * 0.86;

  function layout() {
    cast.forEach((f, i) => {
      f.x = (w * (i + 1)) / (cast.length + 1);
    });
  }

  function draw(now: number) {
    if (!g || !canvas) return;
    g.clearRect(0, 0, w, h);
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#cfe9f6');
    sky.addColorStop(1, '#fdf3e2');
    g.fillStyle = sky;
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#d8ecc4';
    g.beginPath();
    g.ellipse(w / 2, h * 1.02, w * 0.8, h * 0.24, 0, 0, Math.PI * 2);
    g.fill();
    const t = now / 1000;
    for (const f of cast) {
      if (f.gesture && ONE_SHOT[f.gesture] && t > f.gestureEnd) {
        f.gesture = null;
        f.resolve?.();
        f.resolve = null;
      }
      const s = size();
      const breathe = Math.sin(t * 2.2 + f.x) * 0.02;
      let lift = 0;
      let tilt = 0;
      if (f.gesture === 'hop' || f.gesture === 'cheer') lift = Math.abs(Math.sin(t * 9)) * s * 0.18;
      if (f.gesture === 'nod') tilt = Math.sin(t * 12) * 0.08;
      if (f.gesture === 'shake') tilt = Math.sin(t * 16) * 0.12;
      if (f.gesture === 'bow') tilt = 0.25;
      const cx = f.x;
      const cy = ground() - s * 0.5 - lift;
      g.save();
      g.translate(cx, cy);
      g.rotate(tilt);
      g.scale(1 + breathe, 1 - breathe);
      g.fillStyle = f.id === 'chiikawa' ? '#ffffff' : FRIENDS[f.id].accent;
      g.strokeStyle = '#66432f';
      g.lineWidth = 3;
      g.beginPath();
      g.ellipse(0, 0, s * 0.5, s * 0.44, 0, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      // Face: eyes, cheeks, mouth.
      g.fillStyle = '#3b2a20';
      const blink = Math.sin(t * 1.3 + f.x) > 0.985;
      for (const side of [-1, 1]) {
        g.beginPath();
        if (blink || f.face === 'happy') g.fillRect(side * s * 0.16 - s * 0.04, -s * 0.03, s * 0.08, s * 0.015);
        else g.ellipse(side * s * 0.16, -s * 0.03, s * 0.035, s * 0.05, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#f6b9c4';
        g.beginPath();
        g.ellipse(side * s * 0.27, s * 0.06, s * 0.07, s * 0.04, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#3b2a20';
      }
      g.beginPath();
      const open = f.talking && Math.sin(t * 18) > 0;
      if (open) g.ellipse(0, s * 0.1, s * 0.04, s * 0.04, 0, 0, Math.PI * 2);
      else if (f.face === 'worried' || f.face === 'teary') g.arc(0, s * 0.14, s * 0.05, Math.PI * 1.15, Math.PI * 1.85);
      else g.arc(0, s * 0.06, s * 0.05, Math.PI * 0.15, Math.PI * 0.85);
      if (open) g.fill();
      else {
        g.lineWidth = 2;
        g.stroke();
      }
      g.restore();
      if (f.mark && t < f.mark.until) {
        g.font = `bold ${Math.round(s * 0.3)}px sans-serif`;
        g.fillStyle = f.mark.kind === 'heart' ? '#f2a7b6' : '#66432f';
        g.textAlign = 'center';
        g.fillText(MARKS[f.mark.kind], cx + s * 0.38, cy - s * 0.5);
      }
    }
    for (const cb of frameCbs) cb();
  }

  function loop(now: number) {
    raf = requestAnimationFrame(loop);
    if (!paused && !document.hidden) draw(now);
  }

  function resize() {
    if (!canvas) return;
    const r = canvas.parentElement!.getBoundingClientRect();
    w = r.width;
    h = r.height;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    g?.setTransform(dpr, 0, 0, dpr, 0, 0);
    layout();
  }

  const find = (id: FriendId) => cast.find((f) => f.id === id);

  return {
    async mount(container) {
      canvas = document.createElement('canvas');
      canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
      container.appendChild(canvas);
      g = canvas.getContext('2d');
      new ResizeObserver(resize).observe(container);
      resize();
      raf = requestAnimationFrame(loop);
    },
    async setCast(ids) {
      cast = ids.map((id) => find(id) ?? { id, x: 0, hop: 0, face: null, mark: null, gesture: null, gestureEnd: 0, resolve: null, talking: false });
      layout();
    },
    play(id, gesture) {
      const f = find(id);
      if (!f) return Promise.resolve();
      f.resolve?.();
      f.gesture = gesture;
      const len = ONE_SHOT[gesture];
      f.gestureEnd = performance.now() / 1000 + (len ?? Infinity);
      return new Promise<void>((resolve) => (f.resolve = resolve));
    },
    stop(id) {
      const f = find(id);
      if (!f) return;
      f.gesture = null;
      f.resolve?.();
      f.resolve = null;
    },
    setFace(id, face) {
      const f = find(id);
      if (f) f.face = face;
    },
    mark(id, mark) {
      const f = find(id);
      if (f) f.mark = { kind: mark, until: performance.now() / 1000 + 1.6 };
    },
    setTalking(id, on) {
      const f = find(id);
      if (f) f.talking = on;
    },
    lookAt() {},
    followPointer() {},
    headAnchor(id): ScreenPoint | null {
      const f = find(id);
      if (!f) return null;
      return { x: f.x, y: ground() - size() * 0.95 };
    },
    onFrame(cb) {
      frameCbs.add(cb);
      return () => frameCbs.delete(cb);
    },
    setPaused(p) {
      paused = p;
    },
    async measureFps(seconds) {
      let frames = 0;
      const count = () => frames++;
      frameCbs.add(count);
      await new Promise((r) => setTimeout(r, seconds * 1000));
      frameCbs.delete(count);
      return frames / seconds;
    },
    dispose() {
      cancelAnimationFrame(raf);
      canvas?.remove();
    },
  };
}

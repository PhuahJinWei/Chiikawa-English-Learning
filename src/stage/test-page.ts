// Development only: /stage-test.html, for checking the stage by eye (not part of the build).
import { createStage } from './index';
import { FRIEND_IDS, type Face, type FriendId, type Gesture, type Mark } from './types';

const GESTURES: Gesture[] = ['nod', 'shake', 'listen', 'wave', 'hop', 'cheer', 'bow', 'startled', 'look', 'sit', 'doze', 'eat', 'drink', 'read', 'cry', 'hula'];
const FACES: (Face | null)[] = [null, 'neutral', 'smile', 'happy', 'determined', 'worried', 'teary', 'sobbing', 'shocked'];
const MARKS: Mark[] = ['exclaim', 'question', 'heart', 'note', 'zzz'];
const CASTS: FriendId[][] = [
  ['hachiware'],
  ['chiikawa'],
  ['hachiware', 'chiikawa'],
  ['chiikawa', 'hachiware', 'usagi'],
  ['kurimanju', 'shisa', 'momonga'],
  ['rakko', 'furuhonya'],
  ['momonga'],
  ['usagi'],
];

const stageEl = document.getElementById('stage')!;
const fpsEl = document.getElementById('fps')!;
const stage = createStage();
let cast: FriendId[] = [];
let who: FriendId | 'all' = 'all';
const talking = new Set<FriendId>();

function button(parent: string, label: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = label;
  b.addEventListener('click', onClick);
  document.getElementById(parent)!.appendChild(b);
  return b;
}

function targets(): FriendId[] {
  return who === 'all' ? cast : cast.includes(who) ? [who] : [];
}

const dots = new Map<FriendId, HTMLElement>();
function drawDots(): void {
  for (const [id, dot] of dots) {
    const at = stage.headAnchor(id);
    dot.style.display = at ? 'block' : 'none';
    if (at) dot.style.transform = `translate(${at.x}px, ${at.y}px)`;
  }
}

function renderWho(): void {
  const row = document.getElementById('who')!;
  row.textContent = '';
  for (const id of ['all', ...cast] as (FriendId | 'all')[]) {
    const b = button('who', id, () => {
      who = id;
      renderWho();
    });
    if (id === who) b.classList.add('on');
  }
}

async function setCast(ids: FriendId[]): Promise<void> {
  const t0 = performance.now();
  await stage.setCast(ids);
  cast = ids;
  if (who !== 'all' && !cast.includes(who)) who = 'all';
  for (const dot of dots.values()) dot.remove();
  dots.clear();
  for (const id of cast) {
    const dot = document.createElement('span');
    dot.className = 'dot';
    dot.style.left = '0';
    dot.style.top = '0';
    stageEl.appendChild(dot);
    dots.set(id, dot);
  }
  renderWho();
  console.log(`setCast(${ids.join(',')}) took ${Math.round(performance.now() - t0)} ms`);
}

for (const ids of CASTS) button('casts', ids.join('+'), () => void setCast(ids));
for (const id of FRIEND_IDS) button('casts', `only ${id}`, () => void setCast([id]));
for (const g of GESTURES) {
  button('gestures', g, () => {
    for (const id of targets()) void stage.play(id, g).then(() => console.log(`${id} ${g} ended`));
  });
}
button('gestures', 'stop', () => targets().forEach((id) => stage.stop(id)));
for (const face of FACES) button('faces', face ?? '(none)', () => targets().forEach((id) => stage.setFace(id, face)));
for (const mark of MARKS) button('marks', mark, () => targets().forEach((id) => stage.mark(id, mark)));
button('misc', 'talk on/off', () => {
  for (const id of targets()) {
    const on = !talking.has(id);
    if (on) talking.add(id);
    else talking.delete(id);
    stage.setTalking(id, on);
  }
});
button('misc', 'look learner', () => targets().forEach((id) => stage.lookAt(id, 'learner')));
button('misc', 'look ahead', () => targets().forEach((id) => stage.lookAt(id, null)));
button('misc', 'look at 1st', () => targets().forEach((id) => stage.lookAt(id, cast[0])));
button('misc', 'look top-left', () => targets().forEach((id) => stage.lookAt(id, { x: 10, y: 10 })));
const follow = button('misc', 'follow finger', () => {
  const on = !follow.classList.contains('on');
  follow.classList.toggle('on', on);
  stage.followPointer(on);
});
button('misc', 'fps 3s', async () => {
  fpsEl.textContent = 'measuring…';
  const fps = await stage.measureFps(3);
  fpsEl.textContent = `${fps.toFixed(1)} fps`;
});
button('misc', 'pause/resume', () => {
  paused = !paused;
  stage.setPaused(paused);
});
let paused = false;

stage.onFrame(drawDots);
await stage.mount(stageEl);
await setCast(['hachiware', 'chiikawa']);
// Handy from the console while developing.
(window as unknown as Record<string, unknown>).__stage = stage;

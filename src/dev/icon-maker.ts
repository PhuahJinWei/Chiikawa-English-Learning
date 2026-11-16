// Development only (icon-maker.html): makes the app's icons from the star portrait in art/portrait_hoshi.png
// (the user's choice, 2026-11-16, from their Chiikawa PvZ art) and saves them through the dev server into public/icons/.
//
// The home-screen icons get the app's cream paper behind the star, because an iPhone fills transparent icon areas
// with black. The browser-tab icon keeps the transparent background.
const SOURCE = '/art/portrait_hoshi.png';
const PAPER = '#fff9ef';

const ICONS = [
  { name: 'apple-touch-icon.png', size: 180, background: PAPER },
  { name: 'icon-192.png', size: 192, background: PAPER },
  { name: 'icon-512.png', size: 512, background: PAPER },
  { name: 'favicon.png', size: 64, background: null },
];

const out = document.getElementById('out')!;
const msg = document.getElementById('msg')!;

const img = new Image();
img.src = SOURCE;
await img.decode();

const canvases = ICONS.map(({ size, background }) => {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  c.className = 'icon';
  const g = c.getContext('2d')!;
  if (background) {
    g.fillStyle = background;
    g.fillRect(0, 0, size, size);
  }
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  g.drawImage(img, 0, 0, size, size);
  return c;
});
out.replaceChildren(...canvases);

async function save() {
  const results = await Promise.all(
    canvases.map((c, i) =>
      fetch(`/__dev/save?name=${ICONS[i].name}`, { method: 'POST', body: c.toDataURL('image/png') }).then((r) => r.text()),
    ),
  );
  msg.textContent = results.join(' / ');
}

document.getElementById('save')!.onclick = () => void save();

export {};

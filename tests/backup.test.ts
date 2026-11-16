// Backups as text (src/learn/backup.ts): what she sends to LINE must come back exactly, and a damaged copy must be
// refused rather than restored.
import { describe, expect, it } from 'vitest';
import { ORDERED } from '../src/content/index.ts';
import { makeBackup, readBackup } from '../src/learn/backup.ts';
import { emptyProgress } from '../src/learn/progress.ts';
import { buildSession, recordResult } from '../src/learn/session.ts';
import { exchangeById } from '../src/content/index.ts';

function someProgress() {
  const p = emptyProgress();
  for (let day = 10; day < 20; day++) {
    for (const s of buildSession(p, ORDERED, day).steps) {
      if (s.kind === 'catch') recordResult(p, exchangeById(s.exId)!, 'hear', 'good', s.review, day);
      if (s.kind === 'answer') recordResult(p, exchangeById(s.exId)!, 'say', 'hard', s.review, day);
    }
    p.days.push(day);
  }
  p.missedLines['Are you OK?'] = 2;
  p.settings.sound = 'backup';
  return p;
}

describe('backup', () => {
  it('comes back exactly, even pasted with other text and line breaks around and inside it', async () => {
    const p = someProgress();
    const text = await makeBackup(p, 20);
    expect(text).toMatch(/^えいごフレンズの記録（.+・10日分）\nEIGOFRIENDS1z:/);
    const data = text.split('\n')[1];
    const pasted = `これ保存しておいて\n${text.split('\n')[0]}\n${data.slice(0, 40)}\n${data.slice(40, 90)} ${data.slice(90)}\nよろしく`;
    const r = await readBackup(pasted);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.progress).toEqual({ ...p, backedUp: 20 });
  });

  it('is short enough for one LINE message even with the whole course learned', async () => {
    const p = someProgress();
    for (let i = 0; i < 120; i++) p.ex[`x${i}`] = { ...p.ex['hi'] };
    expect((await makeBackup(p, 20)).length).toBeLessThan(10_000);
  });

  it('refuses a copy that was cut short or changed, and says when there is none', async () => {
    const text = await makeBackup(someProgress(), 20);
    expect(await readBackup('こんにちは')).toEqual({ ok: false, why: 'missing' });
    expect(await readBackup(text.slice(0, -30) + '~')).toEqual({ ok: false, why: 'broken' });
    const i = text.indexOf(':') + 30;
    const flipped = text.slice(0, i) + (text[i] === 'A' ? 'B' : 'A') + text.slice(i + 1);
    expect(await readBackup(flipped)).toEqual({ ok: false, why: 'broken' });
  });

  it('reads the uncompressed form too', async () => {
    const p = someProgress();
    const bytes = new TextEncoder().encode(JSON.stringify(p));
    const plain = `EIGOFRIENDS1:${btoa(String.fromCharCode(...bytes))}~`;
    const r = await readBackup(plain);
    expect(r.ok && r.progress.days).toEqual(p.days);
  });
});

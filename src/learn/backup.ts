import { normalize, type Progress } from './progress.ts';

/**
 * Backups as text (REVIEW 1.14, 4.5). She sends it to herself in LINE or Notes, and pastes it back after deleting
 * the app or changing phones. A line of Japanese says what it is; the data sits between a marker and a '~', so the
 * whole message can be pasted as it is, even with extra text or line breaks around it. The data is compressed with a
 * checksum ('deflate'), so a copy that was cut short or changed is refused instead of restoring rubbish.
 */
const MARK = 'EIGOFRIENDS1';
/** The marker, 'z' when compressed, then base64 (line breaks allowed) up to the '~'. */
const FIND = /EIGOFRIENDS1(z?):([A-Za-z0-9+/=\s]+)~/;

export type ReadResult = { ok: true; progress: Progress } | { ok: false; why: 'missing' | 'broken' };

const CHUNK = 8192;

function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += CHUNK) s += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  return btoa(s);
}

function fromBase64(text: string): Uint8Array {
  const s = atob(text);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

/** The most a backup may unpack to: a full course with 500 long notes is under 1 MB. A pasted text that unpacks to
 * more is not a backup, and unpacking it whole could use up the phone's memory (2026-11-17). */
export const BACKUP_MAX_BYTES = 4 * 1024 * 1024;

async function through(data: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const reader = new Blob([data as BlobPart]).stream().pipeThrough(stream).getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > BACKUP_MAX_BYTES) {
      await reader.cancel();
      throw new Error('too big');
    }
    chunks.push(value);
  }
  const out = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}

const canSqueeze = () => typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';

/** The day number as a date, 'YYYY/M/D'. */
export function dayLabel(day: number): string {
  const d = new Date(day * 86_400_000);
  return `${d.getUTCFullYear()}/${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}

/** The text she keeps. `today` is recorded as the backup's day. */
export async function makeBackup(p: Progress, today: number): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify({ ...p, backedUp: today }));
  const squeezed = canSqueeze();
  const data = squeezed ? await through(json, new CompressionStream('deflate')) : json;
  const head = `えいごフレンズの記録（${dayLabel(today)}・${p.days.length}日分）`;
  return `${head}\n${MARK}${squeezed ? 'z' : ''}:${toBase64(data)}~`;
}

/** Reads a backup out of whatever she pasted. */
export async function readBackup(text: string): Promise<ReadResult> {
  const m = FIND.exec(text);
  if (!m) return { ok: false, why: 'missing' };
  try {
    let data = fromBase64(m[2].replace(/\s+/g, ''));
    if (m[1] === 'z') data = await through(data, new DecompressionStream('deflate'));
    const raw: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(data));
    if (!raw || typeof raw !== 'object' || (raw as { v?: unknown }).v !== 1) return { ok: false, why: 'broken' };
    return { ok: true, progress: normalize(raw) };
  } catch {
    return { ok: false, why: 'broken' };
  }
}

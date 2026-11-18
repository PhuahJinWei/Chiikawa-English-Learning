/// <reference types="node" />
import { gunzipSync } from 'node:zlib';
import type { Plugin } from 'vite';

/**
 * The note-reading engine (the phonemizer package: espeak-ng compiled to JavaScript, src/app/reading.ts) carries its
 * pronunciation data gzipped inside its code, and unpacks it when it starts: a DecompressionStream, read with
 * `for await`. Both fail on her phone's browser (2026-11-18):
 * - Safari cannot read a stream with `for await` (ReadableStream async iteration: not in Safari through iOS 26.5,
 *   https://caniuse.com/mdn-api_readablestream_--asynciterator, WebKit bug 194379). The engine stopped there, so a
 *   memo's English got no katakana reading on an iPhone, while every test passed in a WebKit that has it.
 * - WebKit's DecompressionStream, handed the 450 KB in one piece, crashed the whole page (the smoke test's offline
 *   check, Playwright's WebKit). In small pieces it does not; src/learn/backup.ts feeds it 1 KB at a time.
 * So the build unpacks the data and hands the engine its bytes ready: on the phone there is no stream and no
 * unpacking at all. The engine's code grows by about 0.6 MB (base64 of 890 KB instead of 450 KB), less once the
 * server compresses it.
 *
 * If an update of the package changes this code, the build stops here instead of shipping an engine that may not start.
 */
const UNPACK =
  'e=new Blob([A]).stream().pipeThrough(new DecompressionStream("gzip")),C=[];for await(const A of e)C.push(A);const a=await new Blob(C).arrayBuffer();';
/** `A` holds the data's bytes (decoded from base64 just before); the engine wants them as an ArrayBuffer, `a`. */
const READY = 'e=null,C=[];const a=A.buffer.slice(A.byteOffset,A.byteOffset+A.byteLength);';
const ENGINE = /[\\/]node_modules[\\/]phonemizer[\\/]dist[\\/]phonemizer\.js$/;

/** The engine's code with its data unpacked in advance (exported for tests/engine-data.test.ts). */
export function unpacked(code: string): string {
  const fail = (what: string) => {
    throw new Error(`phonemizer: ${what}, so its data cannot be unpacked in advance (tools/build/engine-data.ts)`);
  };
  const at = code.indexOf(UNPACK);
  if (at < 0 || code.indexOf(UNPACK, at + 1) >= 0) fail('the code that unpacks its data is not there once');
  // The data is the string literal right before: ("H4sI…"),
  if (code.slice(at - 3, at) !== '"),') fail('its packed data is not right before the code that unpacks it');
  const open = code.lastIndexOf('("', at);
  const packed = code.slice(open + 2, at - 3);
  if (open < 0 || !packed.startsWith('H4sI') || !/^[A-Za-z0-9+/=]+$/.test(packed)) fail('its packed data is not gzip in base64');
  const data = gunzipSync(Buffer.from(packed, 'base64')).toString('base64');
  return `${code.slice(0, open + 2)}${data}"),${READY}${code.slice(at + UNPACK.length)}`;
}

export function engineData(): Plugin {
  return {
    name: 'eigo-friends-engine-data',
    transform(code, id) {
      return ENGINE.test(id.split('?')[0]) ? { code: unpacked(code), map: null } : null;
    },
  };
}

// The generated service worker (tools/build/service-worker.ts), run against fake caches and a fake server: what it
// keeps on her phone decides whether the app opens offline, so its install and update paths are checked here.
import { describe, expect, it } from 'vitest';
import { hashOf, swSource } from '../tools/build/service-worker.ts';

type Handler = (event: Record<string, unknown>) => void;

/** A fake browser around one generated sw.js: caches by name, and a server that serves `files`. */
function world(server: Record<string, string>) {
  const caches = new Map<string, Map<string, Response>>();
  const fetched: string[] = [];
  const cacheApi = {
    async open(name: string) {
      if (!caches.has(name)) caches.set(name, new Map());
      const c = caches.get(name)!;
      const key = (r: string | { url: string }) => (typeof r === 'string' ? r : r.url);
      return {
        async put(r: string | { url: string }, res: Response) {
          c.set(key(r), res.clone());
        },
        async match(r: string | { url: string }) {
          return c.get(key(r))?.clone();
        },
        async keys() {
          return [...c.keys()].map((url) => ({ url }));
        },
      };
    },
    async keys() {
      return [...caches.keys()];
    },
    async delete(name: string) {
      return caches.delete(name);
    },
  };
  class Req {
    url: string;
    constructor(url: string) {
      this.url = url;
    }
  }
  const fetchApi = async (r: Req) => {
    fetched.push(r.url);
    const body = server[r.url];
    return body === undefined ? new Response('', { status: 404 }) : new Response(body);
  };
  /** Installs (and optionally activates) the worker for this version of the files. */
  async function install(version: string, files: Record<string, string>, activate = true) {
    const on: Record<string, Handler> = {};
    const self = { addEventListener: (t: string, cb: Handler) => (on[t] = cb), clients: { claim: async () => {} }, skipWaiting() {} };
    const hashes = Object.fromEntries(Object.entries(files).map(([p, body]) => [p, hashOf(body)]));
    new Function('self', 'caches', 'fetch', 'Request', 'crypto', swSource(version, hashes))(self, cacheApi, fetchApi, Req, crypto);
    let done: Promise<unknown> = Promise.resolve();
    on.install({ waitUntil: (p: Promise<unknown>) => (done = p) });
    await done;
    if (activate) {
      on.activate({ waitUntil: (p: Promise<unknown>) => (done = p) });
      await done;
    }
    return on;
  }
  return { caches, fetched, install };
}

const V1 = { './': '<html>1</html>', 'index.html': '<html>1</html>', 'assets/app-1.js': 'one', 'audio/hi.mp3': 'hi' };
const V2 = { './': '<html>2</html>', 'index.html': '<html>2</html>', 'assets/app-2.js': 'two', 'audio/hi.mp3': 'hi' };

describe('service worker', () => {
  it('the first install downloads and keeps every file, with its list written last', async () => {
    const w = world(V1);
    await w.install('v1', V1);
    expect(w.fetched.sort()).toEqual(Object.keys(V1).sort());
    expect([...w.caches.get('eigo-friends-v1')!.keys()].sort()).toEqual([...Object.keys(V1), '__files.json'].sort());
  });

  it('an update downloads only what changed, and the old copy is removed once it takes over', async () => {
    const w = world(V1);
    await w.install('v1', V1);
    const w2 = world(V2); // the same phone (its caches), the server after a deploy
    for (const [k, v] of w.caches) w2.caches.set(k, v);
    await w2.install('v2', V2);
    expect(w2.fetched.sort()).toEqual(['./', 'assets/app-2.js', 'index.html']);
    expect([...w2.caches.keys()]).toEqual(['eigo-friends-v2']);
    expect(await w2.caches.get('eigo-friends-v2')!.get('audio/hi.mp3')!.text()).toBe('hi');
  });

  it('refuses a file that is not the expected version (a server mid-deploy), and keeps the old copy', async () => {
    const w = world(V1);
    await w.install('v1', V1);
    const w2 = world({ ...V2, 'index.html': '<html>1</html>' }); // the server still hands out the old page
    for (const [k, v] of w.caches) w2.caches.set(k, v);
    await expect(w2.install('v2', V2, false)).rejects.toThrow(/not the expected version/);
    expect(w2.caches.get('eigo-friends-v2')?.has('__files.json')).toBe(false);
    expect(w2.caches.get('eigo-friends-v1')?.has('__files.json')).toBe(true);
  });

  it('a copy without a file list (from before lists) is not reused: everything is downloaded', async () => {
    const w = world(V2);
    w.caches.set('eigo-friends-old', new Map([['audio/hi.mp3', new Response('hi')]]));
    await w.install('v2', V2);
    expect(w.fetched.sort()).toEqual(Object.keys(V2).sort());
  });

  it('answers the app about its offline copy', async () => {
    const w = world(V1);
    const on = await w.install('v1', V1);
    const reply = await new Promise((resolve) => {
      let done: Promise<unknown> = Promise.resolve();
      on.message({ data: { type: 'status' }, ports: [{ postMessage: resolve }], waitUntil: (p: Promise<unknown>) => (done = p) });
      void done;
    });
    expect(reply).toEqual({ version: 'v1', files: 4, cached: 4 });
  });
});

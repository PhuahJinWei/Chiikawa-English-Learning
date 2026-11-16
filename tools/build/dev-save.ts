/// <reference types="node" />
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import type { Plugin } from 'vite';

/**
 * Development only: lets a dev page save a generated image into public/icons/ (used by icon-maker.html to render
 * the home-screen icon from the 3D friends). Refuses any other folder.
 */
export function devSave(): Plugin {
  return {
    name: 'eigo-friends-dev-save',
    apply: 'serve',
    configureServer(server) {
      const allowed = resolve(server.config.root, 'public', 'icons') + sep;
      server.middlewares.use('/__dev/save', (req, res) => {
        const name = new URL(req.url ?? '', 'http://x').searchParams.get('name') ?? '';
        const target = resolve(allowed, name);
        if (req.method !== 'POST' || !/^[\w.-]+\.png$/.test(name) || !target.startsWith(allowed)) {
          res.statusCode = 400;
          res.end('bad request');
          return;
        }
        const chunks: Buffer[] = [];
        req.on('data', (c: Buffer) => chunks.push(c));
        req.on('end', () => {
          const base64 = Buffer.concat(chunks).toString('utf8').replace(/^data:image\/png;base64,/, '');
          mkdirSync(dirname(target), { recursive: true });
          writeFileSync(target, Buffer.from(base64, 'base64'));
          res.end(`saved public/icons/${name}`);
        });
      });
    },
  };
}

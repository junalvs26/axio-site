// Gera src/scenes/media.generated.json com as mídias que existem de verdade em public/scenes/<id>/.
import { existsSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const FILES = { desktop: 'desktop.mp4', mobile: 'mobile.mp4', poster: 'poster.avif' };

export function scanMedia(root) {
  const out = {};
  if (!existsSync(root)) return out;
  for (const id of readdirSync(root)) {
    const media = {};
    for (const [key, file] of Object.entries(FILES)) {
      if (existsSync(join(root, id, file))) media[key] = `/scenes/${id}/${file}`;
    }
    out[id] = media;
  }
  return out;
}

if (process.argv[1]?.endsWith('scan-media.mjs')) {
  mkdirSync('src/scenes', { recursive: true });
  writeFileSync('src/scenes/media.generated.json', JSON.stringify(scanMedia('public/scenes'), null, 2) + '\n');
}

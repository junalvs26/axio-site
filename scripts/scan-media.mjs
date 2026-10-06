// Gera src/scenes/media.generated.json com as mídias que existem de verdade em public/scenes/<id>/.
import { existsSync, readdirSync, writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const FILES = { desktop: 'desktop.mp4', mobile: 'mobile.mp4', poster: 'poster.avif' };

export function scanMedia(root) {
  const out = {};
  if (!existsSync(root)) return out;
  for (const id of readdirSync(root)) {
    const media = {};
    for (const [key, file] of Object.entries(FILES)) {
      const path = join(root, id, file);
      // ?v=<hash do conteúdo>: /scenes é servido com cache imutável de 1 ano (vercel.json), então
      // o endereço precisa mudar quando o vídeo muda, senão quem já visitou vê o antigo.
      if (existsSync(path)) media[key] = `/scenes/${id}/${file}?v=${createHash('sha1').update(readFileSync(path)).digest('hex').slice(0, 10)}`;
    }
    out[id] = media;
  }
  return out;
}

if (process.argv[1]?.endsWith('scan-media.mjs')) {
  mkdirSync('src/scenes', { recursive: true });
  writeFileSync('src/scenes/media.generated.json', JSON.stringify(scanMedia(process.argv[2] ?? 'public/scenes'), null, 2) + '\n');
}

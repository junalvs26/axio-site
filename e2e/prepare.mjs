// Build isolado para E2E: cria um vídeo de teste na cena "city", gera dist-e2e e remove o vídeo.
import { execSync } from 'node:child_process';
import { mkdirSync, rmSync, existsSync } from 'node:fs';

// city: desktop + mobile · analysis: desktop (para testar troca rápida entre cenas com vídeo)
const fixtures = [['city', 'desktop', '640x360'], ['city', 'mobile', '360x640'], ['analysis', 'desktop', '640x360']];
const dirs = [...new Set(fixtures.map(([s]) => `public/scenes/${s}`))];
const created = dirs.every((d) => !existsSync(d));
try {
  if (created) for (const [scene, fmt, size] of fixtures) {
    mkdirSync(`public/scenes/${scene}`, { recursive: true });
    execSync(`ffmpeg -y -loglevel error -f lavfi -i testsrc=duration=2:size=${size}:rate=30 -c:v libx264 -g 1 -pix_fmt yuv420p -movflags +faststart public/scenes/${scene}/${fmt}.mp4`);
  }
  execSync('node scripts/scan-media.mjs && npx astro build --outDir dist-e2e', { stdio: 'inherit' });
} finally {
  if (created) for (const d of dirs) rmSync(d, { recursive: true, force: true });
  execSync('node scripts/scan-media.mjs');
}

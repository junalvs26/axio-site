// Build isolado para E2E: cria um vídeo de teste na cena "city", gera dist-e2e e remove o vídeo.
import { execSync } from 'node:child_process';
import { mkdirSync, rmSync, existsSync } from 'node:fs';

const dir = 'public/scenes/city';
const file = `${dir}/desktop.mp4`;
const created = !existsSync(file);
mkdirSync(dir, { recursive: true });
try {
  if (created) execSync(`ffmpeg -y -loglevel error -f lavfi -i testsrc=duration=2:size=640x360:rate=30 -c:v libx264 -g 1 -pix_fmt yuv420p -movflags +faststart ${file}`);
  execSync('node scripts/scan-media.mjs && npx astro build --outDir dist-e2e', { stdio: 'inherit' });
} finally {
  if (created) rmSync(dir, { recursive: true, force: true });
  execSync('node scripts/scan-media.mjs');
}

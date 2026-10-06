// Build isolado para E2E: pasta pública própria (marca + vídeos de teste por cena), sem tocar na mídia real.
import { execSync } from 'node:child_process';
import { mkdirSync, rmSync, cpSync } from 'node:fs';

// city: desktop + mobile · analysis: desktop (para testar troca rápida entre cenas com vídeo)
const fixtures = [['city', 'desktop', '640x360'], ['city', 'mobile', '360x640'], ['analysis', 'desktop', '640x360']];
const pub = '.e2e-public';
rmSync(pub, { recursive: true, force: true });
try {
  cpSync('public', pub, { recursive: true, filter: (src) => !src.split(/[\\/]/).join('/').includes('public/scenes') });
  for (const [scene, fmt, size] of fixtures) {
    mkdirSync(`${pub}/scenes/${scene}`, { recursive: true });
    execSync(`ffmpeg -y -loglevel error -f lavfi -i testsrc=duration=2:size=${size}:rate=30 -c:v libx264 -g 1 -pix_fmt yuv420p -movflags +faststart ${pub}/scenes/${scene}/${fmt}.mp4`);
  }
  execSync(`node scripts/scan-media.mjs ${pub}/scenes && npx astro build --outDir dist-e2e`, {
    stdio: 'inherit', env: { ...process.env, AXIO_PUBLIC_DIR: `./${pub}` },
  });
} finally {
  rmSync(pub, { recursive: true, force: true });
  execSync('node scripts/scan-media.mjs');
}

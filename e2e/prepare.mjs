// Build isolado para E2E: pasta pública própria (marca + vídeo de teste da história), sem tocar na mídia real.
import { execSync } from 'node:child_process';
import { mkdirSync, rmSync, cpSync } from 'node:fs';

// Vídeo contínuo de teste com a duração real da história (67 s, 24 fps, todo keyframe) + índice de quadros.
const fixtures = [['desktop', '320x180'], ['mobile', '180x320']];
const pub = '.e2e-public';
rmSync(pub, { recursive: true, force: true });
try {
  cpSync('public', pub, { recursive: true, filter: (src) => !src.split(/[\\/]/).join('/').includes('public/scenes') });
  mkdirSync(`${pub}/scenes/story`, { recursive: true });
  for (const [fmt, size] of fixtures) {
    execSync(`ffmpeg -y -loglevel error -f lavfi -i testsrc=duration=67:size=${size}:rate=24 -c:v libx264 -g 1 -pix_fmt yuv420p -movflags +faststart ${pub}/scenes/story/${fmt}.mp4`);
  }
  execSync(`python scripts/build-story.py --index ${pub}/scenes/story`, { stdio: 'inherit' });
  execSync(`node scripts/scan-media.mjs ${pub}/scenes && npx astro build --outDir dist-e2e`, {
    stdio: 'inherit', env: { ...process.env, AXIO_PUBLIC_DIR: `./${pub}` },
  });
} finally {
  rmSync(pub, { recursive: true, force: true });
  execSync('node scripts/scan-media.mjs');
}

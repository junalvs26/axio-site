import { defineConfig } from 'astro/config';
export default defineConfig({
  site: process.env.SITE_URL ?? 'https://axio.vercel.app',
  // Subpasta de publicação (GitHub Pages serve em /<repo>/); na Vercel fica na raiz.
  base: process.env.BASE_PATH ?? '/',
  // O build de E2E usa uma pasta pública própria com vídeos de teste.
  publicDir: process.env.AXIO_PUBLIC_DIR ?? './public',
  // CSS crítico embutido: elimina uma requisição bloqueante antes da primeira pintura.
  build: { inlineStylesheets: 'always' },
});

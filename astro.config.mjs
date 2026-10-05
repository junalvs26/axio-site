import { defineConfig } from 'astro/config';
export default defineConfig({
  site: 'https://axio.vercel.app',
  // CSS crítico embutido: elimina uma requisição bloqueante antes da primeira pintura.
  build: { inlineStylesheets: 'always' },
});

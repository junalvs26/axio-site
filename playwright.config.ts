import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'e2e',
  use: { baseURL: 'http://localhost:4322' },
  webServer: { command: 'node e2e/serve.mjs', port: 4322, reuseExistingServer: true },
});

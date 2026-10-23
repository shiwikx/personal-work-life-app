import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  use: {
    baseURL: 'http://127.0.0.1:4123',
    channel: 'chrome',
    headless: true
  },
  webServer: {
    command: 'pnpm build && node dist-server/server/cli.js --test-mode',
    port: 4123,
    reuseExistingServer: false,
    timeout: 120000
  }
});
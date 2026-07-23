const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:8080',
    headless: true,
    ignoreHTTPSErrors: true,
  },
  webServer: {
    command: 'node server.js',
    url: 'http://localhost:8080',
    reuseExistingServer: false,
    timeout: 10000,
    env: {
      NODE_ENV: 'test',
      SESSION_SECRET: 'test-secret',
      PORT: '8080',
    },
  },
  reporter: [['list'], ['json', { outputFile: '/tmp/playwright-results.json' }]],
});

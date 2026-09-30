import { defineConfig, devices } from '@playwright/test';

// Every test runs offline: tests/helpers.js answers the site's and the recipe pages' requests from local files.
export default defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // No retries: a timer or glance test that only passes sometimes is a bug, not a flake.
  retries: 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: { ...devices['Desktop Chrome'], trace: 'retain-on-failure' },
});

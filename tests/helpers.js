// Tests run offline and test what ships: the built km.js and index.html (see serve.js), the loader bookmark read out
// of index.html, and made-up recipe pages served at RECIPES.
import { test as base, expect, devices } from '@playwright/test';
import { serveSite, clickBookmark } from './serve.js';

export { SITE, LOADER, clickBookmark } from './serve.js';
export { expect };
export const RECIPES = 'https://recipes.test';
// An Android phone: touch, so (pointer: coarse), as Kitchen Mode and the landing page test for.
export const { defaultBrowserType, ...PHONE } = devices['Pixel 7'];

export const recipe = ({ name = 'Test stew', ingredients = [], steps = [], ...rest } = {}) => ({
  '@context': 'https://schema.org',
  '@type': 'Recipe',
  name,
  recipeIngredient: ingredients,
  recipeInstructions: steps.map(text => (typeof text === 'string' ? { '@type': 'HowToStep', text } : text)),
  ...rest,
});

// A recipe page the way sites publish them: JSON-LD in the head, clutter in the body.
export const recipePage = (data, { head = '', title = 'A recipe site' } = {}) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${title}</title>
<script type="application/ld+json">${JSON.stringify(data)}</script>${head}</head>
<body><h1>My life story</h1><p>Scroll past the ads to find the recipe.</p><button id="page-button">Page button</button></body></html>`;

export const test = base.extend({
  // Every count sent to the relay, parsed.
  counts: async ({}, use) => { await use([]); },
  // Pages served at RECIPES + path. Tests add to it before visiting.
  pages: async ({}, use) => { await use(new Map()); },
  // Response headers for recipe pages, e.g. a Content-Security-Policy.
  pageHeaders: async ({}, use) => { await use({}); },
  context: async ({ context, counts, pages, pageHeaders }, use) => {
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.protocol === 'data:' || url.protocol === 'file:') return route.continue();
      if (await serveSite(route, counts)) return;
      if (url.origin === RECIPES && pages.has(url.pathname)) {
        return route.fulfill({ body: pages.get(url.pathname), contentType: 'text/html', headers: pageHeaders });
      }
      // Web fonts and anything else: offline, as a recipe site's third parties might be.
      return route.abort();
    });
    await use(context);
  },
});

// Opens a recipe page and runs the bookmark on it.
export const openRecipe = async (page, pages, data, options) => {
  pages.set('/recipe', typeof data === 'string' ? data : recipePage(data, options));
  await page.goto(`${RECIPES}/recipe`);
  await clickBookmark(page);
  await expect(page.locator('kitchen-mode .km')).toBeVisible();
};

// Playwright's CSS locators reach into Kitchen Mode's open shadow root.
export const km = page => ({
  root: page.locator('kitchen-mode .km'),
  stage: page.locator('kitchen-mode .stage'),
  current: page.locator('kitchen-mode .s.on'),
  eyebrow: page.locator('kitchen-mode .cook > div > .eyebrow'),
  need: page.locator('kitchen-mode .need li'),
  needNone: page.locator('kitchen-mode .need .none'),
  timers: page.locator('kitchen-mode .timer'),
  chip: text => page.locator('kitchen-mode .chip', { hasText: text }),
  glance: page.locator('kitchen-mode .glance'),
});

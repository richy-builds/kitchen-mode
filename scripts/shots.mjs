// Screenshots of the landing page and the cook view, on a phone and a computer, light and dark, into shots/.
// Look at them after any visual change. The site is served from this checkout (tests/serve.js), so they show
// what's about to ship; only the web fonts come from Google.
//   npm run shots             every screen
//   npm run shots -- glance   just the screens whose names include "glance"
//   npm run shots -- og       regenerate og.png from og-image.html, the link preview
import { mkdirSync } from 'node:fs';
import { chromium, devices } from '@playwright/test';
import { SITE, serveSite } from '../tests/serve.js';

const only = process.argv[2] || '';
const { defaultBrowserType, ...phone } = devices['Pixel 7'];
const DEVICES = { desktop: { viewport: { width: 1280, height: 800 } }, phone };
const FONTS = /^https:\/\/fonts\.(googleapis|gstatic)\.com\//;
// The web fonts that didn't load. (document.fonts.check says yes when a font never arrived at all, so ask load.)
const fontsLoaded = page => page.evaluate(async fonts => {
  const loaded = await Promise.all(fonts.map(f => document.fonts.load(f).then(faces => faces.length > 0, () => false)));
  return fonts.filter((_, i) => !loaded[i]);
}, ['800 40px Archivo', '400 16px "IBM Plex Mono"', '400 16px "Atkinson Hyperlegible Next"']);

const browser = await chromium.launch();

if (only === 'og') {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.goto(new URL('../og-image.html', import.meta.url).href);
  const missing = await fontsLoaded(page);
  if (missing.length) {
    console.error(`og.png left as it is: ${missing.join(', ')} didn't load.`);
    process.exitCode = 1;
  } else {
    await page.screenshot({ path: new URL('../og.png', import.meta.url).pathname });
    console.log('og.png written');
  }
  await browser.close();
  process.exit();
}

// Each screen: how to get there. All but the landing page start from "Try it", which /#try presses on load.
const SCREENS = {
  landing: async () => {},
  overview: async () => {},
  // Step 3's first sentence, with three things in "You'll need".
  step: async page => {
    for (let i = 0; i < 5; i++) await page.keyboard.press('Space');
  },
  // Step 3's "Cook uncovered for 18–20 mins", with its timer started.
  timer: async page => {
    await SCREENS.step(page);
    await page.keyboard.press('Space');
    await page.keyboard.press('t');
  },
  glance: async page => {
    await SCREENS.timer(page);
    await page.clock.runFor(11_000);
  },
  ringing: async page => {
    await SCREENS.timer(page);
    await page.clock.fastForward('18:01');
  },
  corner: async page => {
    await SCREENS.timer(page);
    await page.keyboard.press('Escape');
  },
  finished: async page => {
    for (let i = 0; i < 20; i++) await page.keyboard.press('Space');
  },
};

mkdirSync(new URL('../shots/', import.meta.url), { recursive: true });
const written = [];
for (const [device, options] of Object.entries(DEVICES)) {
  for (const colorScheme of ['light', 'dark']) {
    const context = await browser.newContext({ ...options, colorScheme, reducedMotion: 'reduce' });
    await context.route('**/*', async route => {
      if (FONTS.test(route.request().url())) return route.continue();
      if (!(await serveSite(route))) await route.abort();
    });
    for (const [screen, go] of Object.entries(SCREENS)) {
      const name = `${device}-${colorScheme}-${screen}`;
      if (!name.includes(only)) continue;
      const page = await context.newPage();
      await page.clock.install();
      await page.goto(screen === 'landing' ? SITE : `${SITE}/#try`);
      if (screen !== 'landing') await page.locator('kitchen-mode .km').waitFor();
      await go(page);
      await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1000);
      if (screen === 'landing' && device === 'desktop' && colorScheme === 'light') {
        const missing = await fontsLoaded(page);
        if (missing.length) console.warn(`Web fonts missing, so these show fallback fonts: ${missing.join(', ')}`);
      }
      await page.screenshot({ path: new URL(`../shots/${name}.png`, import.meta.url).pathname, fullPage: screen === 'landing' });
      written.push(name);
      await page.close();
    }
    await context.close();
  }
}
await browser.close();
console.log(written.length ? `Wrote ${written.length} screenshots to shots/:\n  ${written.join('\n  ')}` : `No screen matches "${only}".`);

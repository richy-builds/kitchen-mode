// Runs this checkout's km.js on real recipe pages in headless Chrome, the way the bookmark does, and reports what it
// found. Use it before shipping a change to how recipes are read, and to re-check the list in sites.mjs.
//   node scripts/check-sites.mjs              every page in sites.mjs
//   node scripts/check-sites.mjs <url>...     just these pages
//   add --before                              to print each page's "Before you start" list too
// Needs the internet. km.js and the count relay are answered from this checkout (tests/serve.js), so nothing is
// counted in PostHog and the live site isn't involved. A site's own security policy still applies, as for a real click.
import { chromium, devices } from '@playwright/test';
import { serveSite, clickBookmark } from '../tests/serve.js';
import { tested } from '../sites.mjs';

const args = process.argv.slice(2);
const showBefore = args.includes('--before');
const urls = args.filter(a => !a.startsWith('--'));
const targets = urls.length ? urls.map(url => [new URL(url).hostname.replace(/^www\./, ''), url]) : tested;

const browser = await chromium.launch();
const context = await browser.newContext({ ...devices['Desktop Chrome'] });
await context.route('https://kitchen-mode.com/**', route => serveSite(route));

const check = async ([name, url]) => {
  const page = await context.newPage();
  let alert = '';
  page.on('dialog', d => { alert = d.message(); d.dismiss().catch(() => {}); });
  try {
    const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    if (res && res.status() >= 400) return { name, url, note: `HTTP ${res.status()}, likely bot protection` };
    await clickBookmark(page);
    const outcome = await Promise.race([
      page.locator('kitchen-mode .km').waitFor({ timeout: 10_000 }).then(() => 'opened'),
      page.getByText("Kitchen Mode couldn't find a recipe on this page.").waitFor({ timeout: 10_000 }).then(() => 'none'),
    ]).catch(() => (alert ? 'blocked' : 'nothing'));
    if (outcome === 'none') return { name, url, note: 'no recipe data it can use' };
    if (outcome === 'blocked') return { name, url, note: `the site's security policy blocked km.js (${alert})` };
    if (outcome === 'nothing') return { name, url, note: 'nothing happened in 10 seconds' };
    return {
      name, url, ok: true, ...await page.evaluate(() => {
        const view = document.querySelector('kitchen-mode').shadowRoot;
        return {
          steps: view.querySelectorAll('.progress i').length,
          ingredients: view.querySelectorAll('.ings li').length,
          before: [...view.querySelectorAll('.before li')].map(li => `${li.children[0].textContent}: ${li.children[1].textContent}`),
        };
      }),
    };
  } catch (e) {
    return { name, url, note: e.message.split('\n')[0] };
  } finally {
    await page.close();
  }
};

// A few pages at a time, reported in list order.
const results = new Array(targets.length);
let next = 0;
await Promise.all(Array.from({ length: 4 }, async () => {
  while (next < targets.length) {
    const i = next++;
    results[i] = await check(targets[i]);
  }
}));
await browser.close();

for (const r of results) {
  console.log(r.ok ? `✓ ${r.name}: ${r.steps} steps, ${r.ingredients} ingredients${r.before.length ? `, ${r.before.length} before you start` : ''}` : `✗ ${r.name}: ${r.note}  ${r.url}`);
  if (showBefore) r.before?.forEach(b => console.log(`    ${b}`));
}
const working = results.filter(r => r.ok).length;
console.log(`\n${working} of ${results.length} opened a recipe (${new Date().toISOString().slice(0, 10)}).`);
process.exitCode = working === results.length ? 0 : 1;

import { test, expect, SITE, RECIPES, recipe, recipePage, clickBookmark } from './helpers.js';

// The promise on the landing page and in the README: one anonymous count per open, with the site's name, whether it
// found a recipe and the build. Never the page address, the recipe or anything about the person.
const stew = recipe({ name: 'Secret family stew', ingredients: ['1 onion'], steps: ['Fry the onion until soft.'] });

test('an open sends one count, with nothing but the site, what it found and the build', async ({ page, pages, counts, context }) => {
  await context.addCookies([{ name: 'id', value: 'someone', url: SITE }]);
  pages.set('/grandmas/secret-family-stew', recipePage(stew));
  await page.goto(`${RECIPES}/grandmas/secret-family-stew?user=richy`);
  const requests = [];
  page.on('request', r => requests.push(`${r.method()} ${r.url()}`));
  await clickBookmark(page);
  await expect(page.locator('kitchen-mode .km')).toBeVisible();
  await expect.poll(() => counts.length).toBe(1);

  const { headers, ...count } = counts[0];
  expect(count).toEqual({
    api_key: expect.stringMatching(/^phc_/),
    event: 'kitchen_mode_opened',
    distinct_id: expect.any(String),
    properties: { site: 'recipes.test', found: true, build: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), loader: true, touch: false, $process_person_profile: false },
  });
  expect(JSON.stringify(count)).not.toMatch(/grandma|secret|family|stew|richy|onion/i);
  expect(headers.referer).toBeUndefined();
  expect(headers.cookie).toBeUndefined();
  // Nothing else leaves the page: the code itself, then the count.
  expect(requests).toEqual([`GET ${SITE}/km.js`, `POST ${SITE}/relay/i/v0/e/`]);
});

test('each open gets a new random ID, so counts can’t be joined up into a person', async ({ page, pages, counts }) => {
  pages.set('/recipe', recipePage(stew));
  await page.goto(`${RECIPES}/recipe`);
  await clickBookmark(page);
  await expect(page.locator('kitchen-mode .km')).toBeVisible();
  await clickBookmark(page);
  await clickBookmark(page);
  await expect.poll(() => counts.length).toBe(2);
  expect(counts[0].distinct_id).not.toBe(counts[1].distinct_id);
});

test('nothing is sent when the landing page is opened from a file', async ({ page, counts }) => {
  await page.goto(new URL('../index.html', import.meta.url).href);
  await page.getByRole('button', { name: 'Try it on a sample recipe' }).click();
  await expect(page.locator('kitchen-mode .km')).toBeVisible();
  await page.waitForTimeout(300);
  expect(counts).toEqual([]);
});

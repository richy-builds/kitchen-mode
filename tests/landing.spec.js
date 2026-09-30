import { test, expect, SITE, LOADER, PHONE, clickBookmark } from './helpers.js';

const events = counts => counts.map(c => c.event.replace(/^kitchen_mode_/, ''));
const recipeData = page => page.locator('script[type="application/ld+json"]');

test.describe('on a computer', () => {
  test('the page only claims to be a recipe once someone presses "Try it"', async ({ page, counts }) => {
    await page.goto(SITE);
    await expect(recipeData(page)).toHaveCount(0);
    await page.getByRole('button', { name: 'Try it on a sample recipe' }).click();
    await expect(page.locator('kitchen-mode h1')).toHaveText('Smoky tomato & butter bean stew');
    // The sample serves the stew with cooked rice, so "Try it" shows the list.
    await expect(page.locator('kitchen-mode .before li')).toHaveText(['Have readyCrusty bread or cooked rice, to serve']);
    await expect.poll(() => events(counts)).toEqual(['page_viewed', 'tried', 'opened']);
    expect(counts[2].properties).toMatchObject({ site: 'kitchen-mode.vercel.app', loader: false });
  });

  test('#try opens the sample straight away', async ({ page }) => {
    await page.goto(`${SITE}/#try`);
    await expect(page.locator('kitchen-mode h1')).toHaveText('Smoky tomato & butter bean stew');
  });

  test('clicking the install ticket explains the drag instead of running it', async ({ page, counts }) => {
    await page.goto(SITE);
    await page.locator('.hero .bookmarklet').click();
    await expect(page.locator('#hint')).toHaveText('Drag the button rather than clicking it: press and hold, then drop it on your bookmarks bar.');
    await expect(page.locator('kitchen-mode')).toHaveCount(0);
    await expect.poll(() => events(counts)).toContain('button_clicked');
  });

  test('the install ticket and the phone code are the same bookmark', async ({ page }) => {
    await page.goto(SITE);
    const hrefs = await page.locator('.bookmarklet').evaluateAll(as => as.map(a => a.getAttribute('href')));
    expect(hrefs).toEqual([LOADER, LOADER]);
    expect(await page.locator('#code').textContent()).toBe(LOADER);
  });

  test('the test recipe says when the bookmark works, and "Try it" doesn’t count', async ({ page, counts }) => {
    await page.goto(`${SITE}/#test`);
    const cue = page.locator('#test-cue');
    await expect(cue).toHaveText('Test recipe ready. Now click Kitchen Mode on your bookmarks bar.');
    await page.getByRole('button', { name: 'Try it on a sample recipe' }).click();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    await expect(cue).toHaveText('Test recipe ready. Now click Kitchen Mode on your bookmarks bar.');

    await clickBookmark(page);
    await expect(cue).toHaveText('It works. Close it, then use it the same way on any recipe.');
    await expect.poll(() => counts.find(c => c.event === 'kitchen_mode_test_passed')?.properties)
      .toEqual({ loader: true, touch: false, $process_person_profile: false });
  });

  test('the site list adds up', async ({ page }) => {
    await page.goto(SITE);
    const listed = await page.locator('#sites .menu a').count();
    await expect(page.locator('.works')).toContainText(`and ${listed - 4} more sites`);
    await expect(page.locator('.menu-more summary')).toHaveText(`${listed - 12} more sites`);
  });
});

test.describe('on a phone', () => {
  test.use(PHONE);

  test('the phone steps are open, and "Copy the code" copies the bookmark', async ({ page, context, counts }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: SITE });
    await page.goto(SITE);
    await expect(page.locator('#phone')).toHaveAttribute('open', '');
    await expect(page.locator('.hero .bookmarklet')).toBeHidden();
    await page.getByRole('button', { name: 'Copy the code' }).tap();
    await expect(page.getByRole('button', { name: 'Code copied' })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(LOADER);
    await expect.poll(() => events(counts)).toContain('code_copied');
  });

  test('the Android test says to type kitchenmode: in the address bar, then that it works', async ({ page, counts }) => {
    await page.goto(`${SITE}/#test`);
    await expect(page.locator('#test-cue')).toContainText('type kitchenmode: with the colon');
    await clickBookmark(page);
    await expect(page.locator('#test-cue')).toContainText('It works.');
    await expect.poll(() => counts.find(c => c.event === 'kitchen_mode_test_passed')?.properties?.touch).toBe(true);
  });

  test('nothing is wider than the screen', async ({ page }) => {
    await page.goto(SITE);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(PHONE.viewport.width);
  });
});

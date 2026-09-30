import { test, expect, LOADER, RECIPES, recipe, recipePage, clickBookmark, openRecipe, km } from './helpers.js';

const stew = recipe({
  name: 'Bean stew',
  ingredients: ['1 onion', '400g tin chopped tomatoes'],
  steps: ['Fry the onion until soft and golden.', 'Add the tomatoes and simmer until thick.'],
});

test.describe('the loader bookmark', () => {
  test('is short, ES5 and has no % or #, so it pastes into a phone bookmark and runs as written', () => {
    expect(LOADER.startsWith('javascript:')).toBe(true);
    expect(LOADER.length).toBeLessThan(300);
    expect(LOADER).not.toMatch(/[%#]/);
    expect(LOADER).not.toMatch(/=>|`|\b(?:let|const|class)\b/);
    expect(LOADER).toContain("'https://kitchen-mode.vercel.app/km.js'");
  });

  test('opens Kitchen Mode on a recipe page and closes it when clicked again', async ({ page, pages }) => {
    await openRecipe(page, pages, stew);
    await expect(page.locator('kitchen-mode h1')).toHaveText('Bean stew');
    await clickBookmark(page);
    await expect(page.locator('kitchen-mode')).toHaveCount(0);
    expect(await page.evaluate(() => window.__kitchenMode)).toBeUndefined();
  });

  test('says so when the site blocks the script', async ({ page, pages, pageHeaders }) => {
    pageHeaders['content-security-policy'] = "script-src 'self'";
    pages.set('/recipe', recipePage(stew));
    await page.goto(`${RECIPES}/recipe`);
    const dialog = page.waitForEvent('dialog');
    await clickBookmark(page);
    const d = await dialog;
    expect(d.message()).toBe('Kitchen Mode could not load on this page.');
    await d.dismiss();
  });

  // A script served without a charset is decoded in the page's encoding. On a Windows-1252 page, a "½" in km.js
  // turned into two junk characters, one regex stopped parsing and the click did nothing at all.
  test('km.js is plain ASCII, so it runs on pages that aren’t UTF-8', async ({ page, pages }) => {
    const { readFileSync } = await import('node:fs');
    expect(readFileSync(new URL('../km.js', import.meta.url), 'latin1')).toMatch(/^[\x00-\x7f]*$/);
    await openRecipe(page, pages, recipePage(stew).replace('<meta charset="utf-8">', '<meta charset="windows-1252">'));
    await expect(page.locator('kitchen-mode h1')).toHaveText('Bean stew');
  });

  test('leaves a page with no recipe alone and says so', async ({ page, pages, counts }) => {
    pages.set('/recipe', '<!doctype html><title>Not a recipe</title><p>Just words</p>');
    await page.goto(`${RECIPES}/recipe`);
    await clickBookmark(page);
    await expect(page.getByText("Kitchen Mode couldn't find a recipe on this page.")).toBeVisible();
    await expect(page.locator('kitchen-mode')).toHaveCount(0);
    await expect.poll(() => counts.length).toBe(1);
    expect(counts[0].properties.found).toBe(false);
  });
});

test.describe('finding the recipe', () => {
  const shapes = {
    'a bare Recipe': stew,
    'an array': [{ '@type': 'WebSite', name: 'Site' }, stew],
    'a Yoast @graph': { '@context': 'https://schema.org', '@graph': [{ '@type': 'WebPage' }, stew] },
    'a mainEntity': { '@type': 'WebPage', mainEntity: stew },
    'a list of types': { ...stew, '@type': ['Recipe', 'NewsArticle'] },
  };
  for (const [shape, data] of Object.entries(shapes)) {
    test(`in ${shape}`, async ({ page, pages }) => {
      await openRecipe(page, pages, data);
      await expect(page.locator('kitchen-mode h1')).toHaveText('Bean stew');
    });
  }

  test('skips a Recipe without steps for one that has them', async ({ page, pages }) => {
    await openRecipe(page, pages, [{ '@type': 'Recipe', name: 'Teaser' }, stew]);
    await expect(page.locator('kitchen-mode h1')).toHaveText('Bean stew');
  });

  test('survives broken JSON-LD elsewhere on the page', async ({ page, pages }) => {
    await openRecipe(page, pages, stew, { head: '<script type="application/ld+json">{ not json</script>' });
    await expect(page.locator('kitchen-mode h1')).toHaveText('Bean stew');
  });
});

test.describe('reading the steps', () => {
  const firstLines = async (page, n) => {
    const view = km(page);
    const lines = [];
    await page.getByRole('button', { name: 'Start cooking →' }).click();
    for (let i = 0; i < n; i++) {
      lines.push([await view.eyebrow.textContent(), await view.current.textContent()]);
      await page.keyboard.press('Space');
    }
    return lines;
  };

  test('named sections label their steps', async ({ page, pages }) => {
    await openRecipe(page, pages, recipe({
      steps: [
        { '@type': 'HowToSection', name: 'For the sauce', itemListElement: [{ '@type': 'HowToStep', text: 'Melt the butter in a pan over a low heat.' }] },
        { '@type': 'HowToSection', name: 'To serve', itemListElement: [{ '@type': 'HowToStep', text: 'Spoon the sauce over the fish and serve.' }] },
      ],
    }));
    expect(await firstLines(page, 2)).toEqual([
      ['Step 1 of 2 · For the sauce', 'Melt the butter in a pan over a low heat.'],
      ['Step 2 of 2 · To serve', 'Spoon the sauce over the fish and serve.'],
    ]);
  });

  test('one string of HTML is split into steps, with "Step 1:" and entities cleaned up', async ({ page, pages }) => {
    await openRecipe(page, pages, recipe({
      recipeInstructions: '<p>Step 1: Heat the oil &amp; butter in a large pan.</p><p>2. Add the onions and cook them gently.</p>',
    }));
    expect(await firstLines(page, 2)).toEqual([
      ['Step 1 of 2', 'Heat the oil & butter in a large pan.'],
      ['Step 2 of 2', 'Add the onions and cook them gently.'],
    ]);
  });

  test('one sentence at a time, with short sentences riding along with the one before', async ({ page, pages }) => {
    await openRecipe(page, pages, recipe({
      steps: ['Tip the flour into a large bowl with the salt. Stir well. Make a well in the centre and crack in the eggs.'],
    }));
    expect(await firstLines(page, 2)).toEqual([
      ['Step 1 of 1', 'Tip the flour into a large bowl with the salt. Stir well.'],
      ['Step 1 of 1', 'Make a well in the centre and crack in the eggs.'],
    ]);
  });
});

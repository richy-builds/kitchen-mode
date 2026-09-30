import { test, expect, recipe, openRecipe, km, PHONE } from './helpers.js';

const stew = recipe({
  name: 'Smoky bean stew',
  recipeYield: ['4', '4 servings'],
  prepTime: 'PT10M',
  cookTime: 'PT90M',
  ingredients: ['2 tbsp olive oil', '1 large onion, finely chopped', '400g tin chopped tomatoes', '300ml hot vegetable stock', '2 tins butter beans (400g each), drained'],
  steps: [
    'Heat the oil in a large pan over a medium heat. Add the onion and cook until soft and golden.',
    'Pour in the chopped tomatoes and stock. Tip in the butter beans and simmer until thick.',
  ],
});

test.describe('the first screen', () => {
  test('shows the title, the yield and times, and ingredients to tick off', async ({ page, pages }) => {
    await openRecipe(page, pages, stew);
    await expect(page.locator('kitchen-mode .meta')).toHaveText('Serves 4 · Prep 10 min · Cook 1 hr 30 min');
    const onion = page.locator('kitchen-mode .ings li', { hasText: 'onion' });
    await expect(onion.locator('b')).toHaveText('1');
    await onion.click();
    await expect(onion).toHaveClass('ticked');
    // Ticks survive a trip into the steps and back.
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('kitchen-mode .ings li', { hasText: 'onion' })).toHaveClass('ticked');
  });

  test('a recipe with no ingredient list shows none, not a stray 0', async ({ page, pages }) => {
    await openRecipe(page, pages, recipe({ steps: ['Stir everything together in a large bowl.'] }));
    await expect(page.locator('kitchen-mode .overview')).not.toContainText('0');
    await expect(page.locator('kitchen-mode .ings')).toHaveCount(0);
  });

  test('a packed ingredient string is split into lines', async ({ page, pages }) => {
    await openRecipe(page, pages, recipe({ ingredients: ['1 cup corn\n2 cups stock\n1 onion'], steps: ['Simmer the corn in the stock.'] }));
    await expect(page.locator('kitchen-mode .ings li')).toHaveCount(3);
  });
});

test.describe('moving through the steps', () => {
  test('keys move a sentence at a time, with the ingredients each one needs', async ({ page, pages }) => {
    await openRecipe(page, pages, stew);
    const view = km(page);
    await page.keyboard.press('Space');
    await expect(view.eyebrow).toHaveText('Step 1 of 2');
    await expect(view.current).toHaveText('Heat the oil in a large pan over a medium heat.');
    await expect(view.need).toHaveText(['2 tbsp olive oil']);

    await page.keyboard.press('ArrowRight');
    await expect(view.current).toHaveText('Add the onion and cook until soft and golden.');
    await expect(view.need).toHaveText(['1 large onion, finely chopped']);

    await page.keyboard.press('Enter');
    await expect(view.eyebrow).toHaveText('Step 2 of 2');
    // "hot vegetable stock" matches on "stock", "chopped tomatoes" on "tomatoes": words shared by no other ingredient.
    await expect(view.need).toHaveText(['400g tin chopped tomatoes', '300ml hot vegetable stock']);

    await page.keyboard.press('ArrowRight');
    await expect(view.need).toHaveText(['2 tins butter beans (400g each), drained']);

    await page.keyboard.press('ArrowLeft');
    await expect(view.current).toHaveText('Pour in the chopped tomatoes and stock.');

    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('kitchen-mode .done h2')).toHaveText('Enjoy!');
    await page.getByRole('button', { name: 'Start again' }).click();
    await expect(page.locator('kitchen-mode h1')).toHaveText('Smoky bean stew');
  });

  test('a sentence with nothing new says so', async ({ page, pages }) => {
    await openRecipe(page, pages, recipe({ ingredients: ['1 onion'], steps: ['Leave it all to settle for a while.'] }));
    await page.keyboard.press('Space');
    await expect(km(page).needNone).toHaveText('Nothing new for this bit');
  });

  test('clicking the right of the screen moves on, the left goes back', async ({ page, pages }) => {
    await openRecipe(page, pages, stew);
    const view = km(page);
    const box = await view.stage.boundingBox();
    await page.getByRole('button', { name: 'Start cooking →' }).click();
    await page.mouse.click(box.x + box.width - 6, box.y + box.height / 2);
    await expect(view.current).toHaveText('Add the onion and cook until soft and golden.');
    await page.mouse.click(box.x + 6, box.y + box.height / 2);
    await expect(view.current).toHaveText('Heat the oil in a large pan over a medium heat.');
  });

  test('keys meant for the page, with a modifier, are left alone', async ({ page, pages }) => {
    await openRecipe(page, pages, stew);
    await page.keyboard.press('Control+ArrowRight');
    await expect(page.locator('kitchen-mode h1')).toHaveText('Smoky bean stew');
  });

  test('Esc closes it and gives the page its scrolling back', async ({ page, pages }) => {
    await openRecipe(page, pages, stew);
    expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('hidden');
    await page.keyboard.press('Escape');
    await expect(page.locator('kitchen-mode')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('');
    // The page's own keys work again.
    await page.keyboard.press('Space');
    expect(await page.evaluate(() => window.__kitchenMode)).toBeUndefined();
  });

  test('the ✕ is named for screen readers, and closes it', async ({ page, pages }) => {
    await openRecipe(page, pages, stew);
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(page.locator('kitchen-mode')).toHaveCount(0);
  });

  test('the recipe site’s CSS can’t reach the view', async ({ page, pages }) => {
    await openRecipe(page, pages, stew, { head: '<style>* { color: rgb(0, 255, 0) !important; font-size: 3px !important; } p { display: none !important; }</style>' });
    await page.keyboard.press('Space');
    await expect(km(page).current).toBeVisible();
    expect(await km(page).current.evaluate(el => getComputedStyle(el).color)).not.toBe('rgb(0, 255, 0)');
  });
});

test.describe('on a phone', () => {
  test.use(PHONE);

  test('taps move on and back, swipes too, and the hints say tap', async ({ page, pages }) => {
    await openRecipe(page, pages, stew);
    const view = km(page);
    await expect(page.locator('kitchen-mode .hint')).toHaveText('Tap right → next · tap left ← back');
    await page.getByRole('button', { name: 'Start cooking →' }).tap();
    const box = await view.stage.boundingBox();
    await page.touchscreen.tap(box.x + box.width - 6, box.y + box.height / 2);
    await expect(view.current).toHaveText('Add the onion and cook until soft and golden.');
    await page.touchscreen.tap(box.x + 6, box.y + box.height / 2);
    await expect(view.current).toHaveText('Heat the oil in a large pan over a medium heat.');

    const swipe = (fromX, toX) => view.stage.evaluate((stage, [fromX, toX]) => {
      const at = x => [new Touch({ identifier: 1, target: stage, clientX: x, clientY: 300 })];
      stage.dispatchEvent(new TouchEvent('touchstart', { touches: at(fromX), changedTouches: at(fromX), bubbles: true }));
      stage.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: at(toX), bubbles: true }));
    }, [fromX, toX]);
    await swipe(300, 100);
    await expect(view.current).toHaveText('Add the onion and cook until soft and golden.');
    await swipe(100, 300);
    await expect(view.current).toHaveText('Heat the oil in a large pan over a medium heat.');
  });

  test('nothing is wider than the screen', async ({ page, pages }) => {
    await openRecipe(page, pages, stew);
    for (let i = 0; i < 3; i++) {
      const [scroll, width] = await km(page).stage.evaluate(el => [el.scrollWidth, el.clientWidth]);
      expect(scroll).toBeLessThanOrEqual(width);
      await page.keyboard.press('Space');
    }
  });
});

import { test as base, expect, recipe, openRecipe, clickBookmark, km, PHONE } from './helpers.js';

// Timers run on a paused fake clock, moved on with clock.runFor. Speech and the audio clock are recorded, not played.
const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      window.__spoken = [];
      window.__beeps = [];
      speechSynthesis.speak = u => { window.__spoken.push(u.text); };
      const create = AudioContext.prototype.createOscillator;
      AudioContext.prototype.createOscillator = function () {
        const osc = create.call(this), start = osc.start;
        osc.start = at => { window.__beeps.push(at); start.call(osc, at); };
        return osc;
      };
    });
    await page.clock.install();
    await use(page);
  },
});
const pause = async page => page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1000);

const garlic = recipe({
  ingredients: ['2 garlic cloves', '400g tin tomatoes'],
  steps: ['Fry the garlic for 1 min until fragrant.', 'Add the tomatoes and bring to the boil.'],
});

test('each time in the text starts a timer of the right length', async ({ page, pages }) => {
  const cases = [
    ['Cook the onion for 8–10 mins until soft.', '8–10 mins', '8:00'],
    ['Simmer gently for 1 hr 30 mins, stirring now and then.', '1 hr 30 mins', '1:30:00'],
    ['Roast the lamb for 1½ hours until tender.', '1½ hours', '1:30:00'],
    ['Bake the loaf for 1 1/2 hours in the low oven.', '1 1/2 hours', '1:30:00'],
    ['Braise the beef for an hour and a half, covered.', 'an hour and a half', '1:30:00'],
    ['Leave the dough to prove for half an hour somewhere warm.', 'half an hour', '30:00'],
    ['Chill the custard for 1/2 hour before serving it.', '1/2 hour', '30:00'],
    ['Whisk the cream for 30 seconds until it just holds.', '30 seconds', '0:30'],
    ['Steam the greens for 2-3 minutes until bright green.', '2-3 minutes', '2:00'],
    ['Poach the eggs for 3 to 4 minutes until just set.', '3 to 4 minutes', '3:00'],
    ['Soak the beans for forty-five minutes in cold water.', 'forty-five minutes', '45:00'],
    ['Stir the spices through for a minute over the heat.', 'a minute', '1:00'],
    ['Cook for 2 hours 15 minutes, topping up the water.', '2 hours 15 minutes', '2:15:00'],
    ['Microwave on high for 1.5 mins, then stir it well.', '1.5 mins', '1:30'],
  ];
  await openRecipe(page, pages, recipe({ steps: [cases.map(c => c[0]).join(' ')] }));
  await pause(page);
  await page.keyboard.press('Space');
  const chips = page.locator('kitchen-mode .chip');
  await expect(chips).toHaveCount(cases.length);
  for (const [i, [, text, time]] of cases.entries()) {
    await expect(chips.nth(i)).toHaveText(`⏱︎ ${text}`);
    await chips.nth(i).click();
    await expect(km(page).timers.nth(i).locator('.time'), text).toHaveText(time);
  }
});

test('a timer is named after the verb before its time', async ({ page, pages }) => {
  await openRecipe(page, pages, recipe({ steps: ['Leave to rest for 10 mins. Bake for 20 mins, then cool for 10 mins.', 'Give it 5 mins.'] }));
  await pause(page);
  await page.keyboard.press('Space');
  for (const chip of await page.locator('kitchen-mode .chip').all()) await chip.click();
  await page.keyboard.press('Space');
  await page.keyboard.press('Space');
  await page.locator('kitchen-mode .chip').click();
  await expect(km(page).timers.locator('.label')).toHaveText(['Step 1 · Rest', 'Step 1 · Bake', 'Step 1 · Cool', 'Step 2']);
});

test('one timer per time, and T starts the one in the current sentence', async ({ page, pages }) => {
  await openRecipe(page, pages, garlic);
  await pause(page);
  await page.keyboard.press('Space');
  await page.keyboard.press('t');
  await expect(km(page).chip('1 min')).toHaveClass('chip started');
  await km(page).chip('1 min').click();
  await page.keyboard.press('t');
  await expect(km(page).timers).toHaveCount(1);
});

test('the alarm is booked on the audio clock for its first 90 seconds, and cancelling silences it', async ({ page, pages }) => {
  await openRecipe(page, pages, garlic);
  await pause(page);
  await page.keyboard.press('Space');
  await km(page).chip('1 min').click();
  const beeps = await page.evaluate(() => window.__beeps);
  // Three beeps every 2.5 seconds, 36 times.
  expect(beeps).toHaveLength(108);
  // The audio clock runs on while they're booked, so allow it a few milliseconds.
  expect(Math.max(...beeps) - Math.min(...beeps)).toBeCloseTo(88, 1);
  expect(Math.min(...beeps)).toBeGreaterThanOrEqual(60);
  await page.getByRole('button', { name: 'Cancel timer' }).click();
  await expect(km(page).timers).toHaveCount(0);
  await expect(km(page).chip('1 min')).toHaveClass('chip');
});

test('glance mode: left alone with a timer running, the countdown fills the screen with the sentence and the next one', async ({ page, pages }) => {
  await openRecipe(page, pages, garlic);
  await pause(page);
  await page.keyboard.press('Space');
  await km(page).chip('1 min').click();
  await page.clock.runFor(9000);
  await expect(km(page).glance).not.toBeVisible();
  await page.clock.runFor(2000);
  const glance = km(page).glance;
  await expect(glance).toHaveClass('glance on wait');
  await expect(glance.locator('.g-name')).toHaveText('Step 1 · Fry');
  await expect(glance.locator('.g-time')).toHaveText('0:49');
  await expect(glance.locator('.g-now')).toHaveText('Fry the garlic for 1 min until fragrant.');
  await expect(glance.locator('.g-next')).toHaveText('Next · Step 2Add the tomatoes and bring to the boil.');
  // A key moves on, since pressing one is deliberate.
  await page.keyboard.press('Space');
  await expect(glance).not.toBeVisible();
  await expect(km(page).current).toHaveText('Add the tomatoes and bring to the boil.');
});

test('a ringing timer takes over the screen in red, says which it was, and a tap stops it without moving on', async ({ page, pages }) => {
  await openRecipe(page, pages, garlic, { title: 'Garlic toast' });
  await pause(page);
  await page.keyboard.press('Space');
  await km(page).chip('1 min').click();
  await page.keyboard.press('Space');
  await page.clock.runFor(61_000);
  const glance = km(page).glance;
  await expect(glance).toHaveClass('glance on ring');
  await expect(glance.locator('.g-time')).toHaveText("Time's up");
  await expect(glance.locator('.g-more')).toHaveText('Tap to stop');
  // What follows the sentence the timer came from.
  await expect(glance.locator('.g-next')).toHaveText('Next · Step 2Add the tomatoes and bring to the boil.');
  await expect(page).toHaveTitle("⏰ Time's up! Garlic toast");
  await page.clock.runFor(1000);
  expect(await page.evaluate(() => window.__spoken)).toContain("Fry, step 1. Time's up.");

  await glance.click();
  await expect(glance).not.toBeVisible();
  await expect(km(page).timers).toHaveCount(0);
  await expect(page).toHaveTitle('Garlic toast');
  await expect(km(page).current).toHaveText('Add the tomatoes and bring to the boil.');
});

test('Esc stops a ringing timer first, and only then closes', async ({ page, pages }) => {
  await openRecipe(page, pages, garlic);
  await pause(page);
  await page.keyboard.press('Space');
  await km(page).chip('1 min').click();
  await page.clock.runFor(61_000);
  await page.keyboard.press('Escape');
  await expect(km(page).timers).toHaveCount(0);
  await expect(km(page).root).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('kitchen-mode')).toHaveCount(0);
});

test('"Keep timer small" keeps glance mode off until "Big timer: off" turns it back on', async ({ page, pages }) => {
  await openRecipe(page, pages, garlic);
  await pause(page);
  await page.keyboard.press('Space');
  await km(page).chip('1 min').click();
  await page.clock.runFor(11_000);
  await page.getByRole('button', { name: 'Keep timer small' }).click();
  await expect(km(page).glance).not.toBeVisible();
  await page.clock.runFor(11_000);
  await expect(km(page).glance).not.toBeVisible();
  await page.getByRole('button', { name: 'Big timer: off' }).click();
  await page.clock.runFor(11_000);
  await expect(km(page).glance).toHaveClass('glance on wait');
});

test.describe('timers outlive the view', () => {
  test('closing moves them to a corner, and tapping one goes back to the step', async ({ page, pages }) => {
    await openRecipe(page, pages, garlic);
    await pause(page);
    await page.keyboard.press('Space');
    await km(page).chip('1 min').click();
    await page.keyboard.press('Escape');
    await expect(km(page).root).toHaveClass('km mini');
    await expect(km(page).stage).not.toBeVisible();
    await expect(km(page).timers).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('');

    await km(page).timers.click();
    await expect(km(page).root).toHaveClass('km');
    await expect(km(page).current).toHaveText('Fry the garlic for ⏱︎ 1 min until fragrant.');

    // The bookmark brings it back too.
    await page.keyboard.press('Escape');
    await clickBookmark(page);
    await expect(km(page).stage).toBeVisible();
  });

  test('a timer rings in the corner, and stopping the last one closes Kitchen Mode for good', async ({ page, pages }) => {
    // Reduced motion also stops the ringing pill pulsing, which Playwright would otherwise wait out before clicking.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openRecipe(page, pages, garlic);
    await pause(page);
    await page.keyboard.press('Space');
    await km(page).chip('1 min').click();
    await page.keyboard.press('Escape');
    await page.clock.runFor(61_000);
    await expect(km(page).timers).toHaveClass('timer ringing');
    await expect(km(page).timers).toHaveCSS('animation-name', 'none');
    await expect(km(page).glance).not.toBeVisible();
    await km(page).timers.click();
    await expect(page.locator('kitchen-mode')).toHaveCount(0);
    expect(await page.evaluate(() => window.__kitchenMode)).toBeUndefined();
  });
});

test.describe('on a phone', () => {
  test.use(PHONE);

  // Until 29 Sep 2026 glance hid itself on the first touch, so the tap landed on the step underneath and moved on.
  test('a tap on glance mode brings the full view back and never moves on', async ({ page, pages }) => {
    await openRecipe(page, pages, garlic);
    await pause(page);
    await page.getByRole('button', { name: 'Start cooking →' }).tap();
    await km(page).chip('1 min').tap();
    await page.clock.runFor(11_000);
    const box = await km(page).glance.boundingBox();
    await page.touchscreen.tap(box.x + box.width * 0.8, box.y + box.height / 2);
    await expect(km(page).glance).not.toBeVisible();
    await expect(km(page).current).toHaveText('Fry the garlic for ⏱︎ 1 min until fragrant.');
  });
});

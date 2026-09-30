import { test, expect, recipe, openRecipe } from './helpers.js';

// "Before you start" lists what a recipe takes as already done. Each case here is a rule from the README,
// or a false alarm that was found and fixed.
const listed = async (page, pages, data) => {
  await openRecipe(page, pages, recipe(data));
  return page.locator('kitchen-mode .before li').evaluateAll(lis => lis.map(li => [li.children[0].textContent, li.children[1].textContent]));
};

test('ingredients that go in cooked, soaked or at room temperature', async ({ page, pages }) => {
  expect(await listed(page, pages, {
    ingredients: ['4 cups cooked rice', '2 eggs, at room temperature', '1 tbsp toasted sesame oil', '1 onion'],
    steps: ['Fry the onion, then stir in the rice and eggs.'],
  })).toEqual([
    ['Have ready', '4 cups cooked rice'],
    ['Have ready', '2 eggs, at room temperature'],
  ]);
});

test('a step that uses something cooked that no earlier step made', async ({ page, pages }) => {
  expect(await listed(page, pages, {
    ingredients: ['200g basmati rice', '100g peas'],
    steps: ['Warm the peas in a pan.', 'Stir in the cooked basmati rice and serve.'],
  })).toEqual([['Step 2 uses', 'the cooked basmati rice']]);
});

test('but not when an earlier step cooked it', async ({ page, pages }) => {
  expect(await listed(page, pages, {
    ingredients: ['200g rice'],
    steps: ['Boil the rice for 10 mins, then drain.', 'Fork through the cooked rice and serve.'],
  })).toEqual([]);
});

test('toasted sesame oil comes toasted from the shop, in a step too', async ({ page, pages }) => {
  expect(await listed(page, pages, {
    ingredients: ['1 tbsp sesame oil', '2 spring onions'],
    steps: ['Drizzle over the toasted sesame oil and scatter with the spring onions.'],
  })).toEqual([]);
});

test('long waits: overnight, or an hour or more to chill, marinate or prove, once per step', async ({ page, pages }) => {
  expect(await listed(page, pages, {
    ingredients: ['4 chicken thighs'],
    steps: [
      'Marinate the chicken overnight in the fridge. Chill it overnight again if you have time.',
      'Chill the dough for 2 hours until firm.',
      'Leave to rest for 10 mins before carving.',
    ],
  })).toEqual([
    ['Long wait · step 1', 'Marinate the chicken overnight in the fridge.'],
    ['Long wait · step 2', 'Chill the dough for 2 hours until firm.'],
  ]);
});

test('"until" ends a step, so a long bake until risen is not a wait', async ({ page, pages }) => {
  expect(await listed(page, pages, {
    ingredients: ['500g bread flour'],
    steps: ['Bake the loaf for 1 hr until risen and golden.'],
  })).toEqual([]);
});

test('storage notes are not part of cooking it', async ({ page, pages }) => {
  expect(await listed(page, pages, {
    ingredients: ['1kg beef'],
    steps: ['Braise the beef until tender.', 'Freeze in portions. To use, defrost overnight in the fridge and reheat until piping hot.'],
  })).toEqual([]);
});

test('a preheated oven that no step turns on', async ({ page, pages }) => {
  expect(await listed(page, pages, {
    ingredients: ['1 tray of vegetables'],
    steps: ['Toss the vegetables with oil.', 'Roast in the preheated oven at 200C for 30 mins.'],
  })).toEqual([['Oven', 'Heat it to 200C now. Step 2 wants it hot, and no step says to turn it on.']]);
});

test('but not when a step says to preheat it', async ({ page, pages }) => {
  expect(await listed(page, pages, {
    ingredients: ['1 tray of vegetables'],
    steps: ['Preheat the oven to 200C.', 'Roast in the preheated oven for 30 mins.'],
  })).toEqual([]);
});

test('nothing to list, no list', async ({ page, pages }) => {
  await openRecipe(page, pages, recipe({ ingredients: ['1 onion'], steps: ['Fry the onion until soft.'] }));
  await expect(page.locator('kitchen-mode .before')).toHaveCount(0);
});

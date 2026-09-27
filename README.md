# Kitchen Mode

A free browser button that turns a recipe page into big, step-by-step instructions you can read from across the kitchen.

**Live:** https://kitchen-mode.vercel.app · **Try it on a sample recipe:** https://kitchen-mode.vercel.app/#try

![Kitchen Mode showing a recipe step in large type, with the ingredients that step needs](og.png)

## What it does

Click the bookmark on a recipe page and you get:

- the ingredients to tick off, then each step one sentence at a time, in type sized to be read from a distance
- a "You'll need" panel showing only the ingredients the current sentence mentions
- tap-to-start timers on any time in the text ("cook for 8–10 mins" starts an 8-minute timer)
- the screen kept awake while it's open
- keyboard, tap, swipe, foot pedal or presentation clicker to move through the steps

It runs entirely in the browser and doesn't send anything anywhere.

## How it works

Recipe sites publish a structured copy of each recipe ([schema.org Recipe](https://schema.org/Recipe) JSON-LD) so Google can show rich results. Kitchen Mode reads that instead of the page layout, which is why ads, pop-ups and long introductions never get in the way, and why it works on any site that publishes the data.

- Steps are split into sentences; very short sentences ride along with the one before.
- Ingredients are matched to sentences by their distinctive words ("hot chicken stock" matches on *chicken* and *stock*), ignoring words shared by several ingredients.
- Times are found with a regex; ranges start the timer at the low end, so you check early rather than late.
- The view is mounted in a shadow DOM, so the recipe site's CSS can't interfere.
- The screen stays on through the Screen Wake Lock API, re-requested when the tab becomes visible again.

## Files

| File | What it is |
|---|---|
| `kitchen-mode.js` | Readable source of the bookmarklet. Edit this one. |
| `build.mjs` | Builds `index.html`: strips comments, turns the source into a `javascript:` URL, and writes the landing page with the sample recipe. `HANDLE` and `SITE_URL` are set at the top. |
| `index.html` | The generated landing page. Don't edit by hand. |
| `og.png` | Link preview image (1200×630) used by X and others. |
| `og-image.html` | Source for `og.png`. |

## Working on it

```sh
node build.mjs     # rebuild index.html after changing kitchen-mode.js or build.mjs
open index.html    # "Try it on a sample recipe" runs the current code
```

Regenerate the preview image after changing `og-image.html`:

```sh
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --hide-scrollbars \
  --virtual-time-budget=4000 --window-size=1200,630 --screenshot="$PWD/og.png" "file://$PWD/og-image.html"
```

Deploy (static files, no build step on Vercel):

```sh
vercel deploy --prod
```

## Site support

Checked on 27 Sep 2026 by fetching a recipe page and running the same data lookup the bookmarklet uses:

- **Publish the data** (each links to the recipe that was checked; the list lives in `tested` in `build.mjs`): [BBC Good Food](https://www.bbcgoodfood.com/recipes/bacon-mushroom-risotto), [BBC Food](https://www.bbc.co.uk/food/recipes/easy_chocolate_cake_31070), [Bon Appétit](https://www.bonappetit.com/recipe/bas-best-chocolate-chip-cookies), [Delish](https://www.delish.com/cooking/recipe-ideas/a19636089/creamy-tuscan-chicken-recipe/), [Jamie Oliver](https://www.jamieoliver.com/recipes/chicken/chicken-tikka-masala/), [King Arthur Baking](https://www.kingarthurbaking.com/recipes/classic-chocolate-chip-cookies-recipe), [Pinch of Yum](https://pinchofyum.com/the-best-soft-chocolate-chip-cookies), [RecipeTin Eats](https://www.recipetineats.com/chicken-chasseur/)
- **Blocked the automated check** (bot protection, so unknown rather than unsupported): Allrecipes, Serious Eats, Simply Recipes, Budget Bytes, Sally's Baking Addiction, Taste of Home
- **Left off the landing page on purpose:** NYT Cooking publishes the data, but the recipes are paywalled

## Decisions

- **A bookmarklet rather than an extension.** No install, store fee or review, and nothing leaves the page. The costs: it's desktop-first, phone setup means pasting the code into a bookmark by hand, and installed copies never update, so test before sharing a new version.
- **The pan emoji on the install button is drawn by CSS**, so the dragged bookmark is named plain "Kitchen Mode". Chrome always shows its own globe icon for bookmarklets and there's no way to set a different one.
- **The sample recipe's JSON-LD is only added when someone presses "Try it"**, so Google never reads the landing page as a recipe.
- **Landing page design:** a tablet propped against a tiled splashback, with a live replica of the cook view. Fonts are Young Serif (cookbook feel) and Atkinson Hyperlegible Next (legibility is the point of the tool). The tool itself keeps its own cream and orange palette.
- **Name:** kept "Kitchen Mode" because it says what it does. "Recipease" was considered and dropped: it was Jamie Oliver's cookery shop brand, and it sounds identical to "recipes".

## Not yet tested

- The phone setup steps on a real iPhone (Safari) and Android phone (Chrome)
- Real click tests on each site in the list above (only the data check has been run)

## Ideas

- A mobile web version: paste a recipe link and get the cook view (needs a small server function, since browsers can't read other sites' pages), with shareable links per recipe
- Scale servings ("serves 4" to 2), rewriting quantities including fractions
- Read the current step aloud, and voice "next"
- A tiny loader bookmarklet that opens the cook view on this site, so updates reach everyone
- A shopping list merged from several recipe links

---

Made by [@richyjudge](https://x.com/richyjudge).

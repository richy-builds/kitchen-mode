// Builds index.html: the Kitchen Mode landing page, with the button to drag onto the bookmarks bar.
import { readFileSync, writeFileSync } from 'node:fs';

// Your X handle without the @. Leave empty to keep the credit off the page.
const HANDLE = 'richyjudge';
// Where the page is deployed. Link previews on X need the full address of og.png.
const SITE_URL = 'https://kitchen-mode.vercel.app';

const source = readFileSync(new URL('./kitchen-mode.js', import.meta.url), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n')
  .map(line => line.trim())
  .filter(line => line && !line.startsWith('//'))
  .join('\n');

const href = 'javascript:' + encodeURIComponent(source);

// Picture for the sample recipe: a bowl of stew on the same tiles as the page.
const bowl = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
<rect width="400" height="300" fill="#cfe0d4"/>
<path d="M0 75H400M0 150H400M0 225H400M75 0V300M150 0V300M225 0V300M300 0V300M375 0V300" stroke="#bdd3c4" stroke-width="3"/>
<circle cx="204" cy="160" r="118" fill="#15302a" opacity=".16"/>
<circle cx="198" cy="150" r="116" fill="#f7f1e6"/>
<circle cx="198" cy="150" r="93" fill="#c0442a"/>
<circle cx="182" cy="136" r="60" fill="#cf5634" opacity=".7"/>
<g fill="#f3e5c8">
<ellipse cx="160" cy="118" rx="15" ry="10" transform="rotate(-24 160 118)"/>
<ellipse cx="226" cy="112" rx="15" ry="10" transform="rotate(18 226 112)"/>
<ellipse cx="196" cy="160" rx="15" ry="10" transform="rotate(-8 196 160)"/>
<ellipse cx="146" cy="176" rx="15" ry="10" transform="rotate(30 146 176)"/>
<ellipse cx="238" cy="182" rx="15" ry="10" transform="rotate(-36 238 182)"/>
<ellipse cx="198" cy="210" rx="15" ry="10" transform="rotate(12 198 210)"/>
<ellipse cx="258" cy="146" rx="15" ry="10" transform="rotate(64 258 146)"/>
</g>
<g fill="#3d7a3f">
<ellipse cx="176" cy="96" rx="14" ry="6" transform="rotate(35 176 96)"/>
<ellipse cx="222" cy="148" rx="14" ry="6" transform="rotate(-40 222 148)"/>
<ellipse cx="168" cy="146" rx="13" ry="5" transform="rotate(70 168 146)"/>
<ellipse cx="220" cy="206" rx="13" ry="5" transform="rotate(10 220 206)"/>
<ellipse cx="128" cy="140" rx="12" ry="5" transform="rotate(-60 128 140)"/>
</g>
<path d="M318 228 A58 58 0 0 1 256 268 Z" fill="#f2c94c"/>
<path d="M312 232 A50 50 0 0 1 262 262" fill="none" stroke="#fbe7a1" stroke-width="5"/>
</svg>`;

// Runs when someone presses "Try it on a sample recipe", so the page itself never claims to be a recipe.
const sample = {
  '@context': 'https://schema.org',
  '@type': 'Recipe',
  name: 'Smoky tomato & butter bean stew',
  image: 'data:image/svg+xml,' + encodeURIComponent(bowl),
  recipeYield: '4',
  prepTime: 'PT10M',
  cookTime: 'PT35M',
  recipeIngredient: [
    '2 tbsp olive oil',
    '1 large onion, finely chopped',
    '3 garlic cloves, crushed',
    '2 tsp smoked paprika',
    '1 tbsp tomato purée',
    '400g tin chopped tomatoes',
    '2 tins butter beans (400g each), drained',
    '300ml vegetable stock',
    '100g spinach',
    '1 lemon',
    'Crusty bread, to serve',
  ],
  recipeInstructions: [
    'Heat the oil in a large, deep pan over a medium heat. Add the onion with a pinch of salt and cook for 8–10 mins, stirring now and then, until soft and golden.',
    'Stir in the garlic and paprika and cook for 1 min until fragrant. Add the purée and cook for 1 min more.',
    'Pour in the chopped tomatoes and stock, then tip in the butter beans. Bring to a simmer. Cook uncovered for 18–20 mins, stirring occasionally, until the sauce is thick enough to coat a spoon.',
    'Stir the spinach through for 2 mins until wilted. Squeeze in the juice of half the lemon, taste, and season with salt and pepper.',
    'Ladle into bowls and cut the rest of the lemon into wedges. Serve with crusty bread for mopping up the sauce.',
  ].map(text => ({ '@type': 'HowToStep', text })),
};

// Recipe pages checked to publish the data Kitchen Mode reads (see README).
const tested = [
  ['BBC Good Food', 'https://www.bbcgoodfood.com/recipes/bacon-mushroom-risotto'],
  ['BBC Food', 'https://www.bbc.co.uk/food/recipes/easy_chocolate_cake_31070'],
  ['Bon Appétit', 'https://www.bonappetit.com/recipe/bas-best-chocolate-chip-cookies'],
  ['Delish', 'https://www.delish.com/cooking/recipe-ideas/a19636089/creamy-tuscan-chicken-recipe/'],
  ['Jamie Oliver', 'https://www.jamieoliver.com/recipes/chicken/chicken-tikka-masala/'],
  ['King Arthur Baking', 'https://www.kingarthurbaking.com/recipes/classic-chocolate-chip-cookies-recipe'],
  ['Pinch of Yum', 'https://pinchofyum.com/the-best-soft-chocolate-chip-cookies'],
  ['RecipeTin Eats', 'https://www.recipetineats.com/chicken-chasseur/'],
];

const favicon ='data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🍳</text></svg>');
const handleLink = HANDLE ? `<a href="https://x.com/${HANDLE}">@${HANDLE}</a>` : '';
const description = 'A free browser button that turns a recipe page into big, step-by-step instructions you can read from across the kitchen, with timers you start with a tap.';

const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Kitchen Mode</title>
<meta name="description" content="${description}">
<meta property="og:type" content="website">
<meta property="og:title" content="Kitchen Mode">
<meta property="og:description" content="${description}">
${SITE_URL ? `<meta property="og:url" content="${SITE_URL}/">
<meta property="og:image" content="${SITE_URL}/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Kitchen Mode showing a recipe step in large type, with the ingredients that step needs.">
<meta name="twitter:card" content="summary_large_image">` : '<meta name="twitter:card" content="summary">'}
${HANDLE ? `<meta name="twitter:creator" content="@${HANDLE}">` : ''}
<meta name="theme-color" content="#cfe0d4" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#15302a" media="(prefers-color-scheme: dark)">
<link rel="icon" href="${favicon}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Next:wght@400;700&family=Young+Serif&display=swap">
<style>
  :root {
    color-scheme: light dark;
    --tile: #cfe0d4; --grout: #bdd3c4; --ground: #edf3ee; --ink: #15302a; --muted: #435a51; --rule: #c9d9ce;
    --accent: #c2410c; --on-accent: #fff; --link: #a63a0c; --key: #fff; --bezel: #1d1f1e;
    /* Kitchen Mode's own colours, for the screen in the hero */
    --km-bg: #fbf7f0; --km-panel: #f3ecdf; --km-ink: #1f1a14; --km-soft: #857a6c; --km-line: #e6dccb; --km-accent: #c2410c; --km-chip: #fde4d3;
    --serif: "Young Serif", Georgia, serif;
    --overlap: clamp(40px, 8vw, 96px);
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --tile: #15302a; --grout: #1d3b34; --ground: #0f211c; --ink: #ebf1ec; --muted: #9fb4aa; --rule: #24413a;
      --accent: #fb923c; --on-accent: #1a0e04; --link: #fdab6c; --key: #1a332c; --bezel: #050706;
      --km-bg: #15120e; --km-panel: #221c16; --km-ink: #f5eee4; --km-soft: #a3978a; --km-line: #352c23; --km-accent: #fb923c; --km-chip: #3d2616;
    }
  }
  * { box-sizing: border-box; }
  [hidden] { display: none !important; }
  body { margin: 0; background: var(--ground); color: var(--ink); font: 400 18px/1.6 "Atkinson Hyperlegible Next", "Atkinson Hyperlegible", system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
  a { color: var(--link); text-underline-offset: .18em; text-decoration-thickness: 1px; }
  a:hover { text-decoration-thickness: 2px; }
  :focus-visible { outline: 3px solid var(--accent); outline-offset: 3px; }
  .wrap { width: min(100% - 32px, 1180px); margin-inline: auto; }

  /* Hero: a tablet propped against a tiled splashback */
  .hero { background-color: var(--tile); background-image: linear-gradient(var(--grout) 2px, transparent 2px), linear-gradient(90deg, var(--grout) 2px, transparent 2px); background-size: 84px 84px; background-position: -1px -1px; }
  .top { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding-block: 22px; }
  .brand { font: 400 22px/1 var(--serif); color: var(--ink); text-decoration: none; white-space: nowrap; }
  .top nav { display: flex; gap: 22px; font-size: 16px; }
  .top nav a { color: var(--ink); text-decoration: none; }
  .top nav a:hover { text-decoration: underline; }
  .intro { padding-block: clamp(24px, 4.5vw, 64px) clamp(32px, 4vw, 52px); }
  h1 { font: 400 clamp(40px, 2rem + 4.2vw, 92px)/1 var(--serif); letter-spacing: -.02em; margin: 0 0 28px; max-width: 21ch; text-wrap: balance; }
  .lede { font-size: clamp(19px, 1.05rem + .4vw, 22px); line-height: 1.5; max-width: 34em; margin: 0 0 32px; text-wrap: pretty; }
  .actions { display: flex; flex-wrap: wrap; align-items: center; gap: 14px; }
  /* The pan is drawn by CSS so the dragged bookmark is named plain "Kitchen Mode": Chrome already adds its own globe icon. */
  .bookmarklet::before { content: "🍳"; }
  .bookmarklet { display: inline-flex; align-items: center; gap: .4em; background: var(--accent); color: var(--on-accent); font-weight: 700; font-size: 20px; line-height: 1; padding: 18px 28px; border-radius: 999px; text-decoration: none; cursor: grab; box-shadow: 0 3px 0 color-mix(in srgb, var(--accent) 55%, #000); }
  .bookmarklet:active { cursor: grabbing; }
  .button { font: inherit; font-weight: 700; font-size: 18px; line-height: 1; padding: 17px 24px; border-radius: 999px; border: 2px solid currentColor; background: transparent; color: var(--ink); cursor: pointer; }
  .button:hover { background: color-mix(in srgb, var(--ink) 7%, transparent); }
  .button.small { font-size: 16px; padding: 12px 18px; }
  .hint { margin: 18px 0 0; color: var(--muted); font-size: 16px; }
  .tip { margin: 12px 0 0; color: var(--link); font-size: 16px; }
  .tip:empty { display: none; }
  .for-touch { display: none; }
  @media (pointer: coarse) {
    .for-mouse { display: none; }
    .for-touch { display: revert; }
    .try { background: var(--accent); border-color: var(--accent); color: var(--on-accent); }
  }

  .tablet { margin: 0 0 calc(-1 * var(--overlap)); padding: clamp(7px, 1.1vw, 14px); background: var(--bezel); border-radius: clamp(18px, 2.6vw, 34px); box-shadow: 0 0 0 1px rgb(255 255 255 / .07), 0 40px 80px -30px rgb(8 28 22 / .6), 0 18px 32px -18px rgb(8 28 22 / .45); }
  .screen { container-type: inline-size; aspect-ratio: 16 / 9; display: grid; grid-template-columns: minmax(0, 1fr); grid-template-rows: auto auto minmax(0, 1fr) auto; overflow: hidden; border-radius: clamp(11px, 1.6vw, 22px); background: var(--km-bg); color: var(--km-ink); font: 400 16px/1.45 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; user-select: none; -webkit-user-select: none; }
  .d-head { display: flex; align-items: center; gap: 1.2cqi; padding: 1.4cqi 2.6cqi; }
  .d-title { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font: 600 clamp(13px, 1.5cqi, 17px)/1.2 ui-serif, Georgia, serif; }
  .d-pill { font-size: clamp(11px, 1.15cqi, 13px); padding: .45em .9em; border-radius: 999px; background: var(--km-panel); color: var(--km-soft); white-space: nowrap; }
  .d-x { flex: none; width: clamp(28px, 3.4cqi, 40px); aspect-ratio: 1; border-radius: 50%; background: var(--km-panel); display: grid; place-items: center; font-size: clamp(11px, 1.3cqi, 15px); }
  .d-progress { display: flex; gap: .5cqi; padding: 0 2.6cqi; }
  .d-progress i { flex: 1; height: clamp(4px, .5cqi, 6px); border-radius: 3px; background: var(--km-line); overflow: hidden; }
  .d-progress b { display: block; height: 100%; width: 0; background: var(--km-accent); transition: width .3s; }
  .d-cook { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, .4fr); gap: 4cqi; align-items: center; padding: 3cqi 4.5cqi; }
  .d-eyebrow { font-size: clamp(10px, 1.1cqi, 13px); font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--km-accent); margin-bottom: 1.2cqi; }
  .d-step { margin: 0; font-size: clamp(19px, 3.8cqi, 52px); font-weight: 520; line-height: 1.3; letter-spacing: -.005em; text-wrap: pretty; }
  .d-s { opacity: .22; transition: opacity .35s; }
  .d-s.past { opacity: .38; }
  .d-s.on { opacity: 1; }
  .d-chip { background: var(--km-chip); color: var(--km-accent); font-weight: 650; padding: 0 .28em; border-radius: .3em; white-space: nowrap; outline: 2px solid transparent; outline-offset: 1px; transition: outline-color .2s; }
  .d-chip.started { outline-color: var(--km-accent); }
  .d-need { background: var(--km-panel); border-radius: clamp(12px, 1.7cqi, 20px); padding: 2.2cqi 2.4cqi; }
  .d-need ul { list-style: none; margin: 0; padding: 0; }
  .d-need li { font-size: clamp(15px, 1.9cqi, 26px); line-height: 1.25; padding: .45em 0; }
  .d-need li + li { border-top: 1px solid var(--km-line); }
  .d-none { color: var(--km-soft); margin: 0; font-size: clamp(14px, 1.6cqi, 18px); }
  .d-foot { display: flex; align-items: center; gap: 1.4cqi; padding: 1cqi 2.6cqi 1.4cqi; min-height: clamp(52px, 5.8cqi, 68px); }
  .d-timers { flex: 1; }
  .d-timer { display: inline-flex; align-items: center; gap: .7em; background: var(--km-panel); border-radius: 999px; padding: .35em .35em .35em 1em; font-size: clamp(12px, 1.3cqi, 15px); }
  .d-time { font-weight: 700; font-size: 1.45em; font-variant-numeric: tabular-nums; }
  .d-cancel { width: 2.1em; aspect-ratio: 1; border-radius: 50%; display: grid; place-items: center; color: var(--km-soft); font-size: .85em; }
  .d-hint { color: var(--km-soft); font-size: clamp(11px, 1.2cqi, 14px); white-space: nowrap; }
  @container (max-width: 640px) {
    .d-cook { grid-template-columns: 1fr; align-items: start; gap: 20px; padding: 20px 18px; }
    .d-need { padding: 16px 18px; }
    .d-hint { display: none; }
  }
  @media (max-width: 640px) { .screen { aspect-ratio: auto; } }
  @media (prefers-reduced-motion: reduce) { .d-s, .d-progress b, .d-chip { transition: none; } }

  /* Everything below the hero sits on the countertop */
  .info { padding-block: calc(var(--overlap) + clamp(48px, 8vw, 104px)) clamp(32px, 6vw, 72px); }
  .block { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 2fr); gap: 20px 48px; padding-block: clamp(36px, 5vw, 64px); border-top: 1px solid var(--rule); }
  .block:first-child { border-top: 0; padding-top: 0; }
  .block h2 { font: 400 clamp(30px, 1.3rem + 1.4vw, 40px)/1.1 var(--serif); letter-spacing: -.01em; margin: 0; }
  .body { max-width: 40em; }
  .body > p { margin: 0 0 1em; }
  .body h3 { font-size: 18px; font-weight: 700; margin: 1.8em 0 .6em; }
  kbd { font-family: inherit; font-size: 15px; font-weight: 700; line-height: 1; background: var(--key); border: 1px solid var(--rule); border-bottom-width: 3px; border-radius: 7px; padding: 3px 8px; white-space: nowrap; }

  .steps { list-style: none; margin: 0 0 36px; padding: 0; counter-reset: step; }
  .steps > li { counter-increment: step; position: relative; padding-left: 56px; margin-bottom: 26px; }
  .steps > li::before { content: counter(step); position: absolute; left: 0; top: -2px; font: 400 32px/1 var(--serif); color: var(--accent); }
  .steps .bookmarklet { margin-top: 14px; }

  details { border: 1px solid var(--rule); border-radius: 16px; background: color-mix(in srgb, var(--tile) 40%, var(--ground)); }
  summary { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 18px 22px; font-weight: 700; cursor: pointer; list-style: none; }
  summary::-webkit-details-marker { display: none; }
  summary::after { content: "+"; font: 400 28px/1 var(--serif); color: var(--accent); }
  details[open] summary::after { content: "−"; }
  .phone { padding: 0 22px 22px; }
  .phone > p { margin: 0 0 16px; }
  .phone-cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 0 36px; }
  .phone h3 { margin: 12px 0 8px; }
  .phone ol { margin: 0; padding-left: 1.3em; }
  .phone li { margin-bottom: 8px; }

  .works { list-style: none; margin: 0; padding: 0; columns: 2 200px; column-gap: 36px; }
  .works li { break-inside: avoid; position: relative; padding: 9px 0 9px 30px; border-bottom: 1px solid var(--rule); }
  .works li::before { content: "✓"; position: absolute; left: 2px; color: var(--accent); font-weight: 700; }
  .works a { color: var(--ink); text-decoration-color: color-mix(in srgb, var(--ink) 35%, transparent); }
  .works a:hover { color: var(--link); text-decoration-color: currentColor; }
  .wont { margin: 0; padding-left: 1.2em; }
  .wont li { margin-bottom: 6px; }
  .note { color: var(--muted); font-size: 16px; margin-top: 24px !important; }

  .keys { display: grid; grid-template-columns: minmax(0, 11em) minmax(0, 1fr); margin: 0 0 28px; }
  .keys dt, .keys dd { margin: 0; padding: 12px 0; border-bottom: 1px solid var(--rule); }
  .keys dt { font-weight: 700; padding-right: 16px; }
  .chip-sample { background: color-mix(in srgb, var(--accent) 16%, transparent); color: var(--link); font-weight: 700; padding: 0 .3em; border-radius: .3em; white-space: nowrap; }

  .foot { border-top: 1px solid var(--rule); padding-block: 32px 56px; color: var(--muted); font-size: 16px; }
  .foot p { margin: 0 0 8px; max-width: 46em; }

  @media (max-width: 760px) {
    .top nav { display: none; }
    .block { grid-template-columns: 1fr; }
  }
  @media (max-width: 520px) {
    .keys { grid-template-columns: 1fr; }
    .keys dt { border-bottom: 0; padding-bottom: 0; }
  }
</style>
</head>
<body>
<div class="hero">
  <div class="wrap">
    <header class="top">
      <a class="brand" href="./">🍳 Kitchen Mode</a>
      <nav aria-label="On this page"><a href="#setup">Set it up</a><a href="#sites">Which sites work</a>${handleLink}</nav>
    </header>
    <div class="intro">
      <h1>Read the recipe from across the kitchen.</h1>
      <p class="lede">Kitchen Mode is a free button for your browser. Click it on a recipe page to see the steps in big type, one sentence at a time, with the ingredients each step needs and timers you start with a tap. Your screen stays on until you’re done.</p>
      <div class="actions">
        <a class="bookmarklet for-mouse" href="${href}" data-tip="hint">Kitchen Mode</a>
        <button class="button try" type="button" data-try>Try it on a sample recipe</button>
      </div>
      <p class="hint" id="hint" aria-live="polite"><span class="for-mouse">Drag the orange button onto your bookmarks bar to install it.</span><span class="for-touch">On a phone? <a href="#phone">Setting it up takes a minute.</a></span></p>
    </div>
    <figure class="tablet" role="img" aria-label="Kitchen Mode on a tablet, showing step 3 of a stew recipe in large type, the ingredients that step needs, and a running timer.">
      <div class="screen" aria-hidden="true">
        <div class="d-head"><span class="d-title">🍳 Smoky tomato &amp; butter bean stew</span><span class="d-pill">☀︎ Screen stays on</span><span class="d-x">✕</span></div>
        <div class="d-progress"><i><b style="width:100%"></b></i><i><b style="width:100%"></b></i><i><b data-bar style="width:50%"></b></i><i><b></b></i><i><b></b></i></div>
        <div class="d-cook">
          <div>
            <div class="d-eyebrow">Step 3 of 5</div>
            <p class="d-step"><span class="d-s on">Pour in the chopped tomatoes and stock, then tip in the butter beans. Bring to a simmer.</span> <span class="d-s">Cook uncovered for <span class="d-chip">⏱︎ 18–20 mins</span>, stirring occasionally, until the sauce is thick enough to coat a spoon.</span></p>
          </div>
          <div class="d-need">
            <div class="d-eyebrow">You’ll need</div>
            <ul data-need><li><b>400g</b> tin chopped tomatoes</li><li><b>2</b> tins butter beans (400g each), drained</li><li><b>300ml</b> vegetable stock</li></ul>
            <p class="d-none" data-need hidden>Nothing new for this bit</p>
          </div>
        </div>
        <div class="d-foot"><div class="d-timers"><span class="d-timer" hidden><span>Step 3</span><span class="d-time">18:00</span><span class="d-cancel">✕</span></span></div><span class="d-hint">Space or tap → next · ← back · T timer · Esc close</span></div>
      </div>
    </figure>
  </div>
</div>

<main class="info wrap">
  <section class="block" id="setup">
    <h2>Set it up</h2>
    <div class="body">
      <ol class="steps">
        <li><strong>Show your bookmarks bar.</strong> Press <kbd>⌘</kbd> <kbd>Shift</kbd> <kbd>B</kbd> on a Mac, or <kbd>Ctrl</kbd> <kbd>Shift</kbd> <kbd>B</kbd> on Windows. This works in Chrome, Edge, Brave, Safari and Firefox.</li>
        <li><strong>Drag this button onto the bar.</strong><br><a class="bookmarklet" href="${href}" data-tip="tip">Kitchen Mode</a><p class="tip" id="tip" aria-live="polite"></p></li>
        <li><strong>Open a recipe and click Kitchen Mode on the bar.</strong> Click it again, or press <kbd>Esc</kbd>, to close it.</li>
      </ol>
      <details id="phone">
        <summary>Setting it up on a phone or tablet</summary>
        <div class="phone">
          <p>Phones don’t have a bookmarks bar, so you save Kitchen Mode as a bookmark and paste its code in yourself. You only do this once.</p>
          <p><button class="button small" type="button" id="copy">Copy the code</button></p>
          <div class="phone-cols">
            <div>
              <h3>iPhone and iPad (Safari)</h3>
              <ol>
                <li>Tap <strong>Copy the code</strong>.</li>
                <li>Bookmark this page: tap Share, then <strong>Add Bookmark</strong>. Name it Kitchen Mode.</li>
                <li>Open your bookmarks, tap <strong>Edit</strong>, then tap Kitchen Mode. Delete the address and paste the code in its place.</li>
                <li>On a recipe, open your bookmarks and tap Kitchen Mode.</li>
              </ol>
            </div>
            <div>
              <h3>Android (Chrome)</h3>
              <ol>
                <li>Tap <strong>Copy the code</strong>.</li>
                <li>Bookmark this page with the star in the ⋮ menu.</li>
                <li>Open your bookmarks and edit the new one. Name it Kitchen Mode and paste the code into the URL box.</li>
                <li>On a recipe, type Kitchen Mode in the address bar and tap the bookmark that appears.</li>
              </ol>
            </div>
          </div>
        </div>
      </details>
    </div>
  </section>

  <section class="block" id="sites">
    <h2>Which recipe sites work</h2>
    <div class="body">
      <p>Kitchen Mode doesn’t read the page you see. It reads the copy of the recipe that sites publish for Google, so ads, pop-ups and long introductions never get in the way.</p>
      <p><strong>A quick check:</strong> if a recipe shows a star rating or cooking time in Google results, Kitchen Mode will almost certainly work on it. Most food blogs work too, especially ones with a “Jump to recipe” button.</p>
      <h3>Tested and working</h3>
      <p>Each one opens a recipe you can try Kitchen Mode on.</p>
      <ul class="works">
        ${tested.map(([name, url]) => `<li><a href="${url}" target="_blank" rel="noopener">${name}</a></li>`).join('\n        ')}
      </ul>
      <h3>Won’t work</h3>
      <ul class="wont">
        <li>Recipes in videos, like YouTube, TikTok or Instagram</li>
        <li>Recipes shared as photos, screenshots or PDFs</li>
        <li>Sites that don’t publish their recipes for Google</li>
      </ul>
      <p class="note">If there’s no recipe to read, Kitchen Mode says so and leaves the page alone.</p>
    </div>
  </section>

  <section class="block" id="cooking">
    <h2>While you cook</h2>
    <div class="body">
      <dl class="keys">
        <dt>Next line</dt><dd><kbd>Space</kbd> or <kbd>→</kbd>, tap the right side, or swipe left</dd>
        <dt>Back</dt><dd><kbd>←</kbd>, tap the left side, or swipe right</dd>
        <dt>Start a timer</dt><dd>Tap a highlighted time like <span class="chip-sample">⏱︎ 5 mins</span>, or press <kbd>T</kbd></dd>
        <dt>Tick off ingredients</dt><dd>Tap them on the first screen</dd>
        <dt>Close</dt><dd><kbd>Esc</kbd>, or click Kitchen Mode on the bar again</dd>
      </dl>
      <p>Your screen stays on while Kitchen Mode is open. A Bluetooth page-turner pedal or presentation clicker works as the next button too, so your hands never have to touch the screen.</p>
    </div>
  </section>
</main>

<footer class="foot wrap">
  <p>Kitchen Mode is free and runs entirely in your browser. It reads the recipe on the page you’re on and doesn’t send anything anywhere.</p>
  <p>Bookmarks don’t update themselves. To get a newer version, drag the button onto your bar again and delete the old one.</p>
  ${HANDLE ? `<p>Made by ${handleLink}.</p>` : ''}
</footer>

<script>
var SAMPLE = ${JSON.stringify(sample)};

function runKitchenMode() {
${source.replace(/<\/script/gi, '<\\/script')}
}

function tryIt() {
  if (!document.getElementById('sample-recipe')) {
    var s = document.createElement('script');
    s.type = 'application/ld+json';
    s.id = 'sample-recipe';
    s.textContent = JSON.stringify(SAMPLE);
    document.head.append(s);
  }
  runKitchenMode();
}
document.querySelectorAll('[data-try]').forEach(function (b) { b.addEventListener('click', tryIt); });
if (location.hash === '#try') tryIt();

// The button only works from the bookmarks bar, so a click here explains how to drag it instead.
document.querySelectorAll('.bookmarklet').forEach(function (a) {
  a.addEventListener('click', function (e) {
    e.preventDefault();
    document.getElementById(a.dataset.tip).textContent =
      'Drag the button rather than clicking it: press and hold, then drop it on your bookmarks bar.';
  });
});

if (matchMedia('(pointer: coarse)').matches) document.getElementById('phone').open = true;

document.getElementById('copy').addEventListener('click', function () {
  var btn = this, code = document.querySelector('.bookmarklet').getAttribute('href');
  function done() {
    btn.textContent = 'Code copied';
    setTimeout(function () { btn.textContent = 'Copy the code'; }, 2500);
  }
  function fallback() {
    var t = document.createElement('textarea');
    t.value = code;
    t.setAttribute('readonly', '');
    t.style.cssText = 'position:fixed;opacity:0';
    document.body.append(t);
    t.select();
    try { if (document.execCommand('copy')) done(); } catch (e) {}
    t.remove();
  }
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(code).then(done, fallback);
  else fallback();
});

// The tablet in the hero plays through one step: next sentence, then a timer gets tapped.
(function () {
  var screen = document.querySelector('.screen');
  var beats = screen.querySelectorAll('.d-s');
  var needs = screen.querySelectorAll('[data-need]');
  var bar = screen.querySelector('[data-bar]');
  var chip = screen.querySelector('.d-chip');
  var timer = screen.querySelector('.d-timer');
  var time = screen.querySelector('.d-time');
  var clock = function (s) { return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  var show = function (n) {
    beats.forEach(function (el, i) { el.className = 'd-s' + (i === n ? ' on' : i < n ? ' past' : ''); });
    needs.forEach(function (el, i) { el.hidden = i !== n; });
    bar.style.width = (n + 1) * 50 + '%';
  };
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    show(1);
    chip.classList.add('started');
    time.textContent = '17:42';
    timer.hidden = false;
    return;
  }
  var tickId;
  var loop = function () {
    clearInterval(tickId);
    show(0);
    chip.classList.remove('started');
    timer.hidden = true;
    setTimeout(function () { show(1); }, 3200);
    setTimeout(function () {
      var started = Date.now();
      chip.classList.add('started');
      time.textContent = clock(1080);
      timer.hidden = false;
      tickId = setInterval(function () { time.textContent = clock(1080 - Math.floor((Date.now() - started) / 1000)); }, 250);
    }, 4800);
    setTimeout(loop, 11000);
  };
  loop();
})();
</script>
</body>
</html>
`;

writeFileSync(new URL('./index.html', import.meta.url), page);
console.log(`index.html written (bookmarklet ${(href.length / 1024).toFixed(1)} KB, page ${(page.length / 1024).toFixed(1)} KB)`);

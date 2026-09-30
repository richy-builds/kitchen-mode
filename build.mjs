// Builds index.html: the Kitchen Mode landing page, with the button to drag onto the bookmarks bar,
// and km.js: the same code as a file, which the bookmark loads.
// `node build.mjs --check` writes nothing and fails if the committed files don't match the source.
import { readFileSync, writeFileSync } from 'node:fs';
import { tested, testedOn, featured, proof } from './sites.mjs';

const check = process.argv.includes('--check');
const read = file => { try { return readFileSync(new URL(file, import.meta.url), 'utf8'); } catch { return ''; } };
// The build date goes out with every open's count. --check reuses the committed one, so it passes on any day.
const BUILD = check ? read('./km.js').match(/build: '([\d-]+)'/)?.[1] ?? '' : new Date().toISOString().slice(0, 10);

// Your X handle without the @. Leave empty to keep the credit off the page.
const HANDLE = 'richyjudge';
// Where the page is deployed. Link previews on X need the full address of og.png.
const SITE_URL = 'https://kitchen-mode.vercel.app';
const REPO_URL = 'https://github.com/richy-builds/kitchen-mode';
// PostHog project (EU) for the anonymous usage counts. The key is public by design: it can send events, not read them.
const POSTHOG_KEY = 'phc_lEkG3kWAIlChPY70oaG1aeEIi3ucUwYV42Cpvficcl0';
// Counts go through this site (see vercel.json), so ad blockers that block posthog.com let them through.
const COUNT_URL = SITE_URL + '/relay/i/v0/e/';

const source = readFileSync(new URL('./kitchen-mode.js', import.meta.url), 'utf8')
  .replace('%COUNT_URL%', COUNT_URL)
  .replace('%POSTHOG_KEY%', POSTHOG_KEY)
  .replace('%BUILD%', BUILD)
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n')
  .map(line => line.trim())
  .filter(line => line && !line.startsWith('//'))
  .join('\n')
  // A script served without a charset is read in the page's own encoding, which isn't always UTF-8, and one mangled
  // "½" stops the whole file parsing. So km.js is written as ASCII, with anything else as a \u escape.
  .replace(/[^\x00-\x7f]/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
// The comment stripping above is plain text matching, so a "/*" or "//" inside a string or regex would cut code out.
// Every bookmark runs km.js as soon as it's pushed, so refuse to write one that doesn't parse.
try { new Function(source); } catch (e) {
  console.error(`km.js would not parse after stripping comments: ${e.message}`);
  process.exit(1);
}

// The bookmark, on computers and phones alike, is a short loader for km.js (the same code) from this site, so
// everyone runs the current build. Pasting 34 KB of code into a phone bookmark didn't survive, and a short one can be
// read back to check it. ES5 and no % or #, so it pastes and runs as written. If the site blocks the script, it says so.
const loader = `javascript:(function(){var s=document.createElement('script');s.src='${SITE_URL}/km.js';` +
  `s.onerror=function(){alert('Kitchen Mode could not load on this page.')};document.documentElement.appendChild(s)})()`;

// Picture for the sample recipe: a bowl of stew on a cream tablecloth, in the page's colours.
const bowl = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
<rect width="400" height="300" fill="#f3ecdf"/>
<path d="M0 75H400M0 150H400M0 225H400M75 0V300M150 0V300M225 0V300M300 0V300M375 0V300" stroke="#e6dccb" stroke-width="3"/>
<circle cx="204" cy="160" r="118" fill="#1f1a14" opacity=".14"/>
<circle cx="198" cy="150" r="116" fill="#ffffff"/>
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
<path d="M318 228 A58 58 0 0 1 256 268 Z" fill="#ffb020"/>
<path d="M312 232 A50 50 0 0 1 262 262" fill="none" stroke="#ffd98a" stroke-width="5"/>
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
    'Crusty bread or cooked rice, to serve',
  ],
  recipeInstructions: [
    'Heat the oil in a large, deep pan over a medium heat. Add the onion with a pinch of salt and cook for 8–10 mins, stirring now and then, until soft and golden.',
    'Stir in the garlic and paprika and cook for 1 min until fragrant. Add the purée and cook for 1 min more.',
    'Pour in the chopped tomatoes and stock, then tip in the butter beans. Bring to a simmer. Cook uncovered for 18–20 mins, stirring occasionally, until the sauce is thick enough to coat a spoon.',
    'Stir the spinach through for 2 mins until wilted. Squeeze in the juice of half the lemon, taste, and season with salt and pepper.',
    'Ladle into bowls and cut the rest of the lemon into wedges. Serve with crusty bread for mopping up the sauce.',
  ].map(text => ({ '@type': 'HowToStep', text })),
};

const menuItem = ([name, url]) =>
  `<li><a href="${url}" target="_blank" rel="noopener"><span>${name}</span><i></i>${icon(TICK, 18, 2.8)}</a></li>`;

const handleLink = HANDLE ? `<a href="https://x.com/${HANDLE}">@${HANDLE}</a>` : '';
const description = 'A free browser button for recipe pages. No clutter: each step a sentence at a time, big enough to read from across the kitchen, with timers you start with a tap.';

// Line icons, drawn in currentColor.
const icon = (paths, size, width = 2.4, extra = '') =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${extra}>${paths}</svg>`;
const PAN = '<circle cx="9.5" cy="12" r="7.5"/><path d="M17 12h6"/><circle cx="9.5" cy="12" r="2.4" fill="currentColor" stroke="none"/>';
const favicon = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#d92d20"/>' +
  `<g fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" transform="translate(2 2.4) scale(.8)">${PAN.replace('currentColor', '#fff')}</g></svg>`);
const CLOCK = '<circle cx="12" cy="13.5" r="8"/><path d="M12 9.5v4l2.5 2M9.5 2.5h5"/>';
const TICK = '<path d="M4.5 12.5l5 5 10-11"/>';
const CROSS = '<path d="M6 6l12 12M18 6L6 18"/>';
const UP = '<path d="M12 20V5M5.5 11.5L12 5l6.5 6.5"/>';
const pan = size => icon(PAN, size, 2.2);

// Shapes the stylesheet paints in currentColor through a mask, so no icon ends up in a link's text.
const maskUrl = svg => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" ${svg}</svg>`)}")`;
const panMask = maskUrl(`viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2.2" stroke-linecap="round">${PAN.replace('currentColor', '#000')}`);
const gripMask = maskUrl('viewBox="0 0 12 22" fill="#000"><circle cx="3" cy="4" r="1.8"/><circle cx="9" cy="4" r="1.8"/><circle cx="3" cy="11" r="1.8"/><circle cx="9" cy="11" r="1.8"/><circle cx="3" cy="18" r="1.8"/><circle cx="9" cy="18" r="1.8"/>');
const plusMask = maskUrl('viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/>');
const minusMask = maskUrl('viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2.4" stroke-linecap="round"><path d="M5 12h14"/>');
const cursor = `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 18"><path d="M1 1l11 10.5-4.6.4 2.6 5.3-2 .9-2.6-5.3L1 16z" fill="#1f1a14" stroke="#fff" stroke-width="1"/></svg>')}")`;

// The setup drawing: a browser with the ticket being dragged up to its bookmarks bar, while the banner shows.
const drawing = `<svg viewBox="0 0 760 560" aria-hidden="true">
  <defs>
    <linearGradient id="km-bar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="d-bar-top"/><stop offset="1" class="d-bar-bottom"/></linearGradient>
    <filter id="km-lift" x="-30%" y="-40%" width="160%" height="220%"><feDropShadow dx="0" dy="14" stdDeviation="10" flood-color="#000" flood-opacity=".4"/></filter>
  </defs>
  <rect width="760" height="46" class="d-chrome"/>
  <circle cx="21" cy="23" r="5" class="d-dot"/><circle cx="39" cy="23" r="5" class="d-dot"/><circle cx="57" cy="23" r="5" class="d-dot"/>
  <rect x="76" y="11" width="668" height="24" rx="12" class="d-field"/>
  <text x="90" y="27.5" class="d-url">kitchen-mode.vercel.app</text>
  <rect y="46" width="760" height="44" fill="url(#km-bar)"/>
  <path d="M0 46.5H760" class="d-line-top"/><path d="M0 89.5H760" class="d-line"/>
  <g class="d-items">
    <circle cx="22" cy="68" r="6"/><text x="34" y="72.5">Work</text>
    <circle cx="96" cy="68" r="6"/><text x="108" y="72.5">Bills</text>
    <circle cx="166" cy="68" r="6"/><text x="178" y="72.5">Recipes</text>
  </g>
  <rect x="296" y="52" width="140" height="30" rx="7" class="d-slot"/>
  <g class="d-slot-mark" transform="translate(311 60) scale(.583)">${PAN}</g>
  <text x="329" y="72" class="d-slot-text">Kitchen Mode</text>
  <text x="462" y="71.5" class="d-note">← YOUR BOOKMARKS BAR</text>
  <rect y="90" width="760" height="50" class="d-banner"/>
  <g class="d-arrow" transform="translate(126 105) scale(.833)">${UP}</g>
  <g class="d-arrow" transform="translate(614 105) scale(.833)">${UP}</g>
  <text x="380" y="121" text-anchor="middle" class="d-banner-text">Drop it on your bookmarks bar, just above this page</text>
  <rect x="48" y="178" width="380" height="30" rx="4" class="d-skel-strong"/>
  <rect x="48" y="218" width="300" height="30" rx="4" class="d-skel-strong"/>
  <rect x="48" y="268" width="420" height="10" rx="5" class="d-skel"/>
  <rect x="48" y="288" width="390" height="10" rx="5" class="d-skel"/>
  <rect x="48" y="308" width="260" height="10" rx="5" class="d-skel"/>
  <rect x="510" y="178" width="210" height="250" rx="12" class="d-skel-strong"/>
  <rect x="48" y="340" width="200" height="52" rx="9" class="d-ghost"/>
  <text x="148" y="371.5" text-anchor="middle" class="d-ghost-text">Kitchen Mode</text>
  <path d="M148 336C170 240 300 200 362 88" class="d-path"/>
  <path d="M348 96L362 88L362 104" class="d-path-head"/>
  <g transform="rotate(-5 240 218)" filter="url(#km-lift)">
    <rect x="130" y="193" width="220" height="50" rx="9" class="d-drag"/>
    <g class="d-drag-ink">
      <circle cx="145" cy="210" r="1.6"/><circle cx="151" cy="210" r="1.6"/><circle cx="145" cy="218" r="1.6"/><circle cx="151" cy="218" r="1.6"/><circle cx="145" cy="226" r="1.6"/><circle cx="151" cy="226" r="1.6"/>
    </g>
    <path d="M163 193V243" class="d-tear"/>
    <g class="d-drag-mark" transform="translate(177 209) scale(.75)">${PAN}</g>
    <text x="203" y="224" class="d-drag-text">Kitchen Mode</text>
  </g>
  <path d="M341 240l15.7 15-6.6.6 3.7 7.6-2.9 1.3-3.7-7.6-6.2 5z" class="d-cursor"/>
</svg>`;

const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Kitchen Mode: any recipe page, one big step at a time</title>
<meta name="description" content="${description}">
<meta property="og:type" content="website">
<meta property="og:title" content="Kitchen Mode: any recipe page, one big step at a time">
<meta property="og:description" content="${description}">
${SITE_URL ? `<meta property="og:url" content="${SITE_URL}/">
<meta property="og:image" content="${SITE_URL}/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Kitchen Mode: a recipe step on an order ticket, clipped to a steel rail, with the ingredients that step needs.">
<meta name="twitter:card" content="summary_large_image">` : '<meta name="twitter:card" content="summary">'}
${HANDLE ? `<meta name="twitter:creator" content="@${HANDLE}">` : ''}
<meta name="theme-color" content="#fbf7f0" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#15120e" media="(prefers-color-scheme: dark)">
<link rel="icon" href="${favicon}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..100,800&family=Atkinson+Hyperlegible+Next:wght@400;700;800&family=IBM+Plex+Mono:wght@400;600;700&display=swap">
<style>
  /* The pass: each recipe step is an order ticket clipped to a steel rail, and the bookmarks bar is the rail. */
  :root {
    color-scheme: light dark;
    --ground: #fbf7f0; --band: #f3ecdf; --rule: #e6dccb; --rule-strong: #d6c8b2; --ticket: #fff;
    --ink: #1f1a14; --muted: #6b5f52; --link: #b42318;
    --accent: #d92d20; --on-accent: #fff; --accent-deep: #821b13;
    --amber: #ffb020; --on-amber: #1f1a14; --amber-tint: #ffe9b8;
    --espresso: #1f1a14; --on-espresso: #f5eee4; --espresso-soft: #c4b8a8;
    --tag: #1f1a14; --on-tag: #fbf7f0;
    /* Steel is the only cool colour */
    --steel: linear-gradient(#fbfbfc, #a9aeb3 55%, #d5d8db); --post: #8a8f95; --clip: linear-gradient(#63686e, #2b2e32);
    --bar-top: #fbfbfc; --bar-bottom: #c3c7cb; --bar-ink: #3d4045; --bar-line: #9ea3a8; --slot: rgb(255 255 255 / .7);
    --shadow: rgb(52 36 20 / .3);
    --display: "Archivo", "Arial Narrow", sans-serif;
    --mono: "IBM Plex Mono", ui-monospace, Menlo, monospace;
    --body: "Atkinson Hyperlegible Next", "Atkinson Hyperlegible", system-ui, sans-serif;
    --gutter: clamp(16px, 5.5vw, 80px);
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --ground: #15120e; --band: #1c1712; --rule: #352c23; --rule-strong: #4a3f33; --ticket: #2a231c;
      --ink: #f5eee4; --muted: #a3978a; --link: #ff8a7a;
      --accent: #ff7a6b; --on-accent: #15120e; --accent-deep: #99493f;
      --amber-tint: #4a3510;
      --espresso: #0b0907; --espresso-soft: #b3a797;
      --tag: #f5eee4; --on-tag: #15120e;
      --steel: linear-gradient(#c6cacf, #6e747a 55%, #959a9f); --post: #5f646a; --clip: linear-gradient(#a3a8ae, #4a4e53);
      --bar-top: #3a3f44; --bar-bottom: #26292d; --bar-ink: #d5d8db; --bar-line: #6e747a; --slot: rgb(0 0 0 / .3);
      --shadow: rgb(0 0 0 / .6);
    }
  }
  * { box-sizing: border-box; }
  [hidden] { display: none !important; }
  body { margin: 0; background: var(--ground); color: var(--ink); font: 400 18px/1.6 var(--body); -webkit-font-smoothing: antialiased; }
  a { color: var(--link); text-underline-offset: .18em; text-decoration-thickness: 1px; }
  a:hover { text-decoration-thickness: 2px; }
  :focus-visible { outline: 3px solid var(--accent); outline-offset: 3px; }
  .wrap { width: min(100% - 2 * var(--gutter), 1280px); margin-inline: auto; }
  .vh { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
  h1, h2, .features h3 { font-family: var(--display); font-weight: 800; font-stretch: 72%; text-transform: uppercase; }
  .combo { white-space: nowrap; }
  kbd { font: 600 13px/1.4 var(--mono); background: var(--ticket); border: 1px solid var(--rule-strong); border-bottom-width: 3px; border-radius: 6px; padding: 1px 7px; white-space: nowrap; }
  @media (pointer: coarse) { .for-mouse { display: none !important; } }
  @media not all and (pointer: coarse) { .for-touch { display: none !important; } }

  .top { display: flex; align-items: center; justify-content: space-between; gap: 16px; min-height: 88px; }
  .brand { display: inline-flex; align-items: center; gap: 10px; color: var(--ink); text-decoration: none; font: 600 17px/1 var(--mono); letter-spacing: .06em; text-transform: uppercase; white-space: nowrap; }
  .top nav { display: flex; gap: 32px; font: 400 14px/1 var(--mono); letter-spacing: .06em; text-transform: uppercase; }
  .top nav a { display: inline-flex; align-items: center; min-height: 44px; color: var(--ink); text-decoration: none; }
  .top nav a:hover { text-decoration: underline; }

  /* "Order 001": a label chip and a line of mono above each big heading */
  .kicker { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 14px; margin: 0; font: 400 14px/26px var(--mono); letter-spacing: .12em; text-transform: uppercase; color: var(--muted); }
  .tag { padding: 0 9px; background: var(--tag); color: var(--on-tag); }
  .kicker .short { display: none; }

  /* Hero: the copy on the left, the rail with tickets hanging from it on the right */
  .hero { display: grid; grid-template-columns: minmax(0, 1fr); }
  .hero-copy { container-type: inline-size; padding-top: 8px; }
  /* Sized to the column, and capped by the window's height so the button stays above the fold on a laptop */
  h1 { margin: 22px 0 0; font-size: clamp(40px, min(17.4cqi, 14vh), 118px); line-height: .86; letter-spacing: -.01em; }
  h1 em { font-style: normal; color: var(--accent); }
  .works { margin: 26px 0 0; max-width: 560px; font-size: 16px; line-height: 1.5; color: var(--muted); text-wrap: pretty; }
  .works b { color: var(--ink); }
  .works a { white-space: nowrap; }
  .lede { margin: 26px 0 0; max-width: 580px; font-size: clamp(18px, 1rem + .35vw, 21px); line-height: 1.5; text-wrap: pretty; }
  .actions { display: flex; flex-wrap: wrap; align-items: center; gap: 16px; margin-top: 30px; }
  .button { display: inline-flex; align-items: center; justify-content: center; gap: 12px; min-height: 66px; padding: 0 26px; border: 2px solid var(--ink); border-radius: 10px; background: transparent; color: var(--ink); font: 700 18px/1.2 var(--body); text-decoration: none; cursor: pointer; }
  .button:hover { background: color-mix(in srgb, var(--ink) 7%, transparent); }
  .button.small { min-height: 48px; padding: 0 18px; font-size: 16px; }

  /* The install button is a ticket: grip dots, a tear line, then the pan. All three are drawn by CSS
     so the dragged bookmark is named plain "Kitchen Mode" (Chrome adds its own globe icon). */
  .bookmarklet { --tear: color-mix(in srgb, var(--on-accent) 55%, transparent); display: inline-flex; align-items: center; height: 66px; padding-right: 26px; border-radius: 10px; background: repeating-linear-gradient(var(--tear) 0 6px, transparent 6px 12px) 42px 0 / 2px 100% no-repeat, var(--accent); color: var(--on-accent); font: 800 21px/1 var(--body); text-decoration: none; white-space: nowrap; box-shadow: 0 4px 0 var(--accent-deep); cursor: grab; }
  .bookmarklet::before, .bookmarklet::after { content: ""; flex: none; background: currentColor; -webkit-mask: var(--shape) center / contain no-repeat; mask: var(--shape) center / contain no-repeat; }
  .bookmarklet::before { --shape: ${gripMask}; order: -2; width: 12px; height: 22px; margin: 0 16px; }
  .bookmarklet::after { --shape: ${panMask}; order: -1; width: 24px; height: 24px; margin: 0 10px 0 18px; }
  .bookmarklet.compact { height: 60px; padding-right: 24px; font-size: 19px; }
  .bookmarklet.compact::after { width: 22px; height: 22px; margin-left: 16px; }
  .bookmarklet:active { cursor: grabbing; }

  /* Install hint: a tiny browser whose bookmarks bar the ticket lands in, so the drag reads at a glance */
  .install { display: flex; flex-wrap: wrap; align-items: center; gap: 16px 22px; margin-top: 24px; }
  .install p { flex: 1 1 16em; max-width: 390px; margin: 0; font-size: 17px; line-height: 1.5; }
  .mini { flex: none; position: relative; width: 250px; border-radius: 12px; background: var(--ticket); border: 1px solid var(--rule-strong); box-shadow: 0 12px 24px -16px var(--shadow); overflow: hidden; font: 800 11px/1 var(--body); }
  .mini-top { display: flex; align-items: center; gap: 5px; padding: 9px 10px; }
  .mini-top i { width: 7px; height: 7px; border-radius: 50%; background: var(--rule-strong); }
  .mini-top b { flex: 1; height: 12px; margin-left: 6px; border-radius: 6px; background: var(--band); }
  .mini-bar { display: flex; align-items: center; gap: 6px; padding: 6px 10px 8px; background: linear-gradient(var(--bar-top), var(--bar-bottom)); border-top: 1px solid var(--rule); border-bottom: 1px solid var(--bar-line); color: var(--bar-ink); }
  .mini-bar > i { width: 30px; height: 8px; border-radius: 4px; background: color-mix(in srgb, var(--bar-ink) 22%, transparent); }
  .mini-slot { position: relative; margin-left: 2px; padding: 4px 7px; border-radius: 6px; border: 1.5px dashed var(--accent); white-space: nowrap; }
  .mini-label { opacity: 0; }
  .mini-page { height: 44px; background: var(--band); }
  .mini-drag { position: absolute; inset: -1.5px; display: grid; place-items: center; border-radius: 6px; background: var(--accent); color: var(--on-accent); white-space: nowrap; transform: translate(-70px, 46px); }
  .mini-drag::after { content: ""; position: absolute; right: -8px; bottom: -14px; width: 14px; height: 18px; background: ${cursor} center / contain no-repeat; }
  @media (prefers-reduced-motion: no-preference) {
    .mini-drag { animation: mini-drag 4.2s ease-in-out infinite; }
    .mini-label { animation: mini-land 4.2s ease-in-out infinite; }
    .mini-slot { animation: mini-slot 4.2s ease-in-out infinite; }
  }
  @media (prefers-reduced-motion: reduce) {
    .mini-drag { display: none; }
    .mini-label { opacity: 1; }
    .mini-slot { border-color: transparent; }
  }
  @keyframes mini-drag {
    0%, 12% { transform: translate(-70px, 46px); opacity: 1; }
    48% { transform: translate(0, 0); opacity: 1; }
    58%, 100% { transform: translate(0, 0); opacity: 0; }
  }
  @keyframes mini-land { 0%, 50% { opacity: 0; } 58%, 90% { opacity: 1; } 100% { opacity: 0; } }
  @keyframes mini-slot { 0%, 50%, 100% { border-color: var(--accent); } 58%, 90% { border-color: transparent; } }

  /* Shown while the button is being dragged: the bookmarks bar is just above the page */
  .drop-cue { position: fixed; inset: 0 0 auto; z-index: 10; display: flex; justify-content: center; align-items: center; gap: 12px; padding: 14px 16px; background: var(--espresso); color: var(--on-espresso); font: 800 19px/1.3 var(--body); text-align: center; box-shadow: 0 10px 30px -10px rgb(0 0 0 / .5); pointer-events: none; }
  .drop-cue svg { flex: none; color: var(--amber); }
  @media (prefers-reduced-motion: no-preference) { .drop-cue svg { animation: drop-cue .9s ease-in-out infinite alternate; } }
  @keyframes drop-cue { to { transform: translateY(-6px); } }
  .tip { margin: 12px 0 0; color: var(--link); font-size: 16px; }
  .tip:empty { display: none; }
  .phone-note { max-width: 420px; margin: 12px 0 0; font: 400 12px/17px var(--mono); letter-spacing: .04em; color: var(--muted); }

  /* The rail and its tickets */
  .pass { --rail-top: 14px; container-type: inline-size; position: relative; margin: 44px calc(-1 * var(--gutter)) 0; padding: calc(var(--rail-top) + 6px) 0 56px; }
  .post { position: absolute; top: calc(var(--rail-top) - 10px); left: 6px; width: 10px; height: 34px; border-radius: 3px; background: var(--post); }
  .post + .post { left: auto; right: 6px; }
  .rail { position: absolute; left: 0; right: 0; top: var(--rail-top); height: 14px; border-radius: 7px; background: var(--steel); box-shadow: 0 3px 6px rgb(0 0 0 / .25); }
  .ticket { position: relative; padding-top: 12px; color: var(--ink); filter: drop-shadow(0 18px 22px var(--shadow)); }
  .ticket::before { content: ""; position: absolute; top: 0; left: 50%; z-index: 1; width: 56px; height: 22px; margin-left: -28px; border-radius: 4px; background: var(--clip); }
  .t-body { position: relative; padding: 1.625em 1.625em 2.5em; background: var(--ticket); -webkit-mask: conic-gradient(from -45deg at bottom, #0000, #000 1deg 89deg, #0000 90deg) 50% / 18px 100%; mask: conic-gradient(from -45deg at bottom, #0000, #000 1deg 89deg, #0000 90deg) 50% / 18px 100%; }
  .t-head { display: flex; justify-content: space-between; gap: .75em; font: 400 .75em/1.333 var(--mono); letter-spacing: .06em; text-transform: uppercase; color: var(--muted); }
  .t-rule { margin: .875em 0; border: 0; border-top: 2px dashed var(--rule-strong); }
  .t-eyebrow { margin-bottom: .77em; font: 700 .8125em/1.23 var(--mono); letter-spacing: .1em; text-transform: uppercase; color: var(--accent); }
  .t-step { margin: 0; font-size: 2em; line-height: 1.1; font-weight: 800; letter-spacing: -.01em; text-wrap: pretty; }
  .t-s { opacity: .5; transition: opacity .35s; }
  .t-s.on { opacity: 1; }
  .t-chip { padding: 0 .28em; border-radius: .3em; background: var(--amber-tint); white-space: nowrap; transition: background-color .2s, color .2s; }
  .t-chip.started { background: var(--amber); color: var(--on-amber); }
  .t-label { margin-bottom: .833em; font: 400 .75em/1.333 var(--mono); letter-spacing: .1em; text-transform: uppercase; color: var(--muted); }
  .t-needs { display: grid; }
  .t-needs > * { grid-area: 1 / 1; margin: 0; opacity: 0; visibility: hidden; transition: opacity .35s, visibility .35s; }
  .t-needs > .on { opacity: 1; visibility: visible; }
  .t-need { list-style: none; padding: 0; display: flex; flex-direction: column; gap: .333em; font-size: 1.125em; line-height: 1.444; }
  .t-need li { display: flex; gap: .667em; }
  .t-need b { flex: none; width: 4.5em; font: 700 .889em/1.625 var(--mono); }
  .t-none { font-size: 1.125em; line-height: 1.444; color: var(--muted); }
  .t-foot { display: flex; align-items: center; gap: .75em; min-height: 2.25em; }
  .t-timer { display: inline-flex; align-items: center; gap: .533em; padding: .533em .8em; border-radius: .4em; background: var(--amber); color: var(--on-amber); font: 700 .9375em/1.333 var(--mono); font-variant-numeric: tabular-nums; }
  .t-timer svg { width: 1.2em; height: 1.2em; }
  .t-on { margin-left: auto; font: 400 .75em/1.333 var(--mono); letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }
  .ticket-live { --tw: min(430px, 100cqi - 2 * var(--gutter) - 8px); width: var(--tw); margin-left: var(--gutter); font-size: clamp(12px, var(--tw) * 16 / 430, 16px); transform: rotate(1deg); transform-origin: 50% 0; }
  .ticket-done { position: absolute; top: calc(var(--rail-top) - 4px); left: calc(var(--gutter) + 20px); width: 236px; transform: rotate(-3.5deg); transform-origin: 50% 0; }
  .ticket-done .t-body { padding: 26px 20px 40px; }
  .t-done { margin: 0; font-size: 22px; line-height: 1.2; font-weight: 800; color: var(--muted); text-decoration: line-through 2px; }
  .t-stamp { position: absolute; left: 22px; bottom: 46px; padding: 2px 10px; border: 3px solid var(--accent); border-radius: 4px; color: var(--accent); font: 700 18px/1.3 var(--mono); letter-spacing: .1em; transform: rotate(-12deg); }
  @media (prefers-reduced-motion: reduce) { .t-s, .t-needs > *, .t-chip { transition: none; } }

  /* What it does, on an espresso band */
  .features { background: var(--espresso); color: var(--on-espresso); }
  .features ol { list-style: none; margin: 0 auto; padding-block: clamp(48px, 5vw, 64px); display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 40px 48px; }
  .num { font: 700 14px/1 var(--mono); letter-spacing: .1em; color: var(--amber); }
  .features h3 { margin: 14px 0 12px; font-size: 34px; line-height: .95; }
  .features p { margin: 0; font-size: 17px; line-height: 1.5; color: var(--espresso-soft); }

  /* Sections: a column of copy beside a picture or tickets */
  .section { padding-block: clamp(64px, 8vw, 110px); }
  .band { background: var(--band); }
  .split { display: grid; grid-template-columns: minmax(0, 440px) minmax(0, 760px); justify-content: space-between; align-items: start; gap: 56px 80px; }
  h2 { margin: 22px 0 0; font-size: clamp(48px, 5.9vw, 84px); line-height: .9; }
  .section-lede { margin: 18px 0 0; font-size: 19px; line-height: 1.5; }
  .copy p { margin: 18px 0 0; font-size: 19px; line-height: 1.5; }
  .copy .note { margin-top: 22px; font-size: 16px; color: var(--muted); }

  .steps { list-style: none; margin: 30px 0 0; padding: 0; display: flex; flex-direction: column; gap: 20px; counter-reset: step; }
  .steps > li { display: flex; gap: 16px; font-size: 18px; line-height: 1.5; counter-increment: step; }
  .steps > li::before { content: counter(step); flex: none; width: 40px; font: 800 44px/.9 var(--display); font-stretch: 72%; color: var(--accent); }
  .steps .bookmarklet { margin-top: 12px; }

  details { margin-top: 28px; scroll-margin-top: 120px; }
  summary { display: flex; justify-content: space-between; align-items: center; gap: 12px; min-height: 60px; padding: 10px 22px; border: 2px solid var(--ink); border-radius: 10px; font-size: 17px; font-weight: 700; line-height: 1.3; cursor: pointer; list-style: none; }
  summary:hover { background: color-mix(in srgb, var(--ink) 7%, transparent); }
  summary::-webkit-details-marker { display: none; }
  summary::after { content: ""; flex: none; width: 22px; height: 22px; background: currentColor; -webkit-mask: ${plusMask} center / contain no-repeat; mask: ${plusMask} center / contain no-repeat; }
  details[open] summary::after { -webkit-mask-image: ${minusMask}; mask-image: ${minusMask}; }
  .phone { padding-top: 20px; font-size: 17px; }
  .phone > p { margin: 0 0 16px; }
  .phone h3 { margin: 18px 0 8px; font-size: 18px; }
  .phone ol { margin: 0; padding-left: 1.3em; }
  .phone li { margin-bottom: 8px; }
  .phone code, .test-cue code { font: 600 .9em var(--mono); }
  /* Screenshot of Chrome's address bar (Pixel emulator, Chrome 145), with a ring around the row to tap */
  .phone .shot { position: relative; max-width: 360px; margin: 12px 0 20px; }
  .phone .shot img { display: block; width: 100%; height: auto; border: 1px solid var(--rule-strong); border-radius: 12px; }
  .phone .shot .ring { position: absolute; inset: 71% 0.5% 1% 0.5%; border: 3px solid var(--accent); border-radius: 14px; }
  /* The whole phone bookmark, so people can check what they pasted, or copy it by hand if the button can't */
  .phone pre { margin: 0 0 16px; padding: 12px 14px; background: var(--ticket); border: 1px solid var(--rule-strong); border-radius: 10px; font: 400 13px/1.5 var(--mono); white-space: pre-wrap; word-break: break-all; user-select: all; -webkit-user-select: all; }

  /* Shown on the test recipe (#test): what to do next, then that it worked */
  .test-cue { position: fixed; inset: 0 0 auto; z-index: 10; padding: 14px 16px; background: var(--espresso); color: var(--on-espresso); font: 700 18px/1.4 var(--body); text-align: center; box-shadow: 0 10px 30px -10px rgb(0 0 0 / .5); }
  .test-cue a { color: var(--amber); }
  .test-cue .done { color: var(--amber); }

  .drawing { margin: 0; }
  .frame { overflow: hidden; border: 1px solid var(--rule-strong); border-radius: 16px; background: var(--ground); box-shadow: 0 30px 60px -30px var(--shadow); }
  .frame svg { display: block; width: 100%; height: auto; }
  .drawing figcaption { margin-top: 18px; font: 400 13px/1.5 var(--mono); letter-spacing: .06em; text-transform: uppercase; color: var(--muted); }
  .d-chrome { fill: var(--ticket); }
  .d-dot { fill: var(--rule-strong); }
  .d-field { fill: var(--band); }
  .d-url { fill: var(--muted); font: 400 12px var(--mono); }
  .d-bar-top { stop-color: var(--bar-top); }
  .d-bar-bottom { stop-color: var(--bar-bottom); }
  .d-line-top { stroke: var(--rule); }
  .d-line { stroke: var(--bar-line); }
  .d-items { fill: var(--bar-ink); font: 700 13px var(--body); }
  .d-items circle { fill: var(--bar-line); }
  .d-slot { fill: var(--slot); stroke: var(--accent); stroke-width: 2; stroke-dasharray: 6 4; }
  .d-slot-mark { fill: none; stroke: var(--link); stroke-width: 2.6; stroke-linecap: round; }
  .d-slot-mark circle:last-child { fill: var(--link); stroke: none; }
  .d-slot-text { fill: var(--link); font: 800 13px var(--body); }
  .d-note { fill: var(--bar-ink); font: 400 11px var(--mono); letter-spacing: .08em; }
  .d-banner { fill: var(--espresso); }
  .d-banner-text { fill: var(--on-espresso); font: 800 17px var(--body); }
  .d-arrow { fill: none; stroke: var(--amber); stroke-width: 2.8; stroke-linecap: round; stroke-linejoin: round; }
  .d-skel { fill: var(--rule); }
  .d-skel-strong { fill: var(--rule-strong); opacity: .7; }
  .d-ghost { fill: none; stroke: var(--accent); stroke-width: 2; stroke-dasharray: 6 4; opacity: .6; }
  .d-ghost-text { fill: var(--muted); font: 800 16px var(--body); }
  .d-path, .d-path-head { fill: none; stroke: var(--accent); stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
  .d-path { stroke-dasharray: 9 8; }
  .d-drag { fill: var(--accent); }
  .d-drag-ink { fill: var(--on-accent); }
  .d-tear { stroke: var(--on-accent); stroke-opacity: .55; stroke-width: 2; stroke-dasharray: 6 6; }
  .d-drag-mark { fill: none; stroke: var(--on-accent); stroke-width: 2.4; stroke-linecap: round; }
  .d-drag-mark circle:last-child { fill: var(--on-accent); stroke: none; }
  .d-drag-text { fill: var(--on-accent); font: 800 17px var(--body); }
  .d-cursor { fill: #1f1a14; stroke: #fff; stroke-width: 1.2; }

  /* Which sites work: two tickets on the band */
  .menu-tickets { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 44px 32px; padding-top: 10px; }
  .menu-tickets .ticket { font-size: 16px; }
  .ticket-menu { width: min(420px, 100%); transform: rotate(-1deg); }
  .ticket-wont { width: min(308px, 100%); margin-top: 18px; transform: rotate(1.8deg); }
  .menu { list-style: none; margin: -8px 0 0; padding: 0; }
  .menu a { display: flex; align-items: center; gap: 10px; min-height: 38px; color: var(--ink); font-size: 18px; font-weight: 700; text-decoration: none; }
  .menu a i { flex: 1; margin-top: 8px; border-bottom: 2px dotted var(--rule-strong); }
  .menu a svg { flex: none; color: var(--accent); }
  .menu a:hover span { color: var(--link); text-decoration: underline; }
  .menu-more { margin: 0; }
  .menu-more summary { justify-content: flex-start; gap: 10px; min-height: 38px; padding: 0; border: 0; border-radius: 0; font-size: 18px; }
  .menu-more summary:hover { background: none; }
  .menu-more summary:hover span { color: var(--link); text-decoration: underline; }
  .menu-more summary i { flex: 1; margin-top: 8px; border-bottom: 2px dotted var(--rule-strong); }
  .menu-more summary::after { width: 18px; height: 18px; color: var(--accent); }
  .menu-more .menu { margin: 0; }
  .t-note { margin-top: 10px; font: 400 12px/16px var(--mono); letter-spacing: .06em; text-transform: uppercase; color: var(--muted); }
  .wont { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 16px; font-size: 17px; line-height: 1.4; }
  .wont li { display: flex; gap: 10px; }
  .wont svg { flex: none; margin-top: 3px; color: var(--accent); }

  /* While you cook: the controls on a ticket */
  .ticket-keys { width: min(640px, 100%); font-size: 16px; transform: rotate(-.6deg); }
  .keys { display: grid; grid-template-columns: minmax(0, 11em) minmax(0, 1fr); margin: 0; font-size: 17px; }
  .keys dt, .keys dd { margin: 0; padding: 12px 0; border-bottom: 2px dashed var(--rule-strong); }
  .keys > :nth-last-child(-n+2) { border-bottom: 0; padding-bottom: 0; }
  .keys dt { padding-right: 16px; font-weight: 700; }
  .keys kbd { background: var(--ground); }
  .chip-sample { padding: 0 .3em; border-radius: .3em; background: var(--amber-tint); color: var(--ink); font-weight: 700; white-space: nowrap; }

  .foot { background: var(--espresso); color: var(--espresso-soft); }
  .foot .wrap { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px 32px; min-height: 140px; padding-block: 32px; font: 400 13px/1.6 var(--mono); letter-spacing: .08em; text-transform: uppercase; }
  .foot a { color: var(--on-espresso); text-decoration: none; }
  .foot-links { display: flex; flex-wrap: wrap; gap: 8px 28px; }
  .foot a:hover { text-decoration: underline; }

  @media (min-width: 1200px) {
    .hero { grid-template-columns: minmax(0, 1fr) clamp(480px, 42vw, 604px); padding-bottom: 96px; }
    .hero-copy { padding-top: 20px; }
    .pass { --rail-top: 56px; margin: 0 calc(-1 * min(46px, var(--gutter) - 10px)) 0 0; padding: calc(var(--rail-top) + 6px) 0 0; }
    .rail { height: 16px; border-radius: 8px; }
    .post { top: calc(var(--rail-top) - 12px); left: 10px; width: 12px; height: 40px; }
    .post + .post { left: auto; right: 10px; }
    .ticket-live { --tw: min(430px, 100cqi - 70px); margin: 0 50px 0 auto; transform: rotate(1.2deg); }
    .ticket-done { left: 20px; }
  }
  /* Too little of the done ticket would peek out from behind the live one */
  @media (min-width: 1200px) and (max-width: 1319px) {
    .ticket-done { display: none; }
  }
  @media (min-width: 720px) and (max-width: 1199px) {
    .ticket-live { margin-left: calc(var(--gutter) + 170px); }
  }
  @media (max-width: 1099px) {
    .split { grid-template-columns: minmax(0, 1fr); }
    .split > :first-child { max-width: 640px; }
  }
  @media (max-width: 1000px) {
    .features ol { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
  @media (max-width: 760px) {
    .top { min-height: 60px; }
    .brand { gap: 8px; font-size: 14px; }
    .brand svg { width: 22px; height: 22px; }
    .top nav { font-size: 12px; }
    .top nav a + a { display: none; }
    .kicker { gap: 4px 10px; font-size: 12px; line-height: 24px; }
    .tag { padding: 0 8px; }
    .features ol { grid-template-columns: minmax(0, 1fr); gap: 32px; }
  }
  @media (max-width: 719px) {
    .ticket-done { display: none; }
  }
  /* One column: the ticket comes straight after the buttons (and the drag steps, on a mouse), so a phone's
     first screen reaches it; the sites line and the phone note wait until after it. */
  @media (max-width: 1199px) {
    .hero { container-type: inline-size; }
    .hero-copy { display: contents; }
    .hero-copy > .kicker { order: 1; } .hero-copy > h1 { order: 2; } .hero-copy > .lede { order: 3; }
    .hero-copy > .actions { order: 4; } .hero-copy > .install { order: 5; } .hero-copy > .tip { order: 6; }
    .hero > .pass { order: 7; } .hero-copy > .phone-note { order: 8; } .hero-copy > .works { order: 9; }
  }
  @media (max-width: 599px) {
    .kicker .long { display: none; }
    .kicker .short { display: inline; }
    /* Full-width tickets stay straight on phones, so a tall one can't tilt past the screen edge */
    .menu-tickets .ticket, .ticket-keys { transform: none; }
    .keys { grid-template-columns: minmax(0, 1fr); }
    .keys dt { padding-bottom: 0; border-bottom: 0; }
  }
  @media (pointer: coarse) {
    .actions { flex-direction: column; align-items: stretch; max-width: 420px; gap: 10px; margin-top: 24px; }
    .actions .button { min-height: 56px; }
    .try { background: var(--accent); border-color: var(--accent); color: var(--on-accent); font-weight: 800; box-shadow: 0 4px 0 var(--accent-deep); }
    .try:hover { background: var(--accent); }
    .lede { margin-top: 20px; }
  }
</style>
<script defer src="/_vercel/insights/script.js"></script>
</head>
<body>
<div class="test-cue" id="test-cue" role="status" hidden></div>
<div class="drop-cue" id="drop-cue" hidden>${icon(UP, 22, 2.8)} Drop it on your bookmarks bar, just above this page ${icon(UP, 22, 2.8)}</div>
<header class="top wrap">
  <a class="brand" href="./">${pan(26)}Kitchen Mode</a>
  <nav aria-label="On this page"><a href="#setup">Set it up</a><a href="#sites">Which sites work</a>${handleLink}</nav>
</header>

<main>
<div class="hero wrap">
  <div class="hero-copy">
    <p class="kicker"><span class="tag">Free</span><span class="long">A button for any recipe page · No app, no account</span><span class="short">Any recipe page · No app</span></p>
    <h1>No clutter.<br> <em>Just the<br> next step.</em></h1>
    <p class="lede for-mouse">One click on a recipe page hides the ads, pop-ups and life story, and shows each step a sentence at a time, big enough to read from across the kitchen.</p>
    <p class="lede for-touch">One tap on a recipe page hides the ads, pop-ups and life story, and shows each step a sentence at a time, big enough to read from across the kitchen.</p>
    <div class="actions">
      <a class="bookmarklet for-mouse" href="${loader}" data-tip="hint">Kitchen Mode</a>
      <button class="button try" type="button" data-try>Try it on a sample recipe</button>
      <a class="button for-touch" href="#phone">Set it up on your phone</a>
    </div>
    <p class="tip for-mouse" id="hint" aria-live="polite"></p>
    <div class="install for-mouse">
      <div class="mini" aria-hidden="true">
        <div class="mini-top"><i></i><i></i><i></i><b></b></div>
        <div class="mini-bar"><i></i><i></i><span class="mini-slot"><span class="mini-label">Kitchen Mode</span><span class="mini-drag">Kitchen Mode</span></span></div>
        <div class="mini-page"></div>
      </div>
      <p><strong>Drag the Kitchen Mode ticket up onto your bookmarks bar.</strong> That’s the whole install. No bar? Press <span class="combo"><kbd data-mod>⌘</kbd> <kbd>Shift</kbd> <kbd>B</kbd></span>.</p>
    </div>
    <p class="phone-note for-touch">Phones and tablets have no bookmarks bar, so you paste a short code into a bookmark. It takes a couple of minutes, once.</p>
    <p class="works">Works on <a href="#sites">${tested.length} sites</a>, including ${proof.slice(0, -1).map(name => `<b>${name}</b>`).join(', ')} and <b>${proof[proof.length - 1]}</b>.</p>
  </div>

  <figure class="pass" role="img" aria-label="Kitchen Mode showing step 3 of a stew recipe on an order ticket clipped to a steel rail: one sentence in large type, the ingredients it needs, and a running timer.">
    <i class="post"></i><i class="post"></i><div class="rail"></div>
    <div class="ticket ticket-done" aria-hidden="true">
      <div class="t-body">
        <div class="t-head"><span>Step 2 of 5</span><span>2/5</span></div>
        <hr class="t-rule">
        <p class="t-done">Stir in the garlic and paprika and cook for 1 min until fragrant.</p>
        <span class="t-stamp">DONE</span>
      </div>
    </div>
    <div class="ticket ticket-live" aria-hidden="true">
      <div class="t-body">
        <div class="t-head"><span>Smoky tomato &amp; butter bean stew</span><span>3/5</span></div>
        <hr class="t-rule">
        <div class="t-eyebrow">Step 3 of 5</div>
        <p class="t-step"><span class="t-s on">Pour in the chopped tomatoes and stock, then tip in the butter beans. Bring to a simmer.</span> <span class="t-s">Cook uncovered for <span class="t-chip">⏱︎ 18–20 mins</span>, stirring occasionally, until the sauce is thick enough to coat a spoon.</span></p>
        <hr class="t-rule">
        <div class="t-label">You’ll need</div>
        <div class="t-needs">
          <ul class="t-need on"><li><b>400g</b><span>tin chopped tomatoes</span></li><li><b>300ml</b><span>vegetable stock</span></li><li><b>2 tins</b><span>butter beans, drained</span></li></ul>
          <p class="t-none">Nothing new for this bit</p>
        </div>
        <hr class="t-rule">
        <div class="t-foot"><span class="t-timer" hidden>${icon(CLOCK, 18)}Step 3 · <span class="t-time">18:00</span></span><span class="t-on">Screen stays on</span></div>
      </div>
    </div>
  </figure>
</div>

<section class="features" aria-labelledby="features-title">
  <h2 class="vh" id="features-title">What it does</h2>
  <ol class="wrap">
    <li><span class="num" aria-hidden="true">01</span><h3>Just the recipe</h3><p>No ads, pop-ups or life story. It reads the recipe itself, not the page around it.</p></li>
    <li><span class="num" aria-hidden="true">02</span><h3>One line at a time</h3><p>Set big enough to read from the hob, with the ingredients that sentence needs beside it and a note of anything that should already be done.</p></li>
    <li><span class="num" aria-hidden="true">03</span><h3>Timers on tap</h3><p>Tap “cook for 8–10 mins” and an 8-minute timer starts, fills the screen while you wait, and rings until you stop it.</p></li>
    <li><span class="num" aria-hidden="true">04</span><h3>Screen stays on</h3><p>No wiping flour off the screen to wake it up. Move on with a tap, a key, a swipe or a foot pedal.</p></li>
  </ol>
</section>

<section class="section" id="setup">
  <div class="split wrap">
    <div class="copy">
      <p class="kicker"><span class="tag">Set it up</span><span class="for-mouse">Once, on a computer</span><span class="for-touch">Once, on this phone or tablet</span></p>
      <h2>Hang it on the rail.</h2>
      <p class="section-lede for-mouse">Your bookmarks bar is the rail. Kitchen Mode is the ticket you hang on it, ready for every recipe after.</p>
      <p class="section-lede for-touch">Phones and tablets have no bookmarks bar to drag it to, so it goes in your bookmarks instead. It takes a couple of minutes, once.</p>
      <ol class="steps for-mouse">
        <li><div><strong>Show your bookmarks bar.</strong> Press <span class="combo"><kbd>⌘</kbd> <kbd>Shift</kbd> <kbd>B</kbd></span> on a Mac, or <span class="combo"><kbd>Ctrl</kbd> <kbd>Shift</kbd> <kbd>B</kbd></span> on Windows. Chrome, Edge, Brave, Safari and Firefox all have one.</div></li>
        <li><div><strong>Drag this ticket up onto the bar.</strong><br><a class="bookmarklet compact" href="${loader}" data-tip="tip">Kitchen Mode</a><p class="tip" id="tip" aria-live="polite"></p></div></li>
        <li><div><strong>Test it.</strong> <a href="#test">Open the test recipe</a> and click Kitchen Mode on the bar. After that, use it the same way on any recipe. Click it again, or press <kbd>Esc</kbd>, to close it.</div></li>
      </ol>
      <details id="phone">
        <summary>Setting it up on a phone or tablet</summary>
        <div class="phone">
          <p>You save Kitchen Mode as a bookmark whose address is this short piece of code:</p>
          <pre id="code">${loader.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</pre>
          <p><button class="button small" type="button" id="copy">Copy the code</button></p>
          <h3>Android (Chrome)</h3>
          <ol>
            <li>Tap <strong>Copy the code</strong>.</li>
            <li>Tap ⋮, then the star, to bookmark this page. Then tap the message that pops up at the bottom (<strong>Bookmark saved</strong>, or <strong>Edit</strong>) before it goes. (Missed it? Tap ⋮, then Bookmarks, then Mobile bookmarks, then ⋮ next to Kitchen Mode, then Edit.)</li>
            <li>Change the name to <code>kitchenmode</code>, as one word. In the URL box, press and hold until the whole address is highlighted (tap <strong>Select all</strong> if it isn’t), then tap <strong>Paste</strong>. The URL should now start with <code>javascript:</code>. Go back to this page, and it saves.</li>
            <li><a href="#test">Open the test recipe</a>, tap the address bar and type <code>kitchenmode:</code> with a colon at the end, then tap the suggestion with the star. The colon stops Chrome filling the list with searches, which push the star down behind the keyboard. Always open it this way: tapping it in your bookmarks list does nothing, since Chrome on Android only runs it from the address bar.
              <figure class="shot">
                <picture>
                  <source srcset="android-address-bar-dark.png" media="(prefers-color-scheme: dark)">
                  <img src="android-address-bar.png" width="720" height="400" loading="lazy" alt="Chrome’s address bar with kitchenmode: typed in. Below it, three suggestions; the third, circled, is kitchenmode from Mobile bookmarks, with a star.">
                </picture>
                <span class="ring" aria-hidden="true"></span>
              </figure>
            </li>
          </ol>
          <p>These steps are for Chrome. If you normally use Samsung Internet or another browser, open this page in Chrome to set it up. Pages opened from another app, like Gmail, show an ✕ at the top left, and their address bar won’t let you type: tap ⋮, then <strong>Open in Chrome browser</strong>, first. That goes for recipes too.</p>
          <h3>iPhone and iPad (Safari)</h3>
          <ol>
            <li>Tap <strong>Copy the code</strong>.</li>
            <li>Tap Share, then <strong>Add Bookmark</strong>, then <strong>Save</strong>.</li>
            <li>Open your bookmarks (the book icon), tap <strong>Edit</strong>, then tap Kitchen Mode. Tap the address, tap ⓧ to clear it, then press and hold and tap <strong>Paste</strong>. It should start with <code>javascript:</code>. Tap <strong>Done</strong>.</li>
            <li><a href="#test">Open the test recipe</a>, then open your bookmarks and tap Kitchen Mode.</li>
          </ol>
          <p>Once the test works, use it the same way on any recipe. This bookmark loads Kitchen Mode from this site each time, so it stays up to date.</p>
        </div>
      </details>
    </div>
    <figure class="drawing for-mouse">
      <div class="frame">${drawing}</div>
      <figcaption>While you drag, a banner at the top of the page points up at the bar.</figcaption>
    </figure>
  </div>
</section>

<section class="section band" id="sites">
  <div class="split wrap">
    <div class="copy">
      <p class="kicker"><span class="tag">Which sites work</span></p>
      <h2>On the menu.</h2>
      <p>Kitchen Mode doesn’t read the page you see. It reads the copy of the recipe that sites publish for Google, so ads, pop-ups and long introductions never get in the way.</p>
      <p><strong>A quick check:</strong> if a recipe shows a star rating or cooking time in Google results, Kitchen Mode will almost certainly work on it. Most food blogs work too, especially ones with a “Jump to recipe” button.</p>
      <p class="note">If there’s no recipe to read, Kitchen Mode says so and leaves the page alone.</p>
    </div>
    <div class="menu-tickets">
      <div class="ticket ticket-menu">
        <div class="t-body">
          <div class="t-head"><h3 class="vh">Tested and working</h3><span aria-hidden="true">Tested and working</span><span>${testedOn}</span></div>
          <hr class="t-rule">
          <ul class="menu">
            ${tested.filter(([name]) => featured.has(name)).map(menuItem).join('\n            ')}
          </ul>
          <details class="menu-more">
            <summary><span>${tested.length - featured.size} more sites</span><i></i></summary>
            <ul class="menu">
              ${tested.filter(([name]) => !featured.has(name)).map(menuItem).join('\n              ')}
            </ul>
          </details>
          <div class="t-note">Each one opens a recipe to try it on</div>
        </div>
      </div>
      <div class="ticket ticket-wont">
        <div class="t-body">
          <div class="t-head"><h3 class="vh">Won’t work</h3><span aria-hidden="true">Won’t work</span></div>
          <hr class="t-rule">
          <ul class="wont">
            <li>${icon(CROSS, 18, 2.8)}<span>Recipes in videos, like YouTube, TikTok or Instagram</span></li>
            <li>${icon(CROSS, 18, 2.8)}<span>Recipes shared as photos, screenshots or PDFs</span></li>
            <li>${icon(CROSS, 18, 2.8)}<span>Sites that don’t publish their recipes for Google</span></li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="section" id="cooking">
  <div class="split wrap">
    <div class="copy">
      <p class="kicker"><span class="tag">While you cook</span></p>
      <h2>Call the next step.</h2>
      <p>Your screen stays on while Kitchen Mode is open. A Bluetooth page-turner pedal or presentation clicker works as the next button too, so your hands never have to touch the screen.</p>
      <p>Timers keep going if you close Kitchen Mode: they wait in the corner of the page and ring there. Tap one to get back to your step.</p>
    </div>
    <div class="ticket ticket-keys">
      <div class="t-body">
        <div class="t-head"><span>Controls</span><span>Keys · taps · pedals</span></div>
        <hr class="t-rule">
        <dl class="keys">
          <dt>Next line</dt><dd><kbd>Space</kbd> or <kbd>→</kbd>, tap the right side, or swipe left</dd>
          <dt>Back</dt><dd><kbd>←</kbd>, tap the left side, or swipe right</dd>
          <dt>Start a timer</dt><dd>Tap a highlighted time like <span class="chip-sample">⏱︎ 5 mins</span>, or press <kbd>T</kbd></dd>
          <dt>Stop a timer</dt><dd>Tap it when it rings, or press <kbd>Esc</kbd></dd>
          <dt>Tick off ingredients</dt><dd>Tap them on the first screen</dd>
          <dt>Close</dt><dd><kbd>Esc</kbd>, or click Kitchen Mode on the bar again</dd>
        </dl>
      </div>
    </div>
  </div>
</section>
</main>

<footer class="foot">
  <div class="wrap">
    <span>Kitchen Mode · Free · Runs in your browser. Sends one anonymous count per use: the site’s name and whether it found a recipe</span>
    <span class="foot-links">${REPO_URL ? `<a href="${REPO_URL}#decisions">Why it’s built this way</a>` : ''}${HANDLE ? `<a href="https://x.com/${HANDLE}">Made by @${HANDLE}</a>` : ''}</span>
  </div>
</footer>

<script>
var SAMPLE = ${JSON.stringify(sample)};

// Anonymous counts for the install funnel: one random ID per visit, no cookies, nothing when opened from a file.
var visit = Math.random().toString(36).slice(2);
function count(event, props) {
  if (!location.hostname) return;
  props = props || {};
  props.$process_person_profile = false;
  fetch('${COUNT_URL}', {
    method: 'POST', mode: 'no-cors', credentials: 'omit', keepalive: true,
    body: JSON.stringify({ api_key: '${POSTHOG_KEY}', event: 'kitchen_mode_' + event, distinct_id: visit, properties: props })
  }).catch(function () {});
}
count('page_viewed', { from: document.referrer ? new URL(document.referrer).hostname : '' });

function runKitchenMode() {
${source.replace(/<\/script/gi, '<\\/script')}
}

function addSample() {
  if (document.getElementById('sample-recipe')) return;
  var s = document.createElement('script');
  s.type = 'application/ld+json';
  s.id = 'sample-recipe';
  s.textContent = JSON.stringify(SAMPLE);
  document.head.append(s);
}
var trying = false;
function tryIt() {
  count('tried');
  addSample();
  trying = true;
  runKitchenMode();
}
document.querySelectorAll('[data-try]').forEach(function (b) { b.addEventListener('click', tryIt); });
if (location.hash === '#try') tryIt();

// The test recipe (#test): the sample recipe is on the page, so the bookmark someone just made opens it, and the
// banner says it worked. Like #try, Google never sees it, since it only reads the page without the #.
var testCue = document.getElementById('test-cue'), testing = false;
function startTest() {
  if (testing || location.hash !== '#test') return;
  testing = true;
  count('test_opened');
  addSample();
  var ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  testCue.innerHTML = matchMedia('(pointer: coarse)').matches
    ? (ios ? 'Test recipe ready. Now open your bookmarks and tap Kitchen Mode.'
           : 'Test recipe ready. Now tap the address bar (not your bookmarks list, where it does nothing), type <code>kitchenmode:</code> with the colon, and tap the suggestion with the star.') +
      ' <a href="#phone">Nothing happened?</a>'
    : 'Test recipe ready. Now click Kitchen Mode on your bookmarks bar.';
  testCue.hidden = false;
  // Kitchen Mode sets window.__kitchenMode while it's open. Opened by anything but "Try it" means the bookmark works.
  var check = setInterval(function () {
    if (!window.__kitchenMode) { trying = false; return; }
    if (trying) return;
    clearInterval(check);
    count('test_passed', { loader: !!document.querySelector('script[src$="/km.js"]'), touch: matchMedia('(pointer: coarse)').matches });
    testCue.innerHTML = '<span class="done">It works.</span> Close it, then use it the same way on any recipe.';
  }, 400);
}
startTest();
addEventListener('hashchange', startTest);

// The button only works from the bookmarks bar, so a click here explains how to drag it instead,
// and a banner points up at the bar for as long as the button is being dragged.
var dropCue = document.getElementById('drop-cue');
document.querySelectorAll('.bookmarklet').forEach(function (a) {
  a.addEventListener('click', function (e) {
    e.preventDefault();
    count('button_clicked');
    document.getElementById(a.dataset.tip).textContent =
      'Drag the button rather than clicking it: press and hold, then drop it on your bookmarks bar.';
  });
  a.addEventListener('dragstart', function () {
    count('drag_started');
    requestAnimationFrame(function () { dropCue.hidden = false; });
  });
  // dropEffect is "none" when the drag was cancelled; anything else means it landed, most likely on the bookmarks bar.
  // The page can't tell whether it landed, so it always offers the test.
  a.addEventListener('dragend', function (e) {
    dropCue.hidden = true;
    count('drag_ended', { effect: e.dataTransfer.dropEffect });
    document.getElementById(a.dataset.tip).innerHTML = 'On your bar now? <a href="#test">Test it on the sample recipe</a>.';
  });
});

// Show the shortcut for this computer: Cmd on a Mac, Ctrl everywhere else.
if (!/Mac/.test(navigator.platform)) document.querySelectorAll('[data-mod]').forEach(function (k) { k.textContent = 'Ctrl'; });

if (matchMedia('(pointer: coarse)').matches) document.getElementById('phone').open = true;

document.getElementById('copy').addEventListener('click', function () {
  var btn = this, box = document.getElementById('code'), code = box.textContent;
  function done() {
    count('code_copied');
    btn.textContent = 'Code copied';
    setTimeout(function () { btn.textContent = 'Copy the code'; }, 2500);
  }
  // If neither way of copying works, select the code so a press and hold can copy it
  function fallback() {
    var t = document.createElement('textarea'), copied = false;
    t.value = code;
    t.setAttribute('readonly', '');
    t.style.cssText = 'position:fixed;opacity:0';
    document.body.append(t);
    t.select();
    try { copied = document.execCommand('copy'); } catch (e) {}
    t.remove();
    if (copied) return done();
    getSelection().selectAllChildren(box);
    btn.textContent = 'Press and hold the code to copy it';
  }
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(code).then(done, fallback);
  else fallback();
});

// The ticket in the hero plays through one step: next sentence, then a timer gets tapped.
// Both sentences are painted from the start (the current one in ink, the other dimmed), so the
// longer second sentence never becomes a new, later largest contentful paint.
(function () {
  var ticket = document.querySelector('.ticket-live');
  var beats = ticket.querySelectorAll('.t-s');
  var needs = ticket.querySelectorAll('.t-needs > *');
  var chip = ticket.querySelector('.t-chip');
  var timer = ticket.querySelector('.t-timer');
  var time = ticket.querySelector('.t-time');
  var clock = function (s) { return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  var show = function (n) {
    beats.forEach(function (el, i) { el.classList.toggle('on', i === n); });
    needs.forEach(function (el, i) { el.classList.toggle('on', i === n); });
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

const out = { 'index.html': page, 'km.js': source + '\n' };
if (check) {
  // Vercel serves the committed files as they are, so a source change pushed without rebuilding never ships.
  const stale = Object.keys(out).filter(file => read(`./${file}`) !== out[file]);
  if (stale.length) {
    console.error(`${stale.join(' and ')} ${stale.length > 1 ? "don't" : "doesn't"} match the source. Run node build.mjs and commit the result.`);
    process.exit(1);
  }
  console.log(`index.html and km.js match the source (build ${BUILD})`);
} else {
  for (const [file, text] of Object.entries(out)) writeFileSync(new URL(`./${file}`, import.meta.url), text);
  console.log(`index.html written (page ${(page.length / 1024).toFixed(1)} KB)`);
  console.log(`km.js written (${(source.length / 1024).toFixed(1)} KB, loaded by the ${loader.length}-character bookmark)`);
}

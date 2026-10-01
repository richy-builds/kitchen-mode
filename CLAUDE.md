# Kitchen Mode

A bookmarklet that turns a recipe page into a big, step-by-step cooking view, plus its landing page. Plain JavaScript: no framework, no runtime dependencies, no build step on Vercel. README.md is the full record of what it does, how, and every decision with its date. Read the relevant part before changing behaviour.

## Main is production

Every installed bookmark loads `km.js` from https://kitchen-mode.com (or https://kitchen-mode.vercel.app, for bookmarks set up before 1 Oct 2026) on each click, and pushing main deploys in about 30 seconds. A push to main is a release to every user at once, on sites we don't control. Work on a branch, run `npm test` before any push, and only update main when the user asks (use the ship skill). A hook asks before anything updates main.

## Files

- `kitchen-mode.js`: source of the bookmarklet. `build.mjs`: the landing page (HTML and CSS in a template string) and the build. `sites.mjs`: the tested recipe sites.
- `km.js` and `index.html` are generated and committed, because Vercel serves them as committed. Never edit them by hand (a hook blocks it). A hook rebuilds them whenever you edit `kitchen-mode.js` or `build.mjs`. Commit them with the change that produced them.

## Commands

- `npm test`: checks the committed build matches the source (`node build.mjs --check`), then runs the Playwright tests. Offline, about 20 seconds.
- `npx playwright test tests/timers.spec.js -g "glance"`: one file or test.
- `node build.mjs`: rebuild by hand. It stamps today's date into km.js, so both files change even with no source change.
- `npm run shots` (or `npm run shots -- glance`): screenshots of the landing page and cook view, phone and desktop, light and dark, into `shots/`. After any visual change, look at the ones it touches.
- `node scripts/check-sites.mjs [url…]`: runs this checkout's km.js on real recipe sites (see the check-sites skill).

## Rules

- Fix bugs test-first: a test that fails, then the fix. Tests run against the built km.js, so the rebuild matters. Timer tests use Playwright's fake clock (see `tests/timers.spec.js`).
- The privacy promise is exact: one count per open, with the site's hostname, whether it found a recipe, the build date, `loader` and `touch`. Adding a request or a property needs the user's say-so, plus updates to README "Usage counts" and `tests/privacy.spec.js`.
- `/km.js` must stay at that path forever, on both kitchen-mode.com and kitchen-mode.vercel.app, since installed bookmarks point there. Keep the domain renewing and the vercel.app domain on the Vercel project. The loader bookmark in `build.mjs` must stay ES5 with no `%` or `#`. Changing it only reaches new installs.
- The tool's CSS stays inside its shadow DOM. No web fonts in the tool, and respect `prefers-reduced-motion`.
- Words people read are plain British English (hob, colour), in short sentences, matching the README and landing page. No jargon.
- Anything people will notice gets a dated entry under README "Decisions" (what, why, what was tried, what it costs). Anything checked only in headless Chrome goes under "Not yet tested".

## Gotchas

- `build.mjs` strips comments with plain text matching. Never put `/*` or a line starting `//` inside a string, template or regex in `kitchen-mode.js`. The build refuses to write a km.js that doesn't parse.
- The build writes km.js as ASCII, with `\u` escapes, because a script served without a charset is read in the page's own encoding.
- `package.json` has no `build` script on purpose, because Vercel would run it. `vercel.json` skips the install, so deploys stay static files.
- Claude Code on the web: `@playwright/test` is pinned to match the Chromium preinstalled in `/opt/pw-browsers`. Don't run `playwright install` there. If the browser is missing, set the pin to the version `npm ls -g playwright` reports. Recipe sites and the live site are blocked there, and Chromium doesn't trust the proxy for web fonts, so `check-sites` and live checks need the user's machine, and screenshots show fallback fonts.

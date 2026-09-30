---
name: ship
description: Release Kitchen Mode to every user by getting a change onto main, with the checks first and a live check after. Only when the user asks to ship, deploy or release.
disable-model-invocation: true
argument-hint: "[what's shipping]"
---

Shipping means main gets the change, by a push or a merged pull request. Vercel publishes main in about 30 seconds and every installed bookmark loads the new km.js on its next click, on recipe sites we don't control. There's no staged rollout, so the checks come first. Stop at the first one that fails and say what failed.

1. Know what goes out: `git fetch origin main`, then `git log --oneline origin/main..HEAD` and `git diff --stat origin/main`. Nothing unrelated, nothing uncommitted.
2. `npm test` passes: the committed build matches the source, and every Playwright test is green.
3. If the change touches how recipes are read (finding the recipe, steps, sentences, ingredient matching, timers, Before you start), run the check-sites skill. A site that worked before and doesn't now blocks the release.
4. If it changes anything people see, `npm run shots` and look at the screens it touches, on the phone and the desktop, light and dark.
5. If it changes what leaves the page (the count, its properties, any new request), stop and confirm with the user first. The privacy promise is on the landing page. Update README "Usage counts" and tests/privacy.spec.js with it.
6. README: a dated entry under Decisions for anything people will notice (what changed, why, what was tried, what it costs), and anything checked only in headless Chrome under Not yet tested.
7. Commit km.js and index.html with the source that made them, then push main or merge the pull request. The guard hook asks before anything updates main; that's expected, and the user answers it.
8. Check it landed: `diff <(curl -s "https://kitchen-mode.vercel.app/km.js?v=$(date +%s)") km.js && echo live`. Claude Code on the web can't reach the live site. There, say so and give the user that command rather than saying it's live.

$ARGUMENTS

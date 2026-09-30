---
name: check-sites
description: Re-check which recipe sites Kitchen Mode works on by running this checkout's km.js on real recipe pages, then update sites.mjs and the README's Site support. Use when asked which sites work, to test a site or a recipe link, or before shipping a change to how recipes are read.
argument-hint: "[recipe url…]"
---

1. This needs the internet, and recipe sites are blocked in Claude Code on the web. If the first result says `ERR_TUNNEL_CONNECTION_FAILED`, stop and give the user the command to run on their own machine.
2. Run `node scripts/check-sites.mjs $ARGUMENTS --before`. With no URLs it checks every page in sites.mjs, four at a time, in about two minutes.
3. Read the ✗ lines the way the README does:
   - HTTP 4xx or a captcha is bot protection: unknown, not unsupported. It goes under "Blocked even headless Chrome", not "Don't publish usable data".
   - "no recipe data it can use" on a site that used to work: find another recipe on the same site before calling the site unsupported. Pages move and get rebuilt.
   - "security policy blocked km.js": the bookmark shows its "could not load" message there. Note it under Site support.
4. If this was a full check, update `testedOn` and the list in sites.mjs, then the README "Site support" section with the date and the counts. If the "Before you start" lists changed a lot, update the numbers quoted under Decisions. Then `node build.mjs` and `npm test`.
5. Report what changed since the last check: newly working, newly broken, and still blocked, as a short list.

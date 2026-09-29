# Kitchen Mode

A free browser button that turns a recipe page into big, step-by-step instructions you can read from across the kitchen.

**Live:** https://kitchen-mode.vercel.app · **Try it on a sample recipe:** https://kitchen-mode.vercel.app/#try

![Kitchen Mode showing a recipe step in large type, with the ingredients that step needs](og.png)

## What it does

Click the bookmark on a recipe page and you get:

- the ingredients to tick off, then each step one sentence at a time, in type sized to be read from a distance
- a "You'll need" panel showing only the ingredients the current sentence mentions
- a "Before you start" list of what the recipe takes as already done: ingredients that go in cooked, softened or soaked, long waits like "marinate overnight", and a preheated oven that no step turns on
- tap-to-start timers on any time in the text ("cook for 8–10 mins" starts an 8-minute timer), named after the step's verb ("Step 2 · Fry"), which say out loud which one is done and keep running in a corner of the page if you close Kitchen Mode
- glance mode: leave the screen alone for 10 seconds while a timer runs and the countdown fills it, big enough to read from across the room, with the current sentence and the next one underneath. "Keep timer small" turns it off until you close Kitchen Mode
- a ringing timer fills the screen in red, with what to do next, until you tap it
- the screen kept awake while it's open
- keyboard, tap, swipe, foot pedal or presentation clicker to move through the steps

It runs in the browser. The bookmark loads the code from this site each time it's clicked, on computers and phones alike, so everyone has the latest version. Each time it opens it sends one anonymous count: the site's name, whether it found a recipe, and which build it is. Never the page address, the recipe or anything about you (see [Usage counts](#usage-counts)).

## How it works

Recipe sites publish a structured copy of each recipe ([schema.org Recipe](https://schema.org/Recipe) JSON-LD) so Google can show rich results. Kitchen Mode reads that instead of the page layout, which is why ads, pop-ups and long introductions never get in the way, and why it works on any site that publishes the data.

- Steps are split into sentences; very short sentences ride along with the one before.
- Ingredients are matched to sentences by their distinctive words ("hot chicken stock" matches on *chicken* and *stock*), ignoring words shared by several ingredients.
- Times are found with a regex; ranges start the timer at the low end, so you check early rather than late. "1 hr 30 mins", "1½ hours", "1 1/2 hours", "an hour and a half" and "half an hour" each make one timer of the right length.
- "Before you start" looks for done-already words (cooked, softened, soaked, at room temperature and others) in the ingredient lines, and in the steps for "the cooked rice" when no earlier step mentions rice, waits of an hour or more to chill, marinate, soak, rest or prove, and "overnight". A word after "until" describes the end of a step, so "until cooked through" and "bake for 1 hr until risen" never count. Toasted sesame oil and storage notes ("defrost overnight in the fridge") are skipped.
- A timer is named after the nearest cooking verb before its time ("Leave to rest for 10 mins" is Rest). After the first beeps it says "Rest, step 4. Time's up." with the browser's speech synthesis, which needs no permission.
- A timer's first 90 seconds of rings are booked on the Web Audio clock when it starts. Browsers slow down JavaScript timers in background tabs (Chrome to once a minute after five minutes), but not audio, so the alarm is on time and keeps ringing even if you've switched tabs. Chrome lifts the once-a-minute limit while a page is making sound, so the page's own timer can carry on ringing after that. Until 29 Sep 2026 only the first 10 seconds were booked, which could leave up to a minute of silence in a background tab. The volume is unchanged.
- The view is mounted in a shadow DOM, so the recipe site's CSS can't interfere.
- The screen stays on through the Screen Wake Lock API, re-requested when the tab becomes visible again.
- On Android, the back gesture closes the view instead of leaving the recipe page (`CloseWatcher`, Chrome only).

## Files

| File | What it is |
|---|---|
| `kitchen-mode.js` | Readable source of the bookmarklet. Edit this one. |
| `build.mjs` | Strips comments from the source and writes it to `km.js`, then builds `index.html`: the landing page with the bookmark (`loader`, a short `javascript:` URL that loads `km.js`) and the sample recipe, which "Try it" runs from a copy of the code inside the page. `HANDLE`, `SITE_URL` and `POSTHOG_KEY` are set at the top. |
| `km.js` | Generated. The same code as a file, loaded by the bookmark on every click, on computers and phones. Don't edit by hand. |
| `vercel.json` | Forwards `/relay/*` to PostHog's EU servers, so ad blockers that block posthog.com don't drop the counts. |
| `index.html` | The generated landing page. Don't edit by hand. |
| `og.png` | Link preview image (1200×630) used by X and others. |
| `og-image.html` | Source for `og.png`. |
| `android-address-bar.png`, `android-address-bar-dark.png` | Chrome's address bar with `kitchenmode:` typed, shown in the last Android setup step (light and dark). Taken on the Android emulator, cropped to 720×400. |

## Working on it

```sh
node build.mjs     # rebuild index.html and km.js after changing kitchen-mode.js or build.mjs
open index.html    # "Try it on a sample recipe" runs the current code; index.html#test is the test recipe
```

Regenerate the preview image after changing `og-image.html`:

```sh
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --hide-scrollbars \
  --virtual-time-budget=4000 --window-size=1200,630 --screenshot="$PWD/og.png" "file://$PWD/og-image.html"
```

Test on Android in the emulator (a Pixel 8 with Android 17 and Chrome 145, from the Play Store image, so it's the real Chrome for Android):

```sh
~/Library/Android/sdk/emulator/emulator -avd kitchen_pixel &   # boots in about 30 s; close the window to stop it
adb reverse tcp:8765 tcp:8765 && python3 -m http.server 8765  # its Chrome can then open http://localhost:8765
```

`chrome://inspect` in Chrome on the Mac attaches DevTools to the emulator's tabs. `adb` is in `~/Library/Android/sdk/platform-tools`. It was installed with Homebrew (`openjdk@21`, `android-commandlinetools`), then `sdkmanager "platform-tools" "emulator" "system-images;android-37.0;google_apis_playstore;arm64-v8a"` and `avdmanager create avd -n kitchen_pixel -d pixel_8`. It isn't signed in to Google, so Chrome doesn't update and the Play Store can't install other browsers.

Deploy by pushing `main`: Vercel's Git integration publishes it to production in about 30 seconds (static files, no build step on Vercel). Run `node build.mjs` and commit `index.html` and `km.js` first, since Vercel serves them as committed. Every bookmark loads `km.js` from the live site on each open, so a push reaches everyone at once (except computers set up before 30 Sep 2026, whose bookmarks hold the old full code). Check it landed:

```sh
git push origin main
vercel ls                                                     # newest row: Production, Ready
diff <(curl -s "https://kitchen-mode.vercel.app/km.js?v=$(date +%s)") km.js && echo live
```

## Usage counts

Two free tools, neither using cookies:

- **Vercel Web Analytics** counts landing page visits, where they came from, countries and devices (the project's Analytics tab).
- **PostHog** (project "Analytics", EU region, set to discard IP addresses) gets these events through `/relay/` on this site. Each name starts with `kitchen_mode_`.

| Event | Sent when | Properties |
|---|---|---|
| `page_viewed` | the landing page loads | `from`: the referring site |
| `tried` | "Try it" is pressed, or the page opens at `#try` | |
| `button_clicked` | someone clicks the install button instead of dragging it | |
| `drag_started` | the install button is picked up | |
| `drag_ended` | it's let go | `effect`: `none` if the drag was cancelled; anything else means it landed, most likely on the bookmarks bar |
| `code_copied` | "Copy the code" worked (phone setup) | |
| `test_opened` | the test recipe (`#test`) opens, from the last setup step | |
| `test_passed` | a bookmark opened Kitchen Mode on the test recipe ("Try it" doesn't count) | `loader`: whether the bookmark loaded `km.js` (false only for a computer bookmark set up before 30 Sep 2026); `touch`: whether it's a phone or tablet |
| `opened` | the bookmarklet opens, on any site | `site`, `found` (whether it found a recipe), `build` (build date), `loader` (whether a bookmark loaded it from `km.js`, rather than an old full-code bookmark or "Try it"), `touch` (whether it's a phone or tablet: `(pointer: coarse)`, the test the landing page uses to pick phone or computer steps) |

Until 29 Sep 2026 only phones had the loader bookmark, so `loader` alone meant a phone. Since then computers have it too: tell them apart with `touch`, which events from before then don't have (read `loader: true` there as a phone).

The landing page events share one random ID per visit, so they work as a funnel. `opened` gets a new random ID every time, so it counts opens, not people.

Limits: copies installed before 27 Sep 2026 never report, since full-code bookmarks don't update. Computer bookmarks set up from then until 30 Sep 2026 report with their own `build`, `loader: false` and no `touch`; bookmarks set up since load `km.js`, so they always run the current build. Sites whose security policy blocks outside requests drop the count silently. `opened` on kitchen-mode.vercel.app is "Try it". Nothing is sent when the page is opened from a file.

## Site support

Checked on 27 Sep 2026 by loading a recipe page and running the same data lookup the bookmarklet uses. Sites that turn away plain requests were loaded in headless Chrome instead.

- **Publish the data (73 sites):** the list, with the recipe checked on each, lives in `tested` in `build.mjs`. The 12 names in `featured` show on the landing page; the rest sit behind "N more sites".
- **Don't publish usable data:** Nigella, Mary Berry, Smitten Kitchen, Hairy Bikers, Rick Stein and Inspired Taste publish none; Gordon Ramsay publishes recipes without their steps
- **Blocked even headless Chrome** (bot protection, so unknown rather than unsupported): Taste of Home, The Kitchn, The Woks of Life, Riverford, Coles
- **No recipe page found to check:** EatingWell, Skinnytaste, Tesco Real Food, Donna Hay, Ambitious Kitchen (the crawl only reached collection pages)
- **Left off the landing page on purpose:** NYT Cooking publishes the data, but the recipes are paywalled. Big non-English sites (Marmiton, Chefkoch, Cookpad) weren't checked, since the sentence and timer rules are written for English.

## Decisions

- **A bookmarklet rather than an extension.** No install, store fee or review, and nothing leaves the page but an anonymous count. The costs: it's desktop-first, phone setup means pasting code into a bookmark by hand, and a site's security policy can refuse the script the bookmark loads. Every bookmark runs the live `km.js`, so test before pushing.
- **Every bookmark is the short loader, computers included** (29 Sep 2026). Phones got it first, on 27 Sep: the first phone users couldn't get the 34 KB bookmark to run (8 "Copy the code" presses and no phone opens), so they paste a 224-character bookmark that loads `km.js` from this site. It's short enough to check by eye, always runs the current build, and if the script can't load it says "Kitchen Mode could not load on this page." instead of doing nothing. Computers kept the full-code drag at first, because it runs even on sites whose security policy only allows scripts from listed hosts. They now drag the same loader, because a full-code bookmark never updates: everything shipped since, like "Before you start" and glance mode, reached phone users only. The drag, the ticket and the bookmark's name are unchanged. The cost, now on computers too: each open fetches `km.js` from this site (Vercel's default `max-age=0, must-revalidate`, so a quick revalidation), and a site with that kind of policy shows the message instead of opening. None of the 50 listed sites that answered a plain request has one, and BBC Food, whose policy is strict, works. Computer bookmarks set up earlier keep the old code and can't be changed from here. With about a dozen opens so far, most of them likely the author's own, the landing page doesn't ask anyone to set it up again. The landing page also shrank from 216 KB to 117 KB, since it no longer carries the whole code twice as a URL.
- **Setup ends with a test.** The last setup step, on phones and computers, opens the test recipe (`#test`), which puts the sample recipe on the page and shows a banner saying what to do, then "It works" once a bookmark opens it. People find out at once, with the steps still in front of them. On a computer the page also offers the test after every drag, since it can't tell a ticket that landed on the bar from a cancelled drag (see `drag_ended`). Android steps name the bookmark `kitchenmode` so it's the only address-bar match: the landing page's title is also "Kitchen Mode", and the history entry for it outranks the bookmark. Chrome on Android does nothing when a code bookmark is tapped in the bookmarks list and only runs it from an address-bar suggestion, so the last Android step and the test banner say so. The first real Android test, on 27 Sep 2026, tried the bookmarks menu first. Touch screens (including tablets, whose Chrome sends a desktop user agent) get only the phone steps, since links can't be dragged to a bookmarks bar there.
- **Android users type `kitchenmode:`, with a colon.** Chrome on Android lists Google's search suggestions first and puts bookmarks after as many of them as fit on screen. With plain `kitchenmode`, the star came ninth, half hidden behind the keyboard, under "kitchen modern" and the like (Chrome 145 on the emulator, 28 Sep 2026). Chrome doesn't send address-like input (`word:`) to Google for suggestions, so with the colon the list is just the typed text twice, then the star, third. Other names didn't help: kmode, kmkm, cookmode, zzkm and others still drew about eight suggestions each, and those vary by country; `kitchenmode/` left six rows. If Chrome ever does suggest searches for it, the star is still in the list, just lower. The step shows a screenshot of that list, light and dark, with the row to tap ringed.
- **Android's back gesture closes Kitchen Mode.** Back used to leave the recipe page, which is easy to do by accident when swiping from the screen edge to go back a step. `CloseWatcher` (Chrome 120 and up) exists for this and leaves the site's history alone. `history.pushState` would work in more browsers, but recipe sites that route with the History API could react to it. Browsers without `CloseWatcher` behave as before.
- **Pages opened from other apps need Chrome itself.** Links opened from another app often open in a Custom Tab. It has the bookmark star, but tapping its address bar shows site info instead of letting you type, so Kitchen Mode can't be opened there. The Android steps say to tap ⋮, then Open in Chrome browser, and that the same goes for recipes.
- **Timers outlive the view.** Closing Kitchen Mode (✕, Esc, the bookmark again, or Android's back gesture, which is easy to trigger by accident) used to end every running timer without a word. Now the timers move to the bottom-right corner of the recipe page and ring there. Tapping one goes back to the step you were on, and stopping the last one closes Kitchen Mode for good; the screen stays on until then, since a timer can't ring on a sleeping phone. Esc stops a ringing timer before it closes anything, since that's the key people reach for. Each time in the text runs at most one timer, and stays highlighted while it runs.
- **"Before you start" uses word lists, not an AI model** (29 Sep 2026). A model would mean sending the recipe off the page, which the privacy promise rules out, and a server and a bill besides. The lists answer instantly and work offline. Run against the tested recipes that loaded (42), it listed 18 things on 14 of them, among them "4 cup cooked rice", "leftover slow-cooked lamb", pie crusts to soften and butter at room temperature; the other 28 show nothing. The false alarms it found (toasted sesame oil, a freezer note, the same step twice) were fixed. A code review the same day found three more with made-up recipes and fixed them: toasted sesame oil named in a step, a long bake "until risen" counted as a wait, and a step's item cut to one word ("the cooked basmati" for basmati rice). None of them occurred in the real recipes, whose 49 lists came out the same after the fix. The sample recipe serves the stew with "crusty bread or cooked rice", so "Try it" shows the list. A decision model such as TypeSafe's Jev could grade the lists against those recipes once, for well under a dollar, without changing the product.
- **Glance mode keeps the sentence on screen, and the next one.** It takes over only after 10 seconds untouched while a timer runs. The current sentence stays underneath the countdown, and the next one sits below it in grey, with its step number when it starts a new step: with the countdown filling the screen, it was easy to forget what to do while waiting. A tap brings the full view back and never moves on, so a tap from across the room can't skip a step. Keys, pedals and clickers do move on, since pressing one is deliberate. Until 29 Sep 2026 glance hid itself as soon as a finger touched it, so on touch screens the tap then landed on the step underneath and moved on. Now the press is left to the big timer's own tap.
- **"Keep timer small" lasts until Kitchen Mode closes.** The button in the corner of glance mode keeps timers in the footer, where "Big timer: off" turns it back on. It isn't saved, since storage belongs to the recipe site and this preference should follow the cook from site to site.
- **A ringing timer takes over the screen.** It used to show only as the pulsing pill in the footer, which is hard to see from across the room at the moment it matters most. Now the view turns red with the timer's name, "Time's up" and what to do next (the sentence after the one the timer came from), whether or not glance mode was on and even while you're touching the screen. A tap anywhere stops that timer, and with two ringing, the one that finished first shows first. Esc still stops them all. While Kitchen Mode is closed, timers ring in the corner as before.
- **Spoken timers may come late in a background tab.** Speech can't be booked on the audio clock the way the beeps are, so when Chrome slows a hidden tab's timers it can come up to a minute after the beeps. The beeps stay on time.
- **The alarm is a square wave at 1760 Hz**, not the 880 Hz sine it started as: closer to a kitchen timer's buzzer, and nearer the 2–5 kHz where hearing is most sensitive (the ISO 226 equal-loudness contours) and phone speakers are loudest.
- **The grip dots, tear line and pan on the install button are drawn by CSS**, so the dragged bookmark is named plain "Kitchen Mode". Chrome always shows its own globe icon for bookmarklets and there's no way to set a different one.
- **The headline leads with the pain: "No clutter. Just the next step."** (29 Sep 2026). It replaced "Read the recipe from across the kitchen.", which sold legibility and left ads, pop-ups and life stories, what everyone knows about recipe sites, to the third section. The lede names them and carries the legibility. The second half says what you get instead, which a plain "no clutter" line wouldn't, and is what sets Kitchen Mode apart from a "Jump to recipe" button. Three lines rather than four ("No ads. No scrolling." was tried first), so the hero is shorter. The hero also names four sites people know ("Works on BBC Good Food, Allrecipes…"), the "Order 001" tag became "Free", and the headline's size is capped by the window's height so the install button shows without scrolling on a 1280×720 laptop window. The link preview (`og.png`) matches.
- **The sample recipe's JSON-LD is only added when someone presses "Try it"**, so Google never reads the landing page as a recipe.
- **Landing page design: "The Pass".** Each recipe step is an order ticket clipped to the steel rail at a restaurant pass. The bookmarks bar is the rail, and installing means hanging the Kitchen Mode ticket on it. Cream ground, white tickets with a clip and drop shadow, tomato red (#d92d20) for actions, amber (#ffb020) for timers, espresso bands; steel is the only cool colour. Fonts are Archivo condensed for headings, IBM Plex Mono for labels and Atkinson Hyperlegible Next for body text (legibility is the point of the tool). The hero ticket plays through a step the way the real view does. Every text and background pair is at least 4.5:1, or 3:1 for text 24px and up, in light and dark mode.
- **The tool's palette matches the landing page:** cream background, tomato red for the step counter, progress and buttons, amber chips for running timers with a light amber tint on tappable times, and "You'll need" and the finish screen as white ticket stubs. Labels (title bar, eyebrows, pills, timers, the serves and cooking-time line, key hints) use the system monospace font; the step text and headings are system-ui. Buttons match the landing page: 10px corners, red with a darker red shadow, or an ink outline. There are no web fonts in the tool, because they're unreliable on other sites' pages, and nothing is rotated or torn, because reading comes first. Ringing timers turn red, so the "screen may sleep" warning is an inverted ink pill instead. Dimmed sentences sit at 50–55% opacity so they still reach 3:1.
- **The tool was restyled before launch, not after**, because installed bookmarklets never update: whatever look ships first is the one early users keep. It also means the ticket on the landing page shows what people actually get.
- **Name:** kept "Kitchen Mode" because it says what it does. "Recipease" was considered and dropped: it was Jamie Oliver's cookery shop brand, and it sounds identical to "recipes".

## Not yet tested

- The phone setup steps on a real iPhone (Safari). Checked on 27 Sep 2026 in headless Chrome emulating an Android phone and tablet, with the bookmark run the way the browser runs one: the phone bookmark loads `km.js` and opens the test recipe, "It works" shows for a bookmark but not for "Try it", tapping again closes it, and a failed load shows its message. Checked the same day on a real Android phone (Chrome): typing `kitchenmode` in the address bar and tapping the suggestion with the star opens the test recipe, and tapping the bookmark in the bookmarks menu does nothing. Checked on 28 Sep 2026 in the Android emulator (Pixel 8, Android 17, Chrome 145) by following the Android steps as written: the message after bookmarking said "Bookmark saved", with no Edit button, and went after a few seconds (tapping it opens the editor); pressing and holding the URL highlighted all of it, with no Select all; `kitchenmode:` put the star third and opened the test recipe; the bookmarks list still did nothing. The back gesture was checked on BBC Good Food with the new `km.js` run through DevTools: it closes Kitchen Mode, and the next back leaves the page as normal; Esc and the ✕ also leave back working normally. Not checked: anything on iOS; Samsung Internet and Firefox on Android (the emulator needs a Google account to install them); in-app browsers like Instagram's.
- The computer bookmark dragged onto a real bookmarks bar and clicked there, in any browser (automation can't reach the bar), and in Safari, Firefox and Edge at all. Checked on 29 Sep 2026 in headless Chrome 154 by running the install link's own code, read from the built `index.html`: on the test recipe it loads `km.js`, opens, turns the banner to "It works" and sends `test_passed` with `loader` and `touch: false` (`true` with touch emulation), and a second run closes it; "Try it" still doesn't pass the test; on BBC Good Food and BBC Food it opens the recipe with both the live and the new `km.js`; when `km.js` can't load (a failed request, or a page whose policy allows only its own scripts) it shows "Kitchen Mode could not load on this page." BBC Food's own policy turns off the screen wake lock, so the view there says "Screen may sleep".
- Real click tests on most sites in the list above. The phone bookmark was run the same way on 16 (the 12 featured, plus Budget Bytes, Delish, Minimalist Baker and Pinch of Yum) and opened with the recipe on all of them, including BBC Food despite its strict security policy. The rest have only had the data check.
- The landing page and cook view in Safari and Firefox (the redesign was checked in Chrome only)
- "Before you start", timer names, the spoken line and glance mode on a real phone, especially iOS Safari, which only speaks later if something was spoken during a tap (a silent line is spoken when a timer starts). Checked on 29 Sep 2026 in headless Chrome only: the list on a test recipe with every case and on 43 real recipe pages' data, the names, glance mode turning on after 10 idle seconds, and the spoken line.
- The glance changes of 29 Sep 2026 on a real phone: the next sentence, "Keep timer small", the red ringing screen and the 90 seconds of booked rings. Checked in headless Chrome only, with a phone, a landscape phone and a computer in dark mode: 28 checks, including taps on the big timer not moving on, and the rings booked (108 beeps over 88 seconds).
- The timer changes of 29 Sep 2026 on a real phone: the corner timers, and whether the new alarm carries over an extractor fan. Checked in headless Chrome only (duration parsing on 27 phrasings, one timer per time, the corner tray, reopening, Esc, and the audio booking).
- Whether any browser reports a drop on the bookmarks bar as anything but `none` in `drag_ended`: all 11 drags on 27 Sep 2026 reported `none`, so it may not tell a landed drop from a cancelled one even in Chrome

## Ideas

- A mobile web version: paste a recipe link and get the cook view (needs a small server function, since browsers can't read other sites' pages), with shareable links per recipe. Made installable with a `share_target` in its manifest, it would appear in Android's share sheet, including in apps where a bookmark can't run, and setup would be one tap. The share sheet only passes the link, so the server has to fetch the page, which breaks the "never the page address" promise. On 28 Sep 2026 a plain fetch from a home connection found the recipe on 58 of the 73 tested sites at best: 54 with an honest `KitchenMode/1.0` user agent, and 48 posing as Chrome, since Cloudflare challenged the fake Chrome on 10 sites that let the honest one through. Allrecipes and the other 6 Dotdash Meredith sites answer any non-browser with a 402; Cloudflare, rate limits or a captcha stopped 7 more, and Joshua Weissman's fetched page has no steps in its data. A server's datacenter address would likely do worse, so the bookmark would stay as the fallback. Not yet measured from Vercel.
- Scale servings ("serves 4" to 2), rewriting quantities including fractions
- Read the current step aloud, and voice "next"
- A shopping list merged from several recipe links

---

Made by [@richyjudge](https://x.com/richyjudge).

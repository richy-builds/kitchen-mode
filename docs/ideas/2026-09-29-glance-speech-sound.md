# Glance mode, speech and sound: ideas (29 Sep 2026)

Brainstorm only, no code changed. Read first: `kitchen-mode.js` at 49c93e3 (`say`, `beep`, `startTimer`, `tick`, `glanceTick`, CSS `.glance`/`.g-*`). Idea IDs (CV-xx, DL-xx, ST-xx) are from the idea board, which is not in the repo; they are cited as given.

## What the code does today (facts that shape the ideas)

- **Glance** turns on when `!minimised && !ringing && running.length && idle > 10 s`. It shows the soonest timer's name and time, the *other* timers as one small mono line (`.g-more`, 15-22 px), and the current sentence. The sentence is set once, when glance turns on. Next sentence: not shown.
- **Ringing** turns glance off, so the alarm state is the small pulsing red pill in the footer (22 px digits). From across the room that is the least visible moment in the whole flow.
- **Alarm**: 3 square-wave beeps at 1760 Hz. Only the first 4 bursts (first 10 s) are booked on the audio clock. After that, repeats depend on the 250 ms `setInterval`, which Chrome throttles in hidden tabs (see risks). So "rings until stopped" is only guaranteed for about 10 s in a background tab.
- **Speech**: one utterance 900 ms after the ring, default voice, default rate, `lang` from the page (else `en`). Nothing at start, halfway or 1 minute. No off switch until ST-01.
- Timer objects don't know their step/sentence (`key` is `si.bi.index`, so it can be parsed).

## Ranked ideas

Ranking is by value for effort. The bucket in brackets is your priority list (1 glance, 2 minimise, 3 speech, 4 sound, 5 other).

### 1. Now / Next in glance, plus "When it rings" [1] . Size S (quick) to M (thorough)

**What:** Under the countdown, show the current sentence at full strength and the *next* sentence dimmed (`beats[pos+1]`, crossing into the next step if needed). Add a line "When it rings: <sentence after the timer's own sentence>" so you know what the alarm is for, even after tapping ahead.

**Why:** The failure you describe (forgetting what to do while the big timer owns the screen) is what the sentence-per-screen model is designed to prevent, and the takeover currently hides everything but one sentence. Cooking apps that lead with timers keep step context beside them: Crouton detects times in steps and starts timers in place ([MacStories review](https://www.macstories.net/reviews/crouton-review-an-elegant-modern-recipe-manager-and-cooking-aid/)); Thermomix guided cooking shows the step's time, temperature and speed on one screen and moves on with "Next" ([Vorwerk](https://support-gb.vorwerk.com/hc/en-gb/articles/18202555483292-What-is-Guided-Cooking)). Apple's own guidance for glanceable Live Activities is to keep the same information in every size and put the essential item first ([Apple, Live Activities](https://developer.apple.com/documentation/activitykit/displaying-live-data-with-live-activities)); a watch-style rule is "key information within two seconds" ([summary of Apple's watchOS guidance](https://skills.cat/skills/ehmo/platform-design-skills/watchos-design-guidelines), a secondary source).

**Quick:** next sentence dimmed under the current one; refresh it every tick (fixes the set-once staleness if `pos` changes).
**Thorough:** store `si`/`bi` on each timer; "When it rings" line; "While you wait" list = the remaining sentences in the current step up to the next timer chip (a plain heuristic, no AI); when 2+ timers run, name the one that ends next in the header ("NEXT: Rest 4:10") and keep the others as rows (see sketch B).

**Risks:** more text hurts distance reading. Cap the secondary text to 2 lines, drop the "next" line when the screen is short (`max-height` query), never let it shrink the digits. Splitting sentences is heuristic; a badly split sentence shows as a fragment.
**Related:** builds on the glance decision (sentence stays; a tap never moves on). CV-07 ("Ready about 7:12pm") could sit as the last row.

### 2. Big ringing state [1, 4] . S

**What:** When a timer rings, use the glance layout in red: the timer's name huge ("REST DONE"), "tap to stop" and the "When it rings" sentence. Today ringing falls back to the 22 px footer pill.

**Why:** The alarm is the one moment the cook must notice from anywhere; Google and Alexa named timers announce which timer finished ([TechHive on Alexa](https://www.techhive.com/article/578364/how-to-make-the-most-of-your-alexa-timers.html), [Alexa named timers](https://techcrunch.com/2017/06/01/alexa-adds-support-for-reminders-and-named-timers)); the screen should say the same thing the voice does.
**Quick:** reuse `.glance` with a `.ring` class; on tap stop that timer (existing `removeTimer`). **Thorough:** "+2 min" button beside "Stop" (Google Assistant supports "add 5 minutes to the timer", per [this guide](https://postecards.poste.it/bold-stats/google-timer-how-to-set-a-15-minute-countdown-1767648923), a weak source).
**Risks:** a tap from across the room must not stop the wrong timer when two ring; show one at a time, soonest first. Two big buttons need 48 px targets.
**Related:** ST-02 (night kitchen dims it); DL-05 (sound).

### 3. Glance style setting: Big / Banner / Off, and a self-correcting trigger [2] . S (session) to M (persisted)

**What:** Three glance styles. **Big** = today. **Banner** = after 10 s the footer timer grows to a large strip across the top of the *normal* cook view (steps stay). **Off** = never. Default stays Big. Plus an implicit opt-out: if the cook dismisses glance within 3 s of it appearing twice, stop auto-glance for this session and show a one-line toast ("Glance off; ☾ in the header turns it back on").

**Why:** The README already says a tap only wakes, and `wake()` restarts the 10 s clock, so a cook who wants the steps on screen gets the takeover back 10 s later. The trigger has no memory. The three-way choice is what "minimised" means to different cooks: some want the countdown big *and* the step visible.
**Quick (session only):** in-memory flag toggled by a small header pill next to "Screen stays on"; no storage. **Thorough:** persist as a loader parameter (ST-01) so it survives sessions; per-site localStorage is the wrong place for a global preference (your hard limit), so don't use it.
**Per timer?** Skip. A per-timer switch adds UI on a screen whose selling point is having none. The rule "glance follows the session setting" is easier to explain. Interaction rules: Off and Banner never blank the steps; ringing always takes over (idea 2) whatever the setting, since it needs acknowledging; `minimised` (closed view) stays as today.
**Risks:** a third layout to keep visually consistent in light/dark; the header is already busy on phones (`.pill` shrinks at 820 px), so put the toggle in the glance screen and a long-press/second tap target rather than another header chip.
**Related:** ST-01, ST-02.

### 4. Longer, escalating, background-safe alarm [4] . S to M

**What:** Book many rings on the audio clock up front (for example one 3-beep burst every 2.5 s for 90 s), rising in loudness after the first 10 s (gain 0.25 to about 0.6, then a second burst pitch), instead of 4 bursts and then hoping the interval runs.
**Why:** Chrome throttles hidden-tab timers to once a minute after 5 minutes, but pages playing *audible* audio are exempt, and silent streams don't earn the exemption ([Chrome timer throttling](https://developer.chrome.com/blog/timer-throttling-in-chrome-88/), [summary](https://www.ghacks.net/?p=129826)). Kitchen Mode's own ring is audible, so the exemption probably covers the ring once it starts; but the quiet minutes *before* it (no audio) are what get throttled, which is why the first rings were booked. Escalating until acknowledged is the usual kitchen-alarm pattern (my read; no source found).
**Quick:** loop the booking to 30 bursts. **Thorough:** re-book the next 30 s on `visibilitychange` and on each tick; cap total run (about 5 min), then keep a slow reminder every 30 s.
**Risks:** long rings can annoy neighbours or a sleeping household (ties to night kitchen). `beep` creates 3 oscillators per burst; 30 bursts is only about 90 nodes, fine, but stop them all on `removeTimer` (existing `out.disconnect()` already handles this).
**Related:** DL-05.

### 5. iOS silent switch: `navigator.audioSession` [4] . S, but needs a real iPhone

**What:** Set `navigator.audioSession.type = 'playback'` when a timer is *ringing* (and back to `'auto'` when the last one stops), feature-detected.
**Why:** Web Audio plays as "ambient" by default, so it is muted by the ringer/silent switch; HTML audio isn't ([WebKit bug 237322](https://auto-bugs.webkit.org/show_bug.cgi?id=237322), [Adactio on Web Audio on iOS](https://adactio.com/journal/19929)). Setting the type to `playback` fixes it on iOS 17+ ([WebKit bug 251532](https://bugs.webkit.org/show_bug.cgi?id=251532), [MDN](https://developer.mozilla.org/docs/Web/API/AudioSession/type)). The API is a W3C draft, not Baseline ([W3C](https://www.w3.org/TR/audio-session/)).
**Trade-off to decide:** MDN says `playback` is exclusive and pauses other playback audio. A cook with a podcast or Spotify playing will have it paused when a timer rings. That is arguably right for an alarm, but it should not happen at timer *start*, and resume after isn't guaranteed. Setting the type only while ringing keeps the cost to the alarm itself.
**Risks:** untested on iOS (README says nothing has been checked there). Silent-switch users may *want* silence: with the switch on and no other feedback, a missed alarm is worse than a surprise one, so pair it with the big ringing state (idea 2) and vibration where available.
**Related:** DL-05, ST-02 (night kitchen should override to stay quiet).

### 6. Speak more, say it better [3] . S (quick) to M (thorough)

**What:** (a) The done line also says what's next: "Rest, step 4, done. Next: slice the beef." (b) An optional 1-minute warning for timers of 5 min or more ("Rest, one minute left"). (c) Repeat the done line every 30 s while ringing, because it currently speaks once and the beeps carry the rest. (d) No halfway call by default; it adds chatter for the value of one glance at the screen. If wanted, only for timers over 30 min.
**Why:** Named timers announce which one finished ([Google/Alexa above](https://www.techhive.com/article/578364/how-to-make-the-most-of-your-alexa-timers.html)); the next-step tail is what CV-04 would read anyway, done once here without a mode.
**Voices and platforms:**
- `getVoices()` can be empty at first; Chrome loads voices asynchronously, and Safari lacks `addEventListener` on `speechSynthesis` (use `onvoiceschanged`), and `voiceschanged` is unreliable ([Coders Block](https://codersblock.com/blog/javascript-text-to-speech-and-its-many-quirks/), [DEV](https://dev.to/jankapunkt/cross-browser-speech-synthesis-the-hard-way-and-the-easy-way-353)). Re-read the list at speak time rather than at load.
- On Chrome/Firefox for Android the voice can't be changed from the device default (same Coders Block source), so a voice picker would do nothing there.
- Chrome needs user activation before `speak()` ([blink-dev](https://groups.google.com/a/chromium.org/g/blink-dev/c/XpkevOngqUs)); iOS needs a first utterance inside a tap (the `unlockVoice` the code already has).
- **Privacy:** on desktop Chrome, `localService: false` voices ("Google ..." names) are synthesised by a remote service ([MDN localService](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisVoice/localService), [Readium notes](https://readium.org/speech/docs/WebSpeech.html)). I believe that means the spoken text leaves the page, which cuts against "nothing leaves the page" (from memory; confirm in Chrome's network log before shipping). The spoken text is only "Rest, step 4, done. Next: ...", but the next-sentence tail is recipe text. Rule: pick `localService === true` voices only, else say only the short line with no recipe text.
**Voice choice/rate:** don't build a picker. Pick once: same language as the page, prefer local, prefer a voice whose `default` is true. Rate 0.95 and a short sentence beat picking a voice for clarity over a fan. Expose only on/off (ST-02 "read aloud").
**Risks:** all speech can arrive late in a hidden tab; already documented. Long next-sentence tails are slow to say; cut to about 12 words.
**Related:** CV-04, ST-01, ST-02.

### 7. Distinct sounds per timer [4] . M

**What:** Each running timer takes a slot from the DL-05 palette: a different pitch (for example 1760/1320/2093 Hz) or a different number of beeps (timer 1 = 3, timer 2 = 2 then 2). The name on screen and in the voice matches.
**Why:** Two timers on the same buzzer is the very confusion the spoken name was added for; sound alone (with the phone in a pocket or the screen off) is then enough to tell them apart. Kitchen apps and smart speakers handle this by naming timers (see above); a per-timer tone is the lightweight offline equivalent.
**Synthesised vs sampled:** synthesise. It costs zero bytes, has no fetch (a recipe site's CSP can refuse a `fetch` or `media-src` for a sample), and lets escalation change gain and pattern. A bell is about 20 lines: 4 sine partials at roughly 1 : 2.76 : 5.4 : 8.9 with exponential decays. Sampled sounds sound nicer but mean either a file the page may not be allowed to load, or base64 in `km.js` (each 50 KB sample adds to every open). Not worth it.
**Risks:** more than 3 distinct tones is not distinguishable by ear; cap at 3 and repeat.
**Related:** DL-05.

### 8. Distance-adaptive digits [1] . S

**What:** Above 10 minutes left, show whole minutes only in giant type ("14 min"), and switch to m:ss below 10 min. Oven-clock style: seconds are noise at 40 minutes.
**Why:** Digit height is bounded by *width*. The rule of thumb is a character height of about 0.007 x viewing distance (or 1 inch per 15 ft) ([Extron](https://azwebdev.extron.com/article/videowallfontsize), [the 0.007 rule](https://www.propertycasualty360.com/amp/2003/05/06/qa-007-still-a-secret/)). My arithmetic on the current CSS: on a 390 px-wide portrait phone, `g-time` is about 88 px font-size (`clamp(88px, ...)`), so about 10 mm digits, which by that rule is comfortable at roughly 1.5 m and marginal at 2 m; 3 m needs about 21 mm, which a phone in portrait can't do with "M:SS". Two characters instead of five allows about 2.5 times larger digits (around 130 px, about 15 mm). Landscape or a tablet reaches 3 m; a phone won't. Say so honestly on the landing page rather than promise it.
**Risks:** hiding seconds could feel like a lie ("14 min" for 13:40). Round *up* and show seconds beneath in small text; below 10 min switch to m:ss. Don't pick a rule that hides the last minute.
**Related:** idea 1's layout.

### 9. Keep timers through a page reload [5] . S

**What:** Save each timer's `end` timestamp and label in localStorage (per-site, which is fine for progress) and restore them when Kitchen Mode opens on the same page.
**Why:** A single accidental reload or the site navigating loses every timer silently; `end` is a wall-clock time, so restoring is exact.
**Risks:** two recipes on the same site would collide; key by `location.pathname` plus recipe title. Expired timers should restore as already ringing only if under ~5 min past, else drop.
**Related:** CV-09 (resume). This is its timer half.

### 10. Night kitchen means silent and visual [3, 4] . S once ST-02 exists

**What:** With night kitchen on: no speech, alarm at low gain, the ringing state flashes and (on Android Chrome) uses `navigator.vibrate`. Dark theme forced, glance digits dimmed.
**Why:** Speech and beeps are the two loudest things this tool does; the flag makes both quiet at once. Vibration isn't available in iOS Safari; treat it as a bonus.
**Risks:** silent + missed alarm. The ringing takeover (idea 2) is the safety net; keep it always on.

## Sketches (phone portrait, about 30 columns)

**A. Now / Next (recommended default)**

```
+------------------------------+
|  REST . STEP 4               |
|                              |
|        +-------------+       |
|        |    4:10     |       |
|        +-------------+       |
|  Fry 1:20 . Bake 22:00       |
|                              |
|  Now                         |
|  Leave to rest for 10 mins.  |
|                              |
|  When it rings               |
|  Slice the beef thinly.      |
|                              |
|  tap to see the recipe       |
+------------------------------+
```

**B. Several timers (rows share the screen, soonest biggest)**

```
+------------------------------+
|  NEXT UP                     |
|  REST                        |
|  +-----------------------+   |
|  |        4:10           |   |
|  +-----------------------+   |
|                              |
|  Fry            1:20   [2]   |
|  Bake          22:00   [3]   |
|                              |
|  Now: Leave to rest.         |
|  Then: Slice the beef.       |
+------------------------------+
```

**C. Ringing (always takes over)**

```
+------------------------------+
|  ######## RED SCREEN ####### |
|                              |
|      REST                    |
|      DONE                    |
|                              |
|  Next: Slice the beef thinly |
|                              |
|  [   Stop   ]   [ +2 min ]   |
|                              |
+------------------------------+
```

(Layout for landscape and tablets: digits left, Now/Next stacked right, same content.)

## Also researched: how other tools do it

- **Crouton**: taps a time in a step to start a timer, one step at a time ([MacStories](https://www.macstories.net/reviews/crouton-review-an-elegant-modern-recipe-manager-and-cooking-aid/)). **Cook Mode in other tools** keeps the screen awake and adds larger text and built-in timers ([RecipeKit](https://help.getrecipekit.com/article/786-cook-mode), [Allspice](https://www.allspicelabs.com/docs-guided-cooking/)). **SideChef** adds voice commands and automatic timers ([SideChef](https://www.sidechef.com/about-us/)). **Samsung Food** guided cooking mentions timers and sending settings to an oven ([Samsung](https://www.samsung.com/us/explore/brand/samsung-food/)). I did not find public detail on NYT Cooking's, Paprika's or Mela's cook views (results were thin), so nothing here leans on them.
- **Apple**: Live Activities are meant to be glanceable, with a full-screen presentation in StandBy for reading at a distance ([Apple](https://developer.apple.com/documentation/activitykit/displaying-live-data-with-live-activities)); this is the closest thing to glance mode in the platform.
- **Contrast**: WCAG wants 3:1 for large text, 4.5:1 otherwise ([WCAG 1.4.3 summary](https://wcag.dock.codes/documentation/wcag-success-criteria/wcag143)); the README already meets that everywhere, and glance's dimmed "next" line should be held to 3:1 too.
- **Not fetched**: MDN and developer.chrome.com pages were blocked from this environment, so MDN claims above rest on search snippets. Document PiP (CV-03) is Chrome/Edge 116+ and not in Safari ([Chrome docs](https://developer.chrome.com/docs/web-platform/document-picture-in-picture)); Firefox status is unclear.

## Recommended "do next" (3)

1. **Idea 1 quick version + Idea 2: Now/Next in glance and the big ringing state.** Same layout, one CSS class apart, answers your #1 and fixes the weakest moment (the ring). S together.
2. **Idea 4: background-safe, escalating alarm.** This fixes a real gap (rings past 10 s depend on a throttled timer), needs no new UI, and is mostly a longer booking loop. S.
3. **Idea 3 quick version: session-only glance style (Big / Banner / Off) with the implicit opt-out.** Answers your #2 without touching storage; the persisted version waits for ST-01. S.

Held back on purpose: audioSession (needs a real iPhone and a decision about pausing music), speech changes (need the remote-voice check first), per-timer sounds (wait for DL-05's palette).

## Not verified

Nothing here was run in a browser; iOS behaviour is from docs and bug reports, not a device. Pixel sizes are my arithmetic. Several vendor claims (Alexa/Google commands) come from weak sources and are marked as such.

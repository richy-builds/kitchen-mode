/*
 * Kitchen Mode: turns a recipe page into a big, step-by-step cooking view.
 * Readable source of the bookmarklet. Run `node build.mjs` to rebuild index.html.
 */
(() => {
  if (window.__kitchenMode) { window.__kitchenMode.close(); return; }
  // Only set while km.js runs as a script file, which only the bookmark does ("Try it" runs the code inline).
  const loader = !!document.currentScript?.src;
  // Phones and tablets, as the landing page tells them apart. Counted with each open, and picks the key hints.
  const touch = matchMedia('(pointer: coarse)').matches;

  const h = (tag, props = {}, ...kids) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v);
    }
    for (const kid of kids.flat(Infinity)) {
      if (kid != null && kid !== false) el.append(kid);
    }
    return el;
  };

  const clean = s => (new DOMParser().parseFromString(String(s ?? ''), 'text/html').body.textContent || '')
    .replace(/\s+/g, ' ').trim();

  const toast = msg => {
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'all:initial;position:fixed;left:50%;top:24px;transform:translateX(-50%);z-index:2147483647;' +
      'background:#1f1a14;color:#fff;font:500 16px/1.4 system-ui,sans-serif;padding:12px 18px;border-radius:12px;' +
      'box-shadow:0 8px 30px rgba(0,0,0,.25)';
    document.documentElement.append(t);
    setTimeout(() => t.remove(), 3500);
  };

  // Recipe sites publish schema.org Recipe data for Google; read that rather than the page layout.
  const findRecipe = () => {
    const found = [];
    const visit = n => {
      if (!n || typeof n !== 'object') return;
      if (Array.isArray(n)) { n.forEach(visit); return; }
      if ([].concat(n['@type'] || []).includes('Recipe')) found.push(n);
      visit(n['@graph']);
      visit(n.mainEntity);
    };
    for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
      try { visit(JSON.parse(s.textContent)); } catch {}
    }
    return found.find(r => r.recipeInstructions) || null;
  };

  const getSteps = instructions => {
    const steps = [];
    const walk = (x, section) => {
      if (!x) return;
      if (Array.isArray(x)) { x.forEach(y => walk(y, section)); return; }
      if (typeof x === 'string') {
        x.split(/\n+|<br\s*\/?>|<\/p>|<\/li>/i).forEach(t => walk({ text: t }, section));
        return;
      }
      if (x.itemListElement) { walk(x.itemListElement, clean(x.name) || section); return; }
      const text = clean(x.text || x.name).replace(/^(?:step\s*\d+[.:)]?|\d+[.)])\s+/i, '');
      if (text) steps.push({ text, section });
    };
    walk(instructions, '');
    return steps;
  };

  // One sentence at a time; very short sentences ride along with the one before.
  const splitSentences = text => text.split(/(?<=[.!?])\s+(?=[A-Z0-9"'(“‘])/).reduce((out, s) => {
    if (out.length && s.length < 25) out[out.length - 1] += ' ' + s;
    else out.push(s);
    return out;
  }, []);

  const NUMBER_WORDS = {
    a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    fifteen: 15, twenty: 20, thirty: 30, forty: 40, 'forty-five': 45, 'half a': 0.5, 'half an': 0.5,
  };
  const FRACTIONS = { '½': 0.5, '¼': 0.25, '¾': 0.75, '1/2': 0.5, '1/4': 0.25, '3/4': 0.75 };
  const UNIT = { s: 1, m: 60, h: 3600 };
  // "8–10 mins", "1 hr 30 mins", "1½ hours", "1 1/2 hours", "half an hour", "an hour and a half".
  // Not preceded by a letter, digit or slash, so "1/2 hour" is never read as "2 hour".
  const TIME_RE = /(?<![\w./])((?:\d+(?:\.\d+)?(?!\/))?\s*(?:[½¼¾]|[13]\/[24])|\d+(?:\.\d+)?|half an?|an?|one|two|three|four|five|six|seven|eight|nine|ten|fifteen|twenty|thirty|forty-five|forty)(?:\s*(?:-|–|—|to|or)\s*\d+(?:\.\d+)?)?\s*(secs?|seconds|min(?:ute)?s?|h(?:ou)?rs?)\b(?:\s+(and a half)\b|\s+(?:and\s+)?(\d+)\s*(secs?|seconds|min(?:ute)?s?)\b)?/gi;
  const amount = s => {
    s = s.toLowerCase();
    if (s in NUMBER_WORDS) return NUMBER_WORDS[s];
    const [, whole = 0, frac] = /^(?:(\d+(?:\.\d+)?)(?!\/))?\s*(.*)$/.exec(s);
    return +whole + (FRACTIONS[frac] || 0);
  };
  // Ranges start the timer at the low end, so you check early rather than late.
  const toSeconds = m => {
    const unit = UNIT[m[2][0].toLowerCase()], small = m[4] ? UNIT[m[5][0].toLowerCase()] : unit;
    return amount(m[1]) * unit + (m[3] ? unit / 2 : 0) + (small < unit ? m[4] * small : 0);
  };

  const STOP = new Set(`and or of the to for with into in on at from about plus extra few some small medium large big
    handful pinch dash splash good quality fresh freshly dried ground hot cold warm room temperature chopped finely
    roughly thinly thickly sliced diced grated crushed minced peeled deseeded trimmed halved quartered torn picked
    beaten melted softened cubed shredded rinsed drained cooked uncooked boneless skinless serve serving garnish
    optional taste tbsp tsp tablespoon tablespoons teaspoon teaspoons cup cups can cans tin tins pack packs bunch
    bunches clove cloves rasher rashers sprig sprigs slice slices stick sticks piece pieces litre litres pint pints`
    .split(/\s+/));
  const keywords = s => [...new Set(s.toLowerCase().replace(/\([^()]*\)/g, ' ').replace(/\([^()]*\)/g, ' ').split(/[^a-zà-ÿ]+/)
    .filter(w => w.length >= 3 && !STOP.has(w))
    .map(w => (w.length > 3 ? w.replace(/(?:es|s)$/, '') : w)))];

  const QTY_RE = /^([\d¼-¾⅓-⅞][\d¼-¾⅓-⅞.,/\-–\s]*(?:(?:kg|g|mg|ml|l|litres?|tbsp|tsp|tablespoons?|teaspoons?|cups?|oz|lb|pints?)\b)?)\s*/i;
  const formatIngredient = text => {
    const m = text.match(QTY_RE);
    return m ? [h('b', {}, m[1].trim()), ' ', text.slice(m[0].length)] : [text];
  };

  const duration = iso => {
    const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/.exec(iso || '');
    if (!m) return '';
    // "PT90M" reads as "1 hr 30 min".
    const mins = (+(m[1] || 0) * 24 + +(m[2] || 0)) * 60 + +(m[3] || 0), hrs = Math.floor(mins / 60);
    return [hrs && `${hrs} hr`, mins % 60 && `${mins % 60} min`].filter(Boolean).join(' ');
  };

  const recipe = findRecipe();
  const steps = recipe ? getSteps(recipe.recipeInstructions).map(s => ({ ...s, sentences: splitSentences(s.text) })) : [];

  // One anonymous count per open: the site's name, whether it found a recipe, the build date (installed copies
  // never update), whether the bookmark loaded it from km.js, and whether it's a touch screen. No page address and no ID.
  // See "Usage counts" in the README.
  try {
    if (location.hostname) fetch('%COUNT_URL%', {
      method: 'POST', mode: 'no-cors', credentials: 'omit', keepalive: true, referrerPolicy: 'no-referrer',
      body: JSON.stringify({
        api_key: '%POSTHOG_KEY%', event: 'kitchen_mode_opened', distinct_id: Math.random().toString(36).slice(2),
        properties: { site: location.hostname.replace(/^www\./, ''), found: steps.length > 0, build: '%BUILD%', loader,
          touch, $process_person_profile: false },
      }),
    }).catch(() => {});
  } catch {}
  if (!steps.length) { toast("Kitchen Mode couldn't find a recipe on this page."); return; }

  const title = clean(recipe.name) || document.title;
  // Some sites (Barefoot Contessa) pack the whole list into one newline-separated string.
  const ingredients = [].concat(recipe.recipeIngredient || recipe.ingredients || [])
    .flatMap(s => String(s ?? '').split(/\n+/)).map(clean).filter(Boolean);
  const yieldText = String([].concat(recipe.recipeYield || [])[0] ?? '').trim();
  const [prep, cookTime, total] = [recipe.prepTime, recipe.cookTime, recipe.totalTime].map(duration);
  const meta = [
    yieldText && (/^\d+$/.test(yieldText) ? `Serves ${yieldText}` : clean(yieldText)),
    prep && `Prep ${prep}`,
    cookTime && `Cook ${cookTime}`,
    !prep && !cookTime && total && `Total ${total}`,
  ].filter(Boolean).join(' · ');
  const image = (() => {
    let i = [].concat(recipe.image || [])[0];
    if (i && typeof i === 'object') i = i.url || i.contentUrl;
    return typeof i === 'string' ? i : '';
  })();

  // Match ingredients to a sentence by their distinctive words ("hot chicken stock" -> chicken, stock).
  const ingredientKeys = ingredients.map(keywords);
  const keyCount = {};
  ingredientKeys.flat().forEach(k => { keyCount[k] = (keyCount[k] || 0) + 1; });
  const matchKeys = ingredientKeys.map(ks => {
    const unique = ks.filter(k => keyCount[k] === 1);
    return unique.length ? unique : ks.slice(-1);
  });
  const neededFor = sentence => {
    const t = sentence.toLowerCase();
    return ingredients.filter((_, i) => matchKeys[i].some(k => new RegExp('\\b' + k).test(t)));
  };

  /* ---------- before you start ---------- */
  // What the recipe takes as already done, listed before step 1: an ingredient that goes in cooked, softened or
  // soaked, a step that uses "the cooked rice" when no earlier step mentions rice, a long wait, or a preheated oven
  // that no step turns on. Words after "until" ("until cooked through") describe the end of a step, so they don't count.
  const READY = 'cooked|cooled|chilled|softened|melted|toasted|soaked|marinated|boiled|leftover|defrosted|thawed|room temperature';
  // Toasted sesame oil comes toasted from the shop.
  const READY_RE = new RegExp(`\\b(?:${READY})\\b(?! sesame oil)`, 'i');
  // "the cooked basmati rice and…": up to three words after the ready word, stopping where the next phrase starts.
  const NEXT = '(?!(?:the|a|an|and|or|but|so|is|are|was|were|will|should|can|has|have|it|that|which|if|when|while|with|to|into|in|on|onto|over|of|off|up|out|by|for|from|at|as|then|until|before|after|back|through|together)\\b)';
  const USES_RE = new RegExp(`\\b(?:the|your|some|leftover)\\s+(?:[a-z-]+\\s+)?(?:${READY})\\s+(?!sesame oil)` +
    `(${NEXT}[a-z-]+(?:\\s+${NEXT}(?![a-z-]+ly\\b)[a-z-]+){0,2})`, 'gi');
  const WAIT_RE = /\b(?:chill|marinat|soak|rest|refrigerat|fridge|freez|prove|proof|rise|infuse|steep|cool|stand)/i;
  const LONG_RE = /\bovernight\b|\b(?:the )?(?:day|night) before\b/i;
  // Storage notes at the end of a method ("Defrost overnight in the fridge") aren't part of cooking it.
  const STORE_RE = /\b(?:store|storage|from frozen|leftovers|keeps?|reheat)\b/i;
  const WANTS_HOT = /\bpre-?heated\s+(oven|grill|broiler)\b|\b(oven|grill|broiler)\b[^.]{0,30}\bpre-?heated\b/i;
  const TURNS_ON = /\bpre-?heat(?!ed)|\bheat (?:the |your |an? )?(?:oven|grill|broiler)|\b(?:oven|grill|broiler)\s+(?:on\b|to\s+\d)|\bturn on (?:the )?(?:oven|grill)/i;
  const TEMP_RE = /\b\d{2,3}\s?°?\s?[CF]\b(?:\s?fan)?|\bgas(?: mark)? \d\b/i;
  const before = [];
  const readyIngs = ingredients.filter(i => READY_RE.test(i));
  readyIngs.forEach(i => before.push({ tag: 'Have ready', body: formatIngredient(i) }));
  let earlier = '';
  const waited = new Set();
  steps.forEach((s, si) => s.sentences.forEach(sentence => {
    for (const m of sentence.matchAll(USES_RE)) {
      // Any of its words mentioned earlier, or in a ready ingredient, means the recipe already covers it.
      const words = m[1].toLowerCase().split(/\s+/).map(w => new RegExp('\\b' + w.replace(/(?:es|s)$/, ''), 'i'));
      if (!words.some(w => w.test(earlier) || readyIngs.some(i => w.test(i)))) {
        before.push({ tag: `Step ${si + 1} uses`, body: m[0].replace(/^(?:your|some)\s+/i, 'the ') });
      }
    }
    // A wait word after "until" ("bake for 1 hr until risen") describes the end of a step, not a wait.
    const long = !waited.has(si) && !STORE_RE.test(sentence) && (LONG_RE.test(sentence) ||
      (WAIT_RE.test(sentence.split(/\buntil\b/i)[0]) && [...sentence.matchAll(TIME_RE)].some(m => toSeconds(m) >= 3600)));
    if (long) { waited.add(si); before.push({ tag: `Long wait · step ${si + 1}`, body: sentence }); }
    earlier += ' ' + sentence;
  }));
  const hotStep = steps.findIndex(s => WANTS_HOT.test(s.text));
  if (hotStep >= 0 && !steps.some(s => TURNS_ON.test(s.text))) {
    const [, a, b] = WANTS_HOT.exec(steps[hotStep].text);
    const temp = steps.map(s => s.text.match(TEMP_RE)?.[0]).find(Boolean);
    before.push({
      tag: (a || b)[0].toUpperCase() + (a || b).slice(1).toLowerCase(),
      body: `Heat it${temp ? ` to ${temp}` : ''} now. Step ${hotStep + 1} wants it hot, and no step says to turn it on.`,
    });
  }

  const beats = [];
  steps.forEach((s, si) => s.sentences.forEach((_, bi) => beats.push({ si, bi })));
  let pos = -1; // -1 = ingredients overview, beats.length = finished
  const ticked = new Set();
  const origTitle = document.title;

  /* ---------- timers ---------- */
  const timers = [];
  let audio;
  const unlockAudio = () => {
    try { audio ||= new (window.AudioContext || window.webkitAudioContext)(); audio.resume(); } catch {}
  };
  // Three short beeps at `at` on the audio clock, into the timer's own output so cancelling it silences them.
  // A square wave near 1.8 kHz, like a kitchen timer's buzzer: phone speakers and ears both favour it over a low sine.
  const beep = (out, at = audio?.currentTime) => {
    if (!audio || !out) return;
    [0, 0.25, 0.5].forEach(d => {
      const osc = audio.createOscillator(), gain = audio.createGain();
      osc.type = 'square';
      osc.frequency.value = 1760;
      gain.gain.setValueAtTime(0.0001, at + d);
      gain.gain.exponentialRampToValueAtTime(0.25, at + d + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + d + 0.2);
      osc.connect(gain).connect(out);
      osc.start(at + d);
      osc.stop(at + d + 0.22);
    });
  };
  // After the alarm, a voice says which timer it was: two timers ringing the same buzzer is easy to muddle.
  // Speech needs no permission. It can't be booked on the audio clock, so in a background tab it may come late.
  const say = text => {
    try {
      const u = new SpeechSynthesisUtterance(text);
      const lang = document.documentElement.lang;
      u.lang = /^en\b/i.test(lang) ? lang : 'en';
      speechSynthesis.speak(u);
    } catch {}
  };
  let voiceReady = false;
  // iOS only speaks later if something was spoken during a tap first.
  const unlockVoice = () => {
    if (voiceReady) return;
    voiceReady = true;
    try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); } catch {}
  };
  // A timer is named after the cooking verb nearest before its time ("Leave to rest for 10 mins" -> Rest).
  const VERB_RE = /\b(bake|roast|boil|simmer|cook|fry|grill|griddle|broil|rest|chill|marinate|soak|steam|poach|blanch|toast|brown|sear|braise|reduce|stir|whisk|knead|prove|proof|rise|cool|stand|microwave|saut[eé]|caramelise|caramelize|soften|melt|bubble|char|freeze|steep|infuse|blitz|blend|mix|beat)(?:s|ing)?\b/gi;
  const verbBefore = text => {
    const m = [...text.matchAll(VERB_RE)].pop();
    return m ? m[1][0].toUpperCase() + m[1].slice(1).toLowerCase() : '';
  };
  const clock = secs => {
    const s = Math.max(0, Math.ceil(secs));
    const hrs = Math.floor(s / 3600), mins = Math.floor((s % 3600) / 60), rest = String(s % 60).padStart(2, '0');
    return hrs ? `${hrs}:${String(mins).padStart(2, '0')}:${rest}` : `${mins}:${rest}`;
  };
  let ringingTitle = false;
  const tick = () => {
    const now = Date.now();
    for (const t of timers) {
      const left = (t.end - now) / 1000;
      if (left <= 0 && !t.ringing) {
        t.ringing = true;
        t.el.classList.add('ringing');
        // After the first three beeps.
        setTimeout(() => { if (timers.includes(t)) say(t.speech); }, 900);
      }
      t.time.textContent = t.ringing ? "Time's up!" : clock(left);
      if (t.ringing && now - t.lastBeep > 2500) { t.lastBeep = now; beep(t.out); }
    }
    const ringing = timers.some(t => t.ringing);
    if (ringing !== ringingTitle) {
      ringingTitle = ringing;
      document.title = ringing ? `⏰ Time's up! ${origTitle}` : origTitle;
    }
    glanceTick(now, ringing);
  };

  /* ---------- glance mode ---------- */
  // With a timer running and the screen left alone for a while, the countdown grows to be read from across
  // the room, with the current sentence still underneath. A tap or any key brings the full view back.
  const IDLE_MS = 10000;
  let lastTouch = Date.now(), glancing = false;
  const glanceName = h('div', { class: 'g-name' });
  const glanceTime = h('div', { class: 'g-time' });
  const glanceMore = h('div', { class: 'g-more' });
  const glanceNow = h('p', { class: 'g-now' });
  const glance = h('div', { class: 'glance', onclick: e => { e.stopPropagation(); wake(); } },
    glanceName, glanceTime, glanceMore, glanceNow);
  const wake = () => {
    lastTouch = Date.now();
    if (glancing) { glancing = false; glance.classList.remove('on'); }
  };
  const glanceTick = (now, ringing) => {
    const running = timers.filter(t => !t.ringing).sort((a, b) => a.end - b.end);
    const on = !minimised && !ringing && running.length > 0 && now - lastTouch > IDLE_MS;
    if (on !== glancing) {
      glancing = on;
      glance.classList.toggle('on', on);
      const beat = beats[pos];
      // Word joiners keep a range like "8–10" on one line.
      glanceNow.textContent = beat ? steps[beat.si].sentences[beat.bi].replace(/(\d)\s*([–-])\s*(\d)/g, '$1\u2060$2\u2060$3') : '';
    }
    if (!on) return;
    const [first, ...rest] = running;
    glanceName.textContent = first.label;
    glanceTime.textContent = clock((first.end - now) / 1000);
    glanceMore.textContent = rest.map(t => `${t.label} ${clock((t.end - now) / 1000)}`).join('  ·  ');
  };
  // A time in the text shows as started for as long as its timer runs, across screens.
  const syncChips = () => stage.querySelectorAll('.chip').forEach(c =>
    c.classList.toggle('started', timers.some(t => t.key === c.dataset.key)));
  const removeTimer = t => {
    const i = timers.indexOf(t);
    if (i < 0) return;
    timers.splice(i, 1);
    t.out?.disconnect();
    if (t.ringing) try { speechSynthesis.cancel(); } catch {}
    t.el.remove();
    syncChips();
    tick();
    if (minimised && !timers.length) close();
  };
  const startTimer = (secs, label, key, speech) => {
    if (timers.some(t => t.key === key)) return;
    unlockAudio();
    unlockVoice();
    const t = { key, label, speech, end: Date.now() + secs * 1000, ringing: false, lastBeep: 0 };
    if (audio) {
      // Book the first rings on the audio clock as well: browsers slow down timers in background tabs, but not audio.
      t.out = audio.createGain();
      t.out.connect(audio.destination);
      for (let i = 0; i < 4; i++) beep(t.out, audio.currentTime + secs + i * 2.5);
      t.lastBeep = t.end + 7500;
    }
    t.time = h('span', { class: 'time' }, clock(secs));
    t.el = h('div', {
      class: 'timer',
      onclick: e => { e.stopPropagation(); if (t.ringing) removeTimer(t); else if (minimised) open(); },
    },
      h('span', { class: 'label' }, label),
      t.time,
      h('button', { class: 'cancel', title: 'Cancel timer', onclick: e => { e.stopPropagation(); removeTimer(t); } }, '✕'));
    timers.push(t);
    tray.append(t.el);
    syncChips();
    tick();
  };
  const tickId = setInterval(tick, 250);

  const withTimers = (text, si, bi) => {
    const out = [];
    let last = 0;
    for (const m of text.matchAll(TIME_RE)) {
      const secs = Math.round(toSeconds(m));
      if (!(secs > 0)) continue;
      const key = `${si}.${bi}.${m.index}`;
      const verb = verbBefore(text.slice(0, m.index));
      const label = verb ? `Step ${si + 1} · ${verb}` : `Step ${si + 1}`;
      const speech = `${verb ? `${verb}, step` : 'Step'} ${si + 1}. Time's up.`;
      out.push(text.slice(last, m.index), h('button', {
        class: timers.some(t => t.key === key) ? 'chip started' : 'chip',
        'data-key': key,
        onclick: e => { e.stopPropagation(); startTimer(secs, label, key, speech); },
      }, '⏱︎ ', m[0]));
      last = m.index + m[0].length;
    }
    out.push(text.slice(last));
    return out;
  };

  /* ---------- screens ---------- */
  const fontSize = n =>
    n < 110 ? 'clamp(28px, min(4.4vw, 7vh), 64px)'
    : n < 240 ? 'clamp(24px, min(3.4vw, 5.6vh), 52px)'
    : n < 420 ? 'clamp(21px, min(2.8vw, 4.6vh), 42px)'
    : 'clamp(19px, min(2.2vw, 3.8vh), 34px)';

  const overview = () => h('section', { class: 'overview' },
    h('div', {},
      h('div', { class: 'eyebrow' }, 'Kitchen Mode'),
      h('h1', {}, title),
      meta && h('div', { class: 'meta' }, meta),
      before.length > 0 && h('div', { class: 'before' }, h('div', { class: 'stub' },
        h('div', { class: 'eyebrow' }, 'Before you start'),
        h('ul', {}, before.map(b => h('li', {}, h('span', { class: 'tag' }, b.tag), h('span', {}, b.body)))))),
      ingredients.length && [
        h('div', { class: 'eyebrow' }, 'Ingredients', h('span', { class: 'soft' }, ' · tap to tick off')),
        h('ul', { class: 'ings' }, ingredients.map((ing, i) => h('li', {
          class: ticked.has(i) ? 'ticked' : '',
          onclick: e => {
            e.stopPropagation();
            if (ticked.has(i)) ticked.delete(i); else ticked.add(i);
            e.currentTarget.classList.toggle('ticked');
          },
        }, h('span', { class: 'box' }), h('span', {}, formatIngredient(ing))))),
      ],
      h('button', { class: 'primary', onclick: e => { e.stopPropagation(); next(); } }, 'Start cooking →')),
    image && h('img', { class: 'hero', src: image, alt: '' }));

  const cooking = () => {
    const { si, bi } = beats[pos];
    const step = steps[si];
    const need = neededFor(step.sentences[bi]);
    return h('section', { class: 'cook' },
      h('div', {},
        h('div', { class: 'eyebrow' }, `Step ${si + 1} of ${steps.length}`, step.section && ` · ${step.section}`),
        h('p', { class: 'step', style: `font-size:${fontSize(step.text.length)}` },
          step.sentences.map((s, i) => [
            h('span', { class: i === bi ? 's on' : i < bi ? 's past' : 's' }, withTimers(s, si, i)), ' ',
          ]))),
      h('aside', { class: 'need' }, h('div', { class: 'stub' },
        h('div', { class: 'eyebrow' }, "You'll need"),
        need.length
          ? h('ul', {}, need.map(i => h('li', {}, formatIngredient(i))))
          : h('p', { class: 'none' }, 'Nothing new for this bit'))));
  };

  const finished = () => h('section', { class: 'done' },
    h('div', { class: 'receipt' }, h('div', { class: 'stub' },
      h('div', { class: 'head' }, h('span', {}, title), h('span', {}, `${steps.length}/${steps.length}`)),
      h('div', { class: 'eyebrow' }, 'All steps done'),
      h('h2', {}, 'Enjoy!'),
      h('div', { class: 'row' },
        h('button', { onclick: e => { e.stopPropagation(); pos = -1; render(); } }, 'Start again'),
        h('button', { class: 'primary', onclick: e => { e.stopPropagation(); close(); } }, 'Close Kitchen Mode')))));

  /* ---------- shell ---------- */
  const bars = steps.map(() => h('i', {}, h('b')));
  const pill = h('span', { class: 'pill' }, '');
  const tray = h('div', { class: 'timers' });
  const stage = h('main', {
    class: 'stage',
    onclick: e => {
      if (e.target.closest('button, li')) return;
      const r = stage.getBoundingClientRect();
      (e.clientX - r.left < r.width * 0.3 ? back : next)();
    },
  });
  const root = h('div', { class: 'km' },
    h('header', {},
      h('div', { class: 'title' }, '🍳 ', title),
      pill,
      h('button', { class: 'x', title: 'Close (Esc)', onclick: () => close() }, '✕')),
    h('div', { class: 'progress' }, bars),
    stage,
    h('footer', {},
      h('button', { class: 'reopen', onclick: e => { e.stopPropagation(); open(); } }, 'Back to Kitchen Mode'),
      tray,
      h('div', { class: 'hint' }, touch
        ? 'Tap right → next · tap left ← back'
        : 'Space or tap → next · ← back · T timer · Esc close')),
    glance);

  const render = () => {
    stage.replaceChildren(pos < 0 ? overview() : pos >= beats.length ? finished() : cooking());
    bars.forEach((bar, si) => {
      const total = steps[si].sentences.length;
      const doneCount = beats.filter((b, i) => b.si === si && i <= pos).length;
      bar.firstChild.style.width = `${(doneCount / total) * 100}%`;
    });
    const on = stage.querySelector('.s.on');
    stage.scrollTo({ top: on ? on.offsetTop - stage.clientHeight / 2 + on.offsetHeight / 2 : 0, behavior: 'smooth' });
  };
  const next = () => { if (pos < beats.length) { pos++; render(); } };
  const back = () => { if (pos > -1) { pos--; render(); } };

  /* ---------- keep the screen on ---------- */
  let lock = null, wantLock = true;
  const setAwake = on => {
    pill.textContent = on ? '☀︎ Screen stays on' : '☾ Screen may sleep';
    pill.classList.toggle('off', !on);
  };
  const getLock = async () => {
    if (!('wakeLock' in navigator)) { setAwake(false); return; }
    try {
      const l = await navigator.wakeLock.request('screen');
      // Closed while the request was pending, or a second request won the race.
      if (!wantLock || lock) { l.release().catch(() => {}); return; }
      lock = l;
      setAwake(true);
      l.addEventListener('release', () => { lock = null; setAwake(false); });
    } catch { setAwake(false); }
  };
  const onVisible = () => {
    if (document.visibilityState !== 'visible') return;
    if (wantLock && !lock) getLock();
    audio?.resume().catch(() => {});
  };

  /* ---------- input ---------- */
  const NEXT_KEYS = [' ', 'ArrowRight', 'ArrowDown', 'PageDown', 'Enter'];
  const BACK_KEYS = ['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'];
  const onKey = e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    wake();
    const k = e.key;
    // Enter and Space press a button that has keyboard focus, rather than moving on.
    if ((k === 'Enter' || k === ' ') && e.composedPath()[0]?.tagName === 'BUTTON') return;
    const ringing = timers.filter(t => t.ringing);
    if (NEXT_KEYS.includes(k)) { if (!e.repeat) next(); }
    else if (BACK_KEYS.includes(k)) { if (!e.repeat) back(); }
    // Esc stops a ringing timer first, the way you'd reach for it, and only then closes.
    else if (k === 'Escape') { if (ringing.length) ringing.forEach(removeTimer); else close(); }
    else if (k === 't' || k === 'T') { if (!e.repeat) stage.querySelector('.s.on .chip:not(.started)')?.click(); }
    else return;
    e.preventDefault();
    e.stopImmediatePropagation();
  };
  let touchX = null;
  stage.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
  stage.addEventListener('touchend', e => {
    if (touchX == null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    touchX = null;
    if (Math.abs(dx) > 60) (dx < 0 ? next : back)();
  });
  root.addEventListener('pointerdown', wake, true);
  root.addEventListener('wheel', wake, { capture: true, passive: true });
  // Stop buttons taking focus, so Space always means "next" rather than "press that button again".
  root.addEventListener('mousedown', e => { if (e.target.closest('button')) e.preventDefault(); });

  /* ---------- mount ---------- */
  const host = document.createElement('kitchen-mode');
  const place = where => { host.style.cssText = `all:initial;position:fixed;${where};z-index:2147483647;display:block;`; };
  place('inset:0');
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.append(h('style', {}, `
:host { --bg:#fbf7f0; --panel:#f3ecdf; --ink:#1f1a14; --soft:#6b5f52; --line:#e6dccb; --dash:#d6c8b2; --accent:#d92d20; --on-accent:#fff; --accent-deep:#821b13; --chip:#ffe9b8; --amber:#ffb020; --on-amber:#1f1a14; --ring:#d92d20; --on-ring:#fff; --stub:#fff; --clip:linear-gradient(#63686e,#2b2e32); --shadow:rgb(52 36 20 / .2); --mono:ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,"Liberation Mono",monospace; }
@media (prefers-color-scheme: dark) { :host { --bg:#15120e; --panel:#221c16; --ink:#f5eee4; --soft:#a3978a; --line:#352c23; --dash:#4a3f33; --accent:#ff7a6b; --on-accent:#15120e; --accent-deep:#99493f; --chip:#4a3510; --ring:#ff7a6b; --on-ring:#15120e; --stub:#2a231c; --clip:linear-gradient(#a3a8ae,#4a4e53); --shadow:rgb(0 0 0 / .5); } }
* { box-sizing:border-box; }
.km { position:absolute; inset:0; display:grid; grid-template-columns:minmax(0,1fr); grid-template-rows:auto auto minmax(0,1fr) auto; background:var(--bg); color:var(--ink); font:400 18px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; -webkit-font-smoothing:antialiased; user-select:none; -webkit-user-select:none; }
button { font:inherit; color:inherit; cursor:pointer; border:0; background:none; padding:0; }
header { display:flex; align-items:center; gap:14px; padding:14px clamp(16px,3vw,40px); }
.title { flex:1; min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font:600 14px/1.2 var(--mono); letter-spacing:.06em; text-transform:uppercase; }
.pill { font:600 12px/1 var(--mono); letter-spacing:.08em; text-transform:uppercase; padding:8px 12px; border-radius:999px; background:var(--panel); color:var(--soft); white-space:nowrap; }
.pill.off { background:var(--ink); color:var(--bg); }
.x { width:40px; height:40px; border-radius:50%; background:var(--panel); font-size:15px; flex:none; }
.progress { display:flex; gap:6px; margin:0 clamp(16px,3vw,40px); padding-bottom:14px; border-bottom:2px dashed var(--dash); }
.progress i { flex:1; height:6px; border-radius:3px; background:var(--line); overflow:hidden; }
.progress b { display:block; height:100%; width:0; background:var(--accent); transition:width .3s; }
.stage { position:relative; overflow:auto; padding:clamp(20px,5vh,56px) clamp(16px,4vw,64px); }
.eyebrow { font:700 13px/1.3 var(--mono); letter-spacing:.1em; text-transform:uppercase; color:var(--accent); margin-bottom:14px; }
.soft { color:var(--soft); font-weight:500; letter-spacing:0; text-transform:none; }
.overview { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,.75fr); gap:clamp(24px,4vw,64px); align-items:start; max-width:1240px; margin:0 auto; }
.overview h1 { margin:0 0 14px; font-size:clamp(34px,4.6vw,62px); line-height:1.04; font-weight:800; letter-spacing:-.02em; }
.meta { margin-bottom:32px; font:600 14px/1.4 var(--mono); letter-spacing:.06em; text-transform:uppercase; color:var(--soft); }
.ings { list-style:none; padding:0; margin:0 0 32px; columns:2 240px; column-gap:36px; }
.ings li { break-inside:avoid; display:flex; gap:12px; align-items:flex-start; padding:10px 0; font-size:clamp(18px,1.8vw,23px); line-height:1.3; border-bottom:1px dashed var(--dash); cursor:pointer; }
.box { flex:none; width:22px; height:22px; margin-top:2px; border-radius:50%; border:2px solid var(--soft); display:grid; place-items:center; font-size:13px; }
.ticked { color:var(--soft); }
.ticked span:last-child { text-decoration:line-through; }
.ticked .box { background:var(--accent); border-color:var(--accent); }
.ticked .box::after { content:"\\2713"; color:var(--on-accent); font-weight:800; }
.hero { width:100%; aspect-ratio:4/3; object-fit:cover; border-radius:12px; background:var(--panel); }
.primary { background:var(--accent); color:var(--on-accent); font-weight:700; font-size:19px; padding:15px 26px; border-radius:10px; box-shadow:0 4px 0 var(--accent-deep); }
.cook { display:grid; grid-template-columns:minmax(0,1fr) minmax(220px,.38fr); gap:clamp(16px,2.5vw,40px); max-width:1400px; min-height:100%; margin:0 auto; align-items:center; }
.cook > div { align-self:stretch; display:flex; flex-direction:column; justify-content:center; padding-right:clamp(16px,2.5vw,40px); border-right:2px dashed var(--dash); }
.step { margin:0; font-weight:520; line-height:1.3; letter-spacing:-.005em; text-wrap:pretty; }
.s { opacity:.5; transition:opacity .25s; }
.s.past { opacity:.55; }
.s.on { opacity:1; }
.chip { display:inline; background:var(--chip); color:var(--ink); font-weight:650; padding:0 .28em; border-radius:.3em; white-space:nowrap; }
.chip.started { background:var(--amber); color:var(--on-amber); }
.need, .receipt, .before { position:relative; padding-top:12px; filter:drop-shadow(0 14px 18px var(--shadow)); }
.need::before, .receipt::before, .before::before { content:""; position:absolute; top:0; left:50%; z-index:1; width:56px; height:22px; margin-left:-28px; border-radius:4px; background:var(--clip); }
.stub { background:var(--stub); padding:24px 26px 38px; -webkit-mask:conic-gradient(from -45deg at bottom,#0000,#000 1deg 89deg,#0000 90deg) 50%/18px 100%; mask:conic-gradient(from -45deg at bottom,#0000,#000 1deg 89deg,#0000 90deg) 50%/18px 100%; }
.need .eyebrow, .before .eyebrow { color:var(--soft); padding-bottom:12px; border-bottom:2px dashed var(--dash); }
.need ul, .before ul { list-style:none; margin:0; padding:0; }
.before { max-width:640px; margin-bottom:36px; }
.before li { display:grid; grid-template-columns:150px minmax(0,1fr); gap:3px 14px; align-items:baseline; padding:9px 0; font-size:clamp(17px,1.6vw,21px); line-height:1.3; }
.before li + li { border-top:1px dashed var(--dash); }
.before .tag { font:700 12px/1.3 var(--mono); letter-spacing:.08em; text-transform:uppercase; color:var(--accent); }
.need li { font-size:clamp(19px,1.9vw,26px); line-height:1.25; padding:9px 0; }
.need li + li { border-top:1px dashed var(--dash); }
.none { color:var(--soft); margin:0; font-size:18px; }
.done { min-height:100%; display:grid; place-items:center; }
.receipt { width:min(480px,100%); }
.receipt .stub { padding:24px 26px 44px; text-align:center; }
.receipt .head { display:flex; justify-content:space-between; gap:12px; padding-bottom:12px; border-bottom:2px dashed var(--dash); font:600 12px/1.3 var(--mono); letter-spacing:.06em; text-transform:uppercase; color:var(--soft); text-align:left; }
.receipt .head span:first-child { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.receipt .eyebrow { margin:32px 0 4px; }
.done h2 { margin:0 0 32px; font-size:clamp(40px,5.5vw,72px); line-height:1.1; font-weight:800; letter-spacing:-.02em; }
.row { display:flex; gap:12px; justify-content:center; padding-top:24px; border-top:2px dashed var(--dash); flex-wrap:wrap; }
.row button:not(.primary) { padding:13px 22px; border:2px solid var(--ink); border-radius:10px; font-size:18px; font-weight:700; }
footer { display:flex; align-items:center; gap:16px; padding:10px clamp(16px,3vw,40px) 16px; min-height:68px; }
.timers { flex:1; display:flex; gap:10px; flex-wrap:wrap; }
.timer { display:flex; align-items:center; gap:10px; background:var(--amber); color:var(--on-amber); border-radius:8px; padding:6px 6px 6px 14px; font:700 13px/1 var(--mono); letter-spacing:.08em; text-transform:uppercase; }
.timer .time { font-size:22px; letter-spacing:0; font-variant-numeric:tabular-nums; }
.timer .cancel { width:32px; height:32px; border-radius:6px; font-size:13px; background:rgb(31 26 20 / .1); }
.timer.ringing { background:var(--ring); color:var(--on-ring); cursor:pointer; padding-right:16px; animation:pulse 1s ease-in-out infinite; }
.timer.ringing .cancel { display:none; }
.timer.ringing::after { content:"tap to stop"; font-size:12px; }
@keyframes pulse { 50% { transform:scale(1.05); } }
.hint { color:var(--soft); font:400 12px/1.3 var(--mono); white-space:nowrap; }
.glance { display:none; position:absolute; inset:0; z-index:2; background:var(--bg); padding:24px clamp(16px,4vw,64px); place-content:center; justify-items:center; gap:clamp(14px,3vh,28px); text-align:center; cursor:pointer; animation:fade .5s ease-out; }
.glance.on { display:grid; }
.g-name { font:700 clamp(18px,2.6vw,30px)/1.2 var(--mono); letter-spacing:.1em; text-transform:uppercase; color:var(--accent); }
.g-time { font:700 clamp(88px,min(22vw,38vh),300px)/1 var(--mono); font-variant-numeric:tabular-nums; letter-spacing:-.03em; background:var(--amber); color:var(--on-amber); border-radius:.1em; padding:.06em .22em; }
.g-more { font:600 clamp(15px,1.8vw,22px)/1.3 var(--mono); color:var(--soft); font-variant-numeric:tabular-nums; }
.g-more:empty { display:none; }
.g-now { margin:0; max-width:34ch; font-size:clamp(19px,2.2vw,30px); line-height:1.3; font-weight:520; text-wrap:pretty; }
.g-now:empty { display:none; }
@keyframes fade { from { opacity:0; } }
@media (prefers-reduced-motion: reduce) { .glance { animation:none; } }
.reopen { display:none; }
.km.mini { position:static; display:block; background:none; }
.mini header, .mini .progress, .mini .stage, .mini .hint, .mini .glance { display:none; }
.mini footer { flex-direction:column; align-items:flex-end; gap:8px; min-height:0; padding:0; }
.mini .timers { flex-direction:column; align-items:flex-end; }
.mini .timer, .mini .reopen { box-shadow:0 8px 24px rgb(0 0 0 / .3); cursor:pointer; }
.mini .reopen { display:block; padding:10px 14px; border-radius:999px; background:var(--ink); color:var(--bg); font:600 12px/1 var(--mono); letter-spacing:.08em; text-transform:uppercase; }
@media (max-width: 820px) {
  .overview, .cook { grid-template-columns:1fr; align-items:start; }
  .cook > div { padding:0 0 24px; border-right:0; border-bottom:2px dashed var(--dash); }
  .title { font-size:12px; letter-spacing:.04em; }
  .pill { font-size:11px; padding:7px 10px; }
  .hero, .hint { display:none; }
  .before li { grid-template-columns:1fr; }
}
`), root);
  document.documentElement.append(host);

  const prevOverflow = document.documentElement.style.overflow;
  let watcher = null, minimised = false;
  const open = () => {
    minimised = false;
    root.classList.remove('mini');
    place('inset:0');
    document.documentElement.style.overflow = 'hidden';
    document.activeElement?.blur?.();
    window.addEventListener('keydown', onKey, true);
    // Android's back gesture closes Kitchen Mode instead of leaving the recipe page.
    // CloseWatcher is Chrome 120+ only; unlike pushState it leaves the site's own history alone.
    watcher = window.CloseWatcher ? new CloseWatcher() : null;
    if (watcher) watcher.onclose = () => close();
    render();
  };
  // Closing never loses a running timer: the timers move to a corner of the page and ring there as usual.
  // Tapping one brings Kitchen Mode back where you left it, and stopping the last one closes it for good.
  const close = () => {
    window.removeEventListener('keydown', onKey, true);
    watcher?.destroy();
    watcher = null;
    document.documentElement.style.overflow = prevOverflow;
    if (timers.length) {
      minimised = true;
      root.classList.add('mini');
      place('right:12px;bottom:12px');
      return;
    }
    wantLock = false;
    lock?.release().catch(() => {});
    clearInterval(tickId);
    document.removeEventListener('visibilitychange', onVisible);
    host.remove();
    document.title = origTitle;
    audio?.close?.();
    try { speechSynthesis.cancel(); } catch {}
    delete window.__kitchenMode;
  };
  document.addEventListener('visibilitychange', onVisible);
  getLock();
  open();
  // Running the bookmark again closes Kitchen Mode, or brings it back if only its timers are showing.
  window.__kitchenMode = { close: () => (minimised ? open() : close()) };
})();

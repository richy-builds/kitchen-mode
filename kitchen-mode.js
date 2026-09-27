/*
 * Kitchen Mode: turns a recipe page into a big, step-by-step cooking view.
 * Readable source of the bookmarklet. Run `node build.mjs` to rebuild index.html.
 */
(() => {
  if (window.__kitchenMode) { window.__kitchenMode.close(); return; }

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
    fifteen: 15, twenty: 20, thirty: 30, forty: 40, 'forty-five': 45,
  };
  const TIME_RE = /\b(\d+(?:\.\d+)?|an?|one|two|three|four|five|six|seven|eight|nine|ten|fifteen|twenty|thirty|forty-five|forty)(?:\s*(?:-|–|—|to|or)\s*\d+(?:\.\d+)?)?\s*(secs?|seconds|min(?:ute)?s?|h(?:ou)?rs?)\b/gi;
  // Ranges start the timer at the low end, so you check early rather than late.
  const toSeconds = m => (NUMBER_WORDS[m[1].toLowerCase()] ?? parseFloat(m[1])) *
    ({ s: 1, m: 60, h: 3600 })[m[2][0].toLowerCase()];

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
    const hrs = +(m[1] || 0) * 24 + +(m[2] || 0), mins = +(m[3] || 0);
    return [hrs && `${hrs} hr`, mins && `${mins} min`].filter(Boolean).join(' ');
  };

  const recipe = findRecipe();
  const steps = recipe ? getSteps(recipe.recipeInstructions).map(s => ({ ...s, sentences: splitSentences(s.text) })) : [];
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
  const beep = () => {
    if (!audio) return;
    const now = audio.currentTime;
    [0, 0.25, 0.5].forEach(t => {
      const osc = audio.createOscillator(), gain = audio.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, now + t);
      gain.gain.exponentialRampToValueAtTime(0.5, now + t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.2);
      osc.connect(gain).connect(audio.destination);
      osc.start(now + t);
      osc.stop(now + t + 0.22);
    });
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
      if (left <= 0 && !t.ringing) { t.ringing = true; t.el.classList.add('ringing'); }
      t.time.textContent = t.ringing ? "Time's up!" : clock(left);
      if (t.ringing && now - t.lastBeep > 2500) { t.lastBeep = now; beep(); }
    }
    const ringing = timers.some(t => t.ringing);
    if (ringing !== ringingTitle) {
      ringingTitle = ringing;
      document.title = ringing ? `⏰ Time's up! ${origTitle}` : origTitle;
    }
  };
  const removeTimer = t => { timers.splice(timers.indexOf(t), 1); t.el.remove(); tick(); };
  const startTimer = (secs, label) => {
    unlockAudio();
    const t = { end: Date.now() + secs * 1000, ringing: false, lastBeep: 0 };
    t.time = h('span', { class: 'time' }, clock(secs));
    t.el = h('div', { class: 'timer', onclick: e => { e.stopPropagation(); if (t.ringing) removeTimer(t); } },
      h('span', { class: 'label' }, label),
      t.time,
      h('button', { class: 'cancel', title: 'Cancel timer', onclick: e => { e.stopPropagation(); removeTimer(t); } }, '✕'));
    timers.push(t);
    tray.append(t.el);
    tick();
  };
  const tickId = setInterval(tick, 250);

  const withTimers = (text, stepNo) => {
    const out = [];
    let last = 0;
    for (const m of text.matchAll(TIME_RE)) {
      const secs = Math.round(toSeconds(m));
      if (!(secs > 0)) continue;
      out.push(text.slice(last, m.index), h('button', {
        class: 'chip',
        onclick: e => { e.stopPropagation(); e.currentTarget.classList.add('started'); startTimer(secs, `Step ${stepNo}`); },
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
            h('span', { class: i === bi ? 's on' : i < bi ? 's past' : 's' }, withTimers(s, si + 1)), ' ',
          ]))),
      h('aside', { class: 'need' },
        h('div', { class: 'eyebrow' }, "You'll need"),
        need.length
          ? h('ul', {}, need.map(i => h('li', {}, formatIngredient(i))))
          : h('p', { class: 'none' }, 'Nothing new for this bit')));
  };

  const finished = () => h('section', { class: 'done' },
    h('div', { class: 'plate' }, '🍽️'),
    h('h2', {}, 'Enjoy!'),
    h('p', { class: 'soft' }, title),
    h('div', { class: 'row' },
      h('button', { onclick: e => { e.stopPropagation(); pos = -1; render(); } }, 'Start again'),
      h('button', { class: 'primary', onclick: e => { e.stopPropagation(); close(); } }, 'Close Kitchen Mode')));

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
  const touch = matchMedia('(pointer: coarse)').matches;
  const root = h('div', { class: 'km' },
    h('header', {},
      h('div', { class: 'title' }, '🍳 ', title),
      pill,
      h('button', { class: 'x', title: 'Close (Esc)', onclick: () => close() }, '✕')),
    h('div', { class: 'progress' }, bars),
    stage,
    h('footer', {},
      tray,
      h('div', { class: 'hint' }, touch
        ? 'Tap right → next · tap left ← back'
        : 'Space or tap → next · ← back · T timer · Esc close')));

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
      lock = await navigator.wakeLock.request('screen');
      setAwake(true);
      lock.addEventListener('release', () => { lock = null; setAwake(false); });
    } catch { setAwake(false); }
  };
  const onVisible = () => { if (wantLock && !lock && document.visibilityState === 'visible') getLock(); };

  /* ---------- input ---------- */
  const NEXT_KEYS = [' ', 'ArrowRight', 'ArrowDown', 'PageDown', 'Enter'];
  const BACK_KEYS = ['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'];
  const onKey = e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    if (NEXT_KEYS.includes(k)) { if (!e.repeat) next(); }
    else if (BACK_KEYS.includes(k)) { if (!e.repeat) back(); }
    else if (k === 'Escape') close();
    else if (k === 't' || k === 'T') stage.querySelector('.s.on .chip')?.click();
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
  // Stop buttons taking focus, so Space always means "next" rather than "press that button again".
  root.addEventListener('mousedown', e => { if (e.target.closest('button')) e.preventDefault(); });

  /* ---------- mount ---------- */
  const host = document.createElement('kitchen-mode');
  host.style.cssText = 'all:initial;position:fixed;inset:0;z-index:2147483647;display:block;';
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.append(h('style', {}, `
:host { --bg:#fbf7f0; --panel:#f3ecdf; --ink:#1f1a14; --soft:#857a6c; --line:#e6dccb; --accent:#c2410c; --on-accent:#fff; --chip:#fde4d3; --ring:#dc2626; }
@media (prefers-color-scheme: dark) { :host { --bg:#15120e; --panel:#221c16; --ink:#f5eee4; --soft:#a3978a; --line:#352c23; --accent:#fb923c; --on-accent:#1a0e04; --chip:#3d2616; --ring:#ef4444; } }
* { box-sizing:border-box; }
.km { position:absolute; inset:0; display:grid; grid-template-rows:auto auto minmax(0,1fr) auto; background:var(--bg); color:var(--ink); font:400 18px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; -webkit-font-smoothing:antialiased; user-select:none; -webkit-user-select:none; }
button { font:inherit; color:inherit; cursor:pointer; border:0; background:none; padding:0; }
header { display:flex; align-items:center; gap:14px; padding:14px clamp(16px,3vw,40px); }
.title { flex:1; min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font:600 17px/1.2 ui-serif,Georgia,serif; }
.pill { font-size:13px; padding:6px 11px; border-radius:999px; background:var(--panel); color:var(--soft); white-space:nowrap; }
.pill.off { color:var(--ring); }
.x { width:40px; height:40px; border-radius:50%; background:var(--panel); font-size:15px; flex:none; }
.progress { display:flex; gap:6px; padding:0 clamp(16px,3vw,40px); }
.progress i { flex:1; height:6px; border-radius:3px; background:var(--line); overflow:hidden; }
.progress b { display:block; height:100%; width:0; background:var(--accent); transition:width .3s; }
.stage { position:relative; overflow:auto; padding:clamp(20px,5vh,56px) clamp(16px,4vw,64px); }
.eyebrow { font-size:13px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--accent); margin-bottom:14px; }
.soft { color:var(--soft); font-weight:500; letter-spacing:0; text-transform:none; }
.overview { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,.75fr); gap:clamp(24px,4vw,64px); align-items:start; max-width:1240px; margin:0 auto; }
.overview h1 { font:600 clamp(34px,4.6vw,62px)/1.04 ui-serif,Georgia,serif; margin:0 0 12px; letter-spacing:-.01em; }
.meta { color:var(--soft); font-size:clamp(16px,1.6vw,20px); margin-bottom:32px; }
.ings { list-style:none; padding:0; margin:0 0 32px; columns:2 240px; column-gap:36px; }
.ings li { break-inside:avoid; display:flex; gap:12px; align-items:flex-start; padding:10px 0; font-size:clamp(18px,1.8vw,23px); line-height:1.3; border-bottom:1px solid var(--line); cursor:pointer; }
.box { flex:none; width:22px; height:22px; margin-top:2px; border-radius:50%; border:2px solid var(--soft); display:grid; place-items:center; font-size:13px; }
.ticked { color:var(--soft); }
.ticked span:last-child { text-decoration:line-through; }
.ticked .box { background:var(--accent); border-color:var(--accent); }
.ticked .box::after { content:"\\2713"; color:var(--on-accent); font-weight:800; }
.hero { width:100%; aspect-ratio:4/3; object-fit:cover; border-radius:20px; background:var(--panel); }
.primary { background:var(--accent); color:var(--on-accent); font-weight:650; font-size:19px; padding:15px 28px; border-radius:999px; }
.cook { display:grid; grid-template-columns:minmax(0,1fr) minmax(220px,.38fr); gap:clamp(24px,4vw,64px); max-width:1400px; min-height:100%; margin:0 auto; align-items:center; }
.step { margin:0; font-weight:520; line-height:1.3; letter-spacing:-.005em; text-wrap:pretty; }
.s { opacity:.22; transition:opacity .25s; }
.s.past { opacity:.38; }
.s.on { opacity:1; }
.chip { display:inline; background:var(--chip); color:var(--accent); font-weight:650; padding:0 .28em; border-radius:.3em; white-space:nowrap; }
.chip.started { outline:2px solid var(--accent); outline-offset:1px; }
.need { background:var(--panel); border-radius:20px; padding:24px 26px; }
.need ul { list-style:none; margin:0; padding:0; }
.need li { font-size:clamp(19px,1.9vw,26px); line-height:1.25; padding:9px 0; }
.need li + li { border-top:1px solid var(--line); }
.none { color:var(--soft); margin:0; font-size:18px; }
.done { min-height:100%; display:grid; place-content:center; text-align:center; gap:6px; }
.plate { font-size:72px; line-height:1; }
.done h2 { font:600 clamp(40px,5.5vw,72px)/1.1 ui-serif,Georgia,serif; margin:8px 0 0; }
.done p { margin:0; font-size:20px; }
.row { display:flex; gap:12px; justify-content:center; margin-top:28px; flex-wrap:wrap; }
.row button:not(.primary) { padding:15px 24px; border-radius:999px; background:var(--panel); font-size:18px; }
footer { display:flex; align-items:center; gap:16px; padding:10px clamp(16px,3vw,40px) 16px; min-height:68px; }
.timers { flex:1; display:flex; gap:10px; flex-wrap:wrap; }
.timer { display:flex; align-items:center; gap:10px; background:var(--panel); border-radius:999px; padding:6px 6px 6px 16px; font-size:15px; }
.timer .time { font-weight:700; font-size:22px; font-variant-numeric:tabular-nums; }
.timer .cancel { width:32px; height:32px; border-radius:50%; font-size:13px; color:var(--soft); }
.timer.ringing { background:var(--ring); color:#fff; cursor:pointer; padding-right:18px; animation:pulse 1s ease-in-out infinite; }
.timer.ringing .cancel { display:none; }
.timer.ringing::after { content:"tap to stop"; font-size:13px; opacity:.85; }
@keyframes pulse { 50% { transform:scale(1.05); } }
.hint { color:var(--soft); font-size:14px; white-space:nowrap; }
@media (max-width: 820px) {
  .overview, .cook { grid-template-columns:1fr; align-items:start; }
  .hero, .hint { display:none; }
}
`), root);
  document.documentElement.append(host);

  const prevOverflow = document.documentElement.style.overflow;
  document.documentElement.style.overflow = 'hidden';
  document.activeElement?.blur?.();
  window.addEventListener('keydown', onKey, true);
  document.addEventListener('visibilitychange', onVisible);
  getLock();
  render();

  const close = () => {
    wantLock = false;
    lock?.release().catch(() => {});
    clearInterval(tickId);
    window.removeEventListener('keydown', onKey, true);
    document.removeEventListener('visibilitychange', onVisible);
    host.remove();
    document.documentElement.style.overflow = prevOverflow;
    document.title = origTitle;
    audio?.close?.();
    delete window.__kitchenMode;
  };
  window.__kitchenMode = { close };
})();

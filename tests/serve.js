// Answers a browser context's requests for kitchen-mode.com from this checkout: the built km.js and
// index.html, the images, and the count relay, which records counts instead of sending them to PostHog.
// Shared by the tests and the scripts, so they all run what's about to ship rather than what's live.
import { readFileSync } from 'node:fs';

export const SITE = 'https://kitchen-mode.com';
const file = name => readFileSync(new URL(`../${name}`, import.meta.url));
export const INDEX = file('index.html').toString();
export const KM = file('km.js');
// The bookmark people install: the href of the ticket on the landing page.
export const LOADER = INDEX.match(/class="bookmarklet[^"]*" href="(javascript:[^"]+)"/)[1];

// Returns true if it answered the request.
export const serveSite = async (route, counts = []) => {
  const req = route.request();
  const url = new URL(req.url());
  if (url.origin !== SITE) return false;
  if (url.pathname.startsWith('/relay/')) {
    counts.push({ ...JSON.parse(req.postData()), headers: await req.allHeaders() });
    await route.fulfill({ status: 200, body: '1' });
  } else if (url.pathname === '/km.js') await route.fulfill({ body: KM, contentType: 'text/javascript' });
  else if (url.pathname === '/' || url.pathname === '/index.html') await route.fulfill({ body: INDEX, contentType: 'text/html' });
  else if (url.pathname === '/_vercel/insights/script.js') await route.fulfill({ body: '', contentType: 'text/javascript' });
  else if (url.pathname.endsWith('.png')) await route.fulfill({ body: file(url.pathname.slice(1)), contentType: 'image/png' });
  else await route.fulfill({ status: 404, body: '' });
  return true;
};

// Runs the bookmark in a page, as the browser does for a javascript: bookmark.
export const clickBookmark = page => page.evaluate(code => { (0, eval)(code); }, LOADER.slice('javascript:'.length));

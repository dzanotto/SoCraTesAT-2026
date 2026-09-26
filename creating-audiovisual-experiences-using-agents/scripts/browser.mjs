// Shared helper: start the static server + a headless Chrome on the preview page.
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
import { serve } from './serve.mjs';

const CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
].filter(Boolean);

export function parseArgs(argv = process.argv.slice(2)) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue;
    const key = argv[i].slice(2);
    const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
    args[key] = val;
  }
  return args;
}

export async function openFilm({ scene, page: pagePath = '/' } = {}) {
  const executablePath = CANDIDATES.find((p) => fs.existsSync(p));
  if (!executablePath) throw new Error('No Chrome found. Set CHROME_PATH=/path/to/chrome');
  const port = 5200 + Math.floor(Math.random() * 500);
  const server = await serve(port);
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling'],
  });
  const page = await browser.newPage();
  page.on('console', (m) => { if (m.type() === 'error') console.error('[page]', m.text()); });
  page.on('pageerror', (e) => { if (!String(e.message ?? e).includes('headless')) console.error('[page]', e.message ?? e); });
  const qs = new URLSearchParams({ headless: '1', ...(scene ? { scene } : {}) });
  await page.goto(`http://127.0.0.1:${port}${pagePath}?${qs}`);
  if (pagePath === '/') await page.waitForFunction('window.__ready === true', { timeout: 30000 });
  const close = async () => { await browser.close(); server.close(); };
  return { page, close };
}

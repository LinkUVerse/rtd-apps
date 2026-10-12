#!/usr/bin/env node
const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
(async () => {
  const directory = path.resolve(process.argv[2]);
  const configured = process.argv[3] === 'configured';
  const server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const file = path.resolve(directory, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(directory + path.sep) || !fs.existsSync(file)) { response.writeHead(404).end(); return; }
    response.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.html') ? 'text/html' : 'application/octet-stream');
    response.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    const origin = `http://127.0.0.1:${server.address().port}`;
    browser = await chromium.launch({ headless: true, executablePath: process.env.RTD_EXTENSION_CHROMIUM || path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing') });
    const page = await browser.newPage(); const errors = []; const external = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', async route => { if (new URL(route.request().url()).origin !== origin) { external.push(route.request().url()); await route.abort(); } else await route.continue(); });
    await page.goto(origin, { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: configured ? 'RTD modern dApp Kit demo' : 'Demo configuration required', exact: true }).waitFor();
    if (configured) { await page.getByRole('button', { name: 'Sign transaction', exact: true }).click(); await page.getByRole('alert').waitFor(); assert.match(await page.getByRole('alert').innerText(), /Connect a wallet account first/); }
    assert.deepEqual(errors, []); assert.deepEqual(external, []);
    console.log(JSON.stringify({ passed: true, browser: browser.version(), configured, errors, externalRequests: external, scope: 'Real browser demo rendering and disconnected rejection only; no extension or live transaction acceptance' }, null, 2));
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });

#!/usr/bin/env node
// Real extension startup in an isolated, disposable browser profile. No chain acceptance claim.
const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
(async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'rtd-extension-smoke-'));
  const extension = path.resolve(__dirname, '../dist');
  const executablePath = process.env.RTD_EXTENSION_CHROMIUM || path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing');
  let context;
  const errors = [];
  try {
    context = await chromium.launchPersistentContext(temp, {
      executablePath, headless: true,
      args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`, '--enable-unsafe-extension-debugging'],
    });
    let worker = context.serviceWorkers()[0];
    if (!worker) worker = await context.waitForEvent('serviceworker', { timeout: 15_000 });
    const id = new URL(worker.url()).host;
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`chrome-extension://${id}/ui.html`, { waitUntil: 'domcontentloaded' });
    await page.locator('a[href*="add-account"]').waitFor({ timeout: 15_000 });
    const savedProfileResponse = await page.evaluate(() => new Promise((resolve, reject) => {
      const port = chrome.runtime.connect({ name: 'rtd_ui<->background' });
      const id = crypto.randomUUID();
      const timeout = setTimeout(() => { port.disconnect(); reject(new Error('UI command timeout')); }, 5000);
      port.onMessage.addListener(message => {
        if (message.id !== id) return;
        clearTimeout(timeout); port.disconnect(); resolve(message.payload);
      });
      port.postMessage({ id, payload: { type: 'method-payload', method: 'getSavedCustomProfile', args: {} } });
    }));
    if (savedProfileResponse.method !== 'getSavedCustomProfileResponse' || savedProfileResponse.args.result !== null) throw new Error('Unexpected fresh-profile storage response');
    const manifest = await worker.evaluate(() => chrome.runtime.getManifest());
    const recoveryAlarm = await worker.evaluate(async () => {
      for (let attempt = 0; attempt < 40; attempt++) {
        const alarm = await chrome.alarms.get('wallet-execution-recovery-v2');
        if (alarm) return { name: alarm.name, periodInMinutes: alarm.periodInMinutes };
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      return null;
    });
    if (recoveryAlarm?.periodInMinutes !== 1) throw new Error('Recovery wakeup alarm not installed');
    const result = {
      browser: context.browser()?.version(), extensionWorkerLoaded: true,
      url: new URL(page.url()).hash, visibleText: (await page.locator('body').innerText()).slice(0, 3000),
      buttons: await page.getByRole('button').allTextContents(),
      savedProfileResponse, recoveryAlarm, optionalHostPermissions: manifest.optional_host_permissions, pageErrors: errors,
      scope: 'fresh-profile extension startup and read-only UI messaging; no account import, permission grant or transactions; chain traffic not audited',
    };
    console.log(JSON.stringify(result, null, 2));
    if (errors.length) process.exitCode = 1;
  } finally {
    if (context) await context.close();
    fs.rmSync(temp, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

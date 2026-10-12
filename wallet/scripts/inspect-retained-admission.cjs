// Read only an existing default admission DB through the inert extension manifest document.
const { chromium } = require('@playwright/test');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const assert = require('node:assert/strict');
(async () => {
  const [profile, output] = process.argv.slice(2);
  assert(fs.existsSync(profile)); assert(output && !fs.existsSync(output));
  const extension = path.resolve(__dirname, '../dist');
  const context = await chromium.launchPersistentContext(profile, {
    executablePath: path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),
    headless: true, args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
  });
  let prohibited = 0;
  context.on('request', r => { if (/\/(?:SimulateTransaction|ExecuteTransaction)(?:$|\/)/.test(new URL(r.url()).pathname)) prohibited++; });
  try {
    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    const page = await context.newPage(); await page.goto(new URL('manifest.json', worker.url()).href);
    const observation = await page.evaluate(async () => {
      if (!(await indexedDB.databases()).some(db => db.name === 'RtdWallet NetworkAdmission')) return { exists: false };
      return new Promise((resolve, reject) => {
        const request = indexedDB.open('RtdWallet NetworkAdmission', 1);
        request.onupgradeneeded = () => { request.transaction.abort(); reject(new Error('Upgrade forbidden')); };
        request.onerror = request.onblocked = () => reject(new Error('Read unavailable'));
        request.onsuccess = () => {
          const db = request.result, tx = db.transaction('admission-v1', 'readonly'); let rows;
          tx.oncomplete = () => { db.close(); resolve({ exists: true, rows }); };
          tx.onabort = tx.onerror = () => { db.close(); reject(new Error('Read transaction failed')); };
          const read = tx.objectStore('admission-v1').getAll();
          read.onsuccess = () => { rows = read.result.map(row => ({ schemaVersion: row.schemaVersion, pendingCount: row.pending.length, pendingAreas: row.pending.map(p => p.areas), faults: row.faults })); };
        };
      });
    });
    assert.equal(prohibited, 0);
    const result = { passed: true, observedAt: new Date().toISOString(), observation, simulations: 0, dispatches: 0, scope: 'Existing default DB read-only via inert manifest document; no account unlock, UI mounting, database repair or authorization.' };
    fs.writeFileSync(output, JSON.stringify(result, null, 2)+'\n', {flag:'wx',mode:0o600});
    console.log(JSON.stringify(result));
  } finally { await context.close(); }
})().catch(e => { console.error(JSON.stringify({passed:false,errorType:e.name})); process.exitCode=1; });

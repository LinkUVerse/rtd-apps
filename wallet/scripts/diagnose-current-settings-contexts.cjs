// Readonly diagnosis in a copied task-owned failed profile; preserve original profile and proof.
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const crypto = require('node:crypto'), assert = require('node:assert/strict');
const { chromium } = require('@playwright/test');
(async () => {
 const [output, fixture] = process.argv.slice(2), wallet = path.resolve(__dirname, '..');
 const rt = path.join(os.homedir(), '.local/state/rtd-wallet-migration/dev-20261003-01');
 const log = path.join(wallet, 'migrationToGRpcOrGraphQLDoc/workLog');
 const read = file => JSON.parse(fs.readFileSync(file));
 const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
 const buildFile = path.join(log, '20261006-name-production-build-01.json'), build = read(buildFile);
 const failedFile = path.join(log, '20261006-current-settings-ui-04.json'), failed = read(failedFile);
 assert(!failed.passed && failed.stage === 'actual relock and retained Chrome restart');
 assert(path.dirname(path.resolve(fixture)) === rt && !fs.existsSync(fixture) && !fs.existsSync(output));
 for (const [file, hash] of Object.entries(build.artifacts)) assert.equal(sha(path.join(build.output, file)), hash);
 fs.mkdirSync(fixture, { mode: 0o700 });
 const source = path.join(failed.fixture, 'profile'), copied = path.join(fixture, 'profile'), retained = [];
 function hashes(directory, relative = '') {
  for (const item of fs.readdirSync(path.join(directory, relative), { withFileTypes: true })) {
   const name = path.join(relative, item.name), file = path.join(directory, name);
   if (item.isDirectory()) hashes(directory, name);
   else if (item.isFile()) retained.push({ file: name, sha256: sha(file) });
  }
 }
 hashes(source); fs.cpSync(source, copied, { recursive: true, errorOnExist: true });
 assert(retained.every(row => sha(path.join(copied, row.file)) === row.sha256));
 const traffic = [], errors = [], responseJobs = [], statuses = [], forbidden = [], states = [];
 let context;
 try {
  context = await chromium.launchPersistentContext(copied, { executablePath: path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'), headless: true, args: [`--disable-extensions-except=${build.output}`, `--load-extension=${build.output}`] });
  context.on('request', request => { const url = new URL(request.url()); if (['http:', 'https:'].includes(url.protocol)) traffic.push({ url: url.href, method: request.method() }); });
  await context.route('**/*', route => {
   const request = route.request(), url = new URL(request.url());
   if (['http:', 'https:'].includes(url.protocol) && (url.hostname !== '127.0.0.1' || /\/(ExecuteTransaction|SimulateTransaction)$/.test(url.pathname) || String(request.postData()).includes('"jsonrpc"'))) { forbidden.push(url.href); return route.abort(); }
   return route.continue();
  });
  context.on('response', response => {
   if (!/^https?:/.test(response.url())) return;
   responseJobs.push((async () => {
    const row = { url: response.url(), status: response.status() };
    if (response.url().endsWith('/graphql')) {
     const value = await response.json().catch(() => ({}));
     row.graphqlErrorCount = value.errors?.length ?? 0;
     row.graphqlErrorCodes = value.errors?.map(error => error.extensions?.code ?? null) ?? [];
     row.dataKeys = Object.keys(value.data ?? {});
    }
    statuses.push(row);
   })());
  });
  const originalWorker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  const loaded = await require('./lib/current-extension-worker.cjs').ensure(context, originalWorker, build.output);
  const worker = loaded.worker, page = await context.newPage(), base = new URL('ui.html', worker.url()).href;
  page.on('pageerror', error => errors.push({ name: error.name, message: String(error.message).slice(0, 200) }));
  const entities = () => page.evaluate(() => new Promise((resolve, reject) => {
   const port = chrome.runtime.connect({ name: 'rtd_ui<->background' }), id = crypto.randomUUID();
   const timer = setTimeout(() => { port.disconnect(); reject(new Error('public accounts timeout')); }, 20000);
   port.onMessage.addListener(message => {
    if (message?.kind === 'rtd-ui-source-challenge') { port.postMessage({ kind: 'rtd-ui-source-confirm', nonce: message.nonce }); return; }
    if (message.id === id) { clearTimeout(timer); port.disconnect(); resolve(message.payload?.args?.entities?.map(account => ({ id: account.id, address: account.address, selected: account.selected, locked: account.isLocked })) ?? []); }
   });
   port.postMessage({ id, payload: { type: 'method-payload', method: 'getStoredEntities', args: { type: 'accounts' } } });
  }));
  const capture = async label => {
   await page.locator('body').waitFor();
   const accounts = await entities();
   states.push({ label, accounts, route: new URL(page.url()).hash, publicText: (await page.locator('body').innerText()).slice(0, 4000), ui: await page.evaluate(() => ({ lang: document.documentElement.lang, theme: document.documentElement.dataset.rtdTheme, buttons: [...document.querySelectorAll('button')].map(button => ({ text: button.innerText.slice(0, 80), testId: button.dataset.testid ?? null, disabled: button.disabled })), readContexts: (() => {
     const root = document.getElementById('root'), key = Object.keys(root).find(key => key.startsWith('__reactContainer$'));
     if (!key) return [];
     const attached = root[key], queue = [attached.stateNode?.current ?? attached], seen = new Set(), found = [];
     while (queue.length && seen.size < 10000) {
      const fiber = queue.pop(); if (!fiber || seen.has(fiber)) continue; seen.add(fiber); queue.push(fiber.child, fiber.sibling);
      const value = fiber.memoizedProps?.value;
      if (value && typeof value === 'object' && typeof value.state === 'string' && ('hasFullnodeSession' in value || 'profile' in value))
       found.push({ kind: 'wallet-context', state: value.state, hasFullnodeSession: value.hasFullnodeSession,
        readAdmission: value.readAdmission ? { phase: value.readAdmission.phase, blocked: value.readAdmission.blocked } : null,
        capabilityPhase: value.readCapabilities?.phase, message: value.message,
        profileId: value.profile?.id, generation: value.profile?.generation });
      if (value && typeof value.getQueryCache === 'function')
       found.push({ kind: 'query-cache', queries: value.getQueryCache().getAll().map(query => ({
        key: query.queryKey, status: query.state.status, fetchStatus: query.state.fetchStatus,
        errorType: query.state.error?.name, dataPresent: query.state.data !== undefined,
        accounts: JSON.stringify(query.queryKey).includes('accounts') && Array.isArray(query.state.data)
         ? query.state.data.map(account => ({ address: account.address, selected: account.selected, locked: account.isLocked })) : undefined,
       })) });
     }
     return found;
    })() })) });
  };
  await page.goto(base + '#/tokens');
  await page.getByTestId('coin-page').waitFor({ timeout: 30000 }).catch(() => {}); await capture('copied profile normal startup');
  await page.goto(base + '#/tokens?menu=%2Flanguage'); await page.locator('.settings-panel').getByRole('radio').first().waitFor();
  await page.locator('.settings-panel').getByRole('radio').first().click(); await page.reload();
  await page.locator('.settings-panel').getByRole('radio').first().waitFor(); await capture('language after real reload');
  await page.goto(base + '#/tokens'); await page.getByTestId('coin-page').waitFor({ timeout: 30000 }).catch(() => {}); await capture('tokens after settings reload');
  await Promise.all(responseJobs);
  assert(retained.every(row => sha(path.join(source, row.file)) === row.sha256));
  assert(forbidden.length === 0); assert(traffic.every(row => !/\/(ExecuteTransaction|SimulateTransaction)$/.test(new URL(row.url).pathname)));
  const proof = { passed: true, observedAt: new Date().toISOString(), states, traffic, statuses, errors, forbidden,
   workerSource: loaded.evidence.after ?? loaded.evidence.before, originalProfileFiles: retained,
   originalProfilePreserved: true, originalProfilesOpened: 0, copiedTaskProfileOpened: 1,
   simulations: 0, signatures: 0, executeRequests: 0, certificateChanges: 0,
   inputsSha256: { [__filename]: sha(__filename), [failedFile]: sha(failedFile), [buildFile]: sha(buildFile) },
   scope: 'Readonly diagnosis in byte-identical copy of task-owned failed settings profile. Public account selection, actual UI loading, real reload and response classifications only. Original profile preserved; diagnostic completion is not settings or QA-A22 acceptance.' };
  fs.writeFileSync(output, JSON.stringify(proof, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ passed: true, states: states.map(row => ({ label: row.label, accounts: row.accounts.length, publicTextLength: row.publicText.length })), errors: errors.length, executeRequests: 0 }));
 } finally { if (context) await context.close(); await Promise.all(responseJobs); }
})().catch(error => { console.error(error.name, String(error.message).slice(0, 250)); process.exitCode = 1; });

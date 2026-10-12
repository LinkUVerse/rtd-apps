// Own C109 CFT profile, offline startup inventory only. No credentials or transaction calls.
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = '1';
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const crypto = require('node:crypto'), cp = require('node:child_process'), net = require('node:net');
const assert = require('node:assert/strict'), { chromium } = require('@playwright/test');
const wallet = path.resolve(__dirname, '..'), root = path.resolve(wallet, '../..');
const logs = path.join(wallet, 'migrationToGRpcOrGraphQLDoc/workLog');
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const read = file => JSON.parse(fs.readFileSync(file));
const proxyPort = 42199;
function capture() {
  const program = 'import sys,json;sys.path.insert(0,sys.argv[1]);from wallet_C106_successor_ownership import capture;print(json.dumps(capture()))';
  return JSON.parse(cp.execFileSync(path.join(root, 'rtd-archive-service/localDeploy/data/publisher-venv/bin/python'),
    ['-c', program, path.join(root, 'link-u-smart-contract/all-in-one-deploy/localDeploy')],
    { encoding: 'utf8', timeout: 60000 }));
}
async function vacantProxy() {
  const listener = net.createServer();
  await new Promise((resolve, reject) => {
    listener.once('error', reject); listener.listen(proxyPort, '127.0.0.1', resolve);
  });
  await new Promise((resolve, reject) => listener.close(error => error ? reject(error) : resolve()));
}
async function main() {
  const output = process.argv[2]; assert(output && !fs.existsSync(output));
  const planFile = path.join(logs, '20261008-C110-isolated-browser-surface-diagnostic-plan.md');
  const cleanupFile = path.join(logs, '20261008-C109-current-cleanup-independent-01.json');
  const lineage = require('./lib/C109-product-source-lineage.cjs'), q = read(lineage.qualificationFile);
  const build = read(q.buildFile), source = lineage.validate(q.originalSource, q.buildFile);
  const cleanup = read(cleanupFile); assert(cleanup.passed && cleanup.bothOriginalRtdIndexerGroupsHeld);
  const original = capture(); await vacantProxy();
  const fixture = path.join(os.homedir(), '.local/state/rtd-wallet-migration/dev-20261006-03/current-C109-internal-authorization-20261008-01');
  assert(fs.existsSync(path.join(fixture, 'profile')));
  const inputs = [__filename, planFile, cleanupFile, q.buildFile, lineage.qualificationFile];
  const inputsSha256 = Object.fromEntries(inputs.map(file => [file, sha(file)]));
  const surfaces = [], attempts = [];
  let context, worker, workerEvidence, result;
  try {
    context = await chromium.launchPersistentContext(path.join(fixture, 'profile'), {
      executablePath: path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),
      headless: true, offline: true,
      proxy: { server: 'http://127.0.0.1:' + proxyPort, bypass: '' },
      args: ['--proxy-bypass-list=<-loopback>', `--disable-extensions-except=${build.output}`, `--load-extension=${build.output}`],
    });
    await context.route('**/*', route => {
      if (/^https?:/.test(route.request().url())) return route.abort();
      return route.continue();
    });
    context.on('request', request => {
      if (!/^https?:/.test(request.url())) return;
      let surface; try { surface = request.serviceWorker()?.url() ?? request.frame().url(); } catch { surface = 'unavailable'; }
      attempts.push({ url: request.url(), method: request.method(), surface, at: Date.now() });
    });
    worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker', { timeout: 30000 });
    workerEvidence = await require('./lib/current-extension-worker.cjs').inspect(context, worker, build.output);
    assert(workerEvidence.matchesDisk); assert.equal(workerEvidence.workerSha256, build.artifacts['background.js']);
    const cdp = await context.browser().newBrowserCDPSession();
    try {
      for (let i = 0; i < 4; i++) {
        const targets = await cdp.send('Target.getTargets');
        surfaces.push({ at: Date.now(), pages: context.pages().map(page => ({ url: page.url(), closed: page.isClosed() })),
          targets: targets.targetInfos.map(target => ({ id: target.targetId, type: target.type, url: target.url() })) });
        if (i < 3) await new Promise(resolve => setTimeout(resolve, 500));
      }
    } finally { await cdp.detach(); }
    result = { passed: true, startupSurfaceInventoryCompleted: true };
  } catch (error) {
    result = { passed: false, startupSurfaceInventoryCompleted: false, errorType: error.name,
      message: String(error.message).slice(0, 1000) }; process.exitCode = 1;
  } finally {
    await context?.close(); await vacantProxy();
    assert.deepEqual(capture(), original);
    assert.deepEqual(lineage.validate(q.originalSource, q.buildFile), source);
    for (const [file, hash] of Object.entries(inputsSha256)) assert.equal(sha(file), hash);
    Object.assign(result, { observedAt: new Date().toISOString(), offlineInventoryOnly: true, source,
      surfaces, workerEvidence, observedHTTPAttempts: attempts, profilesOpened: context ? 1 : 0,
      originalProfilesOpened: 0, ownProfileClosed: true, extraPagesCreatedByDiagnostic: 0,
      offlineMode: true, mandatoryUnavailableProxyPort: proxyPort,
      agentCredentialReads: 0, agentCredentialInputs: 0, signatures: 0, executeRequests: 0,
      forwardedHTTPRequests: 0, currentStakingRootCauseConfirmed: false, productChanged: false,
      parentAcceptance: false, originalRuntimeHeld: true, inputsSha256 });
    fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ passed: result.passed, samples: surfaces.length,
      pages: surfaces.at(-1)?.pages, extraPagesCreatedByDiagnostic: 0, forwardedHTTPRequests: 0 }));
  }
}
main().catch(error => { console.error(JSON.stringify({ passed: false, errorType: error.name,
  message: String(error.message).slice(0, 500) })); process.exitCode = 1; });

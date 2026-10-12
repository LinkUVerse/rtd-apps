// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Fresh empty Chrome profile: actual current C46 renderer/worker and three query surfaces.
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = '1';
const { chromium } = require('@playwright/test');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const crypto = require('node:crypto'), assert = require('node:assert/strict');
const { GrpcTypes } = require('rtd-typescript/grpc');
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
function unary(encoded) {
  const raw = Buffer.from(encoded, 'base64'), frames = [];
  for (let i = 0; i < raw.length;) {
    assert(i + 5 <= raw.length); const flag = raw[i], length = raw.readUInt32BE(i + 1);
    assert([0, 128].includes(flag) && i + 5 + length <= raw.length);
    frames.push({ flag, data: raw.subarray(i + 5, i + 5 + length) }); i += 5 + length;
  }
  assert.equal(frames.length, 2); assert.equal(frames[0].flag, 0); assert.equal(frames[1].flag, 128);
  assert.match(frames[1].data.toString(), /(^|\r\n)grpc-status:\s*0(\r\n|$)/);
  return frames[0].data;
}
(async () => {
  const [output] = process.argv.slice(2); assert(output && !fs.existsSync(output));
  const wallet = path.resolve(__dirname, '..'), logs = path.join(wallet, 'migrationToGRpcOrGraphQLDoc/workLog');
  const rt = path.join(os.homedir(), '.local/state/rtd-wallet-migration/dev-20261006-03');
  const buildFile = path.join(logs, '20261007-default-generation-positive-C46-build-03.json');
  const build = JSON.parse(fs.readFileSync(buildFile)); assert(build.passed);
  assert.deepEqual(require('./build-reviewed-generation-production-extension.cjs').productSource(), build.sourceAfter);
  const profileFile = path.join(rt, 'publication-foundation/C46-isolated-browser-gateway-20261007-01/profile.json');
  const profile = JSON.parse(fs.readFileSync(profileFile));
  const switchFile = path.join(logs, '20261007-C46-isolated-gateway-started-01.json');
  const switched = JSON.parse(fs.readFileSync(switchFile)); assert(switched.passed && switched.mode === "isolated-temporary-test" && !switched.C44Replaced);
  for (const [f, h] of Object.entries(switched.inputsSha256)) assert.equal(sha(f), h);
  const owned = path.join(rt, 'positive-C46-transport-chrome-20261007-01'); assert(!fs.existsSync(owned));
  fs.mkdirSync(owned, { mode: 0o700 });
  const origins = [...Object.values(profile.endpoints), profile.faucetUrl].filter(Boolean).map(v => new URL(v).origin + '/*');
  let context;
  try {
    context = await chromium.launchPersistentContext(path.join(owned, 'profile'), {
      executablePath: path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),
      headless: true, args: [`--disable-extensions-except=${build.output}`, `--load-extension=${build.output}`],
    });
    const initial = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    const loaded = await require('./lib/current-extension-worker.cjs').ensure(context, initial, build.output);
    const worker = loaded.worker, extensionId = new URL(worker.url()).hostname;
    assert.equal('chrome-extension://' + extensionId, switched.origin);
    const page = await context.newPage(), base = new URL('ui.html', worker.url()).href;
    const ui = await require('./lib/current-extension-ui-source.cjs').inspect(context, page, build.output,
      Object.keys(build.artifacts).filter(f => f.endsWith('.js') && !['background.js','content-script.js','dapp-interface.js','egress-gate.js'].includes(f)),
      { url: base, navigate: async () => { await page.goto(base); await page.locator('button,a,input').first().waitFor(); } });
    const permissions = await page.evaluate(async origins => ({
      all: await chrome.permissions.contains({ origins }),
      each: await Promise.all(origins.map(async origin => ({ origin, contained: await chrome.permissions.contains({ origins: [origin] }) }))),
      unknownPort: await chrome.permissions.contains({ origins: ['http://127.0.0.1:41999/*'] }),
    }), origins);
    assert(permissions.all && permissions.each.every(r => r.contained) && !permissions.unknownPort);
    const queries = [
      { url: profile.endpoints.graphqlUrl, type: 'application/json', body: JSON.stringify({ query: '{chainIdentifier walletGenesis:checkpoint(sequenceNumber:0){digest}}' }) },
      { url: profile.endpoints.archiveGrpcWeb + '/rtd.rpc.v2.LedgerService/GetServiceInfo', type: 'application/grpc-web+proto', bodyBase64: 'AAAAAAA=' },
      { url: profile.endpoints.accountHistoryUrl, type: 'application/json', body: JSON.stringify({ query: 'query WalletHistoryCoverage($chain:String!){accountHistoryCoverage(chainId:$chain){chainId checkpointLo checkpointHi allAccountActivityCertified}}', variables: { chain: profile.expectedGenesisDigest } }) },
    ];
    const frames = [];
    for (const q of queries) {
      const row = await page.evaluate(async q => {
        const body = q.bodyBase64 ? Uint8Array.from(atob(q.bodyBase64), c => c.charCodeAt(0)) : q.body;
        const headers = { 'content-type': q.type, ...(q.bodyBase64 ? { 'x-grpc-web': '1' } : {}) };
        const response = await fetch(q.url, { method: 'POST', headers, body, credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(30000) });
        const bytes = new Uint8Array(await response.arrayBuffer()); if (bytes.length > 1024 * 1024) throw Error('response-budget');
        let binary = ''; for (const b of bytes) binary += String.fromCharCode(b);
        return { url: q.url, status: response.status, responseBase64: btoa(binary), headers: Object.fromEntries(response.headers), requestBase64: q.bodyBase64 || btoa(q.body) };
      }, q);
      frames.push(row); assert.equal(row.status, 200);
    }
    const decode = r => JSON.parse(Buffer.from(r.responseBase64, 'base64'));
    const graph = decode(frames[0]); assert(!graph.errors);
    assert.equal(graph.data.chainIdentifier, profile.expectedGenesisDigest);
    assert.equal(graph.data.walletGenesis.digest, profile.expectedGenesisDigest);
    const service = GrpcTypes.GetServiceInfoResponse.fromBinary(unary(frames[1].responseBase64));
    assert.equal(service.chainId, profile.expectedGenesisDigest); assert(service.checkpointHeight > 0n);
    const account = decode(frames[2]); assert(!account.errors);
    assert.equal(account.data.accountHistoryCoverage.chainId, profile.expectedGenesisDigest);
    assert(Number.isSafeInteger(account.data.accountHistoryCoverage.checkpointHi));
    assert.deepEqual(require('./build-reviewed-generation-production-extension.cjs').productSource(), build.sourceAfter);
    const proof = { passed: true, observedAt: new Date().toISOString(), source: build.sourceAfter,
      extensionId, origin: 'chrome-extension://' + extensionId,
      workerSource: loaded.evidence.after ?? loaded.evidence.before, uiSource: ui, permissions, frames,
      networkIdentityAccepted: true, isolatedThreeQuerySurfacesAccepted: true, C44RuntimeReplaced: false,
      archiveCheckpoint: String(service.checkpointHeight), accountCoverage: account.data.accountHistoryCoverage,
      simulations: 0, signatures: 0, executeRequests: 0, certificateChanges: 0, originalProfilesOpened: 0,
      chromeBusinessAccepted: false, ordinaryChromeAccepted: false, parentCompletion: false,
      inputsSha256: Object.fromEntries([__filename, buildFile, profileFile, switchFile].map(f => [f, sha(f)])),
      scope: 'Actual fresh empty Chrome C46 renderer/worker bytes and exact origin, five manifest permissions/unknown-port refusal, real GraphQL/archive unary+trailer/account requests on all three modern loopback surfaces. No original account/profile, permission.request/CA import, simulation/execute, indexed NFT/funds or ordinary Chrome acceptance.' };
    fs.writeFileSync(output, JSON.stringify(proof, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ passed: true, extensionId, querySurfaces: 3, archiveCheckpoint: proof.archiveCheckpoint }));
  } finally { if (context) await context.close(); }
})().catch(e => { console.error(JSON.stringify({ passed: false, error: String(e.message).slice(0, 400) })); process.exitCode = 1; });

// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Isolated candidate, real Chrome sender/getFrame/MessagePort/UI guard evidence only.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), crypto = require('node:crypto');
const assert = require('node:assert/strict'); const { chromium } = require('@playwright/test');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
async function main() {
  const [rootArg, outputArg] = process.argv.slice(2); assert(rootArg && outputArg);
  const root = path.resolve(rootArg), output = path.resolve(outputArg);
  assert(root.startsWith(path.join(process.env.HOME, '.local/state/rtd-wallet-migration/dev-20261003-01') + path.sep) && !fs.existsSync(root) && !fs.existsSync(output));
  const inputs = [__filename, path.join(__dirname, 'candidates/dapp-egress-store.cjs'), path.join(__dirname, 'candidates/dapp-egress-peer.cjs')];
  const inputsSha256 = Object.fromEntries(inputs.map(file => [file, sha(fs.readFileSync(file))]));
  fs.mkdirSync(root, { mode: 0o700 }); const extension = path.join(root, 'extension'); fs.mkdirSync(extension, { mode: 0o700 });
  const database = 'RtdWallet NetworkAdmission:test:egress-surface-' + crypto.randomBytes(8).toString('hex');
  const sources = {
    'manifest.json': JSON.stringify({ manifest_version: 3, name: 'RTD private peer surface fixture', version: '1.0.0', permissions: ['storage', 'webNavigation'], background: { service_worker: 'background.js' }, content_scripts: [{ matches: ['http://127.0.0.1/*'], js: ['content.js'], run_at: 'document_start' }], web_accessible_resources: [{ resources: ['gate.html'], matches: ['http://127.0.0.1/*'] }], content_security_policy: { extension_pages: "default-src 'none'; script-src 'self'; frame-src 'self'; frame-ancestors *;" } }),
    'store.js': fs.readFileSync(inputs[1], 'utf8'), 'peer.js': fs.readFileSync(inputs[2], 'utf8'),
    'background.js': `globalThis.fixtureNativePeerDebug={};importScripts('store.js','peer.js');globalThis.fixtureStore=new RtdEgressCandidate.CandidateEgressStore(${JSON.stringify(database)});globalThis.fixtureBroker=new RtdEgressPeerCandidate.CandidatePeerBroker(fixtureStore);fixtureBroker.ready=fixtureBroker.ready.then(()=>fixtureStore.transaction('readwrite',[[0,'fixture-only-independent-binding']],(_,os)=>{os[0].put({schemaVersion:1,bindingKey:'fixture-only-independent-binding',faults:[],pending:[]})}));`,
    'content.js': `(()=>{const port=chrome.runtime.connect({name:'fixture-content'});let channel;let deferred;port.onMessage.addListener(m=>{if(m.kind==='fixture-release-init'){deferred?.();deferred=undefined;return}if(m.kind!=='fixture-private-init')return;const attach=()=>{const f=document.createElement('iframe');f.id='native-private-gate';f.style.display='none';f.src=chrome.runtime.getURL('gate.html');channel=new MessageChannel();channel.port1.onmessage=e=>{if(e.data?.kind==='fixture-channel-challenge'&&typeof e.data.challenge==='string')port.postMessage({kind:'fixture-channel-confirm',session:m.session,challenge:e.data.challenge})};channel.port1.start();f.onload=()=>f.contentWindow.postMessage({kind:'fixture-private-init',session:m.session,cap:m.cap},chrome.runtime.getURL('').slice(0,-1),[channel.port2]);document.body.appendChild(f)};if(location.pathname.startsWith('/hold-source')){deferred=attach;return}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach,{once:true});else attach()});window.addEventListener('message',e=>{if(e.source===window&&e.data?.kind==='fixture-parent-disconnect'){channel?.port1.postMessage({kind:'fixture-dispose'});channel?.port1.close();port.disconnect()}});window.addEventListener('pagehide',()=>{channel?.port1.close();port.disconnect()},{once:true})})();`,
    'gate.html': '<!doctype html><body><script src="store.js"></script><script src="gate.js"></script></body>',
    'gate.js': `globalThis.fixtureGate={ready:false,halted:false,failed:0,held:[]};const gateStore=new RtdEgressCandidate.CandidateEgressStore(${JSON.stringify(database)});let initialized=false,origin,port;const finish=async item=>{if(fixtureGate.halted||!fixtureGate.ready||origin!==item.binding.origin)throw new Error('refused');await gateStore.deliver(item.receipt,item.binding,payload=>{if(fixtureGate.halted)throw new Error('refused');parent.postMessage({kind:'peer-result',requestId:item.binding.requestId,payload},origin)})};globalThis.releaseHeld=async()=>{const held=fixtureGate.held.splice(0);for(const item of held){try{await finish(item)}catch{fixtureGate.failed++}}};window.addEventListener('pagehide',()=>{fixtureGate.halted=true;try{port?.disconnect()}catch{}},{once:true});window.addEventListener('message',e=>{fixtureGate.lastInit={isParent:e.source===parent,sourceNull:e.source===null,origin:e.origin,ports:e.ports.length,kind:e.data?.kind};if(initialized||e.source!==parent||parent===window||e.data?.kind!=='fixture-private-init'||e.ports.length!==1||!/^https?:/.test(e.origin))return;initialized=true;origin=e.origin;const channel=e.ports[0];channel.onmessage=m=>{if(m.data?.kind==='fixture-dispose')fixtureGate.halted=true};channel.start();port=chrome.runtime.connect({name:'fixture-gate'});port.onDisconnect.addListener(()=>{fixtureGate.halted=true});port.onMessage.addListener(m=>{if(m.kind==='fixture-gate-challenge'){channel.postMessage({kind:'fixture-channel-challenge',challenge:m.challenge});return}if(m.kind==='fixture-gate-paired'){if(m.parentOrigin!==origin){fixtureGate.halted=true;return}fixtureGate.ready=true;return}if(m.kind==='fixture-deliver')void(async()=>{const receipt=await gateStore.consume(m.ticket,m.binding);const item={receipt,binding:m.binding};if(m.hold)fixtureGate.held.push(item);else await finish(item)})().catch(()=>{fixtureGate.failed++})});port.postMessage({kind:'fixture-gate-claim',session:e.data.session,cap:e.data.cap,parentOrigin:origin})});`,
    'ui.html': '<!doctype html><body><div id="root"></div><script type="module" src="ui-entry.js"></script></body>',
    'ui-entry.js': `if(window.top!==window){globalThis.fixtureUiBlocked=true;document.getElementById('root').textContent='blocked'}else{await import('./ui-body.js')}`,
    'ui-body.js': `globalThis.fixtureUiBootstrapStarted=true;const port=chrome.runtime.connect({name:'fixture-ui'});port.onMessage.addListener(m=>{if(m.kind==='fixture-ui-accepted')globalThis.fixtureUiAccepted=true});`,
  };
  for (const [name, source] of Object.entries(sources)) fs.writeFileSync(path.join(extension, name), source, { flag: 'wx', mode: 0o600 });
  const server = http.createServer((req, res) => { if (req.url !== '/normal') res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'unsafe-inline'; frame-src 'none'"); if (req.url === '/coop') res.setHeader('Cross-Origin-Opener-Policy', 'same-origin'); res.setHeader('content-type', 'text/html'); res.end('<!doctype html><body><script>window.transcript=[];window.results=[];window.addEventListener("message",e=>{transcript.push(e.data);if(e.data?.kind==="peer-result")results.push(e.data)});</script></body>'); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); let context; const checks = [], observations = [];
  const wait = async (target, predicate, timeout = 5000) => {
    if (target.waitForFunction) return target.waitForFunction(predicate, null, { polling: 100, timeout });
    const deadline = performance.now() + timeout;
    while (performance.now() < deadline) {
      if (await target.evaluate(predicate)) return;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error('Bounded worker observation timed out');
  };
  const check = (name, passed) => { assert(passed, name); checks.push(name); };
  try {
    context = await chromium.launchPersistentContext(path.join(root, 'profile'), { headless: true, executablePath: path.join(process.env.HOME, 'Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'), args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`, '--enable-unsafe-extension-debugging'] });
    const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker'); const id = worker.url().split('/')[2];
    const openParent = async route => {
      const page = await context.newPage(); await page.goto(`http://127.0.0.1:${server.address().port}${route}`);
      try { await page.locator('#native-private-gate').waitFor({ state: 'attached', timeout: 5000 }); }
      catch (error) { const diagnostic = await worker.evaluate(() => ({ counts: fixtureBroker.counts, debug: fixtureNativePeerDebug })); fs.writeFileSync(output + '.diagnostic.json', JSON.stringify({ failed: true, route, diagnostic }, null, 2), { flag: 'wx', mode: 0o600 }); throw error; }
      const url = `chrome-extension://${id}/gate.html`;
      const gate = page.frames().find(f => f.url() === url) ?? await page.waitForEvent('framenavigated', { predicate: f => f.url() === url, timeout: 5000 });
      try { await wait(gate, () => fixtureGate.ready || fixtureGate.halted); }
      catch (error) {
        const diagnostic = await worker.evaluate(() => ({ counts: fixtureBroker.counts, debug: fixtureNativePeerDebug }));
        const gateDiagnostic = await gate.evaluate(() => ({ ready: fixtureGate.ready, halted: fixtureGate.halted, failed: fixtureGate.failed, lastInit: fixtureGate.lastInit }));
        fs.writeFileSync(output + '.diagnostic.json', JSON.stringify({ failed: true, route, diagnostic, gateDiagnostic }, null, 2), { flag: 'wx', mode: 0o600 }); throw error;
      }
      const paired = await gate.evaluate(() => fixtureGate.ready && !fixtureGate.halted);
      if (!paired) {
        const diagnostic = await worker.evaluate(() => ({ counts: fixtureBroker.counts, debug: fixtureNativePeerDebug }));
        const gateDiagnostic = await gate.evaluate(() => ({ ready: fixtureGate.ready, halted: fixtureGate.halted, failed: fixtureGate.failed, lastInit: fixtureGate.lastInit }));
        fs.writeFileSync(output + '.diagnostic.json', JSON.stringify({ failed: true, route, diagnostic, gateDiagnostic }, null, 2), { flag: 'wx', mode: 0o600 });
      }
      check('private-pair-' + route, paired);
      const own = await worker.evaluate(route => Array.from(fixtureBroker.peers.values()).filter(p => p.source.url.endsWith(route)).map(p => ({ id: p.id, tabId: p.source.tabId, frameId: p.source.frameId, documentId: p.source.documentId, gateDocumentId: p.gate?.source.documentId })), route);
      assert.equal(own.length, 1); return { page, gate, peer: own[0] };
    };
    const issue = (peer, hold = false) => worker.evaluate(({ id, hold }) => fixtureBroker.issueForPeer(id, hold), { id: peer.id, hold });
    for (const route of ['/normal', '/strict', '/coop']) {
      const { page, gate, peer } = await openParent(route); await issue(peer); await wait(page, () => results.length === 1);
      check('private-runtime-ticket-and-final-public-dummy-' + route, (await page.evaluate(() => results[0].payload)) === 'public-peer-fixture-dummy');
      check('browser-owned-parent-and-gate-distinct-documents-' + route, peer.frameId === 0 && peer.documentId !== peer.gateDocumentId);
      check('no-private-fields-in-parent-transcript-' + route, await page.evaluate(() => !JSON.stringify(transcript).match(/"(cap|session|ticket|gateOwner|challenge)"/)));
      check('no-capability-in-frame-url-or-dom-' + route, await page.evaluate(() => document.querySelector('#native-private-gate').src.endsWith('/gate.html') && document.querySelector('#native-private-gate').attributes.length === 3));
      observations.push({ route, originalFrameId: peer.frameId, parentDocumentId: peer.documentId, gateDocumentId: peer.gateDocumentId, dummyPublications: 1 });
      await page.close();
    }
    const topUi = await context.newPage(); await topUi.goto(`chrome-extension://${id}/ui.html`); await wait(topUi, () => globalThis.fixtureUiAccepted === true);
    check('top-ui-bootstrap-and-native-port-accepted', await topUi.evaluate(() => fixtureUiBootstrapStarted === true && fixtureUiAccepted === true));
    const { page, gate, peer } = await openParent('/ui-child');
    const deniedUiNavigation = page.waitForEvent('framenavigated', { predicate: f => f.parentFrame() === gate && f.url().startsWith('chrome-error:'), timeout: 5000 });
    await gate.evaluate(url => { const f = document.createElement('iframe'); f.src = url; document.body.appendChild(f); }, `chrome-extension://${id}/ui.html`);
    const deniedUi = await deniedUiNavigation;
    check('minimal-webaccessible-ui-below-web-parent-denied-by-browser', await deniedUi.evaluate(() => typeof globalThis.fixtureUiBootstrapStarted === 'undefined'));
    // A privileged fixture creates a same-origin child below a genuine top UI,
    // allowing us to test the entry guard after navigation succeeds.
    const ownUiNavigation = topUi.waitForEvent('framenavigated', { predicate: f => f.parentFrame() === topUi.mainFrame() && f.url().endsWith('/ui.html'), timeout: 5000 });
    await topUi.evaluate(url => { const f = document.createElement('iframe'); f.src = url; document.body.appendChild(f); }, `chrome-extension://${id}/ui.html`);
    const child = await ownUiNavigation;
    await wait(child, () => globalThis.fixtureUiBlocked === true);
    check('embedded-ui-blocked-before-privileged-bootstrap', await child.evaluate(() => globalThis.fixtureUiBlocked === true && typeof fixtureUiBootstrapStarted === 'undefined'));
    const refusedBefore = await worker.evaluate(() => fixtureBroker.counts.uiRefused);
    await child.evaluate(() => { globalThis.forcedUiPort = chrome.runtime.connect({ name: 'fixture-ui' }); forcedUiPort.onDisconnect.addListener(() => { globalThis.forcedUiRefused = true; }); });
    await wait(child, () => globalThis.forcedUiRefused === true);
    check('embedded-same-origin-ui-native-port-refused', (await worker.evaluate(() => fixtureBroker.counts.uiRefused)) === refusedBefore + 1);
    await gate.evaluate(() => { globalThis.fakeUi = chrome.runtime.connect({ name: 'fixture-ui' }); fakeUi.onDisconnect.addListener(() => { globalThis.fakeUiRefused = true; }); }); await wait(gate, () => globalThis.fakeUiRefused === true);
    check('gate-cannot-borrow-ui-channel', (await worker.evaluate(() => fixtureBroker.counts.uiRefused)) === refusedBefore + 2);
    await issue(peer, true); await wait(gate, () => fixtureGate.held.length === 1);
    await page.evaluate(() => window.postMessage({ kind: 'fixture-parent-disconnect' }));
    await wait(gate, () => fixtureGate.halted === true); await gate.evaluate(() => releaseHeld());
    check('content-disconnect-before-final-post-leaks-zero', (await page.evaluate(() => results.length)) === 0);
    let refused = false; try { await issue(peer); } catch { refused = true; } check('disconnected-source-cannot-issue-new-ticket', refused);
    await page.close(); await topUi.close();
    const attack = await openParent('/attack');
    const fakeClaim = async (frame, value, duplicate = false) => {
      await frame.evaluate(({ value, duplicate }) => {
        globalThis.attackRefused = false;
        const p = chrome.runtime.connect({ name: 'fixture-gate' });
        p.onDisconnect.addListener(() => { globalThis.attackRefused = true; });
        p.postMessage(value); if (duplicate) p.postMessage(value);
      }, { value, duplicate });
      await wait(frame, () => globalThis.attackRefused === true);
    };
    const unknownClaim = { kind: 'fixture-gate-claim', session: 'b'.repeat(64), cap: 'c'.repeat(64), parentOrigin: new URL(attack.page.url()).origin };
    for (const [name, value, duplicate] of [
      ['unknown-session', unknownClaim, false],
      ['extra-claim-field', { ...unknownClaim, extra: true }, false],
      ['missing-claim-field', { kind: 'fixture-gate-claim' }, false],
      ['duplicate-concurrent-claim', unknownClaim, true],
      ['used-session-fake-cap', { ...unknownClaim, session: attack.peer.id }, false],
    ]) {
      await fakeClaim(attack.gate, value, duplicate);
      check(name + '-native-port-refused', (await attack.page.evaluate(() => results.length)) === 0);
    }
    // A webpage can send bogus init to the already initialized gate; it cannot
    // obtain or replace the original isolated-world MessagePort.
    await attack.page.evaluate(() => {
      const channel = new MessageChannel();
      document.querySelector('#native-private-gate').contentWindow.postMessage({ kind: 'fixture-private-init', session: 'x', cap: 'y' }, '*', [channel.port2]);
      channel.port1.close();
    });
    await issue(attack.peer); await wait(attack.page, () => results.length === 1);
    check('bogus-webpage-init-cannot-replace-private-channel', await attack.page.evaluate(() => results[0].payload === 'public-peer-fixture-dummy'));
    await attack.page.close();
    const heldSource = await context.newPage(); await heldSource.goto(`http://127.0.0.1:${server.address().port}/hold-source-cross-tab`);
    await wait(worker, () => Array.from(fixtureBroker.peers.values()).some(p => p.source.url.endsWith('/hold-source-cross-tab')));
    // This stronger attacker receives a stolen fixture cap from the privileged
    // harness only. Nothing is written to logs or exposed to the parent page.
    const stolen = await worker.evaluate(() => {
      const p = Array.from(fixtureBroker.peers.values()).find(p => p.source.url.endsWith('/hold-source-cross-tab'));
      return { session: p.id, cap: p.cap, parentOrigin: p.source.origin };
    });
    const other = await openParent('/other-tab');
    await fakeClaim(other.gate, { kind: 'fixture-gate-claim', ...stolen });
    check('stolen-unused-cap-cross-tab-native-port-refused', (await other.page.evaluate(() => results.length)) === 0);
    await worker.evaluate(id => fixtureBroker.peers.get(id).port.postMessage({ kind: 'fixture-release-init' }), stolen.session);
    const originalGate = heldSource.frames().find(f => f.url().endsWith('/gate.html')) ?? await heldSource.waitForEvent('framenavigated', { predicate: f => f.url().endsWith('/gate.html'), timeout: 5000 });
    await wait(originalGate, () => fixtureGate.ready === true);
    check('cross-tab-rejected-claim-does-not-consume-original-cap', await worker.evaluate(id => !!fixtureBroker.peers.get(id)?.gate, stolen.session));
    await issue({ id: stolen.session }); await wait(heldSource, () => results.length === 1);
    check('original-private-channel-still-publishes-once-after-cross-tab-attack', (await heldSource.evaluate(() => results.length)) === 1);
    await heldSource.close(); await other.page.close();
    const navigation = await openParent('/navigate-old');
    await issue(navigation.peer, true); await wait(navigation.gate, () => fixtureGate.held.length === 1);
    await navigation.page.goto(`http://127.0.0.1:${server.address().port}/navigate-new`);
    await wait(worker, () => !Array.from(fixtureBroker.peers.values()).some(p => p.source.url.endsWith('/navigate-old') && !p.closed));
    let oldRefused = false; try { await issue(navigation.peer); } catch { oldRefused = true; }
    check('same-tab-new-document-refuses-old-source-and-held-ticket', oldRefused && (await navigation.page.evaluate(() => results.length)) === 0);
    await navigation.page.close();
    const detached = await openParent('/detach');
    await issue(detached.peer, true); await wait(detached.gate, () => fixtureGate.held.length === 1);
    await detached.page.evaluate(() => document.querySelector('#native-private-gate').remove());
    await wait(worker, () => !Array.from(fixtureBroker.peers.values()).some(p => p.source.url.endsWith('/detach') && !p.closed));
    let detachedRefused = false; try { await issue(detached.peer); } catch { detachedRefused = true; }
    check('gate-removal-revokes-original-peer-and-held-publication', detachedRefused && (await detached.page.evaluate(() => results.length)) === 0);
    await detached.page.close();
    const siblingSource = await context.newPage(); await siblingSource.goto(`http://127.0.0.1:${server.address().port}/hold-source-sibling`);
    await wait(worker, () => Array.from(fixtureBroker.peers.values()).some(p => p.source.url.endsWith('/hold-source-sibling')));
    const siblingCap = await worker.evaluate(() => {
      const p = Array.from(fixtureBroker.peers.values()).find(p => p.source.url.endsWith('/hold-source-sibling'));
      return { session: p.id, cap: p.cap, expiresAt: p.expiresAt };
    });
    const pairedBeforeSibling = await worker.evaluate(() => fixtureBroker.counts.gatesPaired);
    const siblingNavigation = siblingSource.waitForEvent('framenavigated', { predicate: f => f.url().endsWith('/gate.html'), timeout: 5000 });
    await siblingSource.evaluate(url => {
      const f = document.createElement('iframe'); f.id = 'attacker-sibling-gate'; f.style.display = 'none'; f.src = url; document.body.appendChild(f);
    }, `chrome-extension://${id}/gate.html`);
    const siblingGate = await siblingNavigation;
    await siblingGate.waitForLoadState('load');
    await siblingSource.evaluate(value => {
      const channel = new MessageChannel();
      globalThis.stolenChallengeReceived = false;
      channel.port1.onmessage = e => { if (e.data?.kind === 'fixture-channel-challenge') globalThis.stolenChallengeReceived = true; };
      channel.port1.start();
      document.querySelector('#attacker-sibling-gate').contentWindow.postMessage({ kind: 'fixture-private-init', session: value.session, cap: value.cap }, new URL(document.querySelector('#attacker-sibling-gate').src).origin, [channel.port2]);
    }, { session: siblingCap.session, cap: siblingCap.cap });
    await wait(siblingSource, () => globalThis.stolenChallengeReceived === true);
    let siblingRefused = false; try { await issue({ id: siblingCap.session }); } catch { siblingRefused = true; }
    check('stolen-cap-same-tab-sibling-channel-cannot-confirm-original-content-port', siblingRefused && (await worker.evaluate(() => fixtureBroker.counts.gatesPaired)) === pairedBeforeSibling);
    check('unconfirmed-sibling-gate-cannot-publish-dummy', (await siblingSource.evaluate(() => results.length)) === 0 && !(await siblingGate.evaluate(() => fixtureGate.ready)));
    await wait(worker, () => !Array.from(fixtureBroker.peers.values()).some(p => p.source.url.endsWith('/hold-source-sibling') && !p.closed), 35000);
    check('real-thirty-second-peer-expiry-closes-unconfirmed-gate', Date.now() >= siblingCap.expiresAt && await siblingGate.evaluate(() => fixtureGate.halted));
    let expiredRefused = false; try { await issue({ id: siblingCap.session }); } catch { expiredRefused = true; }
    check('expired-source-cannot-issue-or-replay', expiredRefused && (await siblingSource.evaluate(() => results.length)) === 0);
    await siblingSource.close();
    const counts = await worker.evaluate(() => ({ ...fixtureBroker.counts }));
    for (const [file, digest] of Object.entries(inputsSha256)) assert.equal(sha(fs.readFileSync(file)), digest);
    for (const [name, source] of Object.entries(sources)) assert.equal(fs.readFileSync(path.join(extension, name), 'utf8'), source);
    const result = { passed: true, observedAt: new Date().toISOString(), browser: context.browser().version(), inputsSha256, fixtureFilesSha256: Object.fromEntries(Object.entries(sources).map(([name, source]) => [name, sha(source)])), checks, checkCount: checks.length, counts, observations, accounts: 0, signatures: 0, executions: 0, certificateChanges: 0, productChanged: false, scope: 'Isolated native source/gate pairing, direct private runtime ticket, final dummy, minimal web-accessible gate and earliest fixture UI guard plus native sender refusal only. No product UI/canonical admission integration, wallet authority, account/permissions or actual signing acceptance.' };
    fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); console.log(JSON.stringify({ passed: true, checkCount: checks.length, counts }));
  } catch (error) {
    if (context && !fs.existsSync(output + '.diagnostic.json')) {
      const pages = [];
      for (const page of context.pages()) {
        const frames = [];
        for (const frame of page.frames()) {
          let state;
          try { state = await frame.evaluate(() => ({ top: window.top === window, uiBlocked: globalThis.fixtureUiBlocked === true, uiBootstrap: globalThis.fixtureUiBootstrapStarted === true, readyState: document.readyState, scriptCount: document.scripts.length })); } catch { state = { unavailable: true }; }
          frames.push({ url: frame.url(), state });
        }
        pages.push({ frames });
      }
      fs.writeFileSync(output + '.diagnostic.json', JSON.stringify({ failed: true, checkCount: checks.length, checks, pages }, null, 2), { flag: 'wx', mode: 0o600 });
    }
    throw error;
  } finally { if (context) await context.close(); await new Promise(resolve => server.close(resolve)); }
}
main().catch(error => { console.error(JSON.stringify({ passed: false, errorType: error.name, detail: String(error.message).slice(0, 180) })); process.exitCode = 1; });

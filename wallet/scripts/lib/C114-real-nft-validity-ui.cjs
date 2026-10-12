// Normal dApp requests and Reject clicks only; never replace wallet code or responses.
const fs = require('node:fs'),path = require('node:path'),http = require('node:http'),crypto = require('node:crypto');
const assert = require('node:assert/strict'),{expect} = require('@playwright/test');
const {Transaction} = require('rtd-typescript/transactions');
const variants = require('./C114-nft-validity-variants.cjs');
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function validateDemo(file) {
  const q = JSON.parse(fs.readFileSync(file));assert(q.passed && q.preparedOnly && q.sourceUnchanged && q.sourceMapAllDiskSourcesEqual);
  assert.equal(q.source.files,1122);assert.equal(q.source.sha256,'a012d6876f3b5c4d81b87ecb2e1de29061b4b2b8cf113a59bd39ade5056cfbcf');
  for (const [f,h] of Object.entries(q.inputsSha256)) assert.equal(sha(f),h);
  for (const [f,h] of Object.entries(q.artifacts)) assert.equal(sha(path.join(q.directory,f)),h);
  return q;
}
async function snapshot(popup) {
  return popup.evaluate(async () => {
    const seen = new Set(),stack = [],values = [];
    for (const node of document.querySelectorAll('*')) {const key = Object.keys(node).find(k => k.startsWith('__reactFiber$'));
      if (key) {let f = node[key];while (f.return) f = f.return;if (!f.stateNode?.current) throw Error('Committed root required');stack.push(f.stateNode.current)}}
    while (stack.length) {const f = stack.pop();if (!f || seen.has(f)) continue;seen.add(f);
      for (let hook = f.memoizedState;hook;hook = hook.next) {const value = hook.memoizedState;
        for (const v of [value,value?.data,value?.prepared,value?.data?.prepared]) if (v?.bytesBase64 && v.digest && v.dappApproval) values.push(v)}
      stack.push(f.child,f.sibling);
    }
    const prepared = [];
    for (const value of new Map(values.map(v => [v.dappApproval.requestId,v])).values()) {
      const copy = JSON.parse(JSON.stringify(value)),token = copy.dappApproval.approvalToken;
      if (typeof token !== 'string' || !token) throw Error('Actual preparation token required');delete copy.dappApproval.approvalToken;
      copy.dappApproval.approvalTokenSha256 = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))).map(n => n.toString(16).padStart(2,'0')).join('');
      prepared.push(copy);
    }
    const transactions = (await chrome.storage.local.get({transactions:{}})).transactions;
    return {prepared,transactions:JSON.parse(JSON.stringify(transactions))};
  });
}
async function run({context,extensionPage,owner,forms,approvals,demoFile,setStage,onOrigin,onCase,journal,
  initialJournal,frames,flush,environment,build}) {
  const demoProof = validateDemo(demoFile);let server,demo;const records = [],surfaces = [],popupIds = new Set();
  let demoOrigin,serverClosed = false,demoClosed = false;
  try {
    server = http.createServer((request,response) => {
      const u = new URL(request.url,'http://127.0.0.1'),name = u.pathname === '/' ? 'index.html' : u.pathname.slice(1);
      if (request.method !== 'GET' || !Object.hasOwn(demoProof.artifacts,name)) {response.writeHead(404).end();return}
      response.setHeader('Content-Type',name.endsWith('.js') ? 'text/javascript' : name.endsWith('.map') ? 'application/json' : 'text/html');
      response.setHeader('Cache-Control','no-store');response.end(fs.readFileSync(path.join(demoProof.directory,name)));
    });
    await new Promise((resolve,reject) => {server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
    demoOrigin = 'http://127.0.0.1:'+server.address().port;onOrigin(demoOrigin);
    demo = await context.newPage();demo.setDefaultTimeout(90000);
    setStage('validity dApp discovery and actual connection');await demo.goto(demoOrigin);
    await expect(demo.getByRole('button',{name:'Connect',exact:true})).toBeEnabled();
    const opened = context.waitForEvent('page',{timeout:30000});opened.catch(() => {});
    await demo.getByRole('button',{name:'Connect',exact:true}).click();const connect = await opened;
    await connect.getByRole('button',{name:/^(Continue|继续)$/}).click();
    await connect.getByRole('button',{name:/^(Connect|连接)$/}).click();
    await expect.poll(() => demo.locator('#accounts').innerText()).toBe(JSON.stringify([owner]));
    for (const item of forms) {
      const base = approvals.find(row => row.name === item.name);assert(base?.prepared);
      for (const variant of await variants.build(base.prepared)) {
        setStage(item.name+'/'+variant.name+'/real validity UI');
        const url = new URL(demoOrigin);url.searchParams.set('authorization',Buffer.from(variant.json).toString('base64'));
        await demo.goto(url.href);await expect(demo.getByRole('button',{name:'Connect',exact:true})).toBeEnabled();
        const beforeReconnect = context.pages().length;
        await demo.getByRole('button',{name:'Connect',exact:true}).click();
        await expect.poll(() => demo.locator('#accounts').innerText()).toBe(JSON.stringify([owner]));assert.equal(context.pages().length,beforeReconnect);
        await flush();const simulationStart = frames.filter(f => f.url.endsWith('/SimulateTransaction')).length;
        const waiting = context.waitForEvent('page',{timeout:30000});waiting.catch(() => {});
        await demo.getByRole('button',{name:'Request unsigned preview',exact:true}).click();const popup = await waiting;popup.setDefaultTimeout(90000);
        assert.equal('chrome-extension://'+new URL(popup.url()).host,environment.actualOrigin);
        assert.equal(context.pages().filter(p => p.url().startsWith(new URL('ui.html',popup.url()).href)).length,2);
        const approve = popup.getByRole('button',{name:/^(Approve|批准)$/}),reject = popup.getByRole('button',{name:/^(Reject|拒绝)$/});
        await expect(reject).toBeEnabled();
        if (variant.expired) await popup.getByText(/^(Gas estimation failed|网络费用估算失败)$/).first().waitFor();
        else {
          await popup.getByText(variant.digest,{exact:false}).waitFor();
          if (variant.timestampUnsupported) await popup.getByText(/Not supported by the current RTD network|当前 RTD 网络尚不支持/).waitFor();
        }
        if (variant.approvalEnabled) await expect(approve).toBeEnabled();else await expect(approve).toBeDisabled();
        await flush();const observed = await snapshot(popup),requests = Object.values(observed.transactions);assert.equal(requests.length,1);
        const request = requests[0];assert(request.id && !popupIds.has(request.id));popupIds.add(request.id);
        assert.equal(request.tx.type,'transaction');assert.equal(request.tx.justSign,true);assert.equal(request.tx.account,owner);
        assert.equal(request.tx.chain,'rtd:localnet');assert.equal(request.tx.data,variant.json);assert.equal(request.origin,demoOrigin);assert.equal(request.approved,null);
        const body = await popup.locator('body').innerText();
        if (variant.expired) assert.equal(observed.prepared.length,0);
        else {
          assert.equal(observed.prepared.length,1);const p = observed.prepared[0];assert.equal(p.bytesBase64,variant.bytesBase64);assert.equal(p.digest,variant.digest);
          assert.equal(p.dappApproval.requestId,request.id);assert(p.dappApproval.accountId && p.dappApproval.expiresAt > Date.now());
          assert.equal(await Transaction.from(p.bytesBase64).getDigest(),variant.digest);
          if (variant.name === 'expirationNone') assert.match(body,/No transaction expiration|交易未设置有效期/);
          else if (variant.name === 'expirationLargeEpoch') {assert(body.includes('9007199254740993'));assert(!body.includes('9007199254740992'))}
          else {
            const e = variant.expiration,w = e[e.$kind];
            for (const value of [w.minEpoch,w.maxEpoch].filter(v => v !== null)) assert(body.includes(value));
            if (e.$kind === 'Validity' && w.allowedProposers) {assert.match(body,/Restricted proposing validators|限定提议验证者/);assert(body.includes(String(w.allowedProposers.epoch)));assert(body.includes(w.allowedProposers.proposers.join(', ')))}
            if (e.$kind === 'ValidDuring') assert(!/Restricted proposing validators|限定提议验证者/.test(body));
          }
        }
        const simulations = frames.filter(f => f.url.endsWith('/SimulateTransaction')).slice(simulationStart);assert.equal(simulations.length,1);
        assert.deepEqual(await journal(),initialJournal);
        const row = {...item,variant,request,observed,body,simulations,approvalEnabled:await approve.isEnabled(),popupUrl:popup.url(),
          uiSource:await require('./current-extension-ui-source.cjs').inspect(context,popup,build.output,
            Object.keys(build.artifacts).filter(f => f.endsWith('.js') && !['background.js','content-script.js','dapp-interface.js','egress-gate.js'].includes(f))),
          approvedClicked:false};
        const closed = popup.waitForEvent('close');closed.catch(() => {});await reject.click();await closed;
        await expect(demo.locator('#error')).toContainText(/reject/i);assert.equal(await demo.locator('#result').innerText(),'');
        assert.deepEqual(await journal(),initialJournal);
        assert.deepEqual(await extensionPage.evaluate(async () => (await chrome.storage.local.get({transactions:{}})).transactions),{});
        row.rejectionText = await demo.locator('#error').innerText();row.normalRejectClosedPopup = true;row.noSignatureReturned = true;
        records.push(row);onCase(row);surfaces.push({scenario:item.name,variant:variant.name,popupUrl:row.popupUrl,uniqueRequestId:request.id,
          existingWalletUiPages:1,actualApprovalPopupPages:1,actualDappPages:1});
      }
    }
    setStage('validity dApp normal disconnect');await demo.getByRole('button',{name:'Disconnect',exact:true}).click();
    await expect.poll(() => demo.locator('#accounts').innerText()).toBe('[]');
    assert.equal(await extensionPage.evaluate(async origin => !!(await chrome.storage.local.get('permissions')).permissions?.[origin],demoOrigin),false);
    assert.equal(records.length,54);assert.equal(popupIds.size,54);
    return {passed:true,records,surfaces,demoOrigin,demoFile,demoSource:demoProof.source,normalDisconnect:true,profilesOpened:0,signatures:0,executeRequests:0};
  } finally {
    if (demo) {await demo.close();demoClosed = true}
    if (server) {await new Promise((resolve,reject) => server.close(error => error ? reject(error) : resolve()));serverClosed = true}
    // The caller records closure even if a UI assertion fails.
    onCase({cleanupOnly:true,demoOrigin,demoClosed,serverClosed});
  }
}
module.exports = {run,snapshot,validateDemo};

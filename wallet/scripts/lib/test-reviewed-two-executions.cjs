const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { expect } = require('@playwright/test');
const { Transaction } = require('rtd-typescript/transactions');
const { bcs } = require('rtd-typescript/bcs');

async function journal(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('RtdWallet TransactionJournal');
    request.onerror = () => reject(new Error('journal open failed'));
    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('journal-v2')) { db.close(); resolve([]); return; }
      const read = db.transaction('journal-v2').objectStore('journal-v2').getAll();
      read.onerror = () => { db.close(); reject(new Error('journal read failed')); };
      read.onsuccess = () => { const rows = read.result.map(({requestId,digest,state,accountAddress,receipt}) => ({requestId,digest,state,accountAddress,receipt})); db.close(); resolve(rows); };
    };
  }));
}
async function execute({ context, demo, extensionPage, key, evidenceDirectory, setStage }) {
  const baseline=await journal(extensionPage);
  setStage('dApp execution preparation');
  const waiting = context.waitForEvent('page', { timeout: 20000 }); waiting.catch(() => {});
  await demo.getByRole('button', { name: 'Send transaction', exact: true }).click();
  const approval = await waiting;
  const approve = approval.getByRole('button', { name: /^(批准|Approve)$/ });
  await expect(approve).toBeEnabled({ timeout: 60000 });
  const preview = await approval.getByText(/^(交易摘要|Transaction digest):/).innerText();
  const digest = preview.split(':').pop().trim();
  const requestId = new URL(approval.url()).hash.split('/').pop();
  // Written before approval; never reuse this directory for another dispatch attempt.
  fs.writeFileSync(path.join(evidenceDirectory, 'attempt.json'), JSON.stringify({digest,requestId,origin:new URL(demo.url()).origin,account:key.toRtdAddress(),startedAt:new Date().toISOString()},null,2)+'\n', {flag:'wx',mode:0o600});
  setStage('dApp execution approved');
  await approve.click();
  await expect.poll(async () => {
    if (await demo.getByTestId('action-result').count()) return true;
    if (!approval.isClosed()) {
      const recovered = approval.getByRole('button', {name:'返回原执行结果',exact:true});
      if (await recovered.count() && await recovered.isEnabled()) await recovered.click();
    }
    return false;
  }, {timeout:90000,intervals:[500,1000,3000]}).toBe(true);
  const result = JSON.parse(await demo.getByTestId('action-result').innerText());
  assert.equal(result.$kind, 'Transaction');
  const transaction = result.Transaction;
  assert.equal(transaction.digest,digest);
  const decodeJsonBytes = value => {
    assert(value && typeof value === 'object');
    const entries = Object.entries(value);
    assert(entries.every(([key,byte],i) => key === String(i) && Number.isInteger(byte) && byte >= 0 && byte <= 255));
    return Uint8Array.from(entries.map(([,byte]) => byte));
  };
  const bytes=decodeJsonBytes(transaction.bcs);
  assert.equal(await Transaction.from(bytes).getDigest(),digest);
  assert.equal(await key.getPublicKey().verifyTransaction(bytes,transaction.signatures[0]),true);
  const effects=bcs.TransactionEffects.parse(decodeJsonBytes(transaction.effects.bcs));
  const body=effects.$kind==='V2'?effects.V2:effects.V1;
  assert.equal(body.transactionDigest,digest);
  assert.equal(body.status.$kind,'Success');
  const records=await journal(extensionPage);
  assert.equal(records.length,baseline.length+1);assert(baseline.every(old=>records.some(row=>JSON.stringify(row)===JSON.stringify(old))));const current=records.find(row=>row.digest===digest);assert(current);assert.equal(current.requestId,requestId);assert.equal(current.state,'confirmed-success');assert.equal(current.receipt.success,true);
  const evidence={passed:true,bytesSha256:require('node:crypto').createHash('sha256').update(bytes).digest('hex'),digest,requestId,previewDigestMatches:true,signatureVerified:true,effectsSuccess:true,journal:current,scope:'actual extension approval, one execution and terminal journal; restart checked by caller'};
  fs.writeFileSync(path.join(evidenceDirectory,'confirmed.json'),JSON.stringify(evidence,null,2)+'\n',{flag:'wx',mode:0o600});
  return evidence;
}
module.exports={execute,journal};

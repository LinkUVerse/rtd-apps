// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

module.exports = async function testDapp({ context, key, command, accountId, unlockPopup, unlockAccount, createTestAccount, extensionPage, evidenceDirectory, directory, lifecycleCase, otherAccountId, archiveIdentity, extension, setStage }) {
  const root = fs.realpathSync(directory);
  const server = http.createServer((request, response) => {
    const name = new URL(request.url, 'http://localhost').pathname;
    const file = path.resolve(root, '.' + (name === '/' ? '/index.html' : name));
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      response.writeHead(404).end(); return;
    }
    response.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html');
    fs.createReadStream(file).pipe(response);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const demo = await context.newPage();
  demo.setDefaultTimeout(20000);
  const runtimeErrors = [];
  demo.on('pageerror', error => runtimeErrors.push(error.name)); 
  try {
    setStage('dApp connect');
    await demo.goto(`http://127.0.0.1:${server.address().port}`);

    setStage('dApp wallet discovery');
    await demo.getByRole('button', { name: 'Connect', exact: true }).waitFor();
    await require('@playwright/test').expect(demo.getByRole('button', { name: 'Connect', exact: true })).toBeEnabled({ timeout: 15000 });
    setStage('dApp connect popup');
    const opened = context.waitForEvent('page', { timeout: 20000 });
    opened.catch(() => {});
    await demo.getByRole('button', { name: 'Connect', exact: true }).click();
    const approval = await opened.catch(async error => {
      console.error(JSON.stringify({ connectAlert: await demo.getByRole('alert').allTextContents(), pagePaths: context.pages().map(p => { const u = new URL(p.url()); return u.protocol + '//' + u.host + u.pathname; }) }));
      throw error;
    });
    setStage('dApp HTTP warning');
    await approval.getByRole('button', { name: /^(继续|Continue)$/ }).click();
    await approval.getByRole('button', { name: /^(连接|Connect)$/ }).click();
    await demo.getByTestId('accounts-list').getByText(key.toRtdAddress(), { exact: true }).waitFor();
    setStage('restore authorized accounts after dApp reload');
    await demo.reload();
    await require('@playwright/test').expect.poll(async () => {
      await demo.getByRole('button', { name: 'Inspect wallet authorization', exact: true }).click();
      return JSON.parse(await demo.getByTestId('wallet-authorization').innerText());
    }).toContain(key.toRtdAddress());
    let reconnectPopups = 0;
    const countReconnect = () => { reconnectPopups++; };
    context.on('page', countReconnect);
    await demo.getByRole('button', { name: 'Connect', exact: true }).click();
    await demo.getByTestId('accounts-list').getByText(key.toRtdAddress(), { exact: true }).waitFor();
    context.off('page', countReconnect); assert.equal(reconnectPopups, 0);
    const originTabs = process.env.RTD_TEST_DAPP_ORIGIN_TABS === '1'
      ? await require('./test-dapp-origin-tabs.cjs')({ context, demo, extensionPage, server, key, setStage }) : undefined;
    const lockedApproval = process.env.RTD_TEST_DAPP_LOCKED_APPROVAL === '1'
      ? await require('./test-dapp-locked-approval.cjs')({ context, demo, extensionPage, command, accountId, unlockPopup, key, setStage }) : undefined;
    const accountSwitch = process.env.RTD_TEST_DAPP_ACCOUNT_SWITCH === '1'
      ? await require('./test-dapp-account-switch.cjs')({ context, demo, extensionPage, command, accountId, createTestAccount, key, setStage }) : undefined;
    const frames = process.env.RTD_TEST_DAPP_FRAMES === '1'
      ? await require('./test-dapp-frames.cjs')({ context, demo, extensionPage, server, setStage }) : undefined;
    const networkSwitch = process.env.RTD_TEST_DAPP_NETWORK_SWITCH === '1'
      ? await require('./test-dapp-network-switch.cjs')({ context, demo, extensionPage, command, key, setStage }) : undefined;
    if(process.env.RTD_TEST_WAIT_ADMISSION_CLEAR==='1'){
      setStage('observe canonical pending completion before positive signature');
      const deadline=Date.now()+120000;
      for(;;){
        const pending=await extensionPage.evaluate(async()=>{
          const name='RtdWallet NetworkAdmission';if(!(await indexedDB.databases()).some(x=>x.name===name))throw new Error('Canonical admission missing');
          return new Promise((resolve,reject)=>{const r=indexedDB.open(name);r.onupgradeneeded=()=>{r.transaction.abort();reject(new Error('Readonly forbids upgrade'));};r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,tx=db.transaction('admission-v1','readonly');let count;tx.oncomplete=()=>{db.close();resolve(count);};tx.onabort=()=>{db.close();reject(new Error('Canonical read aborted'));};const q=tx.objectStore('admission-v1').getAll();q.onsuccess=()=>{count=q.result.reduce((n,row)=>n+row.pending.length,0);};};});
        });
        if(pending===0)break;if(Date.now()>=deadline)throw new Error('Actual pending observations did not finish');
        await new Promise(resolve=>setTimeout(resolve,100));
      }
    }
    setStage('dApp PersonalMessage approval');
    const signing = context.waitForEvent('page', { timeout: 20000 });
    signing.catch(() => {});
    await demo.getByRole('button', { name: 'Sign message', exact: true }).click();
    const signingPage = await signing.catch(async error => { console.error(JSON.stringify({ signingAlert: await demo.getByRole('alert').allTextContents() })); throw error; });
    setStage('dApp message visible');
    await signingPage.getByText('Test message', { exact: true }).waitFor();
    setStage('dApp approve signature');
    await signingPage.getByRole('button', { name: /^(签名|Sign)$/ }).click();
    setStage('dApp signed result');
    await demo.getByTestId('action-result').waitFor({timeout:60000}).catch(async error => { console.error(JSON.stringify({ signingAlert: await demo.getByRole('alert').allTextContents() })); throw error; });
    const signed = JSON.parse(await demo.getByTestId('action-result').innerText());
    const message = new TextEncoder().encode('Test message');
    assert.deepEqual(Buffer.from(signed.bytes, 'base64'), Buffer.from(message));
    assert.equal(await key.getPublicKey().verifyPersonalMessage(message, signed.signature), true);
    setStage('dApp wrong chain');
    let wrongChainPopups = 0;
    const countWrongChainPopup = () => { wrongChainPopups++; };
    context.on('page', countWrongChainPopup);
    await demo.getByLabel('Use wrong chain').check();
    await demo.getByRole('button', { name: 'Sign message', exact: true }).click();
    await demo.getByRole('alert').waitFor();
    assert.match(await demo.getByRole('alert').innerText(), /消息请求链与当前钱包网络不匹配/);
    assert.equal(await demo.getByTestId('action-result').count(), 0);
    context.off('page', countWrongChainPopup);
    assert.equal(wrongChainPopups, 0);
    await demo.getByLabel('Use wrong chain').uncheck();
    const cancellation = process.env.RTD_TEST_DAPP_CANCEL === '1'
      ? await require('./test-dapp-cancellation.cjs')({ context, demo, extensionPage, setStage }) : undefined;
    const simulationLock = process.env.RTD_TEST_DAPP_LOCK_SIMULATION === '1'
      ? await require('./test-dapp-cancel-simulation.cjs')({ context, demo, extensionPage, setStage, command, accountId, unlockPopup, lockDuringSimulation: true }) : undefined;
    const simulationCancellation = process.env.RTD_TEST_DAPP_CANCEL_SIMULATION === '1'
      ? await require('./test-dapp-cancel-simulation.cjs')({ context, demo, extensionPage, setStage }) : undefined;
    setStage('modern methods require explicit account');
    let missingAccountPopups = 0;
    const countMissingAccountPopup = () => { missingAccountPopups++; };
    context.on('page', countMissingAccountPopup);
    try {
      await demo.getByLabel('Omit account').check();
      for (const name of ['Sign transaction', 'Send transaction', 'Sign message']) {
        await demo.getByRole('button', { name, exact: true }).click();
        await require('@playwright/test').expect(demo.getByRole('alert')).toContainText('必须明确提供有效的钱包账户');
        assert.equal(await demo.getByTestId('action-result').count(), 0);
      }
      assert.equal(missingAccountPopups, 0);
      await demo.getByLabel('Omit account').uncheck();
    } finally { context.off('page', countMissingAccountPopup); }
    setStage('transaction methods require explicit chain');
    let missingChainPopups = 0;
    const countMissingChainPopup = () => { missingChainPopups++; };
    context.on('page', countMissingChainPopup);
    try {
      await demo.getByLabel('Omit chain').check();
      for (const name of ['Sign transaction', 'Send transaction']) {
        await demo.getByRole('button', { name, exact: true }).click();
        await require('@playwright/test').expect(demo.getByRole('alert')).toContainText('必须明确提供有效的交易链');
        assert.equal(await demo.getByTestId('action-result').count(), 0);
      }
      assert.equal(missingChainPopups, 0);
    } finally { context.off('page', countMissingChainPopup); }
    setStage('PersonalMessage still permits omitted chain');
    const optionalMessage = context.waitForEvent('page', { timeout: 20000 }); optionalMessage.catch(() => {});
    await demo.getByRole('button', { name: 'Sign message', exact: true }).click();
    const optionalPopup = await optionalMessage;
    await optionalPopup.getByText('Test message', { exact: true }).waitFor();
    await optionalPopup.getByRole('button', { name: /^(签名|Sign)$/ }).click();
    await demo.getByTestId('action-result').waitFor();
    const optionalResult = JSON.parse(await demo.getByTestId('action-result').innerText());
    assert.deepEqual(Buffer.from(optionalResult.bytes, 'base64'), Buffer.from(message));
    assert.equal(await key.getPublicKey().verifyPersonalMessage(message, optionalResult.signature), true);
    await demo.getByLabel('Omit chain').uncheck();
    let signOnly, approvedBytesBase64;
    if (true) { // This dedicated helper always signs a transaction; caller prohibits Execute and inherited flags.
      setStage('dApp sign-only preparation');
      const waiting = context.waitForEvent('page', { timeout: 20000 });
      waiting.catch(() => {});
      await demo.getByRole('button', { name: 'Sign transaction', exact: true }).click();
      const txPage = await waiting;
      txPage.setDefaultTimeout(60000);
      const approve = txPage.getByRole('button', { name: /^(批准|Approve)$/ });
      await require('@playwright/test').expect(approve).toBeEnabled({ timeout: 60000 }).catch(async error => {
        console.error(JSON.stringify({ preparationText: (await txPage.locator('body').innerText()).slice(0, 2500) })); throw error;
      });
      const preview = await txPage.getByText(/^(交易摘要|Transaction digest):/).innerText();
      const previewDigest = preview.split(':').pop().trim();
      await approve.click();
      setStage('dApp sign-only result');
      await demo.getByTestId('action-result').waitFor({timeout:60000}).catch(async error => {
        console.error(JSON.stringify({ signOnlyError: await demo.getByRole('alert').allTextContents() })); throw error;
      });
      const result = JSON.parse(await demo.getByTestId('action-result').innerText());
      approvedBytesBase64 = result.bytes;
      const bytes = Buffer.from(result.bytes, 'base64');
      assert.equal(await key.getPublicKey().verifyTransaction(bytes, result.signature), true);
      const { Transaction } = require('rtd-typescript/transactions');
      const tx = Transaction.from(bytes), data = tx.getData();
      assert.equal(data.sender, key.toRtdAddress());
      assert.deepEqual(data.commands.map(command => command.$kind), ['SplitCoins', 'TransferObjects']);
      const digest = await tx.getDigest();
      assert.equal(digest, previewDigest);
      signOnly = { verified: true, previewDigestMatches: true, digest, bytesSha256: require('node:crypto').createHash('sha256').update(bytes).digest('hex'), sender: data.sender,
        gasData: data.gasData, expiration: data.expiration, gasBudget: data.gasData.budget, commands: data.commands.map(command => command.$kind) };
    }
    const signReturnHold = await require('./test-current-sign-return-hold.cjs')({context,demo,extensionPage,command,accountId,unlockAccount,createTestAccount,key,extension,setStage});
    const transactionIdentity = process.env.RTD_TEST_DAPP_IDENTITY_FAULTS === '1'
      ? await require('./test-dapp-transaction-identity.cjs')({context,demo,extensionPage,setStage}) : undefined;
    const networkObservations = process.env.RTD_TEST_NETWORK_OBSERVATIONS === '1'
      ? await require('./test-dapp-network-observations.cjs')({context,demo,extensionPage,accountId,approvedBytesBase64,approvedDigest:signOnly.digest,setStage}) : undefined;
    const execution = undefined;
    setStage('dApp reject message');
    const rejecting = context.waitForEvent('page', { timeout: 20000 });
    rejecting.catch(() => {});
    await demo.getByRole('button', { name: 'Sign message', exact: true }).click();
    const rejectPage = await rejecting;
    await rejectPage.getByRole('button', { name: /^(拒绝|Reject)$/ }).click();
    await demo.getByRole('alert').waitFor();
    assert.match(await demo.getByRole('alert').innerText(), /reject/i);
    assert.equal(await demo.getByTestId('action-result').count(), 0);
    setStage('dApp unauthorized account');
    await demo.getByLabel('Use wrong account').check();
    await demo.getByRole('button', { name: 'Sign message', exact: true }).click();
    await demo.getByRole('alert').waitFor();
    const rejection = await demo.getByRole('alert').innerText();
    assert.match(rejection, /Operation not allowed, dapp doesn't have the required permissions/);
    assert.equal(await demo.getByTestId('action-result').count(), 0);
    setStage('dApp disconnect');
    await demo.getByRole('button', { name: 'Disconnect', exact: true }).click();
    await demo.getByRole('button', { name: 'Connect', exact: true }).waitFor();
    assert.equal(await demo.getByTestId('accounts-list').count(), 0);
    assert.equal(await extensionPage.evaluate(async origin => !!(await chrome.storage.local.get('permissions')).permissions?.[origin], new URL(demo.url()).origin), false);
    await demo.reload();
    await demo.getByRole('button', { name: 'Inspect wallet authorization', exact: true }).click();
    assert.deepEqual(JSON.parse(await demo.getByTestId('wallet-authorization').innerText()), []);
    assert.deepEqual(runtimeErrors, []);
    return { passed: true, lockedApproval, accountSwitch, frames, networkSwitch, originTabs, cancellation, simulationLock, simulationCancellation, signOnly, signReturnHold, transactionIdentity, networkObservations, execution, checks: ['authorized accounts restored on page reload without popup; revoked accounts remain absent after reload', 'transaction methods reject omitted chain; PersonalMessage without chain signs and verifies', 'all three modern methods reject omitted account before popup', 'actual HTTP origin warning and account connection approval', 'actual PersonalMessage approval UI', 'direct Wallet Standard wrong chain rejected before popup', 'returned bytes match message and signature verifies against imported public key', 'user rejection returns no signature', 'unauthorized account rejected by extension permissions', 'disconnect removes account'], chainExecution: !!execution };
  } finally {
    await demo.close();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
};

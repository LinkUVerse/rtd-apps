const assert = require('node:assert/strict');
const { expect } = require('@playwright/test');
module.exports = async ({ context, demo, extensionPage, setStage, command, accountId, unlockPopup, lockDuringSimulation = false }) => {
  const worker = context.serviceWorkers()[0];
  const evidence = [];
  for (const action of ['sign', 'execute']) {
    await worker.evaluate(() => {
      const native = globalThis.fetch.bind(globalThis);
      globalThis.__restoreCancelProbe = () => { globalThis.fetch = native; };
      const state = globalThis.__cancelProbe = { simulations: 0, dispatched: 0, responseReady: false, aborted: false };
      globalThis.fetch = async (input, init) => {
        const url = String(input instanceof Request ? input.url : input);
        if (/\/ExecuteTransaction(?:$|\?)/.test(url)) { state.dispatched++; throw new Error('simulation cancellation probe forbids execution'); }
        if (/\/SimulateTransaction(?:$|\?)/.test(url) && ++state.simulations === 1) {
          const response = await native(input, init);
          await response.arrayBuffer(); state.responseReady = true; state.status = response.status;
          const signal = init.signal;
          return new Promise((_resolve, reject) => {
            const abort = () => { state.aborted = true; state.reason = signal.reason?.name; reject(signal.reason); };
            if (signal.aborted) abort(); else signal.addEventListener('abort', abort, { once: true });
          });
        }
        return native(input, init);
      };
    });
    try {
      setStage(`${action} cancellation during real simulation`);
      await demo.getByLabel('Cancellation stage').selectOption('approval');
      const opened = context.waitForEvent('page', { timeout: 20000 }); opened.catch(() => {});
      await demo.getByRole('button', { name: `Start cancellable ${action}`, exact: true }).click();
      const popup = await opened;
      await expect.poll(() => worker.evaluate(() => globalThis.__cancelProbe.responseReady), { timeout: 15000 }).toBe(true);
      if (lockDuringSimulation) {
        setStage(`${action}: lock during held simulation`);
        assert.equal((await command('lockAccountSourceOrAccount', { id: accountId })).type, 'done');
        await expect.poll(() => worker.evaluate(() => globalThis.__cancelProbe.aborted)).toBe(true);
        assert.equal(popup.isClosed(), false);
        assert.equal(await demo.getByTestId('action-result').count(), 0);
        setStage(`${action}: unlock after simulation invalidation`);
        await popup.getByRole('button', { name: /^(解锁后批准|Unlock to Approve|解锁账户|Unlock Account)$/ }).click();
        await unlockPopup(popup);
        await expect.poll(async () => (await command('getStoredEntities', { type: 'accounts' })).args.entities.find(account => account.id === accountId).isLocked).toBe(false);
      }
      await demo.getByRole('button', { name: 'Cancel transaction request', exact: true }).click();
      await expect(demo.getByRole('alert')).toContainText('Demo transaction cancelled');
      setStage(`${action} simulation cancellation closes popup`);
      await expect.poll(() => popup.isClosed()).toBe(true);
      setStage(`${action} simulation cancellation aborts transport`);
      await expect.poll(() => worker.evaluate(() => globalThis.__cancelProbe.aborted)).toBe(true);
      const fault = await worker.evaluate(() => globalThis.__cancelProbe);
      assert.equal(fault.dispatched, 0); assert.equal(fault.status, 200); assert.notEqual(fault.reason, 'TimeoutError');
      const approvals = await extensionPage.evaluate(async () => Object.keys((await chrome.storage.local.get('transactions')).transactions ?? {}).length);
      assert.equal(approvals, 0); assert.equal(await demo.getByTestId('action-result').count(), 0);
      evidence.push({ action, fault, approvals, passed: true });
    } catch (error) {
      console.error(JSON.stringify({ simulationCancellation: action, fault: await worker.evaluate(() => globalThis.__cancelProbe), openPages: context.pages().length }));
      throw error;
    } finally { await worker.evaluate(() => globalThis.__restoreCancelProbe()); }
  }
  return { passed: true, cases: evidence, scope: lockDuringSimulation ? 'actual simulation response held until account locking aborts transport; unlock UI then caller cancellation; no transaction approval or execution' : 'actual simulation response held until caller cancellation, no transaction approval or execution' };
};

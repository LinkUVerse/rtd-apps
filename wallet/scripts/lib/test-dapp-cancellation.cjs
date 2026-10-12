const assert = require('node:assert/strict');
const { expect } = require('@playwright/test');
module.exports = async function testCancellation({ context, demo, extensionPage, setStage }) {
  const results = [];
  for (const action of ['sign', 'execute']) {
    for (const stage of ['pre-aborted', 'serialization', 'approval']) {
      setStage(`dApp ${action} cancellation ${stage}`);
      await demo.getByLabel('Cancellation stage').selectOption(stage);
      let opened = 0;
      const count = () => { opened++; };
      context.on('page', count);
      try {
        const popupPromise = stage === 'approval' ? context.waitForEvent('page', { timeout: 20000 }) : null;
        popupPromise?.catch(() => {});
        await demo.getByRole('button', { name: `Start cancellable ${action}`, exact: true }).click();
        let popup;
        if (popupPromise) {
          popup = await popupPromise;
          await popup.waitForURL(/#\/dapp\/approve\//);
          // Require a real persisted background approval before cancelling. Never approve it.
          const requestId = new URL(popup.url()).hash.split('/').pop();
          await expect.poll(async () => extensionPage.evaluate(async id => {
            const value = await chrome.storage.local.get('transactions');
            return !!value.transactions?.[id];
          }, requestId)).toBe(true);
        }
        if (stage === 'serialization') await demo.getByTestId('serialization-waiting').waitFor();
        if (stage !== 'pre-aborted') await demo.getByRole('button', { name: 'Cancel transaction request', exact: true }).click();
        await expect(demo.getByRole('alert')).toContainText('Demo transaction cancelled');
        assert.equal(await demo.getByTestId('action-result').count(), 0);
        if (popup) await expect.poll(() => popup.isClosed()).toBe(true);
        await expect.poll(async () => extensionPage.evaluate(async () => {
          const value = await chrome.storage.local.get('transactions');
          return Object.keys(value.transactions ?? {}).length;
        })).toBe(0);
        assert.equal(opened, stage === 'approval' ? 1 : 0);
        results.push({ action, stage, passed: true, approvalWindows: opened, remainingApprovals: 0 });
      } finally { context.off('page', count); }
    }
  }
  return { passed: true, cases: results, scope: 'pre-aborted, serialization and persisted approval cancellation; no approval click or dispatch' };
};

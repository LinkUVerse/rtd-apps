const assert = require('node:assert/strict');
const { expect } = require('@playwright/test');
module.exports = async ({ page, command, accountId, createTestAccount, setStage }) => {
  const base = page.url().split('#')[0];
  const reads = [];
  const listener = async response => {
    if (!response.url().endsWith('/graphql') || !(response.request().postData() || '').includes('objects(first:')) return;
    try {
      const body = await response.json();
      const snapshot = body.data?.walletSnapshot, address = snapshot?.query?.address;
      if (address?.objects && !body.errors?.length) reads.push({ owner: address.address,
        checkpoint: snapshot.sequenceNumber, ids: address.objects.nodes.map(object => object.address),
        complete: !address.objects.pageInfo.hasNextPage });
    } catch {}
  };
  page.on('response', listener);
  let second;
  try {
    setStage('cache UI: create disposable second account');
    second = await createTestAccount();
    assert(second.id !== accountId);
    assert.equal((await command('switchAccount', { accountID: second.id })).type, 'done');
    await page.goto(base + '#/nfts/other');
    setStage('cache UI: second account actual empty objects');
    await expect.poll(() => reads.some(row => row.owner === second.address && row.complete && row.ids.length === 0), { timeout: 45000 }).toBe(true);
    await expect(page).toHaveURL(/#\/nfts\/other$/);
    await expect(page.locator('[title*="::package::"]')).toHaveCount(0);
    const beforeReturn = reads.length;
    setStage('cache UI: restore original account');
    assert.equal((await command('switchAccount', { accountID: accountId })).type, 'done');
    await expect(page.locator('[title*="::package::"]')).toHaveCount(9, { timeout: 45000 });
    await expect.poll(() => reads.slice(beforeReturn).some(row => row.owner !== second.address && row.complete && row.ids.length === 13), { timeout: 45000 }).toBe(true);
    setStage('cache UI: unconfigured network clears old assets');
    assert.equal((await command('@setNetwork', { env: 'devNet', customRpcUrl: null })).type, 'done');
    await expect(page).toHaveURL(/#\/nfts\/other$/);
    await expect(page.locator('[title*="::package::"]')).toHaveCount(0);
    await expect(page.getByText('当前网络尚未配置钱包数据服务', { exact: false }).first()).toBeVisible({ timeout: 15000 });
    const beforeLocal = reads.length;
    setStage('cache UI: same Local profile requires fresh query');
    assert.equal((await command('@setNetwork', { env: 'local', customRpcUrl: null })).type, 'done');
    await expect(page.locator('[title*="::package::"]')).toHaveCount(9, { timeout: 45000 });
    await expect.poll(() => reads.slice(beforeLocal).some(row => row.owner !== second.address && row.complete && row.ids.length === 13), { timeout: 45000 }).toBe(true);
    return { passed: true, secondAddress: second.address, reads,
      oldAccountAssetsRemoved: true, originalAccountRequeried: true,
      unconfiguredNetworkClearsAssets: true, localReentryRequeried: true,
      scope: 'actual Chrome account and network roundtrip; no delayed transport fault injection, no signing/execution' };
  } catch(error) {
    console.error(JSON.stringify({querySwitchDiagnostic:{error:String(error.message).slice(0,1200),route:new URL(page.url()).hash,text:(await page.locator('body').innerText()).slice(0,1400),reads}}));
    throw error;
  } finally {
    await command('@setNetwork', { env: 'local', customRpcUrl: null });
    await command('switchAccount', { accountID: accountId });
    if (second) assert.equal((await command('removeAccount', { accountID: second.id })).type, 'done');
    page.off('response', listener);
  }
};

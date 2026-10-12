const assert = require('node:assert/strict');
const { expect } = require('@playwright/test');
module.exports = async ({ page, setStage }) => {
  const base = page.url().split('#')[0];
  let faults = 0;
  const endpoint = 'https://127.0.0.1:39600/graphql';
  const route = async route => {
    if ((route.request().postData() || '').includes('objects(first:')) {
      faults++;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        errors: [{ message: 'private upstream diagnostic test-only' }],
      }) });
    } else await route.continue();
  };
  await page.route(endpoint, route);
  try {
    setStage('asset error: actual extension rejects injected partial GraphQL');
    await page.goto(base + '#/nfts/other');
    await page.reload();
    await expect(page.getByText('查询结果不完整或不兼容，未接纳数据', { exact: true })).toBeVisible({ timeout: 45000 });
    assert(faults > 0);
    await expect(page.locator('[title*="::package::"]')).toHaveCount(0);
    assert(!(await page.locator('body').innerText()).includes('private upstream'));
  } finally { await page.unroute(endpoint, route); }
  setStage('asset error: real service recovery restores complete list');
  const observed = page.waitForResponse(response => response.url() === endpoint &&
    (response.request().postData() || '').includes('objects(first:'), { timeout: 45000 });
  await page.reload();
  const response = await observed;
  const body = await response.json();
  assert.equal(response.status(), 200);
  assert(!body.errors?.length);
  const snapshot = body.data.walletSnapshot, objects = snapshot.query.address.objects;
  assert.equal(objects.pageInfo.hasNextPage, false);
  assert.equal(objects.nodes.length, 13);
  await expect(page.locator('[title*="::package::"]')).toHaveCount(9, { timeout: 45000 });
  return { passed: true, faults, restoredCheckpoint: snapshot.sequenceNumber, restoredOwnedObjects: 13,
    scope: 'actual extension with injected GraphQL error followed by real service recovery; not a real server outage or transaction failure' };
};

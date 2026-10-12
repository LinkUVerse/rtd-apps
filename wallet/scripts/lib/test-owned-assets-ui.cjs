// Existing dev fixtures through actual extension UI. No transaction or storage injection.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { expect } = require('@playwright/test');
module.exports = async ({ page, setStage }) => {
  const fixture = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../migrationToGRpcOrGraphQLDoc/workLog/20261004-owned-assets-deployer-live.json'), 'utf8'));
  const expected = fixture.rows[0].owned.filter(object => !object.type.includes('::coin::Coin<') && !object.type.endsWith('::ob_kiosk::OwnerToken'));
  assert.equal(expected.length, 10, 'reviewed nonvisual fixture changed');
  const base = page.url().split('#')[0];
  const reads = [];
  const listener = async response => {
    if (!response.url().endsWith('/graphql') || !(response.request().postData() || '').includes('objects(first:')) return;
    try {
      const data = await response.json();
      const snapshot = data.data?.walletSnapshot;
      const objects = snapshot?.query?.address?.objects;
      if (objects) reads.push({ status: response.status(), checkpoint: snapshot.sequenceNumber,
        owner: snapshot.query.address.address, hasNextPage: objects.pageInfo.hasNextPage,
        ids: objects.nodes.map(object => object.address) });
    } catch {}
  };
  page.on('response', listener);
  try {
    setStage('nonvisual assets: real owned query and all fixture rows');
    await page.goto(base + '#/nfts/other');
    for (const object of expected) {
      // The complete canonical type is kept in title even when the visible package ID is shortened.
      await expect(page.locator(`[title="${object.type}"]`).first()).toBeVisible({ timeout: 45000 });
    }
    const rendered = await page.locator('[title]').evaluateAll(nodes => nodes.map(node => node.getAttribute('title')).filter(value => value?.includes('::')));
    assert.deepEqual([...rendered].sort(), expected.map(object => object.type).sort());
    const links = await page.locator('a[href]').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')));
    for (const object of expected) assert(links.some(href => href.includes(object.id)), 'missing object explorer link');
    assert(reads.some(read => read.status === 200 && read.owner === fixture.rows[0].owner && !read.hasNextPage), 'real complete owned page missing');
    setStage('visual assets: kiosk card');
    await page.goto(base + '#/nfts');
    const kioskLink = page.locator('a[href*="/kiosk?"]');
    await expect(kioskLink).toHaveCount(1, { timeout: 45000 });
    await expect(kioskLink).toBeVisible();
    const href = await kioskLink.getAttribute('href');
    await kioskLink.click();
    await page.waitForURL(/#\/kiosk\?/);
    setStage('kiosk details: admitted empty contents');
    await expect(page.getByText(/^(Kiosk 中暂无资产|Kiosk is empty)$/)).toBeVisible({ timeout: 45000 });
    const kioskId = new URLSearchParams(href.split('?')[1]).get('kioskId');
    assert(kioskId);
    setStage('kiosk details: explorer link');
    await expect(page.locator(`a[href*="${kioskId}"]`).first()).toBeVisible();
    const admitted = reads.find(read => read.status === 200 && read.owner === fixture.rows[0].owner && !read.hasNextPage);
    for (const object of expected) assert(admitted.ids.includes(object.id), 'rendered object absent from actual complete page');
    return { passed: true, nonvisualObjects: expected.map(object => ({ id: object.id, type: object.type })),
      reads, kioskHref: href, kioskRouteOpened: true, emptyKioskDetails: true,
      scope: 'actual owned-object nonvisual rows, explorer links and visual kiosk navigation and admitted empty contents; no direct NFT display, hidden assets, nonempty kiosk or NFT transfer acceptance' };
  } catch (error) {
    console.error(JSON.stringify({ ownedAssetsDiagnostic: { error: String(error.message).slice(0, 1000), links: await page.locator('a[href]').evaluateAll(nodes => nodes.map(node => node.getAttribute('href'))), route: new URL(page.url()).hash, text: (await page.locator('body').innerText()).slice(0, 1800), reads } }));
    throw error;
  } finally { page.off('response', listener); }
};

// Actual success-null metadata at the admitted old S; no fixture injection or preparation.
const assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const {expect} = require('@playwright/test');
module.exports = async ({page, setStage}) => {
  const fixture = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.local/state/rtd-wallet-migration/dev-20261003-01/token-mixed-funding-01/fixture.json'), 'utf8'));
  const base = page.url().split('#')[0];
  setStage('token metadata: actual admitted absence disables sending');
  const pending = page.waitForResponse(response => {
    if (!response.url().endsWith('/graphql')) return false;
    const request = JSON.parse(response.request().postData() || '{}');
    return request.query?.includes('coinMetadata(coinType:') && request.variables.type === fixture.coinType;
  }, {timeout: 45000});
  await page.goto(base + '#/send?type=' + encodeURIComponent(fixture.coinType));
  const response = await pending, payload = await response.json();
  assert.equal(response.status(), 200);
  assert.equal(payload.errors?.length || 0, 0);
  const snapshot = payload.data?.walletSnapshot;
  assert(snapshot && Number.isSafeInteger(snapshot.sequenceNumber));
  assert.equal(snapshot.query.coinMetadata, null);
  await expect(page.getByText(/^(当前资产快照中缺少币种精度信息，暂时无法发送。请等待索引同步或核对币种。|This asset snapshot has no decimal information for the coin\. Sending is unavailable\. Wait for indexing or check the coin type\.)$/)).toBeVisible();
  await expect(page.getByTestId('coin-amount-input')).toHaveCount(0);
  await expect(page.getByRole('button', {name: /^(检查|Review|立即发送|Send Now)$/})).toHaveCount(0);
  await page.goto(base + '#/tokens');
  return {passed: true, coinType: fixture.coinType, checkpoint: snapshot.sequenceNumber, digest: snapshot.digest,
    metadata: null, precisionNotGuessed: true, amountInputAbsent: true, approvalAbsent: true,
    scope: 'actual old-snapshot success-null metadata and explicit sending restriction; not token catch-up, nonzero-decimal sending or dependency-failure acceptance'};
};

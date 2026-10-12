// Additional pagination policy only; full canonical pages are decoded by C88/C85.
const assert = require('node:assert/strict');
function validate(frames, histories, addresses) {
  const counts = Object.fromEntries(Object.values(addresses).map(a => [a, 0]));
  for (const frame of frames) {
    if (!frame.url.endsWith('/account/graphql') || frame.status !== 200) continue;
    const request = JSON.parse(Buffer.from(frame.requestBase64, 'base64'));
    const response = JSON.parse(Buffer.from(frame.responseBase64, 'base64'));
    if (!response.data?.accountHistory) continue;
    const page = response.data.accountHistory;
    assert(Object.values(addresses).includes(page.address));
    assert.equal(request.variables.address, page.address);
    assert.equal(request.variables.limit, 4);
    assert.equal(page.limit, 4);
    counts[page.address]++;
  }
  for (const role of ['source', 'existingTarget', 'newTarget']) {
    assert(Number.isSafeInteger(histories[role]?.completePages));
    assert(histories[role].completePages >= (role === 'newTarget' ? 1 : 2));
    assert(counts[addresses[role]] >= histories[role].completePages);
  }
  return { pageSize: 4, sourceAndExistingTargetActuallyMultipage: true };
}
module.exports = { validate };

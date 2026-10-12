// Complete canonical NFT data for real Wallet Standard validity UI requests.
const assert = require('node:assert/strict');
const {bcs} = require('rtd-typescript/bcs');
const {Transaction} = require('rtd-typescript/transactions');
const {toBase64} = require('rtd-typescript/utils');
const contract = require('./C114-nft-wire-contract-v3.cjs');
const names = Object.freeze(['originalWindow','expirationNone','expiredEpoch','expirationLargeEpoch',
  'windowMinTimestamp','windowMaxTimestamp','validDuringNoTimestamp','validDuringMinTimestamp','validDuringMaxTimestamp']);
async function build(prepared) {
  const original = contract.canonical(prepared.bytesBase64), expiration = original.V1.expiration;
  assert(['Validity','ValidDuring'].includes(expiration.$kind));
  const window = expiration[expiration.$kind];assert.equal(window.minTimestamp,null);assert.equal(window.maxTimestamp,null);
  assert.equal(await Transaction.from(prepared.bytesBase64).getDigest(),prepared.digest);
  const rows = [];
  for (const name of names) {
    const data = structuredClone(original), value = data.V1;
    if (name === 'expirationNone') value.expiration = {$kind:'None',None:true};
    else if (name === 'expiredEpoch') value.expiration = {$kind:'Epoch',Epoch:'0'};
    else if (name === 'expirationLargeEpoch') value.expiration = {$kind:'Epoch',Epoch:'9007199254740993'};
    else if (name.startsWith('validDuring')) {
      const {minEpoch,maxEpoch,minTimestamp,maxTimestamp,chain,nonce} = window;
      value.expiration = {$kind:'ValidDuring',ValidDuring:{minEpoch,maxEpoch,minTimestamp,maxTimestamp,chain,nonce}};
      if (name === 'validDuringMinTimestamp') value.expiration.ValidDuring.minTimestamp = '1';
      if (name === 'validDuringMaxTimestamp') value.expiration.ValidDuring.maxTimestamp = '18446744073709551615';
    } else if (name === 'windowMinTimestamp') value.expiration[expiration.$kind].minTimestamp = '1';
    else if (name === 'windowMaxTimestamp') value.expiration[expiration.$kind].maxTimestamp = '18446744073709551615';
    const bytesBase64 = toBase64(bcs.TransactionData.serialize(data).toBytes()), tx = Transaction.from(bytesBase64);
    const actual = contract.canonical(bytesBase64), preserved = structuredClone(actual);preserved.V1.expiration = structuredClone(expiration);
    assert.deepEqual(preserved,original);
    const digest = await tx.getDigest(), json = await tx.toJSON();
    assert.equal(toBase64(await Transaction.from(json).build()),bytesBase64);
    if (name === 'originalWindow') {assert.equal(bytesBase64,prepared.bytesBase64);assert.equal(digest,prepared.digest)}
    else if (bytesBase64 !== prepared.bytesBase64) assert.notEqual(digest,prepared.digest);
    const e = actual.V1.expiration, w = ['ValidDuring','Validity'].includes(e.$kind) ? e[e.$kind] : null;
    const timestampUnsupported = w !== null && (w.minTimestamp !== null || w.maxTimestamp !== null);
    rows.push({name,bytesBase64,digest,json,originalDigest:prepared.digest,expiration:actual.V1.expiration,
      expired:name === 'expiredEpoch',timestampUnsupported,approvalEnabled:name !== 'expiredEpoch' && !timestampUnsupported});
  }
  return rows;
}
module.exports = {names,build};

// Full canonical changes for the actual NFT revalidation parameter; no network client.
const assert = require('node:assert/strict');
const { bcs } = require('rtd-typescript/bcs');
const { Transaction } = require('rtd-typescript/transactions');
const { toBase64 } = require('rtd-typescript/utils');

const names = Object.freeze(['gasBudget', 'gasPrice', 'sender', 'sponsor',
  'expirationNone', 'expiredEpoch', 'expirationLargeEpoch', 'unsupportedTimestamp']);
function canonical(encoded) {
  const bytes = Buffer.from(encoded, 'base64');
  assert.equal(bytes.toString('base64'), encoded);
  const data = bcs.TransactionData.parse(bytes);
  assert.equal(toBase64(bcs.TransactionData.serialize(data).toBytes()), encoded);
  assert.equal(data.$kind, 'V1');
  return data;
}
function expectedData(original, name, options) {
  assert(names.includes(name));
  const expected = structuredClone(original), value = expected.V1;
  if (name === 'gasBudget') value.gasData.budget = String(BigInt(value.gasData.budget) + 1000n);
  else if (name === 'gasPrice') value.gasData.price = String(BigInt(value.gasData.price) + 1n);
  else if (name === 'sender') { assert.notEqual(value.sender, options.otherSender); value.sender = options.otherSender; }
  else if (name === 'sponsor') {
    assert.notEqual(value.gasData.owner, options.sponsor);
    assert(options.sponsorCoin && options.sponsorCoin.objectId && options.sponsorCoin.version && options.sponsorCoin.digest);
    value.gasData.owner = options.sponsor; value.gasData.payment = [structuredClone(options.sponsorCoin)];
  } else if (name === 'expirationNone') value.expiration = {$kind:'None', None:true};
  else if (name === 'expiredEpoch') value.expiration = {$kind:'Epoch', Epoch:'0'};
  else if (name === 'expirationLargeEpoch') value.expiration = {$kind:'Epoch', Epoch:'9007199254740993'};
  else {
    assert(['ValidDuring','Validity'].includes(value.expiration.$kind));
    const kind = value.expiration.$kind;
    value.expiration[kind].minTimestamp = '1';
  }
  assert.notDeepEqual(expected, original);
  return expected;
}
async function build(prepared, options) {
  const original = canonical(prepared.bytesBase64);
  assert.equal(await Transaction.from(prepared.bytesBase64).getDigest(), prepared.digest);
  const rows = [];
  for (const name of names) {
    const data = expectedData(original, name, options);
    const bytesBase64 = toBase64(bcs.TransactionData.serialize(data).toBytes());
    const normalized = canonical(bytesBase64);
    const digest = await Transaction.from(bytesBase64).getDigest();
    assert.notEqual(digest, prepared.digest);
    // Canonical parsing may normalize enum discriminators; compare both through BCS.
    assert.equal(toBase64(bcs.TransactionData.serialize(normalized).toBytes()), bytesBase64);
    assert.equal(toBase64(bcs.TransactionData.serialize(expectedData(original, name, options)).toBytes()), bytesBase64);
    rows.push({name, bytesBase64, digest, originalDigest:prepared.digest,
      expectedPreIoSenderRefusal:name==='sender', unsupportedValidityRequiresUiRefusal:name==='unsupportedTimestamp'});
  }
  return rows;
}
function assertOnlyDeclaredChange(prepared, variant, options) {
  const original = canonical(prepared.bytesBase64);
  const actual = canonical(variant.bytesBase64), expected = expectedData(original, variant.name, options);
  assert.equal(toBase64(bcs.TransactionData.serialize(actual).toBytes()),
    toBase64(bcs.TransactionData.serialize(expected).toBytes()));
  assert.equal(variant.originalDigest, prepared.digest);
  assert.notEqual(variant.digest, prepared.digest);
  return actual;
}
module.exports = {names, canonical, expectedData, build, assertOnlyDeclaredChange};

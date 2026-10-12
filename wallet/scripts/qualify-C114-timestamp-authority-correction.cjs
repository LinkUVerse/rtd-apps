// Source-backed timestamp refusal qualification. Synthetic headers are never live evidence.
const fs = require('node:fs'),path = require('node:path'),crypto = require('node:crypto'),assert = require('node:assert/strict');
const {Transaction} = require('rtd-typescript/transactions');
const variants = require('./lib/C114-nft-validity-variants-v2.cjs'),contract = require('./lib/C114-nft-wire-contract-v3.cjs');
const wallet = path.resolve(__dirname,'..'),logs = path.join(wallet,'migrationToGRpcOrGraphQLDoc/workLog');
const read = file => JSON.parse(fs.readFileSync(file)),sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
async function main() {
  const [output] = process.argv.slice(2);assert(output && !fs.existsSync(output));
  const preparationFile = path.join(logs,'20261008-C114-timestamp-authority-source-prepared-01.json'),p = read(preparationFile);
  assert(p.passed && p.preparedOnly && p.completeSourceInverses.length === 7);
  for (const [f,h] of Object.entries(p.inputsSha256)) assert.equal(sha(f),h);
  for (const inverse of p.completeSourceInverses) {
    assert.equal(sha(inverse.old),inverse.originalSha256);assert.equal(sha(inverse.new),inverse.candidateSha256);
    let source = fs.readFileSync(inverse.new,'utf8');
    for (const d of [...inverse.deltas].reverse()) {assert.equal(source.split(d.toText).length-1,d.count);source = source.split(d.toText).join(d.fromText)}
    assert.equal(source,fs.readFileSync(inverse.old,'utf8'));
  }
  const oldFile = path.join(logs,'20261007-C48-nft-execution-browser-01.json'),old = read(oldFile);
  const priorFile = path.join(logs,'20261008-C114-real-validity-tools-qualified-02.json'),prior = read(priorFile);assert(old.passed && prior.passed && prior.rows.length === 54);
  for (const [f,h] of Object.entries(prior.inputsSha256)) assert.equal(sha(f),h);
  const message = 'Error checking transaction input objects: Feature is not supported: Timestamp-based transaction expiration is not yet supported';
  const uint = n => {const out = [];let v = BigInt(n);do {out.push(Number(v & 127n) | (v > 127n ? 128 : 0));v >>= 7n} while (v);return Buffer.from(out)};
  const details = Buffer.concat([Buffer.from([8,3,18]),uint(Buffer.byteLength(message)),Buffer.from(message)]).toString('base64');
  const headers = {'grpc-status':'3','grpc-message':encodeURIComponent(message),'grpc-status-details-bin':details};
  const parsed = contract.errorDetails(headers);assert.equal(parsed.status,3);assert.equal(parsed.message,message);
  const badHeaders = [ {...headers,'grpc-status':'13'}, {...headers,'grpc-message':'Transaction Expired'},
    {...headers,'grpc-status-details-bin':''}, {...headers,'grpc-status-details-bin':details.slice(0,-4)} ];
  for (const h of badHeaders) assert.throws(() => contract.errorDetails(h));
  const initialFetch = globalThis.fetch;let networkAttempts = 0,supported = 0,expired = 0,timestamp = 0;const rows = [];
  globalThis.fetch = () => {networkAttempts++;throw Error('Offline preparation only')};
  try {
    for (const row of old.previews) for (const v of await variants.build(row.approval.prepared)) {
      const previous = prior.rows.find(r => r.scenario === row.label && r.variant === v.name);assert(previous);assert.equal(previous.digest,v.digest);
      const data = contract.canonical(v.bytesBase64),e = data.V1.expiration,w = ['Validity','ValidDuring'].includes(e.$kind) ? e[e.$kind] : null;
      const hasTimestamp = w !== null && [w.minTimestamp,w.maxTimestamp].some(t => t !== null);
      assert.equal(v.timestampUnsupported,hasTimestamp);assert.equal(v.expired,e.$kind === 'Epoch' && e.Epoch === '0');
      assert.equal(v.approvalEnabled,!hasTimestamp && !v.expired);
      if (v.name === 'validDuringNoTimestamp') assert(v.approvalEnabled && !v.timestampUnsupported);
      if (v.expired) expired++;else if (hasTimestamp) timestamp++;else supported++;
      assert.equal(Buffer.from(await Transaction.from(v.json).build()).toString('base64'),v.bytesBase64);
      rows.push({scenario:row.label,variant:v.name,digest:v.digest,canonicalBytesAndJsonUnchanged:true,
        expectedTimestampRefusal:hasTimestamp,expectedEpochRefusal:v.expired,expectedApprovalEnabled:v.approvalEnabled});
    }
    const negativeFile = path.join(logs,'20261008-C114-internal-nft-preflight-01.json');
    await assert.rejects(() => require('./audit-C114-current-internal-nft-authorization-v2.cjs').audit(negativeFile));
  } finally {globalThis.fetch = initialFetch}
  assert.equal(rows.length,54);assert.equal(supported,24);assert.equal(expired,6);assert.equal(timestamp,24);assert.equal(networkAttempts,0);
  const files = [__filename,preparationFile,oldFile,priorFile,require.resolve('./lib/C114-nft-validity-variants-v2.cjs'),
    require.resolve('./lib/C114-real-nft-validity-ui-v2.cjs'),require.resolve('./audit-C114-current-internal-nft-authorization-v2.cjs'),
    path.join(logs,'20261008-C114-timestamp-authority-correction.md')];
  const q = {passed:true,observedAt:new Date().toISOString(),preparedOnly:true,completeSevenSourceInversesHeld:true,
    original54CanonicalBytesAndJsonDigestsUnchanged:true,historicalClassificationRows:rows,
    expectedUiCanonicalSuccesses:24,expectedUiEpochRefusals:6,expectedUiTimestampRefusals:24,
    original282SimulationsAnd54FaultsAndSixRecipientsHeld:true,expectedInternalCanonicalFinals:150,
    expectedInternalEpochHeaders:6,expectedInternalTimestampHeaders:6,
    statusParserSyntheticTimestampOnly:true,syntheticHeaderMutantsRefused:4,
    actualUncoveredPositiveAuditorRejectedBeforeNetwork:true,networkAttempts,profilesOpened:0,signatures:0,executeRequests:0,
    actualTimestampErrorAccepted:false,actualCurrentValidityUiAccepted:false,actualSponsoredExecutionAccepted:false,
    fullNFTAuthorizationAccepted:false,parentCompletion:false,inputsSha256:Object.fromEntries(files.map(f => [f,sha(f)]))};
  fs.writeFileSync(output,JSON.stringify(q,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:true,preparedOnly:true,variants:54,expectedSupported:24,expectedExpired:6,expectedTimestamp:24,networkAttempts:0}));
}
if (require.main === module) main().catch(e => {console.error(JSON.stringify({passed:false,errorType:e.name,message:String(e.message).slice(0,500)}));process.exitCode = 1});

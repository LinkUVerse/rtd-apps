// Actual retained headers plus isolated decoder mutations; no new network or chain actions.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { GrpcTypes } = require('rtd-typescript/grpc');
const old = require('./lib/C85-post-write-bytes.cjs'), next = require('./lib/C88-post-write-bytes.cjs');
const { summaryCodec, fullSummary } = require('./lib/C88-full-summary.cjs');
const read = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const logs = path.resolve(__dirname, '../migrationToGRpcOrGraphQLDoc/workLog');
const [output] = process.argv.slice(2); assert(output && !fs.existsSync(output));
const files = [__filename, path.join(__dirname, 'lib/C88-full-summary.cjs'),
  path.join(__dirname, 'lib/C88-post-write-bytes.cjs'), path.join(__dirname, 'lib/C85-post-write-bytes.cjs'),
  path.join(__dirname, 'audit-C84-nft-post-write-positive.cjs')];
let result;
try {
  const sourceFile = path.join(logs, '20261008-C88-summary-source-authority-01.json'); files.push(sourceFile);
  const authority = read(sourceFile); assert(authority.passed);
  for (const [f, h] of Object.entries(authority.inputsSha256)) assert.equal(sha(f), h);
  const load = name => {
    const f = path.join(logs, name); files.push(f); const p = read(f); assert(p.passed);
    for (const [f, h] of Object.entries(p.inputsSha256)) assert.equal(sha(f), h); return p;
  };
  const archive = load('20261007-C42-framework-post-transfer-production-02.json');
  const genesis = load('20261007-C46-current-authorization-matrix-independent-02.json');
  const frames = archive.frames.filter(f => f.url.endsWith('/GetCheckpoint'));
  const genesisFrames = genesis.nativeFrames.filter(f => f.url.endsWith('/GetCheckpoint'));
  const actual = [next.checkpoint(frames, archive.snapshot),
    next.checkpoint(genesisFrames, { checkpoint: '0', digest: genesis.h0 })];
  assert(actual.every(r => r.fullOuterSummaryCanonical && r.canonicalSummaryFields === 10));
  let checks = 2; const counterexamples = [], branches = [];
  const baselineFrame = frames[0], originalBody = old.base64(baselineFrame.responseBase64);
  const response = () => GrpcTypes.GetCheckpointResponse.fromBinary(old.grpcBody(baselineFrame.responseBase64, true));
  function encode(value) {
    const body = Buffer.from(GrpcTypes.GetCheckpointResponse.toBinary(value));
    const prefix = Buffer.alloc(5); prefix.writeUInt32BE(body.length, 1);
    const trailer = originalBody.subarray(5 + originalBody.readUInt32BE(1));
    return [{ ...baselineFrame, responseBase64: Buffer.concat([prefix, body, trailer]).toString('base64') }];
  }
  const mutations = [
    ['summary digest', s => { s.digest = genesis.h0; }],
    ['summary sequence', s => { s.sequenceNumber++; }],
    ['previous digest', s => { s.previousDigest = genesis.h0; }],
    ...['computationCost', 'storageCost', 'storageRebate', 'nonRefundableStorageFee']
      .map(name => ['gas ' + name, s => { s.epochRollingGasCostSummary[name]++; }]),
    ['timestamp seconds', s => { s.timestamp.seconds++; }],
    ['timestamp nanoseconds', s => { s.timestamp.nanos++; }],
    ['commitment kind', s => { s.commitments[0].kind = 1; }],
    ['commitment digest', s => { s.commitments[0].digest = genesis.h0; }],
    ['opaque version byte', s => { s.versionSpecificData[1] ^= 1; }],
    ['invented epoch data', s => { s.endOfEpochData = {
      nextEpochCommittee: [], nextEpochProtocolVersion: 1n, epochCommitments: [],
    }; }],
  ];
  for (const [label, change] of mutations) {
    const value = response(); change(value.checkpoint.summary); const changed = encode(value);
    old.checkpoint(changed, archive.snapshot);
    assert.throws(() => next.checkpoint(changed, archive.snapshot), undefined, label);
    counterexamples.push({ field: label, oldPrefixAuditAccepted: true, fullSummaryRejected: true }); checks++;
  }
  const parsed = summaryCodec.parse(response().checkpoint.summary.bcs.value);
  function toCheckpoint(value) {
    const bytes = summaryCodec.serialize(value).toBytes(), hash = old.typed('CheckpointSummary', bytes);
    const protoCommitments = rows => rows.map(r => r.ECMHLiveObjectSetDigest
      ? { kind: 1, digest: r.ECMHLiveObjectSetDigest.digest }
      : { kind: 2, digest: r.CheckpointArtifactsDigest });
    const p = { bcs: { value: bytes }, digest: hash, epoch: BigInt(value.epoch),
      sequenceNumber: BigInt(value.sequenceNumber), totalNetworkTransactions: BigInt(value.totalNetworkTransactions),
      contentDigest: value.contentDigest, previousDigest: value.previousDigest ?? undefined,
      epochRollingGasCostSummary: Object.fromEntries(Object.entries(value.epochRollingGasCostSummary)
        .map(([k,v]) => [k, BigInt(v)])),
      timestamp: { seconds: BigInt(value.timestampMs) / 1000n, nanos: Number(BigInt(value.timestampMs) % 1000n) * 1_000_000 },
      commitments: protoCommitments(value.commitments), versionSpecificData: Uint8Array.from(value.versionSpecificData) };
    if (value.endOfEpochData) {
      const e = value.endOfEpochData;
      p.endOfEpochData = { nextEpochCommittee: e.nextEpochCommittee.map(([key,weight]) => ({
        publicKey: Uint8Array.from(Buffer.from(key, 'base64')), weight: BigInt(weight) })),
      nextEpochProtocolVersion: BigInt(e.nextEpochProtocolVersion), epochCommitments: protoCommitments(e.epochCommitments) };
    }
    return { summary: p, sequenceNumber: BigInt(value.sequenceNumber), digest: hash };
  }
  const wide = structuredClone(parsed);
  wide.epoch = '18446744073709551615'; wide.sequenceNumber = '9223372036854775809';
  wide.totalNetworkTransactions = '18446744073709551615';
  for (const k of Object.keys(wide.epochRollingGasCostSummary)) wide.epochRollingGasCostSummary[k] = '18446744073709551615';
  wide.commitments = [{ ECMHLiveObjectSetDigest: { digest: genesis.h0 } },
    { CheckpointArtifactsDigest: parsed.contentDigest }];
  wide.endOfEpochData = { nextEpochCommittee: [
    [Buffer.alloc(96, 5).toString('base64'), '18446744073709551615'],
    [Buffer.alloc(96, 7).toString('base64'), '9223372036854775809'],
  ], nextEpochProtocolVersion: '9223372036854775811', epochCommitments: wide.commitments };
  wide.versionSpecificData = [0xff, 0x81, 0x00];
  const fixture = toCheckpoint(wide), branch = fullSummary(fixture);
  assert(branch.endOfEpochDataPresent && branch.committeeMembers === 2 && branch.commitments === 2);
  assert(branch.opaquePayloadInterpreted === false && branch.quorumSignatureReverified === false);
  branches.push({ fixture: 'isolated high-u64, both commitments, epoch committee, opaque payload', ...branch }); checks++;
  const rejected = (label, change) => {
    const value = structuredClone(fixture); change(value); assert.throws(() => fullSummary(value), undefined, label); checks++;
  };
  rejected('high u64 precision loss', c => { c.summary.totalNetworkTransactions = BigInt(Number(c.summary.totalNetworkTransactions)); });
  rejected('checkpoint commitment order', c => { c.summary.commitments.reverse(); });
  rejected('epoch commitment order', c => { c.summary.endOfEpochData.epochCommitments.reverse(); });
  rejected('committee order', c => { c.summary.endOfEpochData.nextEpochCommittee.reverse(); });
  rejected('committee weight', c => { c.summary.endOfEpochData.nextEpochCommittee[0].weight--; });
  rejected('committee key length', c => { c.summary.endOfEpochData.nextEpochCommittee[0].publicKey = new Uint8Array(95); });
  rejected('epoch protocol', c => { c.summary.endOfEpochData.nextEpochProtocolVersion--; });
  rejected('epoch omitted', c => { c.summary.endOfEpochData = undefined; });
  rejected('timestamp normalization', c => { c.summary.timestamp.nanos = 1_000_000_000; });
  rejected('missing gas field', c => { delete c.summary.epochRollingGasCostSummary.storageCost; });
  for (const kind of ['trailing bytes', 'truncated bytes']) {
    const cp = response().checkpoint, bytes = Buffer.from(cp.summary.bcs.value);
    cp.summary.bcs.value = kind === 'trailing bytes' ? Buffer.concat([bytes, Buffer.from([0])]) : bytes.subarray(0, -1);
    cp.digest = cp.summary.digest = old.typed('CheckpointSummary', cp.summary.bcs.value);
    assert.throws(() => fullSummary(cp), undefined, kind); checks++;
  }
  for (const key of Object.keys(old)) if (key !== 'checkpoint') assert.equal(next[key], old[key]);
  checks++;
  result = { passed: true, observedAt: new Date().toISOString(), preparedOnly: true, checksPassed: checks,
    historicalFullSummaries: actual, actualRetainedSummaryBytes: actual.reduce((n,r) => n + r.canonicalSummaryBytes, 0),
    actualHistoricalCommitmentKinds: [2], actualEpochSummaryRead: false,
    counterexamples, isolatedDecoderBranches: branches, originalOtherFunctionsHeld: true,
    fixturesAreQuorumCertificates: false, opaquePayloadInterpreted: false,
    postWriteIndexAccepted: false, completeSupportedAccountWindowAccepted: false, chromeAccepted: false,
    parentCompletion: false, networkRequests: 0, signatures: 0, executeRequests: 0,
    inputsSha256: Object.fromEntries(files.map(f => [f, sha(f)])),
    scope: 'Two actual retained full outer checkpoint summaries (103 and170 bytes) canonical and all protobuf fields matched; thirteen actual-response metadata counterexamples demonstrate the explicit old prefix limitation and reject under C88. High-u64/epoch/two-commitment fixtures and rehashed trailing/truncated BCS test decoder boundaries only, no actual epoch quorum or protocol-specific opaque payload acceptance. All other C85 parser functions retained by identity; no current three-account positive or browser acceptance.' };
} catch (error) {
  result = { passed: false, observedAt: new Date().toISOString(), errorType: error.name,
    message: String(error.message).slice(0, 700), networkRequests: 0, signatures: 0, executeRequests: 0 };
  process.exitCode = 1;
}
fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify({ passed: result.passed, checksPassed: result.checksPassed,
  counterexamples: result.counterexamples?.length, errorType: result.errorType, message: result.message }));

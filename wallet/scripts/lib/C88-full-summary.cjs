// Complete fixed Rust CheckpointSummary layout; protocol-specific payload remains opaque.
const assert = require('node:assert/strict');
const { bcs } = require('rtd-typescript/bcs');
const { fromBase58, toBase58 } = require('rtd-typescript/utils');
const { canonical, typed } = require('../audit-C84-nft-post-write-positive.cjs');

const digest = bcs.byteVector().transform({
  input: value => {
    const bytes = fromBase58(value); assert.equal(bytes.length, 32); return bytes;
  },
  output: value => { assert.equal(value.length, 32); return toBase58(Uint8Array.from(value)); },
});
const authority = bcs.byteVector().transform({
  input: value => {
    const bytes = Buffer.from(value, 'base64'); assert.equal(bytes.length, 96);
    assert.equal(bytes.toString('base64'), value); return bytes;
  },
  output: value => { assert.equal(value.length, 96); return Buffer.from(value).toString('base64'); },
});
const gasFields = ['computationCost', 'storageCost', 'storageRebate', 'nonRefundableStorageFee'];
const gas = bcs.struct('GasCostSummary', Object.fromEntries(gasFields.map(name => [name, bcs.u64()])));
const commitment = bcs.enum('CheckpointCommitment', {
  ECMHLiveObjectSetDigest: bcs.struct('ECMHLiveObjectSetDigest', { digest }),
  CheckpointArtifactsDigest: digest,
});
const end = bcs.struct('EndOfEpochData', {
  nextEpochCommittee: bcs.vector(bcs.tuple([authority, bcs.u64()])),
  nextEpochProtocolVersion: bcs.u64(),
  epochCommitments: bcs.vector(commitment),
});
const summaryCodec = bcs.struct('CheckpointSummary', {
  epoch: bcs.u64(),
  sequenceNumber: bcs.u64(),
  totalNetworkTransactions: bcs.u64(),
  contentDigest: digest,
  previousDigest: bcs.option(digest),
  epochRollingGasCostSummary: gas,
  timestampMs: bcs.u64(),
  commitments: bcs.vector(commitment),
  endOfEpochData: bcs.option(end),
  versionSpecificData: bcs.byteVector(),
});

function unsigned(actual, expected) {
  assert.equal(typeof actual, 'bigint');
  assert.equal(actual, BigInt(expected));
}

function commitments(actual, expected) {
  assert(Array.isArray(actual)); assert.equal(actual.length, expected.length);
  for (let index = 0; index < expected.length; index++) {
    const value = expected[index], proto = actual[index];
    assert(['ECMHLiveObjectSetDigest', 'CheckpointArtifactsDigest'].includes(value.$kind));
    const ecmh = value.$kind === 'ECMHLiveObjectSetDigest';
    assert.equal(proto.kind, ecmh ? 1 : 2);
    assert.equal(proto.digest, ecmh ? value.ECMHLiveObjectSetDigest.digest : value.CheckpointArtifactsDigest);
  }
}

function fullSummary(checkpoint) {
  const proto = checkpoint.summary; assert(proto?.bcs?.value?.length);
  const bytes = Buffer.from(proto.bcs.value);
  assert(bytes.length <= 16 * 1024 * 1024);
  const value = canonical(summaryCodec, bytes);
  const summaryDigest = typed('CheckpointSummary', bytes);
  assert.equal(checkpoint.digest, summaryDigest); assert.equal(proto.digest, summaryDigest);
  unsigned(checkpoint.sequenceNumber, value.sequenceNumber);
  for (const name of ['epoch', 'sequenceNumber', 'totalNetworkTransactions']) unsigned(proto[name], value[name]);
  assert.equal(proto.contentDigest, value.contentDigest);
  assert.equal(proto.previousDigest ?? null, value.previousDigest);
  assert(proto.epochRollingGasCostSummary);
  for (const name of gasFields) unsigned(proto.epochRollingGasCostSummary[name], value.epochRollingGasCostSummary[name]);
  assert(proto.timestamp && Number.isSafeInteger(proto.timestamp.nanos));
  assert(proto.timestamp.nanos >= 0 && proto.timestamp.nanos < 1_000_000_000);
  const millis = BigInt(value.timestampMs);
  assert.equal(typeof proto.timestamp.seconds, 'bigint');
  assert.equal(proto.timestamp.seconds, millis / 1000n);
  assert.equal(proto.timestamp.nanos, Number(millis % 1000n) * 1_000_000);
  commitments(proto.commitments, value.commitments);
  if (value.endOfEpochData === null) {
    assert.equal(proto.endOfEpochData, undefined);
  } else {
    assert(proto.endOfEpochData);
    const actual = proto.endOfEpochData, expected = value.endOfEpochData;
    assert.equal(actual.nextEpochCommittee.length, expected.nextEpochCommittee.length);
    for (let i = 0; i < expected.nextEpochCommittee.length; i++) {
      const [key, weight] = expected.nextEpochCommittee[i], member = actual.nextEpochCommittee[i];
      assert(member.publicKey); assert.equal(member.publicKey.length, 96);
      assert.equal(Buffer.from(member.publicKey).toString('base64'), key); unsigned(member.weight, weight);
    }
    unsigned(actual.nextEpochProtocolVersion, expected.nextEpochProtocolVersion);
    commitments(actual.epochCommitments, expected.epochCommitments);
  }
  // No protocol configuration is supplied here: compare the full opaque byte
  // vector, without guessing its internal format or future protocol version.
  assert.deepEqual(Buffer.from(proto.versionSpecificData ?? []), Buffer.from(value.versionSpecificData));
  return { canonicalSummaryFields: 10, canonicalSummaryBytes: bytes.length,
    previousDigestPresent: value.previousDigest !== null, commitments: value.commitments.length,
    endOfEpochDataPresent: value.endOfEpochData !== null,
    committeeMembers: value.endOfEpochData?.nextEpochCommittee.length ?? 0,
    versionSpecificBytes: value.versionSpecificData.length, opaquePayloadInterpreted: false,
    quorumSignatureReverified: false };
}

module.exports = { summaryCodec, fullSummary };

// Read-only decoding of retained production frames, independent of wallet readers.
const assert = require('node:assert/strict');
const { GrpcTypes } = require('rtd-typescript/grpc');
const { bcs } = require('rtd-typescript/bcs');
const { toBase58, fromBase58 } = require('rtd-typescript/utils');
const objectParser = require('../audit-C84-nft-post-write-positive.cjs');
const { base64, grpcBody, canonical, typed, nativeObjects, snapshotObjects } = objectParser;

function transactionBytes(row, lo, hi) {
  assert(Number.isSafeInteger(row.checkpoint) && row.checkpoint >= lo && row.checkpoint <= hi);
  assert.equal(row.transaction.digest, row.digest);
  assert.equal(row.transaction.effects.digest, row.digest);
  assert.equal(row.transaction.effects.checkpoint.sequenceNumber, row.checkpoint);
  const transaction = base64(row.transaction.transactionBcs);
  const effects = base64(row.transaction.effects.effectsBcs);
  const tx = canonical(bcs.TransactionData, transaction), fx = canonical(bcs.TransactionEffects, effects);
  assert.equal(typed('TransactionData', transaction), row.digest);
  assert.equal(typed('TransactionEffects', effects), row.transaction.effects.effectsDigest);
  assert.equal(fx[fx.$kind].transactionDigest, row.digest);
  assert.equal(tx[tx.$kind].sender, row.sender ?? '0x' + '00'.repeat(32));
  assert(['SUCCESS', 'FAILURE'].includes(row.status));
  assert.equal(fx[fx.$kind].status.$kind === 'Success', row.status === 'SUCCESS');
  assert.equal(row.transaction.effects.status, row.status);
  return { transaction, effects };
}

function historyPages(frames, history, h0, address, dispatched, original, browser) {
  assert.equal(history.address, address);
  assert.equal(history.coverage.registrationComplete, false);
  assert.equal(history.coverage.allAccountActivityCertified, false);
  assert([false, null].includes(history.coverage.allAccountTransfersCertified));
  for (const key of ['completeForRegisteredKiosks', 'completeForDiscoveredOwnerTokens', 'completeForDiscoveredCapabilities'])
    assert.equal(history.coverage[key], true);
  const attempts = []; let current, failures = 0;
  for (const frame of frames.filter(f => f.url.endsWith('/account/graphql'))) {
    if (frame.status !== 200) { failures++; continue; }
    const request = JSON.parse(base64(frame.requestBase64)), response = JSON.parse(base64(frame.responseBase64));
    assert(response.data && !response.errors);
    const page = response.data.accountHistory;
    if (!page || page.address !== address || page.snapshot !== history.snapshot ||
        page.checkpointLo !== history.checkpointLo || page.checkpointHi !== history.checkpointHi) continue;
    const variables = request.variables;
    assert.equal(page.chainId, h0); assert.equal(variables.chain, h0); assert.equal(variables.address, address);
    assert.equal(variables.lo, page.checkpointLo); assert.equal(variables.hi, page.checkpointHi);
    assert.equal(variables.limit, page.limit);
    assert(Number.isSafeInteger(page.limit) && page.limit > 0 && page.limit <= 50);
    assert.match(page.snapshot, /^[0-9a-f]{64}$/);
    if (variables.cursor === null) { current = []; attempts.push(current); }
    assert(current); current.push({ page, variables });
  }
  const complete = attempts.filter(a => a[a.length - 1].page.hasNextPage === false);
  assert(complete.length > 0, 'No complete raw history window');
  const selected = complete[complete.length - 1], rows = [], cursors = new Set();
  let cursor = null, total, limit;
  for (const { page, variables } of selected) {
    assert.equal(variables.cursor, cursor);
    assert(Array.isArray(page.transactions) && page.transactions.length <= page.limit);
    assert(Number.isSafeInteger(page.totalTransactions) && page.totalTransactions >= 0);
    if (total === undefined) { total = page.totalTransactions; limit = page.limit; }
    assert.equal(page.totalTransactions, total); assert.equal(page.limit, limit);
    for (const [key, value] of Object.entries(history.coverage)) assert.equal(page[key], value);
    assert.equal(typeof page.hasNextPage, 'boolean');
    rows.push(...page.transactions); cursor = page.nextCursor;
    if (page.hasNextPage) {
      assert.equal(page.transactions.length, limit); assert(rows.length < total);
      assert(typeof cursor === 'string' && cursor.length <= 2048);
      assert.match(cursor, /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
      assert(!cursors.has(cursor)); cursors.add(cursor);
    } else { assert.equal(cursor, null); assert.equal(rows.length, total); }
  }
  assert.equal(rows.length, total); assert.equal(new Set(rows.map(r => r.digest)).size, total);
  assert.equal(history.totalTransactions, total);
  assert.deepEqual(rows.map(r => r.digest), history.transactions.map(r => r.digest));
  const decoded = new Map(); let previous;
  for (const row of rows) {
    assert(!previous || previous.checkpoint > row.checkpoint ||
      (previous.checkpoint === row.checkpoint && previous.digest < row.digest));
    decoded.set(row.digest, transactionBytes(row, history.checkpointLo, history.checkpointHi)); previous = row;
  }
  for (const dispatch of dispatched) {
    const row = rows.find(r => r.digest === dispatch.digest); assert(row);
    const receipt = original.nativeReceipts.find(r => r.digest === row.digest); assert(receipt?.nativeSuccessVerified);
    assert.equal(String(row.checkpoint), receipt.checkpoint); assert.equal(row.sender, browser.owner);
    assert.equal(row.status, 'SUCCESS');
    const preview = browser.previews.find(r => r.approval.prepared.digest === row.digest);
    const execution = browser.executions.find(r => r.digest === row.digest); assert(preview && execution);
    assert.equal(decoded.get(row.digest).transaction.toString('base64'), preview.approval.prepared.bytesBase64);
    assert.equal(decoded.get(row.digest).effects.toString('base64'), execution.receipt.effectsBase64);
  }
  return { completePages: selected.length, totalTransactions: total, allRowsCanonical: rows.length,
    originalDispatchesVerified: dispatched.length, retainedOtherAttempts: attempts.length - 1, retainedFailures: failures };
}

function exactArchiveObjects(frames, native) {
  assert.equal(frames.filter(f => f.url.endsWith('/GetObject')).length, native.size);
  const archive = nativeObjects(frames, [...native.keys()]);
  for (const frame of frames.filter(f => f.url.endsWith('/GetObject'))) {
    const request = GrpcTypes.GetObjectRequest.fromBinary(grpcBody(frame.requestBase64, false));
    assert.equal(String(request.version), native.get(request.objectId).version);
  }
  for (const [id, value] of native) {
    assert.deepEqual(archive.get(id).objectBcs, value.objectBcs);
    assert.deepEqual(archive.get(id).content, value.content);
  }
  return { fixedVersions: archive.size, identicalCanonicalObjectBytes: archive.size };
}

function checkpoint(frames, snapshot) {
  const candidates = frames.filter(f => f.url.endsWith('/GetCheckpoint'));
  assert.equal(candidates.length, 1);
  const frame = candidates[0]; assert.equal(frame.status, 200);
  const request = GrpcTypes.GetCheckpointRequest.fromBinary(grpcBody(frame.requestBase64, false));
  const cp = GrpcTypes.GetCheckpointResponse.fromBinary(grpcBody(frame.responseBase64, true)).checkpoint;
  assert(cp?.summary?.bcs?.value?.length && cp.contents?.bcs?.value?.length);
  assert.equal(request.checkpointId.oneofKind, 'sequenceNumber');
  assert.equal(String(request.checkpointId.sequenceNumber), String(snapshot.checkpoint));
  assert.equal(String(cp.sequenceNumber), String(snapshot.checkpoint)); assert.equal(cp.digest, snapshot.digest);
  assert.equal(typed('CheckpointSummary', cp.summary.bcs.value), cp.digest);
  assert.equal(typed('CheckpointContents', cp.contents.bcs.value), cp.contents.digest);
  assert.equal(cp.summary.contentDigest, cp.contents.digest);
  // The non-evolvable Rust CheckpointSummary starts with three u64s and a Digest byte vector.
  const summary = Buffer.from(cp.summary.bcs.value); assert(summary.length >= 57);
  assert.equal(summary.readBigUInt64LE(8), cp.sequenceNumber);
  assert.equal(summary.readBigUInt64LE(0), cp.summary.epoch);
  assert.equal(summary.readBigUInt64LE(16), cp.summary.totalNetworkTransactions);
  assert.equal(summary[24], 32); assert.equal(toBase58(summary.subarray(25, 57)), cp.contents.digest);
  const digest = bcs.byteVector().transform({
    input: s => Array.from(fromBase58(s)), output: v => { assert.equal(v.length, 32); return toBase58(Uint8Array.from(v)); },
  });
  const pair = bcs.struct('ExecutionDigests', { transaction: digest, effects: digest }), sig = bcs.byteVector();
  const contents = bcs.enum('CheckpointContents', {
    V1: bcs.struct('V1', { transactions: bcs.vector(pair), user_signatures: bcs.vector(bcs.vector(sig)) }),
    V2: bcs.struct('V2', { transactions: bcs.vector(bcs.struct('Entry', {
      digest: pair, user_signatures: bcs.vector(bcs.tuple([sig, bcs.option(bcs.u64())])),
    })) }),
  });
  const parsed = canonical(contents, cp.contents.bcs.value);
  const ordered = parsed.$kind === 'V1' ? parsed.V1.transactions : parsed.V2.transactions.map(t => t.digest);
  assert.equal(new Set(ordered.map(t => t.transaction)).size, ordered.length);
  assert.deepEqual(ordered, cp.contents.transactions.map(t => ({ transaction: t.transaction, effects: t.effects })));
  return { checkpoint: String(cp.sequenceNumber), digest: cp.digest, canonicalContentsTransactions: ordered.length,
    typedSummaryAndContents: true, summaryPrefixBoundToContents: true };
}

function originalDetails(frames, original, browser) {
  const rows = frames.filter(f => f.url.endsWith('/GetTransaction')); assert.equal(rows.length, 6);
  const seen = new Set();
  for (const frame of rows) {
    assert.equal(frame.status, 200);
    const request = GrpcTypes.GetTransactionRequest.fromBinary(grpcBody(frame.requestBase64, false));
    const tx = GrpcTypes.GetTransactionResponse.fromBinary(grpcBody(frame.responseBase64, true)).transaction;
    assert(tx && tx.digest === request.digest && !seen.has(tx.digest)); seen.add(tx.digest);
    const dispatch = original.sixFirstDispatches.find(d => d.digest === tx.digest); assert(dispatch);
    const preview = browser.previews.find(r => r.approval.prepared.digest === tx.digest);
    const receipt = original.nativeReceipts.find(r => r.digest === tx.digest); assert(preview && receipt?.nativeSuccessVerified);
    const bytes = Buffer.from(tx.transaction.bcs.value); canonical(bcs.TransactionData, bytes);
    assert.equal(typed('TransactionData', bytes), tx.digest);
    assert.equal(bytes.toString('base64'), preview.approval.prepared.bytesBase64);
    assert.equal(String(tx.checkpoint), receipt.checkpoint);
    if (tx.effects?.bcs?.value) {
      const effects = canonical(bcs.TransactionEffects, tx.effects.bcs.value);
      assert.equal(effects[effects.$kind].transactionDigest, tx.digest);
      assert.equal(typed('TransactionEffects', tx.effects.bcs.value), tx.effects.digest);
      assert.equal(effects[effects.$kind].status.$kind, 'Success');
      assert.equal(Buffer.from(tx.effects.bcs.value).toString('base64'), browser.executions.find(r => r.digest === tx.digest).receipt.effectsBase64);
    }
  }
  assert.deepEqual([...seen].sort(), original.sixFirstDispatches.map(d => d.digest).sort());
  return { originalTransactions: seen.size };
}

module.exports = { base64, grpcBody, canonical, typed, nativeObjects, snapshotObjects,
  transactionBytes, historyPages, exactArchiveObjects, checkpoint, originalDetails };

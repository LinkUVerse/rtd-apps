// Independently audit whole recorded indexed pages, canonical native bodies and fresh typed checkpoints.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { GrpcTypes, RtdGrpcClient } = require('rtd-typescript/grpc'), { bcs } = require('rtd-typescript/bcs');
const { toBase64, toBase58, normalizeStructTag, normalizeRtdAddress } = require('rtd-typescript/utils');
const { blake2b } = require('@noble/hashes/blake2.js'), loader = require('tsx/cjs/api');
const wallet = path.resolve(__dirname, '..'), load = n => loader.require(path.join(wallet, 'src/shared/rpc', n + '.ts'), __filename);
const { STAKED_RTD_BCS, SYSTEM_WRAPPER_BCS, SYSTEM_V2_BCS, STAKING_RATE_BCS } = load('staking-bcs');
const read = f => JSON.parse(fs.readFileSync(f)), sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const typed = (type, bytes) => toBase58(blake2b(Buffer.concat([Buffer.from(type + '::'), Buffer.from(bytes)]), { dkLen: 32 }));
function canonical(codec, encoded) {
  const parsed = codec.parse(Buffer.from(encoded, 'base64'));
  assert.equal(toBase64(codec.serialize(parsed).toBytes()), encoded);
  return parsed;
}
function wire(encoded, T, response) {
  const raw = Buffer.from(encoded, 'base64'); assert(raw.length >= 5 && raw[0] === 0);
  const end = raw.readUInt32BE(1) + 5; assert(end <= raw.length);
  if (response) {
    assert.equal(raw[end], 128); assert.equal(end + 5 + raw.readUInt32BE(end + 1), raw.length);
    assert(/(?:^|\r\n)grpc-status:\s*0\r\n/.test(raw.subarray(end + 5).toString('ascii')));
  } else assert.equal(end, raw.length);
  return T.fromBinary(raw.subarray(5, end));
}
(async () => {
  const [proofFile, output] = process.argv.slice(2); assert(output && !fs.existsSync(output));
  const p = read(proofFile), originalFetch = globalThis.fetch, supplementalFrames = [];
  let report = {}, stage = 'original input authority';
  try {
    assert(p.passed && p.originalStakeIndexedInBothProductionDomains);
    assert.equal(p.originalCheckpoint, '332734'); assert.equal(p.simulations, 0); assert.equal(p.signatures, 0); assert.equal(p.executeRequests, 0); assert.equal(p.keystoreRead, false);
    assert.equal(p.currentChromeStakeWithdrawAccepted, false); assert.equal(p.parentTX08Complete, false);
    for (const [f, h] of Object.entries(p.inputsSha256)) assert.equal(sha(f), h);
    assert.deepEqual(require('./build-reviewed-generation-production-extension.cjs').productSource(), p.source);
    const fixtureFile = Object.keys(p.inputsSha256).find(f => f.endsWith('/20261007-G3-staking-fixture-native-audit-02.json'));
    const fixture = read(fixtureFile); assert(fixture.passed && fixture.actualBrowserExecuteRequests === 1);
    assert.equal(p.originalDigest, fixture.digest); assert.equal(p.stakeId, fixture.newStake.objectId); assert.equal(p.owner, fixture.newStake.owner.AddressOwner);
    const domainProof = p.domain.snapshot, assetProof = p.assetProof, snapshots = [domainProof, assetProof];
    const sets = [
      ['Address.dynamicField', 'Address.dynamicFields', 'Address.objects', 'MoveObject.contents', 'Query.checkpoints', 'Query.object'],
      ['Address.balances', 'Address.dynamicField', 'Address.dynamicFields', 'Address.dynamicObjectField', 'Address.objects', 'MoveObject.contents', 'MoveValue.display', 'Query.checkpoints', 'Query.coinMetadata', 'Query.object'],
    ];
    for (const [i, snapshot] of snapshots.entries()) {
      assert.equal(JSON.parse(snapshot.bindingKey)[5], p.h0); assert.equal(JSON.parse(snapshot.bindingKey)[6], p.generation);
      assert(BigInt(snapshot.checkpoint) >= 332734n);
      assert.deepEqual(snapshot.dependencies.map(d => d.type + '.' + d.field).sort(), sets[i]);
    }
    stage = 'complete original gRPC and GraphQL frames';
    const graph = [], objects = new Map(), recordedMarkers = new Map(); let rpcCount = 0;
    for (const row of p.frames) {
      assert.equal(row.status, 200); const u = new URL(row.url); assert.equal(u.hostname, '127.0.0.1');
      if (u.port === '41954' && u.pathname === '/graphql') {
        const request = JSON.parse(Buffer.from(row.requestBase64, 'base64')), response = JSON.parse(Buffer.from(row.responseBase64, 'base64'));
        assert(!request.query.includes('jsonrpc')); assert(!response.errors); assert.equal(response.data.walletGenesis.digest, p.h0);
        const snapshot = response.data.walletSnapshot;
        if (snapshot) {
          const relevant = snapshots.filter(s => s.checkpoint === String(snapshot.sequenceNumber) && s.digest === snapshot.digest); assert(relevant.length);
          const config = response.data.serviceConfig;
          assert(config); const ranges = Object.values(config);
          assert(relevant.some(s => s.dependencies.length === ranges.length));
          for (const range of ranges) {
            assert(Number.isSafeInteger(range.first.sequenceNumber) && Number.isSafeInteger(range.last.sequenceNumber));
            assert(range.first.sequenceNumber <= snapshot.sequenceNumber && range.last.sequenceNumber >= snapshot.sequenceNumber);
          }
        }
        graph.push({ request, data: response.data });
      } else {
        assert.equal(u.port, '41750'); const method = u.pathname.split('/').pop(); assert(['GetServiceInfo', 'GetObject', 'GetCheckpoint'].includes(method));
        const request = wire(row.requestBase64, GrpcTypes[method + 'Request'], false), response = wire(row.responseBase64, GrpcTypes[method + 'Response'], true); rpcCount++;
        if (method === 'GetServiceInfo') assert.equal(response.chainId, p.h0);
        else if (method === 'GetObject') {
          const o = response.object; assert(o && o.bcs?.value && o.contents?.value); assert.equal(request.objectId, o.objectId);
          assert.equal(typed('Object', o.bcs.value), o.digest);
          const parsed = canonical(bcs.Object, toBase64(o.bcs.value)); assert.equal(parsed.data.$kind, 'Move');
          assert.equal(parsed.data.Move.version, String(o.version)); assert.equal(parsed.previousTransaction, o.previousTransaction);
          assert.equal(toBase64(parsed.data.Move.contents), toBase64(o.contents.value));
          assert(!objects.has(o.objectId)); objects.set(o.objectId, { wire: o, parsed });
        } else {
          const c = response.checkpoint; assert(c.summary?.bcs?.value && c.contents?.bcs?.value);
          assert.equal(request.checkpointId.sequenceNumber.toString(), String(c.sequenceNumber));
          assert.equal(typed('CheckpointSummary', c.summary.bcs.value), c.digest);
          assert.equal(typed('CheckpointContents', c.contents.bcs.value), c.contents.digest); assert.equal(c.summary.contentDigest, c.contents.digest);
          recordedMarkers.set(String(c.sequenceNumber), c);
        }
      }
    }
    const nativeStake = objects.get(p.stakeId), systemId = normalizeRtdAddress('0x5'), nativeSystem = objects.get(systemId);
    assert.equal(objects.size, 2); assert(nativeStake && nativeSystem);
    for (const saved of [p.indexedStake, p.assetStake, p.freshStake]) {
      assert.equal(saved.objectId, p.stakeId); assert.equal(saved.version, String(nativeStake.wire.version)); assert.equal(saved.digest, nativeStake.wire.digest);
      assert.equal(saved.type, normalizeStructTag('0x3::staking_pool::StakedRtd')); assert.deepEqual(saved.owner, nativeStake.parsed.owner);
      assert.equal(saved.contentBase64, toBase64(nativeStake.wire.contents.value));
      if (saved.objectBcsBase64) assert.equal(saved.objectBcsBase64, toBase64(nativeStake.wire.bcs.value));
    }
    assert.equal(nativeStake.parsed.previousTransaction, fixture.digest); assert.deepEqual(nativeStake.parsed.owner, { AddressOwner: p.owner, $kind: 'AddressOwner' });
    assert.equal(p.freshSystem.objectBcsBase64, toBase64(nativeSystem.wire.bcs.value));
    const decodedStake = canonical(STAKED_RTD_BCS, p.freshStake.contentBase64); assert.deepEqual(decodedStake, fixture.newStake.decoded);
    assert.equal(decodedStake.principal.value, '1000000000'); const wrapper = canonical(SYSTEM_WRAPPER_BCS, p.freshSystem.contentBase64);
    assert.equal(wrapper.id, systemId); assert.equal(wrapper.version, '2');
    function pagesAt(snapshot, predicate, connection) {
      const pages = graph.filter(r => String(r.data.walletSnapshot?.sequenceNumber) === snapshot.checkpoint && predicate(r));
      assert(pages.length); let cursor = null; const seen = new Set(), nodes = [];
      for (const [i, row] of pages.entries()) {
        assert.equal(row.request.variables.cursor, cursor); const page = connection(row.data.walletSnapshot.query);
        assert(page && page.pageInfo && Array.isArray(page.nodes));
        for (const node of page.nodes) { assert(!seen.has(node.address)); seen.add(node.address); nodes.push(node); }
        assert.equal(page.pageInfo.hasNextPage, i < pages.length - 1);
        if (page.pageInfo.hasNextPage) { assert(typeof page.pageInfo.endCursor === 'string' && page.pageInfo.endCursor && page.pageInfo.endCursor !== cursor); cursor = page.pageInfo.endCursor; }
      }
      return { nodes, pages: pages.length };
    }
    const filtered = pagesAt(domainProof, r => r.request.variables?.owner === p.owner && r.request.variables.filter?.type === normalizeStructTag('0x3::staking_pool::StakedRtd'), q => q.address.objects);
    const complete = pagesAt(assetProof, r => r.request.variables?.owner === p.owner && r.request.variables.filter === null && r.request.variables.pageSize === 50, q => q.address.objects);
    assert.equal(filtered.nodes.length, 1); assert.equal(complete.nodes.length, p.completeOwnedAssetCount);
    for (const nodes of [filtered.nodes, complete.nodes]) {
      const matching = nodes.filter(n => n.address === p.stakeId); assert.equal(matching.length, 1); const node = matching[0];
      assert.equal(String(node.version), p.freshStake.version); assert.equal(node.digest, p.freshStake.digest); assert.equal(node.contents.bcs, p.freshStake.contentBase64);
      assert.equal(node.owner.__typename, 'AddressOwner'); assert.equal(node.owner.address.address, p.owner);
    }
    const innerRows = graph.filter(r => String(r.data.walletSnapshot?.sequenceNumber) === domainProof.checkpoint && r.request.variables?.parent === systemId && r.data.walletSnapshot?.query.address?.field);
    assert.equal(innerRows.length, 1); const inner = innerRows[0], innerField = inner.data.walletSnapshot.query.address.field;
    assert.equal(inner.request.variables.name.type, 'u64'); assert.equal(canonical(bcs.u64(), inner.request.variables.name.bcs), '2');
    assert.equal(innerField.value.type.repr, normalizeStructTag('0x3::rtd_system_state_inner::RtdSystemStateInnerV2'));
    const system = canonical(SYSTEM_V2_BCS, innerField.value.bcs); assert.equal(system.system_state_version, '2'); assert.equal(system.epoch, p.domain.value.epoch);
    assert.equal(system.safe_mode, p.domain.value.safeMode); assert.equal(system.reference_gas_price, p.domain.value.referenceGasPrice);
    const inactive = pagesAt(domainProof, r => r.request.variables?.parent === system.validators.inactive_validators.id && r.data.walletSnapshot?.query.address?.dynamicFields, q => q.address.dynamicFields);
    assert.equal(BigInt(inactive.nodes.length), BigInt(system.validators.inactive_validators.size));
    // This chain currently has no inactive validator. Do not pretend to audit unseen future branches.
    assert.equal(inactive.nodes.length, 0); assert.equal(system.validators.active_validators.length, p.domain.value.validators.length);
    let rateRows = 0;
    for (const native of system.validators.active_validators) {
      const pool = native.staking_pool, saved = p.domain.value.validators.find(v => v.address === native.metadata.rtd_address);
      assert(saved && saved.active); assert.equal(saved.poolId, pool.id); assert.equal(saved.commissionBps, native.commission_rate); assert.equal(saved.stakeBalance, pool.rtd_balance);
      const rates = pagesAt(domainProof, r => r.request.variables?.parent === pool.exchange_rates.id && r.data.walletSnapshot?.query.address?.dynamicFields, q => q.address.dynamicFields);
      assert.equal(BigInt(rates.nodes.length), BigInt(pool.exchange_rates.size)); const epochs = new Set();
      for (const field of rates.nodes) {
        assert.equal(field.name.type.repr, 'u64'); const epoch = canonical(bcs.u64(), field.name.bcs); assert(!epochs.has(epoch)); epochs.add(epoch);
        assert.equal(field.value.type.repr, normalizeStructTag('0x3::staking_pool::PoolTokenExchangeRate')); canonical(STAKING_RATE_BCS, field.value.bcs); rateRows++;
      }
    }
    assert.equal(p.domain.value.positions.length, 1); const position = p.domain.value.positions[0];
    assert.equal(position.objectId, p.stakeId); assert.equal(position.principal, decodedStake.principal.value); assert.equal(position.poolId, decodedStake.pool_id);
    assert.equal(position.activationEpoch, decodedStake.stake_activation_epoch); assert.equal(position.version, p.freshStake.version); assert.equal(position.digest, p.freshStake.digest);
    assert(p.domain.value.validators.some(v => v.poolId === position.poolId && v.address === position.validatorAddress));
    const pending = BigInt(position.activationEpoch) > BigInt(system.epoch); assert.equal(p.pendingAtSnapshot, pending); assert.equal(position.status, pending ? 'pending' : 'active');
    if (pending) assert.deepEqual(position.reward, { state: 'unknown', reason: 'pending' });
    for (const snapshot of snapshots) { const cp = recordedMarkers.get(snapshot.checkpoint); assert(cp && cp.digest === snapshot.digest); if (snapshot === domainProof) assert.equal(String(cp.summary.epoch), system.epoch); }
    stage = 'fresh independent typed checkpoint and H0 bookends';
    globalThis.fetch = async (input, init) => {
      const u = new URL(input instanceof Request ? input.url : String(input)); assert.equal(u.origin, 'http://127.0.0.1:41750'); assert(/\/(GetServiceInfo|GetCheckpoint)$/.test(u.pathname));
      const response = await originalFetch(input, { ...init, credentials: 'omit', redirect: 'error' });
      supplementalFrames.push({ url: u.href, status: response.status, requestBase64: Buffer.from(init?.body ?? []).toString('base64'), responseBase64: Buffer.from(await response.clone().arrayBuffer()).toString('base64') }); return response;
    };
    const client = new RtdGrpcClient({ network: 'localnet', baseUrl: 'http://127.0.0.1:41750', format: 'binary', fetch: globalThis.fetch, mvr: { url: '' } });
    assert.equal((await client.ledgerService.getServiceInfo({}, { timeout: 20000 })).response.chainId, p.h0);
    for (const snapshot of snapshots) {
      const cp = (await client.ledgerService.getCheckpoint({ checkpointId: { oneofKind: 'sequenceNumber', sequenceNumber: BigInt(snapshot.checkpoint) }, readMask: { paths: ['sequence_number', 'digest', 'summary', 'contents'] } }, { timeout: 20000 })).response.checkpoint;
      assert.equal(String(cp.sequenceNumber), snapshot.checkpoint); assert.equal(cp.digest, snapshot.digest);
      assert.equal(typed('CheckpointSummary', cp.summary.bcs.value), cp.digest); assert.equal(typed('CheckpointContents', cp.contents.bcs.value), cp.contents.digest); assert.equal(cp.summary.contentDigest, cp.contents.digest);
    }
    assert.equal((await client.ledgerService.getServiceInfo({}, { timeout: 20000 })).response.chainId, p.h0);
    for (const row of supplementalFrames) { assert.equal(row.status, 200); const method = new URL(row.url).pathname.split('/').pop(); wire(row.requestBase64, GrpcTypes[method + 'Request'], false); wire(row.responseBase64, GrpcTypes[method + 'Response'], true); }
    report = { passed: true, observedAt: new Date().toISOString(), source: p.source, h0: p.h0, generation: p.generation, owner: p.owner,
      originalDigest: p.originalDigest, originalCheckpoint: p.originalCheckpoint, stakeId: p.stakeId,
      originalFramesVerified: p.frames.length, graphqlFrames: graph.length, rpcFrames: rpcCount, canonicalNativeObjects: objects.size,
      completeStakingDependencies: 6, completeAssetDependencies: 10, stakingCheckpoint: domainProof.checkpoint, assetCheckpoint: assetProof.checkpoint,
      filteredStakingPages: filtered.pages, completeOwnedPages: complete.pages, completeOwnedObjects: complete.nodes.length, canonicalRateRows: rateRows,
      originalStakeIndexedInBothProductionDomains: true, freshTypedCheckpointsVerified: 2, pendingAtSnapshot: pending,
      currentChromeStakeWithdrawAccepted: false, parentTX08Complete: false, simulations: 0, signatures: 0, executeRequests: 0, keystoreRead: false,
      supplementalFrames, inputsSha256: Object.fromEntries([__filename, path.resolve(proofFile)].map(f => [f, sha(f)])),
      scope: 'Whole original frames and grpc-status0; canonical typed stake/system Object BCS; original once-executed stake content/owner/principal/pool; full filtered and unfiltered pagination; indexed V2 system/active validators/rate table bodies; six and ten real dependencies at two S>=332734; four fresh native H0/typed checkpoint frames. Node only; no browser, journal injection, key read, additional stake or redeem, parent completion.' };
  } catch (error) { report = { passed: false, observedAt: new Date().toISOString(), stage, errorType: error.name, message: String(error.message).slice(0, 700), supplementalFrames }; process.exitCode = 1; }
  finally { globalThis.fetch = originalFetch; fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); console.log(JSON.stringify({ passed: report.passed, stage: report.stage, message: report.message, frames: report.originalFramesVerified, supplementary: supplementalFrames.length })); }
})().catch(error => { console.error(JSON.stringify({ passed: false, message: String(error.message).slice(0, 250) })); process.exitCode = 1; });

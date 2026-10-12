// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Actual production reader: refuse uncovered fixture; validate current inventory after coverage.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { validateNetworkProfile } from '../src/shared/rpc/profile';
import { WalletReadSession } from '../src/shared/rpc/session';
import { WalletAssetReader } from '../src/shared/rpc/asset-reader';
import { WalletFullnodeReader } from '../src/shared/rpc/fullnode-reader';
import { normalizeStructTag } from 'rtd-typescript/utils';
import type { WalletKioskItem } from 'rtd-apps-core/src/rpc/kiosk-types';

async function main() {
  const [readinessFile, output] = process.argv.slice(2);
  assert(readinessFile && output && !existsSync(output));
  const read = (f: string) => JSON.parse(readFileSync(f, 'utf8'));
  const sha = (f: string) => createHash('sha256').update(readFileSync(f)).digest('hex');
  const wallet = resolve(__dirname, '..'), logs = join(wallet, 'migrationToGRpcOrGraphQLDoc/workLog');
  const readiness = read(readinessFile);
  assert(readiness.passed && readiness.currentWalletContainers === 29 && readiness.healthyChecks === 14);
  assert(Date.now() - Date.parse(readiness.observedAt) < 300000);
  assert(readiness.targetCheckpoint === 424677 && readiness.profilesOpened === 0);
  const fixture = readiness.fixture, intentFile = join(fixture, 'intent.json'), intent = read(intentFile);
  const nativeFile = join(logs, '20261007-C43-nonempty-kiosk-native-independent-01.json');
  const oracle = read(nativeFile);
  assert(oracle.passed && oracle.operation === fixture && oracle.h0 === readiness.h0);
  const buildFile = join(logs, '20261007-default-generation-positive-C46-build-03.json');
  const build = read(buildFile); assert(build.passed);
  assert.deepEqual(require('./build-reviewed-generation-production-extension.cjs').productSource(), build.sourceAfter);
  const profileFile = join(fixture, '../publication-foundation/C46-isolated-browser-gateway-20261007-03/profile.json');
  const gatewayFile = join(logs, '20261007-C46-nonempty-gateway-started-01.json'), gateway = read(gatewayFile);
  assert(gateway.passed && gateway.mode === 'isolated-temporary-test' && gateway.profile === profileFile);
  for (const [f, h] of Object.entries(gateway.inputsSha256)) assert.equal(sha(f), h);
  const profile = validateNetworkProfile(read(profileFile));
  assert(profile.expectedGenesisDigest === readiness.h0 && profile.generation === readiness.generation);
  for (const proof of [readiness, oracle])
    for (const [f, h] of Object.entries(proof.inputsSha256)) assert.equal(sha(f), h);
  const protectedPins: Record<string, string> = intent.protectedOriginalsSha256;
  const held = () => {
    for (const [f, h] of Object.entries(protectedPins)) assert.equal(sha(f), h);
    assert.deepEqual(require('./build-reviewed-generation-production-extension.cjs').productSource(), build.sourceAfter);
  };
  held();
  const frames: any[] = [], allowed = new Set([
    'http://127.0.0.1:41750', 'http://127.0.0.1:41957',
    'http://127.0.0.1:41958', 'http://127.0.0.1:41959',
  ]);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    assert(allowed.has(url.origin));
    assert(url.pathname === '/graphql' || url.pathname === '/account/graphql' ||
      ['/GetCheckpoint', '/GetServiceInfo', '/GetObject', '/GetAvailableRange']
        .some(p => url.pathname.endsWith(p)));
    const response = await originalFetch(input, init), body = Buffer.from(await response.clone().arrayBuffer());
    assert(body.length <= 16 * 1024 * 1024);
    const request = init?.body;
    assert(request === undefined || typeof request === 'string' || request instanceof Uint8Array);
    frames.push({ url: url.href, status: response.status,
      requestBase64: Buffer.from(request ?? '').toString('base64'), responseBase64: body.toString('base64') });
    return response;
  };
  let session: WalletReadSession | undefined;
  const proof: any = { passed: false, h0: readiness.h0, targetCheckpoint: readiness.targetCheckpoint,
    fixture, frames, originalFilesHeld: Object.keys(protectedPins).length,
    profilesOpened: 0, simulations: 0, signatures: 0, executeRequests: 0,
    indexedFixtureAccepted: false, chromeAccepted: false, parentCompletion: false };
  try {
    session = new WalletReadSession(profile);
    if (!readiness.coverageGates.declaredAndNativeAssetWindow) {
      let reason: string | undefined;
      try {
        await WalletAssetReader.open(session, { minimumCheckpoint: '424677', timeoutMs: 60000 });
        assert.fail('Production must not admit a fixture beyond the current indexed window');
      } catch (e: any) {
        reason = e.reason; assert.equal(reason, 'coverage');
      }
      Object.assign(proof, { passed: true, mode: 'uncovered-fixture-denied',
        rejectionReason: reason, actualProductionMinimumCheckpointDenied: true,
        scope: 'Actual production minimumCheckpoint424677 refusal under the current indexed window. '
          + 'No old snapshot substitute, native fallback, profile, simulation or dispatch. '
          + 'The positive inventory and Chrome branches remain unexecuted.' });
    } else {
      assert(readiness.infrastructureReadyForProductionProbe,
        'All formal publication/pipeline/Display/account gates must pass before positive inventory');
      const reader = await WalletAssetReader.open(session, { minimumCheckpoint: '424677', timeoutMs: 60000 });
      assert(BigInt(reader.proof.checkpoint) >= 424677n);
      const source = await reader.kiosks(oracle.addresses.source);
      assert.equal(source.value.length, 3);
      assert.equal(source.snapshot.cacheKey, reader.proof.cacheKey);
      for (const k of oracle.kiosks) {
        const found = source.value.find(r => r.kioskId === k.objectId);
        assert(found?.kind === 'framework');
        assert.equal(found.ownerCap.isPersonal, k.kind === 'personal');
        assert.equal(found.ownerCap.objectId, k.kind === 'personal'
          ? oracle.personalCap.objectId : oracle.frameworkCap.objectId);
        const expected = oracle.nfts.filter((n: any) => k.kind === 'personal'
          ? n.value.serial === '5' : ['1', '2', '3', '4'].includes(n.value.serial));
        assert.deepEqual(found.items.map(n => n.objectId).sort(), expected.map((n: any) => n.objectId).sort());
        for (const n of expected) {
          const item: WalletKioskItem = found.items.find(i => i.objectId === n.objectId)!;
          assert.equal(item.isLocked, n.value.serial === '3');
          if (['2', '4'].includes(n.value.serial)) {
            assert(item.listing); assert.equal(item.listing.isExclusive, n.value.serial === '4');
            assert.equal(String(item.listing.price), '1000000');
          } else assert.equal(item.listing, undefined);
        }
      }
      const sourceOB = oracle.originByte.find((r: any) => r.owner === oracle.addresses.source);
      const ob = source.value.find(r => r.kioskId === sourceOB.kioskId);
      assert(ob?.kind === 'originbyte' && ob.ownerTokenId === sourceOB.tokenId);
      assert.deepEqual(ob.items.map(i => i.objectId).sort(), oracle.obNfts.map((n: any) => n.objectId).sort());
      assert(ob.items.every(i => i.originByteRegistered && !i.originByteExclusive));
      const existing = await reader.kiosks(oracle.addresses.existingTarget);
      const targetOB = oracle.originByte.find((r: any) => r.owner === oracle.addresses.existingTarget);
      assert.equal(existing.value.length, 1);
      assert(existing.value[0].kind === 'originbyte' && existing.value[0].kioskId === targetOB.kioskId);
      assert.equal(existing.value[0].items.length, 0);
      const empty = await reader.kiosks(oracle.addresses.newTarget); assert.equal(empty.value.length, 0);
      const route = read(join(fixture, 'seed/route-binding.json'));
      const direct = await reader.ownedObjects(oracle.addresses.source, { type: route.nftType, pageSize: 1 });
      const directOracle = oracle.nfts.find((n: any) => n.value.serial === '6');
      assert.deepEqual(direct.value.map(n => n.objectId), [directOracle.objectId]);
      const fullnode = new WalletFullnodeReader(session, { timeoutMs: 60000 });
      const live: any[] = [];
      for (const n of [...oracle.nfts, ...oracle.obNfts]) {
        const current = await fullnode.object(n.objectId); assert(current);
        const indexed = direct.value.find(i => i.objectId === n.objectId) ??
          source.value.flatMap(k => k.items).find(i => i.objectId === n.objectId);
        assert(indexed); assert.equal(indexed.version, current.version); assert.equal(indexed.digest, current.digest);
        assert.equal(normalizeStructTag(indexed.type), current.type);
        assert.deepEqual(indexed.owner, current.owner);
        assert.deepEqual(Buffer.from(indexed.content), Buffer.from(current.content));
        live.push({ objectId: current.objectId, version: current.version, digest: current.digest,
          canonicalCurrentOwnerAndContentMatch: true });
      }
      await reader.snapshot.revalidate();
      Object.assign(proof, { passed: true, mode: 'covered-fixture-inventory', indexedFixtureAccepted: true,
        snapshot: reader.proof, sourceKiosks: source.value, existingTargetKiosks: existing.value,
        newTargetKiosks: empty.value, direct: direct.value, freshNativeObjects: live,
        scope: 'Actual current C46 isolated production same-S ten-domain/Display snapshot, all8 NFT/five Item/cap/OB '
          + 'discovery and three controlled owners, four framework lock/list states and live Fullnode '
          + 'version/digest/owner/content agreement. Readonly; no transfer preview, Chrome or parent closure.' });
    }
    held();
  } catch (e: any) {
    proof.errorType = e.name; proof.message = String(e.message).slice(0, 1000);
    process.exitCode = 1;
  } finally {
    session?.close(); globalThis.fetch = originalFetch;
    Object.assign(proof, { observedAt: new Date().toISOString(),
      inputsSha256: Object.fromEntries([resolve(process.argv[1]), resolve(readinessFile), nativeFile,
        intentFile, profileFile, buildFile, gatewayFile].map(f => [f, sha(f)])) });
    writeFileSync(output, JSON.stringify(proof, (_k, v) => typeof v === 'bigint' ? v.toString() : v, 2) + '\n',
      { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ passed: proof.passed, mode: proof.mode, frames: frames.length,
      indexedFixtureAccepted: proof.indexedFixtureAccepted, executeRequests: 0 }));
  }
}
main().catch(e => { console.error(JSON.stringify({ passed: false, errorType: e.name,
  message: String(e.message).slice(0, 500) })); process.exitCode = 1; });

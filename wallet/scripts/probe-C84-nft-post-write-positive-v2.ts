// Read-only acceptance of the six original transfers after all seven coverage gates pass.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { normalizeStructTag } from 'rtd-typescript/utils';
import { WalletReadSession } from '../src/shared/rpc/session';
import { validateNetworkProfile } from '../src/shared/rpc/profile';
import { WalletAssetReader } from '../src/shared/rpc/asset-reader';
import { WalletFullnodeReader } from '../src/shared/rpc/fullnode-reader';
import { WalletAccountHistoryReader } from '../src/shared/rpc/account-history-reader';

async function main() {
  const [readinessArg, outputArg, option] = process.argv.slice(2);
  assert(readinessArg && outputArg && (option === undefined || option === '--preflight'));
  const output = resolve(outputArg); assert(!existsSync(output));
  const wallet = resolve(__dirname, '..'), logs = join(wallet, 'migrationToGRpcOrGraphQLDoc/workLog');
  assert(output.startsWith(logs + '/'));
  const read = (f: string) => JSON.parse(readFileSync(f, 'utf8'));
  const sha = (f: string) => createHash('sha256').update(readFileSync(f)).digest('hex');
  const readinessFile = resolve(readinessArg), readiness = read(readinessFile);
  const nativeFile = join(logs, '20261007-C48-nft-execution-browser-independent-02.json');
  const seedFile = join(logs, '20261007-C43-nonempty-kiosk-native-independent-01.json');
  const gatewayFile = join(logs, '20261008-C51-ordinary-gateway-started-01.json');
  const native = read(nativeFile), seed = read(seedFile), gateway = read(gatewayFile);
  const profileFile = gateway.profile, profile = validateNetworkProfile(read(profileFile));
  assert(readiness.passed && native.passed && seed.passed && gateway.passed);
  assert(readiness.targetCheckpoint === 524022 && native.originalExecutions === 6);
  assert(native.maximumExecutionCheckpoint === '524022' && native.normalRelockChromeAbsent && native.journalsRetained);
  assert(native.auditExecutions + native.auditSignatures + native.auditSimulations === 0);
  assert(profile.expectedGenesisDigest === readiness.h0 && native.h0 === readiness.h0 && seed.h0 === readiness.h0);
  assert(profile.generation === readiness.generation && native.generation === readiness.generation);
  const gateNames = ['committedPublication', 'hbase14', 'sql23', 'rocks4', 'display', 'declaredAndNativeAssetWindow', 'accountHistoryWindow'];
  assert.deepEqual(Object.keys(readiness.coverageGates).sort(), [...gateNames].sort());
  assert(gateNames.every(g => typeof readiness.coverageGates[g] === 'boolean'));
  const allReady = gateNames.every(g => readiness.coverageGates[g]);
  assert.equal(allReady, readiness.infrastructureReadyForProductionProbe);
  for (const p of [readiness, native, seed, gateway]) {
    for (const [f, h] of Object.entries(p.inputsSha256)) assert.equal(sha(f), h);
  }
  const expectedSource = { sha256: 'a03cb96c62e2ae6d7908a8506fc1411a0e92aa1a0cb27b69f49783659ab12521', files: 1120 };
  const productSource = () => require('./build-reviewed-generation-production-extension.cjs').productSource();
  assert.deepEqual(productSource(), expectedSource); assert.deepEqual(native.source, expectedSource);
  const intentFile = join(readiness.fixture, 'intent.json'), intent = read(intentFile);
  const pins: Record<string, string> = intent.protectedOriginalsSha256;
  assert.equal(Object.keys(pins).length, 1015);
  const held = () => { for (const [f, h] of Object.entries(pins)) assert.equal(sha(f), h); assert.deepEqual(productSource(), expectedSource); };
  held();
  const expectedIds: string[] = [...seed.nfts, ...seed.obNfts].map((n: any) => n.objectId);
  assert(expectedIds.length === 8 && new Set(expectedIds).size === 8);
  assert(native.currentTransferredNFTs.length === 6 && native.sixFirstDispatches.length === 6);
  const transferred = new Map<string, any>();
  for (const n of native.currentTransferredNFTs) {
    assert(expectedIds.includes(n.objectId) && !transferred.has(n.objectId));
    const dispatched = native.sixFirstDispatches.find((d: any) => d.objectId === n.objectId);
    assert(dispatched && dispatched.digest === n.previousTransaction && n.objectBcsBase64);
    transferred.set(n.objectId, n);
  }
  const owners: string[] = [seed.addresses.source, seed.addresses.existingTarget, seed.addresses.newTarget];
  assert(new Set(owners).size === 3);
  const files = [resolve(process.argv[1]), readinessFile, nativeFile, seedFile, gatewayFile, profileFile, intentFile];
  const frames: any[] = [], originalFetch = globalThis.fetch;
  let phase: 'asset' | 'fullnode' | 'history' = 'asset';
  let session: WalletReadSession | undefined;
  const result: any = { passed: false, observedAt: new Date().toISOString(), h0: readiness.h0,
    generation: readiness.generation, targetCheckpoint: 524022, frames,
    indexedPostWriteAccepted: false, chromeAccepted: false, parentCompletion: false,
    profilesOpened: 0, simulations: 0, signatures: 0, executeRequests: 0,
    protectedOriginalsHeld: 1015, productSource: expectedSource };
  try {
    if (option === '--preflight') {
      Object.assign(result, { passed: true, preparedOnly: true, actualCoverageReady: allReady,
        scope: 'Actual sealed inputs, original six terminal receipts, eight NFT identity set, protected files and current product bytes. No network or positive indexed acceptance.' });
      return;
    }
    assert(allReady, 'Seven independent checkpoint524022 coverage gates must pass before any positive network probe');
    const age = Date.now() - Date.parse(readiness.observedAt);
    assert(Number.isFinite(age) && age >= 0 && age < 300000);
    const allowed = new Set(['http://127.0.0.1:41750', 'http://127.0.0.1:41957', 'http://127.0.0.1:41958', 'http://127.0.0.1:41959']);
    globalThis.fetch = async (input, init) => {
      const url = new URL(input instanceof Request ? input.url : String(input));
      assert(allowed.has(url.origin));
      assert(['/graphql', '/account/graphql'].includes(url.pathname) || /\/(GetCheckpoint|GetServiceInfo|GetObject|GetAvailableRange)$/.test(url.pathname));
      const response = await originalFetch(input, init), body = Buffer.from(await response.clone().arrayBuffer());
      assert(body.length <= 16 * 1024 * 1024);
      const request = init?.body; assert(request === undefined || typeof request === 'string' || request instanceof Uint8Array);
      frames.push({ phase, url: url.href, status: response.status, requestBase64: Buffer.from(request ?? '').toString('base64'), responseBase64: body.toString('base64') });
      return response;
    };
    session = new WalletReadSession(profile);
    const reader = await WalletAssetReader.open(session, { minimumCheckpoint: '524022', timeoutMs: 60000 });
    assert(BigInt(reader.proof.checkpoint) >= 524022n);
    phase = 'fullnode';
    const fullnode = new WalletFullnodeReader(session, { timeoutMs: 60000 });
    const current = new Map<string, any>();
    for (const id of expectedIds) {
      const object = await fullnode.object(id); assert(object?.objectBcs);
      const original = transferred.get(id);
      if (original) {
        assert.equal(object.version, original.version); assert.equal(object.digest, original.digest);
        assert.deepEqual(object.owner, original.owner); assert.equal(object.previousTransaction, original.previousTransaction);
        assert.equal(Buffer.from(object.objectBcs).toString('base64'), original.objectBcsBase64);
      }
      current.set(id, object);
    }
    phase = 'asset';
    const types = [...new Set([...current.values()].map(n => normalizeStructTag(n.type)))];
    const indexed = new Map<string, any>(), ownerResults: any[] = [];
    for (const owner of owners) {
      const kiosks = await reader.kiosks(owner); assert.equal(kiosks.snapshot.cacheKey, reader.proof.cacheKey);
      const direct: any[] = [];
      for (const type of types) {
        const rows = await reader.ownedObjects(owner, { type, pageSize: 1 });
        assert.equal(rows.snapshot.cacheKey, reader.proof.cacheKey); direct.push(...rows.value);
      }
      for (const object of [...direct, ...kiosks.value.flatMap(k => k.items)]) {
        if (!expectedIds.includes(object.objectId)) continue;
        assert(!indexed.has(object.objectId), 'NFT discovered twice across original three owners');
        const live = current.get(object.objectId); assert(live);
        assert.equal(object.version, live.version); assert.equal(object.digest, live.digest);
        assert.equal(normalizeStructTag(object.type), normalizeStructTag(live.type));
        assert.deepEqual(object.owner, live.owner); assert.deepEqual(Buffer.from(object.content), Buffer.from(live.content));
        assert.equal(object.previousTransaction, live.previousTransaction);
        indexed.set(object.objectId, { ...object, discoveredUnder: owner });
      }
      ownerResults.push({ owner, kiosks: kiosks.value, direct });
    }
    assert.deepEqual([...indexed.keys()].sort(), [...expectedIds].sort());
    for (const dispatched of native.sixFirstDispatches) {
      const object = indexed.get(dispatched.objectId); assert.equal(object.discoveredUnder, dispatched.recipient);
      const transferredObject = transferred.get(dispatched.objectId);
      const kiosks = ownerResults.find(r => r.owner === dispatched.recipient).kiosks;
      if (transferredObject.targetKiosk) {
        const kiosk = kiosks.find((k: any) => k.kioskId === transferredObject.targetKiosk);
        assert(kiosk?.kind === 'originbyte' && kiosk.items.some((n: any) => n.objectId === dispatched.objectId));
      } else assert(ownerResults.find(r => r.owner === dispatched.recipient).direct.some((n: any) => n.objectId === dispatched.objectId));
    }
    const sourceKiosks = ownerResults.find(r => r.owner === seed.addresses.source).kiosks;
    for (const k of seed.kiosks) {
      const actual = sourceKiosks.find((r: any) => r.kioskId === k.objectId); assert(actual?.kind === 'framework');
      assert.equal(actual.ownerCap.isPersonal, k.kind === 'personal');
      assert.equal(actual.ownerCap.objectId, k.kind === 'personal' ? seed.personalCap.objectId : seed.frameworkCap.objectId);
    }
    const sourceItems = sourceKiosks.flatMap((k: any) => k.items);
    const locked = seed.nfts.find((n: any) => n.value.serial === '3');
    const exclusive = seed.nfts.find((n: any) => n.value.serial === '4');
    assert.deepEqual(sourceItems.map((n: any) => n.objectId).sort(), [locked.objectId, exclusive.objectId].sort());
    assert(sourceItems.find((n: any) => n.objectId === locked.objectId).isLocked);
    const exclusiveItem = sourceItems.find((n: any) => n.objectId === exclusive.objectId);
    assert(exclusiveItem.listing?.isExclusive && String(exclusiveItem.listing.price) === '1000000');
    phase = 'history';
    const history = await new WalletAccountHistoryReader(session, { minimumCheckpoint: '524022', timeoutMs: 60000, pageSize: 50, maxPages: 100 }).read(seed.addresses.source);
    assert(history.checkpointHi >= 524022);
    for (const dispatched of native.sixFirstDispatches) assert.equal(history.transactions.filter(r => r.digest === dispatched.digest).length, 1);
    phase = 'asset';
    await reader.snapshot.revalidate(); held();
    Object.assign(result, { passed: true, preparedOnly: false, indexedPostWriteAccepted: true,
      snapshot: reader.proof, ownerResults, freshNativeObjects: [...current.values()], sourceHistory: history,
      originalSixTransfersIndexed: 6, originalEightNFTsMatched: 8,
      scope: 'Current production same-S paginated assets across the original three controlled owners, all eight NFT native identity/content agreement, six exact previously executed ownership transitions, framework/Personal caps and retained lock/exclusive listing, both target OB kiosks, separately pinned supported source-account history containing all six original digests. No Chrome, signature, simulation, execute or parent closure.' });
  } catch (e: any) { result.errorType = e.name; result.message = String(e.message).slice(0, 1000); process.exitCode = 1; }
  finally {
    session?.close(); globalThis.fetch = originalFetch; held();
    result.inputsSha256 = Object.fromEntries(files.map(f => [f, sha(f)]));
    writeFileSync(output, JSON.stringify(result, (_k, v) => typeof v === 'bigint' ? v.toString() : v, 2) + '\n', { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ passed: result.passed, preparedOnly: result.preparedOnly, indexedPostWriteAccepted: result.indexedPostWriteAccepted, frames: frames.length, errorType: result.errorType }));
  }
}
main().catch(e => { console.error(JSON.stringify({ passed: false, phase: 'input-validation', errorType: e.name })); process.exitCode = 1; });

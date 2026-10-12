// Independent canonical native object/effects audit; indexed authority is a separate gate.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, join } from 'node:path';
import { GrpcTypes } from 'rtd-typescript/grpc';
import { bcs } from 'rtd-typescript/bcs';
import { normalizeStructTag } from 'rtd-typescript/utils';
import { decodeFreshObject } from '../src/shared/rpc/fresh-object';
import { KIOSK_BCS, exactBcs } from '../src/shared/rpc/kiosk-reader';

const [output] = process.argv.slice(2); assert(output && !existsSync(output));
const wallet = resolve(__dirname, '..'), log = join(wallet, 'migrationToGRpcOrGraphQLDoc/workLog');
const sha = (f: string) => createHash('sha256').update(readFileSync(f)).digest('hex');
const read = (f: string) => JSON.parse(readFileSync(f, 'utf8'));
const productionFile = join(log, '20261007-C40-account-nonempty-production-02.json');
const nativeFile = join(log, '20261007-C40-account-native-independent-audit-02.json');
const production = read(productionFile), proof = read(nativeFile); assert(production.passed && proof.passed);
const pins: Record<string, string> = Object.fromEntries([__filename, productionFile, nativeFile].map(f => [f, sha(f)]));
const native = new Map<string, any>();
for (const r of proof.rawFiles) {
  assert.equal(sha(r.file), r.sha256); pins[r.file] = r.sha256;
  if (!r.url.endsWith('/GetTransaction')) continue;
  const raw = readFileSync(r.file); assert.equal(raw[0], 0);
  const size = raw.readUInt32BE(1); assert(size > 0 && size + 5 <= raw.length);
  const t = GrpcTypes.GetTransactionResponse.fromBinary(raw.subarray(5, size + 5)).transaction;
  assert(t?.digest && t.effects?.bcs?.value); native.set(t.digest, t);
}
assert.equal(native.size, 22);
const item = bcs.struct('CanonicalKioskItemField', { id: bcs.Address, name: bcs.Address, value: bcs.Address });
const rows: any[] = [];
for (const collection of production.collections) for (const row of collection.history.transactions) {
  const transfer = row.kioskTransfers; if (!transfer) continue;
  assert.equal(transfer.chainId, production.h0); assert.equal(transfer.address, collection.owner);
  assert.equal(transfer.digest, row.digest); assert.equal(transfer.checkpoint, row.checkpoint);
  assert.equal(transfer.completeForDiscoveredKioskAssets, true); assert.equal(transfer.allAccountTransfersCertified, false);
  const tx = native.get(row.digest); assert(tx);
  const fx = bcs.TransactionEffects.parse(tx.effects.bcs.value).V2; assert(fx);
  const changes = new Map<string, any>(fx.changedObjects);
  const get = (id: string, side: string) => {
    const change = changes.get(id); assert(change, 'Native effects object change required');
    const state = change[side];
    if (state.$kind === 'NotExist') return null;
    const version = side === 'inputState' ? state.Exist[0][0] : fx.lamportVersion;
    const digest = side === 'inputState' ? state.Exist[0][1] : state.ObjectWrite[0];
    const raw = tx.objects.objects.find((o: any) => o.objectId === id && String(o.version) === version);
    assert(raw, 'Canonical native object/version required');
    const object = decodeFreshObject(raw, id);
    assert.equal(object.digest, digest);
    assert.deepEqual(object.owner, side === 'inputState' ? state.Exist[1] : state.ObjectWrite[1]);
    return object;
  };
  for (const movement of transfer.movements) {
    const endpoints: any[] = [];
    for (const [side, endpoint] of [['inputState', movement.before], ['outputState', movement.after]] as const) {
      const asset = get(movement.assetId, side);
      if (endpoint.kind === 'absent') { assert.equal(asset, null); assert.equal(endpoint.kioskId, null); assert.equal(endpoint.address, null); continue; }
      assert(asset); assert.equal(asset.type, normalizeStructTag(movement.assetType));
      assert.equal(bcs.Address.parse(asset.content.subarray(0, 32)), movement.assetId);
      if (endpoint.kind === 'address') {
        assert.equal(asset.owner.$kind, 'AddressOwner'); assert.equal(asset.owner.AddressOwner, endpoint.address); assert.equal(endpoint.kioskId, null);
      } else {
        assert.equal(endpoint.kind, 'kiosk'); assert.equal(asset.owner.$kind, 'ObjectOwner');
        const wrapper = get(asset.owner.ObjectOwner!, side); assert(wrapper);
        assert.equal(wrapper.type, normalizeStructTag('0x2::dynamic_field::Field<0x2::dynamic_object_field::Wrapper<0x2::kiosk::Item>, 0x2::object::ID>'));
        const value = exactBcs(item, wrapper.content); assert.equal(value.id, wrapper.objectId);
        assert.equal(value.name, movement.assetId); assert.equal(value.value, movement.assetId);
        assert.equal(wrapper.owner.$kind, 'ObjectOwner'); assert.equal(wrapper.owner.ObjectOwner, endpoint.kioskId);
        const kiosk = get(endpoint.kioskId, side); assert(kiosk);
        assert.equal(kiosk.type, normalizeStructTag('0x2::kiosk::Kiosk')); assert.equal(kiosk.owner.$kind, 'Shared');
        const valueKiosk = exactBcs(KIOSK_BCS, kiosk.content); assert.equal(valueKiosk.id, endpoint.kioskId);
        const authority = endpoint.ownershipProof;
        assert(authority && authority.kioskId === endpoint.kioskId && authority.digest === row.digest && authority.checkpoint === row.checkpoint && authority.side === side);
        assert.equal(authority.address, endpoint.address);
        endpoints.push({ side, assetVersion: asset.version, assetDigest: asset.digest, wrapperId: wrapper.objectId, wrapperVersion: wrapper.version, kioskId: kiosk.objectId, kioskVersion: kiosk.version, ownershipProofIndependentlyAccepted: false });
      }
    }
    const before = movement.before, after = movement.after, ownBefore = before.address === collection.owner, ownAfter = after.address === collection.owner;
    assert.equal(movement.received, ownAfter && before.address !== null && before.address !== collection.owner);
    assert.equal(movement.sent, ownBefore && after.address !== null && after.address !== collection.owner);
    assert.equal(movement.createdForAccount, ownAfter && before.kind === 'absent');
    assert.equal(movement.destroyedForAccount, ownBefore && after.kind === 'absent');
    assert.equal(movement.internalMove, ownBefore && ownAfter && before.kioskId !== after.kioskId);
    assert.equal(movement.enteredKiosk, after.kioskId !== null && after.kioskId !== before.kioskId);
    assert.equal(movement.leftKiosk, before.kioskId !== null && before.kioskId !== after.kioskId);
    rows.push({ digest: row.digest, checkpoint: row.checkpoint, assetId: movement.assetId, canonicalNativeEndpoints: true, endpoints, booleansAgreeWithDeclaredAddresses: true, authorityAddressIndependentlyAccepted: false });
  }
}
assert.equal(rows.length, 7);
writeFileSync(output, JSON.stringify({ passed: true, observedAt: new Date().toISOString(), rows, inputsSha256: pins,
  indexedAuthorityAuditStillRequired: true, parentQA13Complete: false,
  scope: 'Seven actual native effects/object/version/digest/owner and canonical NFT->dynamic wrapper->SharedKiosk endpoints. Movement flags recomputed against declared addresses. No use of Kiosk.owner to authenticate authority: immutable token/cap SQL roots, transaction ordinal and possession proof remain required. Prior fresh native raw reused without mutation.' }, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify({ passed: true, canonicalNativeMovements: rows.length, indexedAuthorityAuditStillRequired: true }));

// Native-only original once-dispatch audit. Never signs, simulates or writes chain state.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { Transaction } from 'rtd-typescript/transactions';
import { verifyTransactionSignature } from 'rtd-typescript/verify';
import { deriveDynamicFieldID, toBase64, normalizeRtdAddress } from 'rtd-typescript/utils';
import { receiptObjectEffects } from 'rtd-apps-core/src/rpc/transaction-view';
import { validateNetworkProfile } from '../src/shared/rpc/profile';
import { WalletReadSession } from '../src/shared/rpc/session';
import { WalletExecutionReader } from '../src/shared/rpc/execution-reader';
import { WalletFullnodeReader } from '../src/shared/rpc/fullnode-reader';
import { exactBcs, KIOSK_BCS, KIOSK_ITEM_BCS, nativeKioskCap } from '../src/shared/rpc/kiosk-reader';
async function main() {
  const [profileFile, proofFile, output] = process.argv.slice(2);
  assert(!existsSync(output));
  const read = (file: string) => JSON.parse(readFileSync(file, 'utf8'));
  const sha = (file: string) => createHash('sha256').update(readFileSync(file)).digest('hex');
  const p = read(proofFile); assert(p.passed && p.formalSimulationSignatureAndOnceDispatch && !p.indexedCoverageAccepted);
  const pendingFile = join(p.operation, 'execute.pending.json'), receiptFile = join(p.operation, 'execute.json'), beforeFile = join(p.operation, 'unsigned.base64.before.json');
  const pending = read(pendingFile), original = read(receiptFile).result, before = read(beforeFile);
  assert.equal(pending.digest, p.digest); assert.equal(original.digest, p.digest); assert.equal(original.effects.status.status, 'success');
  assert.equal(pending.sender, before.sender); assert.equal(before.transactionDigest, p.digest);
  for (const [file, hash] of Object.entries(p.inputsSha256)) assert.equal(sha(file), hash);
  const profile = validateNetworkProfile(read(profileFile)); assert.equal(profile.expectedGenesisDigest, p.h0);
  const session = new WalletReadSession(profile), execution = new WalletExecutionReader(session), fullnode = new WalletFullnodeReader(session);
  const originalFetch = globalThis.fetch, paths: string[] = [];
  globalThis.fetch = (input, init) => {
    const u = new URL(input instanceof Request ? input.url : String(input));
    assert.equal(u.origin, 'http://127.0.0.1:41750'); assert(['/GetServiceInfo', '/GetObject', '/GetTransaction'].some(s => u.pathname.endsWith(s)));
    paths.push(u.href); return originalFetch(input, init);
  };
  try {
    const details = await execution.details(p.digest), receipt = await execution.lookup(p.digest); assert(details && receipt?.success);
    assert.equal(receipt.checkpoint, String(p.checkpoint)); assert.equal(toBase64(details.transaction.bcs), pending.bytesBase64);
    assert.equal(details.transaction.signatures.length, 1); assert.equal(details.transaction.signatures[0], pending.signature);
    assert.equal((await verifyTransactionSignature(details.transaction.bcs, pending.signature)).toRtdAddress(), p.sender);
    const tx = Transaction.from(details.transaction.bcs); assert.equal(await tx.getDigest(), p.digest);
    const data = tx.getData(); assert.equal(data.sender, p.sender);
    assert.deepEqual(data.commands.map(c => c.$kind), ['MoveCall', 'MoveCall', 'TransferObjects', 'MoveCall']);
    const framework = normalizeRtdAddress('0x2');
    for (const index of [0, 1, 3]) assert.equal(data.commands[index].MoveCall!.package, framework);
    assert.equal(data.commands[0].MoveCall!.function, 'new'); assert.equal(data.commands[1].MoveCall!.function, 'place'); assert.equal(data.commands[3].MoveCall!.function, 'public_share_object');
    assert.equal(data.commands[1].MoveCall!.typeArguments[0], before.nftType);
    const changes = receiptObjectEffects(details.transaction);
    const caps = changes.filter(c => c.operation === 'Created' && c.objectType?.endsWith('::kiosk::KioskOwnerCap'));
    const kiosks = changes.filter(c => c.operation === 'Created' && c.objectType?.endsWith('::kiosk::Kiosk'));
    assert.equal(caps.length, 1); assert.equal(kiosks.length, 1);
    const cap = await fullnode.object(caps[0].objectId), kiosk = await fullnode.object(kiosks[0].objectId), nft = await fullnode.object(before.nftId); assert(cap && kiosk && nft);
    assert(cap.owner.$kind === 'AddressOwner' && cap.owner.AddressOwner === p.sender);
    const decoded = nativeKioskCap(cap, profile.packages); assert(decoded && !decoded.isPersonal && decoded.kioskId === kiosk.objectId);
    const content = exactBcs(KIOSK_BCS, kiosk.content); assert.equal(content.owner, p.sender); assert.equal(content.item_count, 1);
    assert.equal(kiosk.owner.$kind, 'Shared');
    const wrapperId = deriveDynamicFieldID(kiosk.objectId, '0x2::dynamic_object_field::Wrapper<0x2::kiosk::Item>', KIOSK_ITEM_BCS.serialize({ id: before.nftId }).toBytes());
    assert(nft.owner.$kind === 'ObjectOwner' && nft.owner.ObjectOwner === wrapperId); assert.equal(nft.type, before.nftType);
    for (const object of [cap, kiosk, nft]) {
      const change = original.objectChanges.find((c: any) => c.objectId === object.objectId);
      assert(change); assert.equal(String(change.version), object.version); assert.equal(change.digest, object.digest);
    }
    const report = { passed: true, observedAt: new Date().toISOString(), h0: p.h0, generation: p.generation, digest: p.digest, checkpoint: receipt.checkpoint, sender: p.sender,
      nftId: before.nftId, nftType: before.nftType, kioskId: kiosk.objectId, capId: cap.objectId, kiosk: content, wrapperId,
      originalBcsSignatureAndNativeReceiptMatch: true, originalCliVersionsAndDigestsMatch: true, originalCapStillOwned: true, frameworkNonemptyConfirmed: true,
      auditSimulations: 0, auditSignatures: 0, auditExecuteRequests: 0, paths, indexedCoverageAccepted: false,
      inputsSha256: Object.fromEntries([resolve(process.argv[1]), profileFile, proofFile, pendingFile, receiptFile, beforeFile].map(file => [resolve(file), sha(file)])),
      scope: 'Original current debug G3 framework fixture once execution and canonical native cap/Kiosk/Item owner only. Indexed discovery, actual C39 transfer and full parents remain unverified.' };
    writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ passed: true, checkpoint: receipt.checkpoint, itemCount: 1, indexedCoverageAccepted: false }));
  } finally { session.close(); globalThis.fetch = originalFetch; }
}
main().catch(error => { console.error(JSON.stringify({ passed: false, errorType: error.name })); process.exitCode = 1; });

// Read-only production NFT discovery and unsigned command assembly. Never simulates or signs.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { Transaction } from 'rtd-typescript/transactions';
import { normalizeStructTag, normalizeRtdAddress, toBase64 } from 'rtd-typescript/utils';
import type { WalletRpc, WalletAssetSnapshot } from 'rtd-apps-core/src/rpc/WalletRpcContext';
import { validateNetworkProfile } from '../src/shared/rpc/profile';
import { WalletReadSession } from '../src/shared/rpc/session';
import { WalletAssetReader } from '../src/shared/rpc/asset-reader';
import { WalletFullnodeReader } from '../src/shared/rpc/fullnode-reader';
import { appendOriginByteTransfer } from '../src/shared/rpc/originbyte-transfer';
import { groupCollectibles } from '../src/shared/rpc/nft-assets';

async function main() {
  const [profilePath, fixturesPath, output] = process.argv.slice(2);
  const profile = validateNetworkProfile(JSON.parse(readFileSync(profilePath, 'utf8')));
  const fixtures = JSON.parse(readFileSync(fixturesPath, 'utf8'));
  assert.equal(fixtures.expectedGenesisDigest, profile.expectedGenesisDigest);
  assert.equal(fixtures.results.length, 2);
  const original = globalThis.fetch;
  const requests: { path: string; milliseconds: number; status?: number; error?: string }[] = [];
  globalThis.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    assert.equal(url.hostname, '127.0.0.1');
    assert(url.pathname === '/graphql' || ['/GetServiceInfo', '/GetObject'].some(path => url.pathname.endsWith(path)));
    const started = performance.now(), row = { path: url.pathname, milliseconds: 0 } as typeof requests[number];
    requests.push(row);
    try { const response = await original(input, init); row.status = response.status; return response; }
    catch (error) { row.error = error instanceof Error ? error.name : 'unknown'; throw error; }
    finally { row.milliseconds = Math.round(performance.now() - started); }
  };
  const session = new WalletReadSession(profile);
  const evidence: Record<string, unknown> = { observedAt: new Date().toISOString(), h0: profile.expectedGenesisDigest,
    passed: false, requests, dispatches: 0, simulations: 0,
    scope: 'Actual admitted GraphQL NFT/OwnerToken/Kiosk reads, fresh Fullnode comparison and production unsigned P2P assembly. No gas resolution, simulation, signing, hidden-state persistence or Chrome acceptance.' };
  try {
    const reader = await WalletAssetReader.open(session, { timeoutMs: 30000 });
    evidence.proof = reader.proof;
    const fullnode = new WalletFullnodeReader(session);
    // Only the read capabilities consumed by appendOriginByteTransfer are provided.
    const rpc = { packages: profile.packages, bindingKey: session.bindingKey,
      readFreshObject: fullnode.object.bind(fullnode) } as WalletRpc;
    const rows: unknown[] = []; evidence.rows = rows;
    for (const fixture of fixtures.results) {
      const kiosks = await reader.kiosks(fixture.targetOwner);
      const kiosk = kiosks.value.find(value => value.kioskId === fixture.targetKiosk);
      assert(kiosk?.kind === 'originbyte');
      assert.equal(kiosk.ownerTokenId, fixture.ownerToken);
      assert.equal(kiosk.items.length, fixture.itemCount);
      const listed = kiosk.items.find(item => item.objectId === fixture.nft);
      assert(listed?.originByteRegistered && !listed.originByteExclusive && !listed.isLocked);
      const point = (await reader.objects([fixture.nft])).value[0];
      assert(point && !(point instanceof Error));
      assert.equal(point.type, normalizeStructTag('0x4305d2a990f17b57b95af09287ab601d52474b49225dd6e4c200e11cefb26ef1::migration_nft::MigrationNFT'));
      assert.equal(point.version, listed.version); assert.equal(point.digest, listed.digest);
      assert.equal(point.owner.$kind, 'ObjectOwner');
      assert.equal(point.owner.ObjectOwner, fixture.wrapper);
      const fresh = await fullnode.object(fixture.nft); assert(fresh);
      assert.equal(fresh.version, point.version); assert.equal(fresh.digest, point.digest);
      assert.equal(fresh.type, point.type); assert.deepEqual(fresh.owner, point.owner);
      assert.equal(toBase64(fresh.content), toBase64(point.content));
      const owned = (await reader.ownedObjects(fixture.targetOwner)).value;
      assert(owned.some(item => item.objectId === fixture.ownerToken));
      const visible = groupCollectibles(owned, [], profile.packages);
      assert(visible.visual.some(item => item.objectId === fixture.ownerToken));
      const hidden = groupCollectibles(owned, [fixture.ownerToken], profile.packages);
      assert(hidden.hidden.some(item => item.objectId === fixture.ownerToken));
      assert(![...hidden.visual, ...hidden.other].some(item => item.objectId === fixture.ownerToken));
      const recipient = fixtures.results.find((value: { targetOwner: string }) => value.targetOwner !== fixture.targetOwner);
      const tx = new Transaction();
      await appendOriginByteTransfer(tx, rpc, reader as WalletAssetSnapshot, kiosk, fresh,
        fixture.targetOwner, recipient.targetOwner, AbortSignal.timeout(20000));
      const commands = tx.getData().commands;
      assert.equal(commands.length, 1);
      assert.equal(commands[0].MoveCall?.function, 'p2p_transfer');
      assert.equal(commands[0].MoveCall?.package, profile.packages.originByte!.executionPackage);
      assert.equal(commands[0].MoveCall?.module, 'ob_kiosk');
      assert.deepEqual(commands[0].MoveCall?.typeArguments, [point.type]);
      const newRecipient = normalizeRtdAddress('0xccc');
      assert.equal((await reader.kiosks(newRecipient)).value.length, 0);
      const createTarget = new Transaction();
      await appendOriginByteTransfer(createTarget, rpc, reader as WalletAssetSnapshot, kiosk, fresh,
        fixture.targetOwner, newRecipient, AbortSignal.timeout(20000));
      const createCommands = createTarget.getData().commands;
      assert.equal(createCommands.length, 1);
      assert.equal(createCommands[0].MoveCall?.function, 'p2p_transfer_and_create_target_kiosk');
      assert.equal(createCommands[0].MoveCall?.package, profile.packages.originByte!.executionPackage);
      assert.equal(createCommands[0].MoveCall?.module, 'ob_kiosk');
      assert.deepEqual(createCommands[0].MoveCall?.typeArguments, [point.type]);
      await assert.rejects(appendOriginByteTransfer(new Transaction(), rpc, reader as WalletAssetSnapshot,
        kiosk, fresh, recipient.targetOwner, fixture.targetOwner, AbortSignal.timeout(20000)), /尚未登记/);
      rows.push({ owner: fixture.targetOwner, kiosk: fixture.targetKiosk, nft: fixture.nft,
        version: point.version, digest: point.digest, type: point.type, json: point.json, display: point.display,
        ownerTokenClassification: 'visual then hidden without visible duplication',
        freshObjectMatchesSnapshot: true, wrongSenderRejected: true, unsignedCommands: commands,
        newRecipient, unsignedCreateTargetCommands: createCommands });
    }
    await reader.snapshot.revalidate(); evidence.passed = true;
    console.log(JSON.stringify({ checkpoint: reader.proof.checkpoint, verifiedNfts: rows.length, dispatches: 0 }));
  } catch (error) {
    evidence.error = error instanceof Error ? { name: error.name, message: error.message } : { name: 'unknown' };
    throw error;
  } finally {
    session.close(); globalThis.fetch = original;
    writeFileSync(output, JSON.stringify(evidence, null, 2) + '\n', { flag: 'wx' });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });

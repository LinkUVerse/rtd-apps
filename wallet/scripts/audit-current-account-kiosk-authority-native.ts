// Fresh checkpoint ordering plus canonical source objects for independent SQL authority facts.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, join } from 'node:path';
import { homedir } from 'node:os';
import { RtdGrpcClient, GrpcTypes } from 'rtd-typescript/grpc';
import { bcs } from 'rtd-typescript/bcs';
import { toBase58, toBase64, normalizeStructTag } from 'rtd-typescript/utils';
import { blake2b } from '@noble/hashes/blake2.js';
import { decodeFreshObject } from '../src/shared/rpc/fresh-object';
import { KIOSK_CAP_BCS, PERSONAL_CAP_BCS, exactBcs } from '../src/shared/rpc/kiosk-reader';
import { ORIGINBYTE_OWNER_TOKEN_BCS } from '../src/shared/rpc/originbyte-kiosk';
import { validateNetworkProfile } from '../src/shared/rpc/profile';

async function main() {
  const [output] = process.argv.slice(2); assert(output && !existsSync(output));
  const wallet = resolve(__dirname, '..'), logs = join(wallet, 'migrationToGRpcOrGraphQLDoc/workLog');
  const rt = join(homedir(), '.local/state/rtd-wallet-migration/dev-20261006-03');
  const rawDir = join(rt, 'account-kiosk-authority-native-20261007-01'); assert(!existsSync(rawDir)); mkdirSync(rawDir, { mode: 0o700 });
  const read = (f: string) => JSON.parse(readFileSync(f, 'utf8'));
  const sha = (f: string) => createHash('sha256').update(readFileSync(f)).digest('hex');
  const sqlFile = join(logs, '20261007-account-kiosk-authority-sql-audit-01.json');
  const nativeFile = join(logs, '20261007-C40-account-native-independent-audit-02.json');
  const profileFile = join(rt, 'certified-positive-transport-release-20261006-01/profile.json');
  const sql = read(sqlFile), prior = read(nativeFile), profile = validateNetworkProfile(read(profileFile));
  assert(sql.passed && prior.passed);
  for (const p of [sql, prior]) for (const [f, h] of Object.entries(p.inputsSha256)) assert.equal(sha(f), h);
  const calls: any[] = [], checkpoints: any[] = [], authorityObjects: any[] = [];
  const fetch: typeof globalThis.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    assert.equal(url.origin, new URL(profile.endpoints.fullnodeGrpcWeb).origin);
    assert(['/GetCheckpoint', '/GetServiceInfo'].some(n => url.pathname.endsWith(n)));
    const response = await globalThis.fetch(input, init), body = Buffer.from(await response.clone().arrayBuffer());
    const file = join(rawDir, `native-${calls.length}.bin`); writeFileSync(file, body, { flag: 'wx', mode: 0o600 });
    calls.push({ url: url.href, status: response.status, file, sha256: sha(file) }); assert.equal(response.status, 200); return response;
  };
  const client = new RtdGrpcClient({ network: profile.sdkNetwork, baseUrl: profile.endpoints.fullnodeGrpcWeb, format: 'binary', fetch, mvr: { url: '' } });
  const before = (await client.ledgerService.getServiceInfo({})).response; assert.equal(before.chainId, profile.expectedGenesisDigest);
  const digest = bcs.byteVector().transform({ input: (s: string) => { throw Error('Read-only codec'); }, output: (v: number[]) => { assert.equal(v.length, 32); return toBase58(Uint8Array.from(v)); } });
  // Rust messages_checkpoint.rs CheckpointContents and crypto.rs Signable prefix.
  const pair = bcs.struct('ExecutionDigests', { transaction: digest, effects: digest });
  const sig = bcs.byteVector();
  const contents = bcs.enum('CheckpointContents', {
    V1: bcs.struct('CheckpointContentsV1', { transactions: bcs.vector(pair), user_signatures: bcs.vector(bcs.vector(sig)) }),
    V2: bcs.struct('CheckpointContentsV2', { transactions: bcs.vector(bcs.struct('CheckpointTransactionContents', { digest: pair, user_signatures: bcs.vector(bcs.tuple([sig, bcs.option(bcs.u64())])) })) }),
  });
  const typedHash = (name: string, bytes: Uint8Array) => toBase58(blake2b(Buffer.concat([Buffer.from(name+'::'), Buffer.from(bytes)]), { dkLen: 32 }));
  const points = new Map<number, any>();
  const point = async (height: number) => {
    if (points.has(height)) return points.get(height);
    const cp = (await client.ledgerService.getCheckpoint({ checkpointId: { oneofKind: 'sequenceNumber', sequenceNumber: BigInt(height) }, readMask: { paths: ['sequence_number', 'digest', 'summary', 'contents'] } })).response.checkpoint;
    assert(cp?.contents?.bcs?.value && cp.summary?.bcs?.value); assert.equal(Number(cp.sequenceNumber), height);
    assert.equal(typedHash('CheckpointSummary', cp.summary.bcs.value), cp.digest);
    assert.equal(typedHash('CheckpointContents', cp.contents.bcs.value), cp.contents.digest);
    assert.equal(cp.summary.contentDigest, cp.contents.digest);
    const parsed = contents.parse(cp.contents.bcs.value);
    const ordered = parsed.$kind === 'V1' ? parsed.V1.transactions : parsed.V2.transactions.map(t => t.digest);
    assert.deepEqual(ordered, cp.contents.transactions.map(t => ({ transaction: t.transaction, effects: t.effects })));
    assert.equal(new Set(ordered.map(t => t.transaction)).size, ordered.length);
    points.set(height, { cp, ordered }); checkpoints.push({ height, digest: cp.digest, contentsDigest: cp.contents.digest, transactionCount: ordered.length, canonicalContentsAgree: true });
    return points.get(height);
  };
  const native = new Map<string, any>();
  for (const r of prior.rawFiles) {
    assert.equal(sha(r.file), r.sha256);
    if (r.url.endsWith('/GetTransaction')) {
      const raw = readFileSync(r.file), t = GrpcTypes.GetTransactionResponse.fromBinary(raw.subarray(5, 5+raw.readUInt32BE(1))).transaction;
      assert(t?.digest); native.set(t.digest, t);
    }
  }
  const seen = new Set<string>();
  for (const row of sql.rows) {
    const p = row.proof, cp = await point(p.checkpoint), prev = await point(p.checkpoint - 1);
    assert.equal(cp.cp.digest, p.checkpointDigest);
    assert.equal(cp.ordered[p.transactionOrdinal]?.transaction, p.digest);
    assert.equal(cp.cp.summary.totalNetworkTransactions - prev.cp.summary.totalNetworkTransactions, BigInt(cp.ordered.length));
    for (const [kind, facts] of [['token', row.tokenFacts], ['capability', row.capabilityFacts]] as const) for (const record of facts) {
      const f = record.facts, id = f.ownerTokenId ?? f.capabilityId, key = id+':'+f.objectVersion;
      if (seen.has(key)) continue; seen.add(key);
      const source = native.get(f.transactionDigest); assert(source, 'Authority source transaction must have fresh canonical native proof');
      assert.equal(Number(source.checkpoint), record.checkpoint);
      const sourceCp = await point(record.checkpoint); assert.equal(sourceCp.ordered[record.ordinal]?.transaction, f.transactionDigest);
      assert.equal(record.ordinal, f.transactionOrdinal);
      const fx = bcs.TransactionEffects.parse(source.effects.bcs.value).V2; assert(fx);
      const change = fx.changedObjects.find(([objectId]) => objectId === id)?.[1]; assert(change?.outputState.ObjectWrite);
      const object = source.objects.objects.find((o: any) => o.objectId === id && Number(o.version) === f.objectVersion); assert(object);
      const decoded = decodeFreshObject(object, id); assert.equal(decoded.digest, f.objectDigest);
      assert.equal(String(fx.lamportVersion), String(f.objectVersion)); assert.equal(change.outputState.ObjectWrite[0], decoded.digest);
      assert.deepEqual(decoded.owner, change.outputState.ObjectWrite[1]); assert.equal(decoded.owner.$kind, 'AddressOwner');
      if (kind === 'token') {
        assert.equal(decoded.type, normalizeStructTag(profile.packages.originByte!.discoveryPackage+'::ob_kiosk::OwnerToken'));
        const value = exactBcs(ORIGINBYTE_OWNER_TOKEN_BCS, decoded.content);
        assert.equal(value.id, id); assert.equal(value.kiosk, f.kioskId); assert.equal(value.owner, f.owner); assert.equal(decoded.owner.AddressOwner, f.owner);
      } else {
        assert.equal(decoded.type, normalizeStructTag(f.capabilityType)); assert.equal(decoded.owner.AddressOwner, f.nativeOwner.AddressOwner);
        assert.equal(toBase64(decoded.content), f.contentsBcs);
        const cap = f.capabilityKind === 'personal' ? exactBcs(PERSONAL_CAP_BCS, decoded.content) : { id, cap: exactBcs(KIOSK_CAP_BCS, decoded.content) };
        assert.equal(cap.id, id); assert(cap.cap); assert.equal(cap.cap.for, f.kioskId); assert.equal(cap.cap.id, f.embeddedCapId);
      }
      authorityObjects.push({ id, version: f.objectVersion, digest: decoded.digest, checkpoint: record.checkpoint, ordinal: record.ordinal, transaction: f.transactionDigest, kind, nativeCanonicalAndEffectsBound: true });
    }
  }
  const after = (await client.ledgerService.getServiceInfo({})).response; assert.equal(after.chainId, before.chainId); assert(after.checkpointHeight >= before.checkpointHeight);
  const result = { passed: true, observedAt: new Date().toISOString(), authorityBoundaries: sql.rows.length, checkpoints, authorityObjects, calls,
    originalTransactionRelativeAuthoritiesVerified: true, parentQA13Complete: false, simulations: 0, signatures: 0, executeRequests: 0,
    inputsSha256: Object.fromEntries([__filename, sqlFile, nativeFile, profileFile].map(f => [f, sha(f)])),
    scope: 'Fresh native checkpoint summary/contents typed hashes, canonical ordered contents vs native fields, network count and exact API/input/output/source-fact ordinals. All selected immutable SQL authority objects bound to prior fresh native canonical transaction/effects and full object BCS/type/version/digest/owner plus exact Token/standard/personal cap layouts; no Kiosk.owner shortcut, new transaction or flag inflation. Final full QA-A13 contract audit remains separate.' };
  writeFileSync(output, JSON.stringify(result, null, 2)+'\n', { flag: 'wx', mode: 0o600 }); console.log(JSON.stringify({ passed: true, authorityBoundaries: sql.rows.length, authorityObjects: authorityObjects.length, checkpoints: checkpoints.length }));
}
main().catch(e => { console.error(JSON.stringify({ passed: false, errorType: e.name, message: String(e.message).slice(0, 700) })); process.exitCode = 1; });

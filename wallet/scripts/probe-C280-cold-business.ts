// Actual current production reads before/after G4 cold recovery. No write methods.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { WalletReadSession } from '../src/shared/rpc/session';
import { validateNetworkProfile } from '../src/shared/rpc/profile';
import { WalletFullnodeReader } from '../src/shared/rpc/fullnode-reader';
import { WalletAssetReader } from '../src/shared/rpc/asset-reader';
import { WalletAccountHistoryReader } from '../src/shared/rpc/account-history-reader';
import { WalletLedgerReader } from '../src/shared/rpc/ledger-reader';
import { WalletNameReader } from '../src/shared/rpc/name-reader';
import { WalletStakingSnapshotReader } from '../src/shared/rpc/staking-snapshot-reader';
const owners = ['0x32707d815917729a49dc103a1b511f297de389b19600611fcc1a5cdb8b91dcb7', '0xbad0f77037d2352d281607a6237bf559180c85228baf91b7144a5fa021f20456'];
const digests = ['AQ2Jo739WgnovgmUHk2rPquJ8wJkBuk7aiNXXyzr1Rzu', 'GTED42FdBk9thXPBEdorhxNxUU5SG9L8Lt2HowonwxQh', 'BcNZtuXwwK4XBkpBtA1iri5ZLVbVCR2AjYmodcrWPjjE'];
const serialize = (v: any) => JSON.stringify(v, (_k, x) => typeof x === 'bigint' ? String(x) : x instanceof Uint8Array ? Buffer.from(x).toString('base64') : x, 2);
export const stableBusiness = (d: any) => JSON.parse(serialize({owners: Object.fromEntries(owners.map(owner => [owner, {
 balances: d.owners[owner].balances,
 objects: d.owners[owner].objects.value.map((o: any) => ({ objectId:o.objectId, version:o.version, digest:o.digest, type:o.type, owner:o.owner, content:o.content, display:o.display?.output })).sort((a: any,b: any)=>a.objectId.localeCompare(b.objectId)),
 kiosks: d.owners[owner].kiosks.value,
 transactions: d.owners[owner].history.transactions.map((t: any)=>({digest:t.digest,status:t.status,bcs:t.transaction?.bcs})).sort((a: any,b: any)=>a.digest.localeCompare(b.digest))
}])), positions: d.staking.value.positions, transactions: Object.fromEntries(digests.map(digest=>[digest,{bcs:d.transactions[digest].transaction.bcs,effects:d.transactions[digest].transaction.effects.bcs}])), name: {name:d.name.name,address:d.name.address,expirationTimestampMs:d.name.expirationTimestampMs,registry:d.name.registry}}));
async function main() {
 const [profileFile, output, beforeFile] = process.argv.slice(2); assert(!existsSync(output));
 const profile = validateNetworkProfile(JSON.parse(readFileSync(profileFile, 'utf8')));
 assert.equal(profile.expectedGenesisDigest, 'BTrU3deMDbnWcUWLJ2ruDj9vbCC4gaYnVj8qV3K2nFah');
 const session = new WalletReadSession(profile), original = globalThis.fetch, frames: any[] = [], data: any = { owners: {}, transactions: {} };
 const origins = new Set(Object.values(profile.endpoints).map(x => new URL(x!).origin));
 globalThis.fetch = async (input, init) => {
  const url = new URL(input instanceof Request ? input.url : String(input));
  assert.equal(url.hostname, '127.0.0.1'); assert(origins.has(url.origin)); assert(!/Execute|Simulate|VerifySignature/.test(url.pathname));
  const row: any = { url: url.href, at: new Date().toISOString(), requestBase64: Buffer.from(init?.body as any ?? '').toString('base64') }; frames.push(row);
  try { const res = await original(input, init); row.status = res.status; row.responseBase64 = Buffer.from(await res.clone().arrayBuffer()).toString('base64'); return res; }
  catch(e: any) { row.error = { name: e.name, message: e.message }; throw e; }
 };
 let result: any;
 try {
  for (const owner of owners) {
   const row: any = {}; data.owners[owner] = row;
   row.balances = await new WalletFullnodeReader(session).balances(owner);
   const reader = await WalletAssetReader.open(session);
   row.objects = await reader.ownedObjects(owner); row.kiosks = await reader.kiosks(owner);
   row.history = await new WalletAccountHistoryReader(session, { minimumCheckpoint: '4699' }).read(owner);
  }
  data.staking = await WalletStakingSnapshotReader.read(session, owners[0]);
  assert.deepEqual(data.staking.value.positions, []);
  data.name = await new WalletNameReader(session).resolve('wallet-renamed.rtd'); assert(data.name);
  for (const digest of digests) { const row = await new WalletLedgerReader(session).details(digest); assert(row?.transaction.status.success); data.transactions[digest] = row; }
  if (beforeFile) {
   const before = JSON.parse(readFileSync(beforeFile, 'utf8')); assert(before.passed);
   assert.deepEqual(stableBusiness(data), stableBusiness(before.data));
  }
  result = { passed:true, beforeAfterBusinessIdentical: !!beforeFile };
 } catch(e:any) { result = { passed:false, error:{name:e.name,message:e.message,reason:e.reason} }; }
 finally {session.close(); globalThis.fetch=original;}
 const inputs=[process.argv[1],profileFile,...(beforeFile?[beforeFile]:[])];
 writeFileSync(output,serialize({...result,observedAt:new Date().toISOString(),h0:profile.expectedGenesisDigest,data,frames,executions:0,simulations:0,signatures:0,scope:'Two current G4 accounts, complete admitted asset/Kiosk lists, supported account history windows, staking/name and three original confirmed transactions. All-account certification and browser UI are separate.',inputsSha256:Object.fromEntries(inputs.map(f=>[f,createHash('sha256').update(readFileSync(f)).digest('hex')]))})+'\n',{flag:'wx',mode:0o600});
 console.log(JSON.stringify({...result,requests:frames.length,owners:Object.keys(data.owners).length,originalTransactions:Object.keys(data.transactions).length})); if(!result.passed)process.exitCode=1;
}
if (require.main === module) main().catch(e=>{console.error(e);process.exitCode=1});

// Independent original transaction/native ownership audit; never signs or executes.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { GrpcTypes } from 'rtd-typescript/grpc';
import { Transaction } from 'rtd-typescript/transactions';
import { verifyTransactionSignature } from 'rtd-typescript/verify';
import { toBase64 } from 'rtd-typescript/utils';
import { validateNetworkProfile } from '../src/shared/rpc/profile';
import { WalletReadSession } from '../src/shared/rpc/session';
import { WalletExecutionReader } from '../src/shared/rpc/execution-reader';
import { WalletFullnodeReader } from '../src/shared/rpc/fullnode-reader';
import { exactBcs } from '../src/shared/rpc/kiosk-reader';
import { bcs } from 'rtd-typescript/bcs';
import { Ed25519Keypair } from 'rtd-typescript/keypairs/ed25519';
import { homedir } from 'node:os';

async function main() {
  const [profileFile, proofFile, output, retainedFixture] = process.argv.slice(2);
  assert(!existsSync(output));
  const read = (f: string) => JSON.parse(readFileSync(f, 'utf8'));
  const sha = (f: string) => createHash('sha256').update(readFileSync(f)).digest('hex');
  const p = read(proofFile);
  const fixture = p.fixture ?? retainedFixture;
  assert(typeof fixture === 'string' && fixture.includes('/dev-20261006-03/C39-direct-display-execution-chrome-'));
  const buildFile = 'migrationToGRpcOrGraphQLDoc/workLog/20261006-default-generation-positive-C39-build-01.json';
  const build = read(buildFile);
  assert(build.passed && p.executeRequests === 1 && p.originalExecuteResponseCaptured);
  assert.deepEqual(p.source ?? p.execution?.source ?? read(join(fixture, 'attempt.json')).source, build.sourceAfter);
  for (const [f, h] of Object.entries(p.inputsSha256 ?? {})) assert.equal(sha(f), h);
  assert.equal(p.workerSource.workerSha256, build.artifacts['background.js']);
  for (const row of p.uiSource.loadedBundles) assert.equal(row.loadedSha256, build.artifacts[row.file]);
  const attemptFile = join(fixture, 'attempt.json');
  const wireFile = join(fixture, 'execute-wire-1.json');
  const responseFile = join(fixture, 'execute-response.json');
  const attempt = read(attemptFile), wire = read(wireFile), response = read(responseFile);
  assert.equal(attempt.approvalClicks, 1);
  assert.equal(attempt.route, 'direct');
  assert.deepEqual(attempt.source, build.sourceAfter);
  function decode(value: string, T: any, trailers: boolean) {
    const raw = Buffer.from(value, 'base64');
    assert.equal(raw[0], 0);
    const n = raw.readUInt32BE(1);
    assert(raw.length >= 5 + n);
    assert.equal(raw.length > 5 + n, trailers);
    if (trailers) {
      const trailer = raw.subarray(5 + n);
      assert.equal(trailer[0], 128);
      assert.equal(trailer.length, 5 + trailer.readUInt32BE(1));
      assert.match(trailer.subarray(5).toString(), /(^|\r\n)grpc-status:[ \t]*0(\r\n|$)/);
    }
    return T.fromBinary(raw.subarray(5, 5 + n));
  }
  const request = decode(wire.requestBase64, GrpcTypes.ExecuteTransactionRequest, false);
  const result = decode(response.responseBase64, GrpcTypes.ExecuteTransactionResponse, true);
  assert.deepEqual(GrpcTypes.ExecuteTransactionRequest.toJson(request), wire.request);
  assert.deepEqual(GrpcTypes.ExecuteTransactionResponse.toJson(result), response.response);
  assert.equal(response.status, 200);
  assert.equal(result.transaction.digest, attempt.digest);
  assert.equal(toBase64(request.transaction.bcs.value), attempt.bytesBase64);
  assert.equal(request.signatures.length, 1);
  const profile = validateNetworkProfile(read(profileFile));
  assert.equal(profile.expectedGenesisDigest, 'BkuLHhdtnoK7yLxo2eQuvcjHtdyipE7MMyxgTJiyHGg4');
  const session = new WalletReadSession(profile);
  const execution = new WalletExecutionReader(session), fullnode = new WalletFullnodeReader(session);
  const original = globalThis.fetch, paths: string[] = [];
  globalThis.fetch = (input, init) => {
    const u = new URL(input instanceof Request ? input.url : String(input));
    assert.equal(u.origin, 'http://127.0.0.1:41750');
    assert(['/GetServiceInfo', '/GetTransaction', '/GetObject'].some(s => u.pathname.endsWith(s)));
    paths.push(u.href);
    return original(input, init);
  };
  try {
    const receipt = await execution.lookup(attempt.digest), details = await execution.details(attempt.digest);
    assert(receipt?.success && receipt.checkpoint !== null && details);
    assert.equal(receipt.effectsBase64, response.response.transaction.effects.bcs.value);
    assert.equal(toBase64(details.transaction.bcs), attempt.bytesBase64);
    assert.equal(await Transaction.from(details.transaction.bcs).getDigest(), attempt.digest);
    assert.equal(details.transaction.signatures.length, 1);
    assert.equal(toBase64(request.signatures[0].bcs.value), details.transaction.signatures[0]);
    assert.equal((await verifyTransactionSignature(details.transaction.bcs, details.transaction.signatures[0])).toRtdAddress(), attempt.accountAddress);
    const tx = Transaction.from(details.transaction.bcs).getData();
    assert.equal(tx.sender, attempt.accountAddress);
    assert.equal(tx.gasData.owner, attempt.accountAddress);
    assert.deepEqual(tx.commands.map(c=>c.$kind), ['TransferObjects']);
    const command=tx.commands[0].TransferObjects!;
    assert.equal(command.objects.length,1);
    const objectArg=command.objects[0], addressArg=command.address;
    assert(objectArg.$kind==='Input'&&addressArg.$kind==='Input');
    const originalObject=tx.inputs[objectArg.Input].Object!.ImmOrOwnedObject!;
    assert.equal(originalObject.objectId,attempt.nftId);
    const recipient=bcs.Address.parse(Buffer.from(tx.inputs[addressArg.Input].Pure!.bytes,'base64'));
    assert.equal(recipient,attempt.recipient);
    const controlled=read(join(homedir(),'.local/state/rtd-wallet-migration/dev-20261006-03/config/rtd.keystore')).map((v:string)=>{
      const key=Buffer.from(v,'base64');assert(key.length===33&&key[0]===0);return Ed25519Keypair.fromSecretKey(key.subarray(1)).toRtdAddress();
    });
    assert(controlled.includes(attempt.accountAddress)&&controlled.includes(recipient)&&recipient!==attempt.accountAddress);
    const oracleFile='migrationToGRpcOrGraphQLDoc/workLog/20261006-default-generation-display-bcs-01.json';
    const oracle=read(oracleFile),originalNft=oracle.nfts.find((n:any)=>n.id===attempt.nftId);
    assert(oracle.passed&&oracle.h0===profile.expectedGenesisDigest&&originalNft);
    assert(originalNft.owner.$kind==='AddressOwner'&&originalNft.owner.AddressOwner===attempt.accountAddress);
    assert.equal(String(originalObject.version),originalNft.version);assert.equal(originalObject.digest,originalNft.digest);
    const nft=await fullnode.object(attempt.nftId),template=await fullnode.object(oracle.display.id);assert(nft&&template);
    assert(nft.owner.$kind==='AddressOwner'&&nft.owner.AddressOwner===recipient);
    assert(nft.type.endsWith('::display_v2_nft::DisplayNFT'));
    const nftLayout=bcs.struct('DisplayNFT',{id:bcs.Address,name:bcs.string(),image_url:bcs.string(),serial:bcs.u64()});
    const nftValue=exactBcs(nftLayout,nft.content);assert.deepEqual(nftValue,originalNft.value);
    assert.equal(template.version,oracle.display.version);assert.equal(template.digest,oracle.display.digest);
    const templateLayout=bcs.struct('Display',{id:bcs.Address,fields:bcs.struct('VecMap',{contents:bcs.vector(bcs.struct('Entry',{key:bcs.string(),value:bcs.string()}))}),cap_id:bcs.option(bcs.Address)});
    const displayValue=exactBcs(templateLayout,template.content);assert.deepEqual(displayValue,oracle.display.value);
    let matched=0;
    for(const sim of p.simulations){
      const req=decode(sim.requestBase64,GrpcTypes.SimulateTransactionRequest,false),res=decode(sim.responseBase64,GrpcTypes.SimulateTransactionResponse,true);
      assert.equal(sim.status,200);assert.equal(req.checks,GrpcTypes.SimulateTransactionRequest_TransactionChecks.ENABLED);
      if(toBase64(req.transaction.bcs.value)!==attempt.bytesBase64)continue;
      assert(res.transaction.effects.status.success);assert.equal(toBase64(res.transaction.transaction.bcs.value),attempt.bytesBase64);
      const effects=bcs.TransactionEffects.parse(res.transaction.effects.bcs.value);assert.equal((effects.$kind==='V2'?effects.V2:effects.V1).transactionDigest,attempt.digest);matched++;
    }
    assert(matched>0);
    const wholeBrowserPassed = p.passed === true;
    if (wholeBrowserPassed) {
      assert.equal(p.execution.approvalClicks, 1);
      const terminal = p.execution.terminal;
      assert.equal(terminal['journal-v2'].length, 1);
      assert.equal(terminal['journal-v2'][0].digest, attempt.digest);
      assert.equal(terminal['journal-v2'][0].state, 'confirmed-success');
      assert.equal(terminal['pending-scopes-v2'].length, 0);
      assert.equal(terminal['journal-v2'][0].receipt.effectsBase64, receipt.effectsBase64);
      assert.deepEqual(p.finalJournal, terminal);
    }
    const report = {
      passed: true, observedAt: new Date().toISOString(), source: build.sourceAfter,
      h0: profile.expectedGenesisDigest, generation: profile.generation,
      digest: attempt.digest, receipt, nftId: attempt.nftId,
      owner: attempt.accountAddress, recipient: attempt.recipient, currentNftOwner: nft.owner, nftValue, displayTemplateId: template.objectId, displayTemplateUnchanged: true, recipientControlledDevKeyVerified: true, matchedFormalSimulations: matched,
      originalApprovedBcsUnchanged: true, signatureVerified: true, nativeEffectsMatch: true,
      originalExecuteGrpcStatusVerified: true, wholeBrowserPassed,
      strictJournalVerified: wholeBrowserPassed, actualBrowserExecuteRequests: 1,
      auditExecuteRequests: 0, auditSignatures: 0, auditSimulations: 0, paths,
      inputsSha256: Object.fromEntries([profileFile, proofFile, buildFile, resolve(process.argv[1]), attemptFile, wireFile, responseFile, oracleFile].map(f => [resolve(f), sha(f)])),
      scope: 'Original current C39 direct Display NFT once approved and dispatched, exact TransferObjects signed BCS/effects and ENABLED simulation frames; unchanged canonical NFT content and Display template with current native controlled-recipient ownership. Browser whole-run status kept separately; no audit writes, index catchup or other route/full parent acceptance.'
    };
    writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ passed: true, digest: attempt.digest, checkpoint: receipt.checkpoint, wholeBrowserPassed }));
  } finally { session.close(); globalThis.fetch = original; }
}
main().catch(e => { console.error(String(e.message).slice(0, 500)); process.exitCode = 1; });

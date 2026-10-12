// Actual checks-enabled simulation only. Never import keys, sign or dispatch.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { Transaction } from 'rtd-typescript/transactions';
import { GrpcTypes } from 'rtd-typescript/grpc';
import { fromBase64, normalizeRtdAddress } from 'rtd-typescript/utils';
import { WalletReadSession } from '../src/shared/rpc/session';
import { validateNetworkProfile } from '../src/shared/rpc/profile';
import { WalletTransactionReader } from '../src/shared/rpc/transaction-reader';
import { WalletFullnodeReader } from '../src/shared/rpc/fullnode-reader';

async function main() {
  const [profileFile, output] = process.argv.slice(2);
  assert(profileFile && output && !existsSync(output));
  const profile = validateNetworkProfile(JSON.parse(readFileSync(profileFile, 'utf8')));
  assert.equal(profile.endpoints.fullnodeGrpcWeb, 'http://127.0.0.1:39400');
  assert(globalThis.navigator?.locks);
  const sender = normalizeRtdAddress('0xa0ccc8bcc83f6c628340134f8546a21e0618fd1aaa02432bba454c4a2c2233da');
  const recipient = normalizeRtdAddress('0x123');
  const session = new WalletReadSession(profile);
  const requests: any[] = [], cases: any[] = [];
  const original = globalThis.fetch;
  const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
  globalThis.fetch = async (input, init) => {
    const u = new URL(input instanceof Request ? input.url : String(input));
    assert.equal(u.origin, 'http://127.0.0.1:39400');
    assert(/\/(GetServiceInfo|GetObject|ListOwnedObjects|GetBalance|SimulateTransaction)$/.test(u.pathname), u.pathname);
    const body = init?.body as Uint8Array;
    let checks: number | undefined;
    if (u.pathname.endsWith('/SimulateTransaction')) {
      const request = GrpcTypes.SimulateTransactionRequest.fromBinary(body.subarray(5));
      checks = request.checks;
      assert.equal(checks, GrpcTypes.SimulateTransactionRequest_TransactionChecks.ENABLED);
    }
    const response = await original(input, init);
    const wire = new Uint8Array(await response.clone().arrayBuffer());
    requests.push({path:u.pathname, status:response.status, checks, requestSha256:sha(body), responseSha256:sha(wire), responseBytes:wire.length, wireBase64:Buffer.from(wire).toString('base64')});
    return response;
  };
  try {
    const reader = new WalletTransactionReader(session), fullnode = new WalletFullnodeReader(session);
    const transfer = (amount: bigint) => { const tx=new Transaction();const coin=tx.splitCoins(tx.gas,[amount]);tx.transferObjects([coin],recipient);return tx; };
    const prepared = await reader.prepare(transfer(1n),sender);
    const repeated = await reader.simulate(prepared.bytesBase64,sender);
    assert.equal(repeated.$kind,'Transaction');assert.equal(repeated.Transaction?.digest,prepared.digest);
    cases.push({name:'one-atomic-success-and-exact-revalidation',passed:true,digest:prepared.digest,gasBudget:prepared.gasBudget,gasOwner:prepared.gasOwner,bytesSha256:sha(fromBase64(prepared.bytesBase64))});
    const reject = async (name:string, operation:()=>Promise<unknown>, local=false) => {
      const before=requests.length;let error: any;
      try {await operation();} catch(e){error=e;}
      assert(error, name+' unexpectedly accepted');
      if(local)assert.equal(requests.length,before,name+' issued I/O');
      cases.push({name,passed:true,requestCount:requests.length-before,errorType:error.name,message:String(error.message).slice(0,600)});
    };
    await reject('invalid-address-before-network',()=>reader.prepare(transfer(1n),'invalid-address'),true);
    await reject('approved-sender-mismatch-before-network',()=>reader.simulate(prepared.bytesBase64,recipient),true);
    await reject('insufficient-transfer-u64-max',()=>reader.prepare(transfer((1n<<64n)-1n),sender));
    await reject('insufficient-gas-budget',()=>{const tx=transfer(1n);tx.setGasBudget(1n);return reader.prepare(tx,sender);});
    await reject('unknown-move-function',()=>{const tx=new Transaction();tx.moveCall({target:'0x2::rtd::wallet_migration_missing_command'});return reader.prepare(tx,sender);});
    const coins=await fullnode.coins(sender,'0x2::rtd::RTD');
    assert(coins.length>0,'Actual owned Coin required for version rejection');
    const coin=coins[0];
    await reject('incorrect-owned-object-version',()=>{const tx=new Transaction();tx.transferObjects([tx.objectRef({objectId:coin.objectId,version:'0',digest:coin.digest})],recipient);return reader.prepare(tx,sender);});
    const originalData=Transaction.from(prepared.bytesBase64).getData();
    assert(originalData.gasData.budget);
    const changed=Transaction.from(prepared.bytesBase64);changed.setGasBudget(BigInt(originalData.gasData.budget)+1n);
    const bytes=await changed.build();assert.notEqual(sha(bytes),sha(fromBase64(prepared.bytesBase64)));
    const {TransactionDataBuilder}=await import('rtd-typescript/transactions');
    assert.notEqual(TransactionDataBuilder.getDigestFromBytes(bytes),prepared.digest);
    cases.push({name:'gas-change-is-new-authorization-content',passed:true,originalDigest:prepared.digest,changedDigest:TransactionDataBuilder.getDigestFromBytes(bytes),originalBudget:originalData.gasData.budget,changedBudget:changed.getData().gasData.budget,scope:'Exact native BCS/digest inequality only; actual UI reauthorization remains separate.'});
    const buildFile='migrationToGRpcOrGraphQLDoc/workLog/20261006-personal-production-build-04.json';
    const build=JSON.parse(readFileSync(buildFile,'utf8'));assert(build.passed);
    const report={passed:true,observedAt:new Date().toISOString(),source:build.sourceAfter,h0:profile.expectedGenesisDigest,sender,profileRevision:profile.revision,cases,requests,signatures:0,executeRequests:0,simulations:requests.filter(r=>r.path.endsWith('/SimulateTransaction')).length,inputsSha256:{[profileFile]:sha(readFileSync(profileFile)),[process.argv[1]]:sha(readFileSync(process.argv[1]))},scope:'Current production WalletTransactionReader actual latest-debug-chain finite success and negative checks-enabled simulation. No keys/signatures/Execute, no current Chrome/UI gas reauthorization, no complete QA08 parent acceptance.'};
    writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
    console.log(JSON.stringify({passed:true,cases:cases.length,requests:requests.length,simulations:report.simulations,signatures:0,executeRequests:0}));
  } finally {session.close();globalThis.fetch=original;}
}
main().catch(e=>{console.error(JSON.stringify({passed:false,errorType:e.name,message:String(e.message).slice(0,600)}));process.exitCode=1;});

// Actual wallet snapshot/asset path against explicitly configured isolated services.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { validateNetworkProfile } from '../src/shared/rpc/profile';
import { WalletReadSession } from '../src/shared/rpc/session';
import { WalletFullnodeReader } from '../src/shared/rpc/fullnode-reader';
import { WalletTransactionReader } from '../src/shared/rpc/transaction-reader';
import { prepareStaking, revalidateStaking } from '../src/shared/rpc/staking-preparation';
import type { WalletRpc } from 'rtd-apps-core/src/rpc/WalletRpcContext';
import { WalletAssetReader } from '../src/shared/rpc/asset-reader';
async function main() {
 const [rpc,graphql,h0,pkg,owner,output,transactionOutput,withdrawObject]=process.argv.slice(2);
 for(const endpoint of [rpc,graphql])assert.equal(new URL(endpoint).hostname,'127.0.0.1');
 const session=new WalletReadSession(validateNetworkProfile({schemaVersion:2,id:'isolated-wallet-dev',displayName:'独立钱包开发链',sdkNetwork:'localnet',walletStandardChain:'rtd:localnet',generation:'dev-20261003-01',revision:1,expectedGenesisDigest:h0,endpoints:{fullnodeGrpcWeb:rpc,graphqlUrl:graphql},packages:{kiosk:'0x2',originByte:{discoveryPackage:pkg,executionPackage:pkg}}}));
 try {
  const reader=await WalletAssetReader.open(session,{timeoutMs:30000});
  const staking=await reader.staking(owner);
  assert(staking.value.validators.length>0);
  const fullnode=new WalletFullnodeReader(session), transactions=new WalletTransactionReader(session);
  const adapter={bindingKey:session.bindingKey,readSessionKey:session.cacheKey,
   readFreshBalance:fullnode.balance.bind(fullnode),readFreshObject:fullnode.object.bind(fullnode),prepareTransaction:transactions.prepare.bind(transactions),simulateTransaction:transactions.simulate.bind(transactions)} as WalletRpc;
  const prepared=await prepareStaking(adapter,withdrawObject ? {kind:'withdraw',sender:owner,objectId:withdrawObject} : {kind:'stake',sender:owner,amount:'1000000000',validator:staking.value.validators[0].address});
  assert.equal(prepared.simulation.$kind,'Transaction');
  await revalidateStaking(adapter,prepared,owner);
  if(transactionOutput)writeFileSync(transactionOutput,prepared.bytesBase64+'\n',{flag:'wx',mode:0o600});
  const evidence={verifiedAt:new Date().toISOString(),proof:reader.proof,owner,staking:staking.value,preparation:{digest:prepared.digest,gasBudget:prepared.gasBudget,amount:prepared.input.kind==='stake'?prepared.input.amount:null,sameBytesRevalidation:true,input:prepared.input,withdrawal:prepared.withdrawal},scope:'Actual wallet GraphQL system BCS, validators, rate histories and stake positions at one admitted snapshot; no signing, dispatch or extension acceptance.'};
  writeFileSync(output,JSON.stringify(evidence,(_,v)=>typeof v==='bigint'?v.toString():v,2)+'\n');
  console.log(JSON.stringify({validators:staking.value.validators.length,positions:staking.value.positions.length,epoch:staking.value.epoch,checkpoint:reader.proof.checkpoint}));
 } finally {session.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});

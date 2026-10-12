// Actual wallet snapshot/asset path against explicitly configured isolated services.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { validateNetworkProfile } from '../src/shared/rpc/profile';
import { WalletReadSession } from '../src/shared/rpc/session';
import { WalletAssetReader } from '../src/shared/rpc/asset-reader';
async function main() {
 const [rpc,graphql,h0,pkg,owner,output]=process.argv.slice(2);
 for(const endpoint of [rpc,graphql])assert.equal(new URL(endpoint).hostname,'127.0.0.1');
 const session=new WalletReadSession(validateNetworkProfile({schemaVersion:2,id:'isolated-wallet-dev',displayName:'独立钱包开发链',sdkNetwork:'localnet',walletStandardChain:'rtd:localnet',generation:'dev-20261003-01',revision:1,expectedGenesisDigest:h0,endpoints:{fullnodeGrpcWeb:rpc,graphqlUrl:graphql},packages:{kiosk:'0x2',originByte:{discoveryPackage:pkg,executionPackage:pkg}}}));
 try {
  const reader=await WalletAssetReader.open(session,{timeoutMs:30000});
  const owned=await reader.ownedObjects(owner);
  const balances=await reader.balances(owner);
  const kiosks=await reader.kiosks(owner);
  assert(kiosks.value.some(k=>k.kind==='originbyte'));
  const evidence={verifiedAt:new Date().toISOString(),proof:reader.proof,owner,ownedCount:owned.value.length,balances:balances.value,kiosks:kiosks.value,scope:'Actual GraphQL snapshot admission, owned objects, balances and OriginByte contents. No extension approval or dispatch acceptance.'};
  writeFileSync(output,JSON.stringify(evidence,(_,v)=>typeof v==='bigint'?v.toString():v,2)+'\n');
  console.log(JSON.stringify({owned:owned.value.length,kiosks:kiosks.value.length,checkpoint:reader.proof.checkpoint}));
 } finally {session.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});

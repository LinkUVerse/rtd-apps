import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {WalletIndexedLists} from '../src/shared/rpc/indexed-lists';
import {WalletReadSession} from '../src/shared/rpc/session';
import {validateNetworkProfile} from '../src/shared/rpc/profile';
async function main(){
  const [profileFile,sender,output]=process.argv.slice(2);
  const profile=validateNetworkProfile(JSON.parse(readFileSync(profileFile,'utf8')));
  assert.equal(new URL(profile.endpoints.graphqlUrl!).hostname,'127.0.0.1');
  const session=new WalletReadSession(profile),paths:string[]=[];
  const reader=new WalletIndexedLists(session,(input,init)=>{
    const url=new URL(input instanceof Request?input.url:String(input));
    assert.equal(url.href,profile.endpoints.graphqlUrl);paths.push(url.pathname);
    return fetch(input,init);
  });
  try{
    const window={lower:0,upper:2000,order:'ascending' as const};
    const ascending=await reader.sentTransactions(sender,window);
    const descending=await reader.sentTransactions(sender,{...window,order:'descending'});
    assert(ascending.value.length>0);
    assert.deepEqual(descending.value.map(tx=>tx.digest),ascending.value.map(tx=>tx.digest).reverse());
    const events=await reader.events({module:'0x3'},window);
    writeFileSync(output,JSON.stringify({observedAt:new Date().toISOString(),h0:profile.expectedGenesisDigest,
      transactions:ascending,reverseDigests:descending.value.map(tx=>tx.digest),events,requests:paths.length,
      dispatches:0,scope:'Actual bounded GraphQL lists; index references only, no account-wide completeness or execution proof.'},null,2)+'\n',{flag:'wx'});
    console.log(JSON.stringify({transactions:ascending.value.length,events:events.value.length,dispatches:0}));
  }finally{session.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});

// Test-only browser entry over exact current production readonly modules; no mock responses.
import {validateNetworkProfile} from '../src/shared/rpc/profile';
import {WalletReadSession} from '../src/shared/rpc/session';
import {probeNetworkCapabilities} from '../src/shared/rpc/network-capabilities';
import {probeGraphQLSchemaCapabilities} from '../src/shared/rpc/graphql-schema-capabilities';
import {probeNetworkIdentity} from '../src/shared/rpc/identity';
import {probeDeploymentCapabilities} from '../src/shared/rpc/deployment-capabilities';
import {NATIVE_READ_PROBE_METHODS} from '../src/shared/rpc/native-service-capabilities';
import {projectReadCapabilities} from '../src/shared/rpc/read-capability-view';
const sha=async(b:BufferSource)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b))).map(b=>b.toString(16).padStart(2,'0')).join('');
(globalThis as any).__qa02Run=async(raw:any,declaration:{json:string;trustedSha256:string},mode:string)=>{
 const profile=validateNetworkProfile(raw,{requireComplete:true}),session=new WalletReadSession(profile),requests:any[]=[];
 const allowed=new Set([...NATIVE_READ_PROBE_METHODS.fullnode,'MovePackageService/GetPackage'].map(m=>profile.endpoints.fullnodeGrpcWeb+'/rtd.rpc.v2.'+m));
 for(const m of NATIVE_READ_PROBE_METHODS.archive)allowed.add(profile.endpoints.archiveGrpcWeb+'/rtd.rpc.v2.'+m);
 allowed.add(profile.endpoints.graphqlUrl!);allowed.add(profile.endpoints.accountHistoryUrl!);
 const native=globalThis.fetch.bind(globalThis),fetchImpl:typeof fetch=async(url,init)=>{
  if(!allowed.has(String(url))||init?.method!=='POST'||/\/(ExecuteTransaction|SimulateTransaction)$/.test(String(url)))throw new Error('Readonly audit rejects request');
  const data=typeof init.body==='string'?new TextEncoder().encode(init.body):init.body instanceof Uint8Array?init.body:undefined;if(!data)throw new Error('Readonly request bytes required');
  const row:any={url:String(url),requestSha256:await sha(data),bytes:data.byteLength};requests.push(row);const response=await native(url,init);row.status=response.status;row.contentType=response.headers.get('content-type');return response;
 };
 const start=performance.now();let result:any;
 try{
  if(mode==='capabilities'){
   const report=await probeNetworkCapabilities(session,{fetch:fetchImpl,declaration});
   const view=projectReadCapabilities(session,report);
   const schema=await probeGraphQLSchemaCapabilities(session,{fetch:fetchImpl});
   result={report,view,schema};
  }else if(mode==='wrong-h0')result=await probeNetworkIdentity(session,{fetch:fetchImpl});
  else if(['deployment-positive','wrong-pin','wrong-revision'].includes(mode))result=await probeDeploymentCapabilities(session,{fetch:fetchImpl,declaration});
  else throw new Error('Unknown audit mode');
  return JSON.parse(JSON.stringify({passed:true,mode,result,requests,elapsedMs:performance.now()-start},(_,v)=>typeof v==='bigint'?v.toString():v));
 }catch(error:any){return{passed:false,mode,errorType:error.name,reason:error.reason,role:error.role,requests,elapsedMs:performance.now()-start};}
 finally{session.close();}
};

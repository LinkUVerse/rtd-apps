// An owner-close cancellation is not an upstream response. Keep every raw observation;
// independently validate the zero-dispatch partition before applying the unchanged
// complete-entity contract to all requests that actually reached upstream.
const assert=require('./C158-bounded-strict-assert.cjs'),{parse}=require('graphql');
const {GrpcTypes}=require('rtd-typescript/grpc');
const bag=rows=>{const b={};for(const r of rows){const k=JSON.stringify([r.stage,r.url,r.method]);b[k]=(b[k]??0)+1;}return b;};
const popup=/^chrome-extension:\/\/allmppilngnjjikoeinlmjpfpdemkdal\/ui\.html#\/dapp\/approve\/([0-9a-f-]+)$/;
const queries=new Set(['WalletGenesisIdentity','WalletSchemaCapabilities','WalletSnapshotAdmission','WalletHistoryCoverage','WalletSnapshotPin','WalletSnapshotRevalidate','WalletSnapshotRead','WalletAccountHistory']);
function early(row,events,network,p){
 assert(row.cancelledBeforeUpstreamDispatch===true);
 assert(row.requestHeaderLookupStarted&&row.requestHeaderLookupFailed&&!row.requestHeaderLookupCompleted);
 assert.equal(row.requestHeadersArray,null);assert.equal(row.errorClass,'TargetClosedError');
 assert.equal(row.sourceOwner.kind,'page');assert(row.ownerClosedAtHeaderFailure);
 const match=row.sourceOwner.url.match(popup);assert(match);
 const completed=[...p.cases,...p.denials].filter(c=>Object.values(c.observed.transactions).some(t=>t.id===match[1]));
 assert.equal(completed.length,1);const c=completed[0];assert(c.normalPopupClosed||c.normalReject);
 assert.equal(c.popupUrl,row.sourceOwner.url);assert(Number.isFinite(Date.parse(c.normalPopupClosedAt)));
 assert.equal(row.upstreamFetchAttempted,false);assert.equal(row.upstreamDispatchCalls,0);
 for(const k of ['upstreamBodyComplete','browserDeliveryAttempted','browserDeliveryCompleted','routeFulfillResolved','responseDisposed','passed','encodedWireBytesCaptured','originalRequestOverrides'])assert.equal(row[k],false);
 for(const k of ['bodyRepresentation','responseBase64','responseSha256','responseBytes'])assert.equal(row[k],null);
 for(const k of ['status','headers','headersArray'])assert.equal(row[k],undefined);
 assert(row.deliveryObservationRequired);assert(row.browserRequestOutcome.observed);assert.equal(row.browserRequestOutcome.status,'failed');
 assert.equal(row.fetchOptions.maxRedirects,0);assert.equal(row.fetchOptions.maxRetries,0);assert(row.fetchOptions.timeout>0&&row.fetchOptions.timeout<=25000);
 const u=new URL(row.url);assert.equal(row.method,'POST');assert(!u.username&&!u.password&&!u.hash&&!u.search);
 assert(['grpc-readonly','graphql-readonly'].includes(row.kind));
 const body=Buffer.from(row.requestBase64,'base64');assert.equal(body.toString('base64'),row.requestBase64);
 if(row.kind==='grpc-readonly'){
  assert(['http://127.0.0.1:41750','http://127.0.0.1:42012'].includes(u.origin));
  const prefix=u.origin.endsWith(':42012')?'/archive':'';
  const m=u.pathname.slice(prefix.length).match(/^\/rtd\.rpc\.v2\.(LedgerService|StateService|MovePackageService)\/(GetServiceInfo|GetCheckpoint|GetObject|GetCoinInfo|GetBalance|ListOwnedObjects|GetDatatype|GetFunction|GetPackage)$/);assert(m&&u.pathname.startsWith(prefix));
  const allowed={LedgerService:['GetServiceInfo','GetCheckpoint','GetObject'],StateService:['GetCoinInfo','GetBalance','ListOwnedObjects'],MovePackageService:['GetDatatype','GetFunction','GetPackage']};assert(allowed[m[1]].includes(m[2]));
  assert(body.length>=5&&body[0]===0&&body.readUInt32BE(1)+5===body.length);GrpcTypes[m[2]+'Request'].fromBinary(body.subarray(5));
 }else{
  assert((u.origin==='http://127.0.0.1:42011'&&u.pathname==='/graphql')||(u.origin==='http://127.0.0.1:42013'&&u.pathname==='/account/graphql'));
  const q=JSON.parse(body),definitions=parse(q.query).definitions,operations=definitions.filter(d=>d.kind==='OperationDefinition');assert.equal(operations.length,1);const op=operations[0];assert.equal(op.operation,'query');assert(queries.has(op.name?.value));assert(definitions.every(d=>['OperationDefinition','FragmentDefinition'].includes(d.kind)));if(q.operationName!==undefined)assert.equal(q.operationName,op.name.value);if(op.name.value==='WalletAccountHistory')assert.equal(u.pathname,'/account/graphql');
 }
 const saved=events.filter(e=>e.row.id===row.id);assert.equal(saved.length,2);assert.deepEqual(saved.at(-1).row,row);
 assert.deepEqual(row.events.map(e=>e.event),['request or upstream capture failed','capture settled']);
 for(const[i,e]of saved.entries()){assert.equal(e.event,row.events[i].event);assert.deepEqual(e.row.events,row.events.slice(0,i+1));for(const k of ['id','stage','url','method','requestBase64','sourceOwner','requestHeadersArray','requestHeaderLookupFailed','upstreamDispatchCalls','cancelledBeforeUpstreamDispatch'])assert.deepEqual(e.row[k],row[k]);}
 assert(row.events[1].monotonic>=row.events[0].monotonic);
 const bindings=network.routeBindings.filter(b=>b.captureId===row.id);assert.equal(bindings.length,1);const b=bindings[0],requests=network.requests.filter(r=>r.id===b.requestId);assert.equal(requests.length,1);const r=requests[0];
 for(const k of ['url','method','requestBase64'])assert.equal(r[k],row[k]);assert.equal(r.terminal,'failed');assert.equal(r.failure,row.browserRequestOutcome.errorText);assert.equal(network.responses.filter(r=>r.requestId===b.requestId).length,0);
 return b.requestId;
}
function capture(p,events,network){
 assert.deepEqual(network,{requests:p.browserRequests,responses:p.browserResponses,routeBindings:p.routeBindings});
 const zero=p.cancelledBeforeAdmissionRecords;assert(Array.isArray(zero));const all=[...p.completeCaptureRecords,...zero];
 assert.equal(new Set(all.map(r=>r.id)).size,all.length);assert.deepEqual(bag(p.traffic),bag(all));
 assert.equal(network.routeBindings.length,all.length);assert.equal(new Set(network.routeBindings.map(b=>b.captureId)).size,all.length);assert.equal(new Set(network.routeBindings.map(b=>b.requestId)).size,all.length);
 assert.equal(new Set(events.map(e=>e.row.id)).size,all.length);
 const cancelledIds=new Set(zero.map(r=>early(r,events,network,p))),captureIds=new Set(zero.map(r=>r.id));
 const requests=network.requests.filter(r=>!cancelledIds.has(r.id)),routeBindings=network.routeBindings.filter(b=>!captureIds.has(b.captureId));
 const view={...p,browserRequests:requests,routeBindings,traffic:p.completeCaptureRecords.map(r=>({stage:r.stage,url:r.url,method:r.method}))};
 // This view is derived only after exact raw multiset, ownership, bindings, failed
 // terminal and absence of any HTTP dispatch/response have independently passed.
 require('./C173-original-entity-and-browser-copy-correlation.cjs').capture(view,events.filter(e=>!captureIds.has(e.row.id)),{requests,responses:network.responses,routeBindings});
 return{allPreAdmissionCancellationsIndependentlyObserved:true,cancelledBeforeNativeDispatch:zero.length,cancelledRequestsCountedAsHttpEntities:0,allActuallyDispatchedOriginalEntitiesAccepted:true};
}
module.exports={capture,early};

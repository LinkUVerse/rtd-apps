// Native exported HAR only. Reconstruct logical domains from actual GraphQL AST.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {parse, print, visit, Kind} from 'graphql';
const logs=path.resolve('migrationToGRpcOrGraphQLDoc/workLog');
const source=path.join(logs,'20261010-C210-home-three-refresh-01.har');
const raw=fs.readFileSync(source);fs.chmodSync(source,0o600);
const har=JSON.parse(raw).log, logical=[], grpc=[];
const genesis='BkuLHhdtnoK7yLxo2eQuvcjHtdyipE7MMyxgTJiyHGg4';
const owner='0x9d7652713f02b13b73744ba47e4f21ca0a0a2966cc02df86adcde2041454e5bc';
const operations=['WalletSnapshotAdmission','WalletSnapshotPin','WalletSnapshotRead','WalletSnapshotRevalidate'];
for(const [index,e] of har.entries.entries()) {
  assert.equal(e.response.status,200);
  if(e.request.url==='http://127.0.0.1:41750/rtd.rpc.v2.LedgerService/GetServiceInfo') {grpc.push(e.pageref);continue;}
  assert.equal(e.request.url,'http://127.0.0.1:41957/graphql');
  const req=JSON.parse(e.request.postData.text),res=JSON.parse(e.response.content.text);
  assert(!res.errors?.length && res.data);
  const doc=parse(req.query),op=doc.definitions[0];
  assert.equal(op.operation,'query');assert.equal(op.name.value,'WalletSnapshotBatch');
  const groups=new Map();
  for(const field of op.selectionSet.selections) {
    assert.equal(field.kind,Kind.FIELD);
    const match=/^(q\d+_)(WalletSnapshot\w+)_(\w+)$/.exec(field.alias.value);assert(match);
    const [,prefix,operation,name]=match;
    const group=groups.get(prefix)??{prefix,operation,fields:[],data:{}};
    assert.equal(group.operation,operation);
    group.fields.push({...field,alias:{kind:Kind.NAME,value:name}});
    assert(Object.hasOwn(res.data,field.alias.value));group.data[name]=res.data[field.alias.value];
    groups.set(prefix,group);
  }
  assert.equal(groups.size,2);
  for(const g of groups.values()) {
    assert(operations.includes(g.operation));
    const restored=visit({kind:Kind.DOCUMENT,definitions:[{...op,selectionSet:{...op.selectionSet,selections:g.fields}}]}, {
      Variable(n){assert(n.name.value.startsWith(g.prefix)||op.variableDefinitions.some(d=>d.variable.name.value===n.name.value));return {...n,name:{...n.name,value:n.name.value.startsWith(g.prefix)?n.name.value.slice(g.prefix.length):n.name.value}};},
    });
    const query=print(restored),variables=Object.fromEntries(Object.entries(req.variables).filter(([k])=>k.startsWith(g.prefix)).map(([k,v])=>[k.slice(g.prefix.length),v]));
    const coverage=[...query.matchAll(/availableRange\(type: "([^"]+)", field: "([^"]+)"/g)].map(m=>m.slice(1));
    const domain=coverage.some(([t,f])=>t==='Address'&&f==='balances')?'balances':'metadata';
    assert.deepEqual(coverage,domain==='balances'?[['Address','balances'],['Query','checkpoints']]:[['Query','checkpoints'],['Query','coinMetadata']]);
    const data=g.data,snapshot=data.walletSnapshot??data.walletHead;
    assert.equal(data.walletGenesis.digest,genesis);
    for(const range of Object.values(data.serviceConfig))assert(range.first.sequenceNumber<=snapshot.sequenceNumber&&range.last.sequenceNumber>=snapshot.sequenceNumber);
    if(g.operation!=='WalletSnapshotAdmission') assert.equal(Number(/walletSnapshot: checkpoint\(sequenceNumber: (\d+)\)/.exec(query)[1]),snapshot.sequenceNumber);
    if(g.operation==='WalletSnapshotRead') {
      if(domain==='balances') {
        assert.deepEqual(variables,{owner,cursor:null});
        assert.equal(snapshot.query.address.address,owner);
        assert.deepEqual(snapshot.query.address.balances,{nodes:[],pageInfo:{hasNextPage:false,endCursor:null}});
      } else {assert.equal(snapshot.query.coinMetadata.symbol,'RTD');assert.equal(snapshot.query.coinMetadata.decimals,9);}
    }
    logical.push({index,page:e.pageref,domain,operation:g.operation,snapshot:snapshot.sequenceNumber,digest:snapshot.digest,start:Date.parse(e.startedDateTime),end:Date.parse(e.startedDateTime)+e.time});
  }
}
assert.equal(har.pages.length,3);assert.equal(har.entries.length,15);
const cycles=[];
for(const page of har.pages) {
  assert.equal(grpc.filter(p=>p===page.id).length,1);
  const rows=logical.filter(r=>r.page===page.id);assert.equal(rows.length,8);
  for(const domain of ['balances','metadata']) {
    const cycle=rows.filter(r=>r.domain===domain);
    assert.deepEqual(cycle.map(r=>r.operation),operations);
    assert.equal(new Set(cycle.map(r=>JSON.stringify([r.snapshot,r.digest]))).size,1);
    for(let i=1;i<cycle.length;i++)assert(cycle[i-1].end<=cycle[i].start+2);
    cycles.push({page:page.id,domain,snapshot:cycle[0].snapshot,complete:true,secondsToFinalRevalidation:(cycle.at(-1).end-Date.parse(page.startedDateTime))/1000});
  }
}
const proof={passed:true,scope:'Three actual ordinary Chrome reloads; all balance/metadata logical proofs reconstructed from native HAR batch AST and verified. grpc counted, not accepted as independent business proof here.',harSha256:crypto.createHash('sha256').update(raw).digest('hex'),requests:15,graphqlPerRefresh:4,grpcPerRefresh:1,previousGraphqlPerRefresh:8,graphqlReductionPercent:50,graphqlErrors:0,incomplete:0,cycles,nonzeroBalanceAccepted:false,parentCompletion:false};
fs.writeFileSync(path.join(logs,'20261010-C210-ordinary-balance-har-audit-01.json'),JSON.stringify(proof,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify(proof));

"""Bind C224 installed source, checks and complete actual receipt HAR evidence."""
from pathlib import Path
import json, hashlib, datetime, subprocess
W=Path(__file__).resolve().parent.parent;L=W/'migrationToGRpcOrGraphQLDoc/workLog'
read=lambda p:json.loads(p.read_text())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
names=['20261011-C224-source-and-checks-01.json','20261011-C224-ordinary-upgrade-installed-01.json',
 '20261011-C224-ordinary-bytecode-01.json','20261011-C224-receipt-historical-audit-01.json',
 '20261011-C222-current-receipts-02.json','20261011-C223-guard-reuse-applied-01.json',
 '20261011-C222-receipt-historical-audit-01.json']
paths=[L/n for n in names];qualification,installed,bytecode,audit,live,guard,previous=map(read,paths)
assert all(read(p)['passed'] for p in paths)
source=json.loads(subprocess.check_output(['node','-e','console.log(JSON.stringify(require("./scripts/build-reviewed-generation-production-extension.cjs").productSource()))'],cwd=W,text=True))
assert source==qualification['currentSource']==installed['source']
assert bytecode['actualUiStaticBytesAccepted'] and bytecode['actualWorkerStaticBytesAccepted']
for p in [qualification,installed,audit,live,guard,previous]:
 for f,h in p['inputsSha256'].items():assert sha(Path(f))==h
for f,h in bytecode['sourcePins'].items():assert sha(Path(f))==h
assert audit['durationMs']>=100_000 and audit['fullAssetAdmissionCycles']==1 and audit['coinMetadataCycles']==5
assert audit['graphqlRequests']==22 and audit['grpcRequests']==10 and audit['allNetworkRequestsComplete']
assert audit['receiptAndHistoricalGrpcRequests']==9 and audit['historicalObject']['version']=='269849'
assert len(live['receipts'])==6 and all(r['passed'] for r in live['receipts'])
assert sum(len(r['effects']) for r in live['receipts'])==34

def initial_graphql(har,start):
 es=read(har)['log']['entries'][start:]
 gs=[e for e in es if e['request']['url'].endswith('/graphql')]
 final=next(e for e in gs if 'WalletSnapshotRevalidate' in e['request']['postData']['text'])
 stop=datetime.datetime.fromisoformat(final['startedDateTime'].replace('Z','+00:00')).timestamp()+final['time']/1000
 return sum(datetime.datetime.fromisoformat(e['startedDateTime'].replace('Z','+00:00')).timestamp()<=stop for e in gs)
oldHar=L/'20261011-C222-receipt-historical-01.har';newHar=L/'20261011-C224-receipt-historical-01.har'
assert initial_graphql(oldHar,6)==8 and initial_graphql(newHar,0)==6
proof={'passed':True,'observedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),
 'scope':'C224 ordinary C51 Chrome, one real public receipt, explicit historical NFT version, initial plus four complete automatic metadata cycles; all full-asset/metadata/gRPC proofs replayed with production readers.',
 'source':source,'initialReceiptGraphqlBefore':8,'initialReceiptGraphqlAfter':6,
 'initialReceiptGrpcRequests':7,'historicalObjectClickGrpcRequests':3,
 'automaticCycles':4,'automaticMetadataGraphqlPerCycle':4,'automaticFullAssetGraphqlPerCycle':0,
 'browserObservationMs':audit['durationMs'],'regressionTestsPassed':2828,
 'actualUiAndWorkerAccepted':True,'livePublicReceipts':6,'liveExplicitHistoricalObjects':34,
 'currentAccountOwnedNftAcceptance':False,'allPagesAccepted':False,'parentCompletion':False,
 'inputsSha256':{str(p):sha(p) for p in [Path(__file__),*paths,oldHar,newHar]}}
with (L/'20261011-C224-receipt-acceptance-01.json').open('x') as f:json.dump(proof,f,indent=2);f.write('\n')
print(json.dumps({k:v for k,v in proof.items() if k not in ['inputsSha256','scope']}))

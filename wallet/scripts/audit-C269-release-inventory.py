#!/usr/bin/env python3
"""Current release source/evidence index, deliberately not full acceptance."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib,json,re,subprocess,sys

W=Path(__file__).resolve().parents[1];ROOT=W.parents[1]
D=W/'migrationToGRpcOrGraphQLDoc';L=D/'workLog'
files=[Path(__file__),W/'scripts/inventory-C269-routes.cjs']
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def read(p):files.append(p);return p.read_text()
def record(p):return json.loads(read(p))
def anchor(relative,token):
    p=ROOT/relative;s=read(p);assert token in s,(p,token)
    return dict(path=str(p),line=s[:s.index(token)].count('\n')+1,token=token,sha256=sha(p))
def rpc(file,token):return ('rtd-apps/wallet/src/shared/rpc/'+file+'.ts',token)

# Explicitly reviewed routes; presence/anchors support inspection, not semantic proof.
definitions=[
 ('GraphQL asset object / Fullnode current object / archive historical object',[rpc('asset-reader','async objects('),rpc('fullnode-reader','ledgerService.getObject'),rpc('archive-object-reader','async objects(')]),
 ('GraphQL multiGetObjects / archive explicit versions',[rpc('asset-reader','async objects('),rpc('archive-object-reader','async objects(')]),
 ('GraphQL owned-object complete pages',[rpc('asset-reader','async ownedObjects(')]),
 ('Fullnode ListOwnedObjects for spendable coins; GraphQL asset objects',[rpc('fullnode-reader','stateService.listOwnedObjects'),rpc('asset-reader','async ownedObjects(')]),
 ('Fullnode current ListBalances; independent GraphQL snapshot balances',[rpc('fullnode-reader','stateService.listBalances'),rpc('balance-reader','address(address: $owner) { address balances')]),
 ('Fullnode GetBalance for current funds',[rpc('fullnode-reader','stateService.getBalance')]),
 ('GraphQL coinMetadata',[rpc('coin-metadata-reader','coinMetadata(coinType: $type)')]),
 ('GraphQL address.dynamicFields',[rpc('asset-reader','async dynamicFields(')]),
 ('Fullnode then explicit archive transaction details',[rpc('ledger-reader','ledgerService.getTransaction')]),
 ('Fullnode ExecuteTransaction, durable coordinator/journal',[rpc('execution-reader','transactionExecutionService.executeTransaction'),rpc('execution-coordinator','export class'),rpc('execution-journal','export')]),
 ('Fullnode SimulateTransaction for resolution and final simulation',[rpc('transaction-reader','transactionExecutionService.simulateTransaction')]),
 ('Separate account-history service and typed indexed transactions',[rpc('account-history-reader','endpoints.accountHistoryUrl'),rpc('indexed-lists','"transactions"')]),
 ('Typed GraphQL indexed events',[rpc('indexed-lists','events(input:')]),
 ('Explicit same-chain registry forward lookup with freshness guard',[rpc('name-reader','async resolve('),rpc('name-reader','startHeight')]),
 ('Explicit registry default reverse name with forward consistency',[rpc('name-reader','async defaultName(')]),
 ('Fixed-S system wrapper and inner BCS; Fullnode fresh epoch',[rpc('staking-reader','const systemId = normalizeRtdAddress("0x5")'),rpc('fullnode-reader','async currentEpoch(')]),
 ('GraphQL staking objects, system and pool/rates composition',[rpc('staking-snapshot-reader','async ownedObjects('),rpc('staking-reader','async function readCompleteStaking(')]),
 ('Snapshot pools/rates plus locked local APY calculation',[rpc('staking-reader','const apy = estimateStakingApy(')]),
 ('Fullnode GetServiceInfo checkpoint / separate indexed snapshot head',[rpc('fullnode-reader','async checkpoint('),rpc('entry-access','getServiceInfo')]),
 ('Build resolution by Fullnode simulation; independent Core gas-price query',[rpc('transaction-reader','transactionExecutionService.simulateTransaction'),('rtd-ts-sdk/packages/typescript/src/grpc/core.ts','async getReferenceGasPrice(')]),
 ('Build resolution by Fullnode simulation; independent Core Move descriptor',[rpc('transaction-reader','transactionExecutionService.simulateTransaction'),('rtd-ts-sdk/packages/typescript/src/grpc/core.ts','movePackageService.getFunction')]),
]
matrix=read(D/'08-JSON-RPC全量迁移对照表.md')
rows=[line.split('|') for line in matrix.splitlines() if line.startswith('| RPC-')]
assert len(rows)==len(definitions)==21
methods=[]
for i,(row,(route,locations)) in enumerate(zip(rows,definitions),1):
    assert row[1].strip()==f'RPC-{i:02}'
    methods.append(dict(id=row[1].strip(),legacy=row[2].strip(),currentRoute=route,anchors=[anchor(*x) for x in locations],fullCurrentBrowserAcceptance=False))

routes=json.loads(subprocess.check_output(['node',str(W/'scripts/inventory-C269-routes.cjs')],cwd=W,text=True))
for row in routes:
    p=Path(row['file']);files.append(p);row['sourceSha256']=sha(p)
    row['scope']='Declared JSX route only; nested paths are local to their router; not proof of UI/business acceptance'

installed=record(L/'20261011-C257-ordinary-bytecode-01.json')
assert installed['completeInstalledBytecodeAccepted']
matched=set()
for script in installed['scripts']:
    p=Path(script['artifact']);assert sha(p)==script['sha256'];files.append(p)
    sm=record(p.with_suffix(p.suffix+'.map'))
    for name,source in zip(sm['sources'],sm['sourcesContent']):
        if name.startswith('webpack:///./shared/rpc/'):
            local=W/'src/shared/rpc'/name.removeprefix('webpack:///./shared/rpc/')
            assert read(local)==source;matched.add(str(local))
assert len(matched)==106

task=read(D/'Task.md')
parents=[dict(id=m[1],declaredComplete=m[0]=='x',contract=m[2]) for m in re.findall(r'^- \[([ x])\] `([A-Z]+-[A-Z0-9]+)` (.*)$',task,re.M)]
assert len(parents)==98 and len({x['id'] for x in parents})==98
qas=[x for x in parents if x['id'].startswith('QA-A')];assert len(qas)==22
assert [x['id'] for x in parents if not x['declaredComplete']]==['QA-A15','QA-A17','QA-A20','REL-02','REL-05']
chapters=sorted(D.glob('[0-9][0-9]-*.md'));assert [int(p.name[:2]) for p in chapters]==list(range(1,15))
for p in chapters:files.append(p)

evidence=[]
for name in ['20261011-C243-readonly-pages-traffic-01.json','20261011-C248-browser-dapp-audit-01.json','20261011-C249-execution-audit-02.json','20261011-C250-browser-balances-audit-01.json','20261011-C253-staking-execution-audit-02.json','20261011-C258-nft-execution-audit-01.json','20261011-C259-execution-audit-01.json','20261011-C262-hidden-audit-01.json','20261011-C265-qualification-01.json','20261011-C266-qualification-01.json']:
    p=L/name;proof=record(p);assert proof['passed']
    evidence.append(dict(path=str(p),sha256=sha(p),scope=proof.get('scope'),originalBuildAndScopeRetained=True,transitiveEvidenceReaudited=False))

proof=dict(passed=True,observedAt=datetime.now(timezone.utc).isoformat(),scope='21 legacy RPC current source anchors, all JSX Route declarations, 14 chapter and 98/22 declared task indexes, 106 installed RPC source matches and ten scoped ordinary-Chrome evidence entrypoints. No new full business or full release acceptance.',methods=methods,routes=routes,chapters=[dict(path=str(p),sha256=sha(p)) for p in chapters],parents=parents,qaCount=len(qas),installedRpcModulesMatched=len(matched),ordinaryChromeEvidence=evidence,completeCurrentBrowserAcceptance=False,allEvidenceTransitivelyReaudited=False,parentCompletion=False,inputsSha256={str(p):sha(p) for p in dict.fromkeys(files)})
output=Path(sys.argv[1]).resolve();assert output.parent==L and not output.exists()
with output.open('x') as f:json.dump(proof,f,ensure_ascii=False,indent=2);f.write('\n')
print(json.dumps({k:v for k,v in proof.items() if k not in ['methods','routes','chapters','parents','ordinaryChromeEvidence','inputsSha256']},ensure_ascii=False))
print(json.dumps(dict(rpc=len(methods),routes=len(routes),routeFiles=len({r['file'] for r in routes}),parents=len(parents),evidenceEntrypoints=len(evidence))))

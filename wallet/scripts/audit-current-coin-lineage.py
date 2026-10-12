#!/usr/bin/env python3
"""Exact original raw compiled coin modules, no normalized source-map or historical relabelling."""
from pathlib import Path
from datetime import datetime, timezone
import argparse,hashlib,json,re
p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);a=p.parse_args();assert not a.output.exists()
w=Path(__file__).resolve().parents[1];l=w/'migrationToGRpcOrGraphQLDoc/workLog';rt=Path.home()/'.local/state/rtd-wallet-migration/dev-20261003-01';read=lambda f:json.loads(Path(f).read_text());sha=lambda f:hashlib.sha256(Path(f).read_bytes()).hexdigest()
old=rt/'indexed-event-c18-before-c19-20261006-01/ui_index_tsx.js';new=w/'dist/ui_index_tsx.js';oldBuildFile=l/'20261006-terminal-observation-c18-build-01.json';newBuildFile=l/'20261006-sponsored-execute-dev-build-01.json';prodFile=l/'20261006-loopback-production-build-01.json';ob=read(oldBuildFile);nb=read(newBuildFile);production=read(prodFile)
assert ob['passed'] and nb['passed'] and production['passed'];assert sha(old)==ob['compiledProfile']['bundles']['ui_index_tsx.js']['sha256'];assert sha(new)==nb['compiledProfile']['bundles']['ui_index_tsx.js']['sha256'];assert nb['sourceSha256']==production['sourceAfter']['sha256']
def modules(f):
 text=f.read_bytes().decode();matches=list(re.finditer(r'/\*\*\*/ "([^"\n]+)"\r?\n',text));assert len(matches)>500
 return {m.group(1):text[m.start():matches[i+1].start() if i+1<len(matches) else len(text)] for i,m in enumerate(matches)}
before=modules(old);after=modules(new);wanted=['../../core/src/rpc/coin.ts','./shared/rpc/address-funded-transfer.ts','./shared/rpc/coin-transfer-preparation.ts','./shared/rpc/fullnode-reader.ts']+['./ui/app/pages/home/transfer-coin/'+n for n in ['CoinSelector.tsx','PreviewTransfer.tsx','SendTokenForm.tsx','index.tsx','utils/transaction.ts','validation.ts']];same={}
for n in wanted:assert before[n]==after[n];same[n]=hashlib.sha256(after[n].encode()).hexdigest()
report={'passed':True,'observedAt':datetime.now(timezone.utc).isoformat(),'source':production['sourceAfter'],'historicalBaseline':'C18 raw compiled UI modules','currentRevision':'C21','exactUnchangedCoinModules':same,'oldCompiledUiSha256':sha(old),'currentCompiledUiSha256':sha(new),'currentLoopbackCandidateSameProductSource':True,'historicalRunClaimedCurrent':False,'certificateChanges':0,'profilesOpened':0,'simulations':0,'signatures':0,'executeRequests':0,'inputsSha256':{str(f):sha(f) for f in [Path(__file__).resolve(),old,new,oldBuildFile,newBuildFile,prodFile]},'scope':'Ten exact complete raw compiled coin modules, CRLF preserved, old and current actual JS bound to original recorded build SHA. Current production candidate has same C21 product source. Changed transaction/backend admission modules excluded and current actual execution separately verified; no claim old Oct4/C18 execution was newly run.'}
a.output.open('x').write(json.dumps(report,indent=2)+'\n');print(json.dumps({'passed':True,'exactUnchangedCoinModules':len(same)}))

#!/usr/bin/env python3
"""Independent complete product-source reconstruction and emitted delta audit."""
import json,hashlib,sys
from pathlib import Path
from datetime import datetime,timezone
w=Path(__file__).resolve().parents[1];l=w/'migrationToGRpcOrGraphQLDoc/workLog';out=Path(sys.argv[1]);assert not out.exists()
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
read=lambda p:json.loads(Path(p).read_text())
f=[l/n for n in ['20261007-default-generation-positive-C40-build-01.json','20261007-default-generation-positive-C41-build-01.json','20261007-default-generation-positive-C41-audit-01.json','20261007-C41-account-budget-tests-01.json']]
a,b,audit,tests=map(read,f);assert a['passed'] and b['passed'] and audit['passed'] and tests['success'] and tests['numFailedTests']==0
rows={}
for base in [w/'src',w/'configs',w.parent/'core/src',w.parent.parent/'rtd-ts-sdk/packages/typescript/src']:
 for p in base.rglob('*'):
  if p.is_file():rows[str(p.relative_to(w.parent.parent))]=sha(p)
for p in [w/'package.json',w/'webpack.config.ts',w.parent/'pnpm-lock.yaml']:rows[str(p.relative_to(w.parent.parent))]=sha(p)
identity=lambda x:{'sha256':hashlib.sha256(json.dumps(x,sort_keys=True).encode()).hexdigest(),'files':len(x)}
assert identity(rows)==b['sourceAfter']
pins={str(p):sha(p) for p in [Path(__file__).resolve(),*f]};prior=dict(rows);delta=[]
for name in ['src/shared/rpc/account-history-reader.ts','src/shared/rpc/account-history-reader.test.ts']:
 p=w/name;old=l/'20261007-C41-budget-before'/name.replace('/','__');assert p.read_bytes()!=old.read_bytes();prior[str(p.relative_to(w.parent.parent))]=sha(old);pins[str(old)]=sha(old);pins[str(p)]=sha(p);delta.append(name)
assert identity(prior)==a['sourceAfter']
sources=[]
for build in [a,b]:
 s={}
 for name,h in build['artifacts'].items():
  p=Path(build['output'])/name;assert sha(p)==h
  if name.endswith('.js.map'):
   m=read(p)
   for k,v in zip(m['sources'],m['sourcesContent']):
    s[(name,k)]=v
 sources.append(s)
assert set(sources[0])==set(sources[1]);changed=[k for k in sources[0] if sources[0][k]!=sources[1][k]]
assert {k[1] for k in changed}=={'webpack:///./shared/rpc/account-history-reader.ts'}
result={'passed':True,'observedAt':datetime.now(timezone.utc).isoformat(),'source':b['sourceAfter'],'historicalC40SourceReconstructed':True,'onlyProductChanges':delta,'onlyEmittedSourceChanges':changed,'emittedSourceKeysCompared':len(sources[0]),'allOldAndNewArtifactHashesVerified':True,'targetedTests':tests['numPassedTests'],'inputsSha256':pins,'scope':'Full1119 product-source hash reconstructed using only two retained before files; actual C40/C41 all emitted map leaf contents compared. Only reader default60 shared-deadline changes runtime code. Complete static closure and unit deadline proofs are separate from actual UI/server readiness. No fixture, cache, journal or original artifacts mutation.'}
out.open('x').write(json.dumps(result,indent=2)+'\n');print(json.dumps({k:result[k] for k in ['passed','onlyProductChanges','onlyEmittedSourceChanges','targetedTests']}))

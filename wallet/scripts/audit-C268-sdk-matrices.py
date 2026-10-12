#!/usr/bin/env python3
"""Check a scoped documentation correction against current source and saved originals."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import re
import sys

W=Path(__file__).resolve().parents[1];ROOT=W.parents[1]
D=W/'migrationToGRpcOrGraphQLDoc';L=D/'workLog'
files=[Path(__file__)]
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def read(p):files.append(p);return p.read_text()
manifest_path=L/'20261011-C268-before-sdk-matrices-01/manifest.json'
manifest=json.loads(read(manifest_path));changes=[];rows=[];routes=[]
for record in manifest:
    before=Path(record['copy']);after=Path(record['original'])
    assert sha(before)==record['sha256'];old=read(before);new=read(after)
    old_sections=old[old.index('## 1.'):];new_sections=new[new.index('## 1.'):]
    old_lines=old_sections.splitlines();new_lines=new_sections.splitlines()
    assert len(old_lines)==len(new_lines)
    deltas=[(a,b) for a,b in zip(old_lines,new_lines) if a!=b]
    assert len(deltas)==2
    assert any(a.startswith('选定路由仍遵循 03：') for a,b in deltas)
    assert any(a.startswith('| 币列表、总余额、详情 |') for a,b in deltas)
    row=next(b for a,b in deltas if b.startswith('| 币列表、总余额、详情 |'))
    assert all(s in row for s in ['Fullnode ListBalances','全分页当前资金','不能把实时资金标为同快照余额','失败不归零','交易准备仍实时校验'])
    rows.append(row)
    route=next(b for a,b in deltas if b.startswith('选定路由遵循'))
    refs=re.findall(r'\]\((\./[^)]+)\)',route);assert len(refs)==2
    for ref in refs:assert (after.parent/ref).is_file()
    routes.append(re.sub(r'\]\([^)]*\)','](same-semantic-document)',route))
    assert '代码示意与新增领域接口均待实施' not in new[:new.index('## 1.')]
    changes.append({'path':str(after),'savedOriginal':str(before),'changedMainContractLines':2,'correctLocalSectionReferences':refs})
assert rows[0]==rows[1] and routes[0]==routes[1]
hook=W/'src/ui/app/hooks/useGetAllBalances.ts';h=read(hook)
for token in ['"wallet-current-balances"','rpc.readFreshBalances(address!, signal)','staleTime: 5_000','20_000','skipPersistedCache: true']:
    assert token in h
provider=W/'src/shared/rpc/WalletRpcProvider.ts';p=read(provider)
assert 'readFreshBalances: (owner, signal) => fullnode!.balances(owner, signal)' in p
assert 'WalletBalanceReader.read(session!, owner, signal)' in p
fullnode=W/'src/shared/rpc/fullnode-reader.ts';f=read(fullnode)
balance=f.split('  async balances(')[1].split('  async coins(')[0]
for token in ['stateService.listBalances','response.nextPageToken','decodeBalance(raw)','this.#verifyIdentity(signal)','this.session.assertActive()']:
    assert token in balance
assert 'snapshot' not in balance
official_dir=D/'evidence/official/C250-current-balances-20261011-01'
official=json.loads(read(official_dir/'sources.json'))
for name,info in official['files'].items():
    path=official_dir/name;assert sha(path)==info['sha256'];files.append(path)
    if 'source' in info:
        source=Path(info['source']);assert sha(source)==info['sha256'];files.append(source)
proof={'passed':True,'observedAt':datetime.now(timezone.utc).isoformat(),
 'scope':'Two SDK document main matrices and local chapter references aligned with already implemented C250 current-balance path; not a complete REL-05 or new runtime acceptance',
 'documents':changes,'sameBalanceRow':True,'sameRouteSemantics':True,'currentSourceInspected':True,
 'officialLivePagesRechecked':['https://sdk.mystenlabs.com/sui/clients/querying','https://sdk.mystenlabs.com/sui/migrations/sui-2.0/json-rpc-migration'],
 'preservedPinnedOfficialSourceCommit':official['suiPinnedCommit'],'newBusinessCode':False,'parentCompletion':False,
 'inputsSha256':{str(p):sha(p) for p in dict.fromkeys(files)}}
output=Path(sys.argv[1]).resolve();assert output.parent==L and not output.exists()
with output.open('x') as stream:json.dump(proof,stream,ensure_ascii=False,indent=2);stream.write('\n')
print(json.dumps({k:v for k,v in proof.items() if k!='inputsSha256'},ensure_ascii=False))

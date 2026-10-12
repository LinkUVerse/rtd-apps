#!/usr/bin/env python3
"""Bind the human semantic review to current documents, source and scoped evidence."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib, json, re

W=Path(__file__).resolve().parents[1];R=W.parents[1]
D=W/'migrationToGRpcOrGraphQLDoc';L=D/'workLog';A=R/'rtd-archive-service/docs/wallet'
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
files=[Path(__file__),L/'20261012-C290-document-contract-completion.md']


def lines(p):
    return {re.sub(r'\]\([^)\n]+\)',']',x).strip() for x in p.read_text().splitlines()[1:] if x.strip() and not x.startswith('> ')}


chapters=sorted(D.glob('[0-1][0-9]-*.md'));assert len(chapters)==14
sources=sorted(A.glob('[0-1][0-9]-*.md'));assert len(sources)==7
merged=set().union(*(lines(p) for p in chapters[1:8]))
original=set().union(*(lines(p) for p in sources))
assert original==merged, {'sourceOnly':sorted(original-merged),'mergedOnly':sorted(merged-original)}
links=[]
for p in chapters+sources:
    text=p.read_text()
    for m in re.finditer(r'\]\(([^)\n]+)\)',text):
        v=m[1];base=v.split('#')[0]
        if not base or re.match(r'https?://|mailto:',base):continue
        base=re.sub(r':\d+$','',base);target=Path(base) if base.startswith('/') else p.parent/base
        assert target.exists(),(p,v)
        links.append({'document':str(p),'target':str(target.resolve())})
files.extend(chapters+sources)

# Validate the complete edit chain, rather than claiming superseded intermediate hashes are current.
last={};backups=[]
for name in ['20261012-C288-document-edits-01.json','20261012-C290-document-edits-01.json','20261012-C290-document-edits-02.json','20261012-C290-document-edits-03.json','20261012-C290-document-edits-04.json']:
    p=L/name;files.append(p)
    for row in json.loads(p.read_text())['files']:
        target=Path(row['path']).resolve();before=Path(row['before']).resolve()
        assert sha(before)==row['beforeSha256']
        if target in last:assert last[target]==row['beforeSha256']
        last[target]=row['afterSha256'];backups.append(before)
assert all(sha(p)==h for p,h in last.items())
files.extend(backups)

source_names=['profile','profile-registry','profile-permissions','identity','session','WalletRpcProvider','fullnode-reader','graphql-snapshot','snapshot-pagination','read-admission','read-request-queue','snapshot-query-queue','fullnode-read-queue','asset-reader','archive-object-reader','archive-checkpoint-reader','ledger-reader','account-history-reader','indexed-lists','name-reader','kiosk-reader','staking-reader','staking-snapshot-reader','staking-rates','execution-journal','execution-coordinator','execution-reader','transaction-reader','transaction-network-identity']
paths=[W/'src/shared/rpc'/(n+'.ts') for n in source_names]
paths += [W/'src/background/execution.ts',W/'src/background/dapp-execution.ts',R/'rtd-ts-sdk/packages/typescript/src/grpc/core.ts',R/'rtd-ts-sdk/packages/typescript/src/graphql/core.ts',R/'rtd-ts-sdk/packages/typescript/src/client/types.ts',R/'rtd-ts-sdk/packages/typescript/src/client/core-resolver.ts']
assert all(p.is_file() for p in paths);files.extend(paths)
assert 'No signed payload, bytes or key material is stored' in (W/'src/shared/rpc/execution-journal.ts').read_text()
assert 'address(address: $parent)' in (W/'src/shared/rpc/name-reader.ts').read_text()
assert 'response.lowestAvailableCheckpoint' in (W/'src/shared/rpc/ledger-reader.ts').read_text()
assert 'stateService.listBalances' in (W/'src/shared/rpc/fullnode-reader.ts').read_text()
assert 'transactionExecutionService.simulateTransaction' in (W/'src/shared/rpc/transaction-reader.ts').read_text()
proofs=[]
for name in ['20261012-C281-source-applicability-01.json','20261012-C281-business-traffic-01.json']:
    p=L/name;r=json.loads(p.read_text());assert r['passed']
    assert all(sha(f)==h for f,h in r['inputsSha256'].items())
    files.append(p);proofs.append({'path':str(p),'sha256':sha(p),'unchangedInputs':len(r['inputsSha256'])})
for name in ['source-manifest.json','sui-snapshot-manifest.json']:
    p=D/'evidence/official'/name;assert p.is_file();files.append(p)
out=L/'20261012-C290-document-contracts-01.json';assert not out.exists()
result={'passed':True,'at':datetime.now(timezone.utc).isoformat(),'acceptedPackage':'REL-05.4','scope':'Fourteen current main-document contracts reviewed; historical dated records retained, seven source documents aligned, no runtime acceptance added.','humanReview':str(files[1]),'chapters':[{ 'number':int(p.name[:2]),'path':str(p),'sha256':sha(p)} for p in chapters],'sourceDocuments':7,'sourceBodyUnionMatchesMerged':True,'normalization':'Ignore document title, explicitly scoped editorial blockquotes, blank lines and Markdown link destinations only; relocated history remains in merged chapter 06. Link targets validated separately.','validLocalLinks':len(links),'links':links,'editChainAndOriginalsVerified':True,'currentSourceFilesBound':len(paths),'existingAcceptanceProofs':proofs,'browserTestsRepeated':False,'all98Completed':False,'parentCompletion':False,'inputsSha256':{str(p):sha(p) for p in dict.fromkeys(files)}}
out.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'passed':True,'chapters':14,'sourceBodyAligned':True,'localLinks':len(links),'acceptedPackage':'REL-05.4','parentCompletion':False}))

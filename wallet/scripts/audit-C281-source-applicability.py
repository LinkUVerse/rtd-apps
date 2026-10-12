#!/usr/bin/env python3
"""Bind retained Chrome evidence to the installed C278 product, naming every intervening change."""
import hashlib
import json
from pathlib import Path
import sys
from datetime import datetime, timezone

W = Path(__file__).resolve().parents[1]; L = W / 'migrationToGRpcOrGraphQLDoc/workLog'
inputs = {}
def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def read(p):
    inputs[str(p)] = sha(p)
    return json.loads(Path(p).read_text())
def modules(root):
    result = {}
    for p in sorted(root.glob('*.js.map')):
        source = read(p)
        for name, content in zip(source['sources'], source['sourcesContent']):
            if name.startswith('webpack:///./'):
                if name in result: assert result[name] == content
                result[name] = content
    return result

p275 = read(L / '20261011-C275-ordinary-upgrade-installed-01.json')
p278 = read(L / '20261012-C278-ordinary-upgrade-installed-01.json')
assert p275['passed'] and p278['passed']
old, stable, candidate = Path(p275['archive']), Path(p278['stable']), Path(p278['compilerOutput'])
for p in candidate.rglob('*'):
    if p.is_file():
        assert sha(p) == sha(stable / p.relative_to(candidate)); inputs[str(p)] = sha(p)
old_loaded = read(L / '20261011-C257-ordinary-bytecode-01.json')
assert old_loaded['completeInstalledBytecodeAccepted']
for item in old_loaded['scripts']:
    p = old / Path(item['artifact']).name; assert sha(p) == item['sha256']; inputs[str(p)] = sha(p)
before, current = modules(old), modules(stable)
assert len(before) == len(current) == 547 and set(before) == set(current)
changed = {name for name in before if before[name] != current[name]}
expected = {'shared/rpc/name-reader.ts', 'shared/rpc/snapshot-pagination.ts', 'shared/rpc/staking-snapshot-reader.ts',
    'ui/app/components/receipt-card/TxnAddress.tsx', 'ui/app/components/receipt-card/TxnAddressLink.tsx',
    'ui/app/pages/home/transfer-coin/PreviewTransfer.tsx', 'ui/app/pages/home/transfer-coin/index.tsx'}
assert changed == {'webpack:///./' + name for name in expected}
matches = []
for name, content in current.items():
    p = W / 'src' / name.removeprefix('webpack:///./')
    if p.suffix in ('.ts', '.tsx') and p.is_file():
        assert p.read_text() == content, name
        inputs[str(p)] = sha(p); matches.append(str(p))
assert len(matches) > 400
# Pagination widened only a TypeScript input type, with no runtime implementation change.
n = 'webpack:///./shared/rpc/snapshot-pagination.ts'
assert before[n].replace('snapshot: GraphQLSnapshot,', 'snapshot: Pick<GraphQLSnapshot, "session" | "revalidate">,') == current[n]
evidence = []
for name in ['20261011-C276-withdraw-closure-01.json', '20261012-C278-name-transfer-closure-01.json',
             '20261012-C279-name-completion-01.json', '20261012-C281-business-traffic-01.json',
             '20261012-default-generation-positive-C278-closure-01.json']:
    p = L / name; value = read(p); assert value['passed']; evidence.append({'path': str(p), 'sha256': sha(p)})
record = {'passed': True, 'observedAt': datetime.now(timezone.utc).isoformat(), 'retainedC257LoadedScriptsMatched': True,
    'installedEqualsReviewedC278': True, 'webpackProductModules': len(current), 'unchangedSinceC257': len(current)-len(changed),
    'changedModules': sorted(changed), 'currentTypeScriptFilesMatched': len(matches), 'paginationChangeTypeOnly': True,
    'changedStakingAndNameEvidence': evidence,
    'scope': 'Byte comparison and exact change applicability. C257 actual NFT/dApp/hidden/network traffic remains applicable to unchanged code. C276 covers changed staking composition; C277-C279 cover changed name/admission/transfer/receipt presentation. Earlier positive balance/settings/asset/history/connection evidence keeps its original build and scope, supported by later unchanged-flow observations and targeted regressions; this is not a new browser run of every route.',
    'inputsSha256': {str(Path(__file__).resolve()): sha(__file__), **inputs}}
output = Path(sys.argv[1]); assert not output.exists(); output.write_text(json.dumps(record, ensure_ascii=False, indent=2)+'\n')
print(json.dumps({'passed': True, 'modules': len(current), 'unchanged': len(current)-len(changed), 'changed': len(changed), 'currentFiles': len(matches)}))

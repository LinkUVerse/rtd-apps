#!/usr/bin/env python3
"""Reconstruct original C42 source and independently limit C43 to the staking draft change."""
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

w = Path(__file__).resolve().parents[1]
l = w / 'migrationToGRpcOrGraphQLDoc/workLog'
out = Path(sys.argv[1])
assert not out.exists()
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
read = lambda p: json.loads(Path(p).read_text())
op = Path.home() / '.local/state/rtd-wallet-migration/dev-20261006-03/C42-staking-draft-repair-20261007-01'
proofs = [l / n for n in ['20261007-default-generation-positive-C42-build-01.json',
    '20261007-default-generation-positive-C43-build-01.json',
    '20261007-default-generation-positive-C43-audit-01.json',
    '20261007-staking-draft-tests-before-01.json',
    '20261007-staking-draft-tests-after-01.json',
    '20261007-staking-draft-boundaries-tests-after-02.json',
    '20261007-staking-draft-typecheck-01.json']]
old, new, audit, red, green, boundaries, types = map(read, proofs)
assert all(p['passed'] for p in [old, new, audit, types])
assert not red['success'] and red['numFailedTests'] == 2 and red['numPassedTests'] == 23
assert green['success'] and green['numFailedTests'] == 0 and green['numPassedTests'] == 25
assert boundaries['success'] and boundaries['numFailedTests'] == 0 and boundaries['numPassedTests'] == 47
failed = [r['fullName'] for t in red['testResults'] for r in t['assertionResults'] if r['status'] == 'failed']
assert all('retains unapproved amount through same-session read' in name for name in failed)
rows = {}
for base in [w/'src', w/'configs', w.parent/'core/src', w.parent.parent/'rtd-ts-sdk/packages/typescript/src']:
    for p in base.rglob('*'):
        if p.is_file(): rows[str(p.relative_to(w.parent.parent))] = sha(p)
for p in [w/'package.json', w/'webpack.config.ts', w.parent/'pnpm-lock.yaml']:
    rows[str(p.relative_to(w.parent.parent))] = sha(p)
identity = lambda r: {'sha256': hashlib.sha256(json.dumps(r, sort_keys=True).encode()).hexdigest(), 'files': len(r)}
assert identity(rows) == new['sourceAfter'] == audit['source'] == types['source']
before = read(op / 'before.json')
assert before['sourceBefore'] == old['sourceAfter']
prior = dict(rows)
pins = {str(p): sha(p) for p in [Path(__file__).resolve(), op/'before.json', *proofs]}
assert len(before['files']) == 2
for file, evidence in before['files'].items():
    p = Path(file); saved = Path(evidence['before'])
    assert sha(saved) == evidence['sha256'] and p.read_bytes() != saved.read_bytes()
    prior[str(p.relative_to(w.parent.parent))] = sha(saved)
    pins[str(p)] = sha(p); pins[str(saved)] = sha(saved)
assert identity(prior) == old['sourceAfter']
sources = []
for build in [old, new]:
    items = {}
    for name, digest in build['artifacts'].items():
        p = Path(build['output']) / name
        assert sha(p) == digest
        if name.endswith('.js.map'):
            m = read(p); assert len(m['sources']) == len(m['sourcesContent'])
            for source, content in zip(m['sources'], m['sourcesContent']):
                if not source.startswith('webpack:///webpack/'):
                    previous = items.get(source)
                    assert previous is None or previous == content
                    items[source] = content
    sources.append(items)
assert sources[0].keys() == sources[1].keys()
changed = [key for key in sources[0] if sources[0][key] != sources[1][key]]
assert changed == ['webpack:///./ui/app/staking/stake/StakingCard.tsx']
result = {'passed': True, 'observedAt': datetime.now(timezone.utc).isoformat(),
    'source': new['sourceAfter'], 'historicalC42SourceReconstructed': True,
    'onlyProductChanges': list(before['files']), 'onlyEmittedSourceChanges': changed,
    'targetedTests': 47, 'initialFailingDraftRegressions': 2,
    'emittedSourcesCompared': len(sources[0]), 'allOldAndNewArtifactHashesVerified': True,
    'inputsSha256': pins, 'newOriginInstalled': False, 'currentChromeStakingAccepted': False,
    'scope': 'Exact before backups reconstruct all1119 C42 sources; current C43 changes only staking component and its tests, one emitted runtime leaf. Two reproduced failures,47 boundary tests and production typecheck. Old artifacts/dist preserved; no runtime origin/Chrome acceptance.'}
out.open('x').write(json.dumps(result, indent=2)+'\n')
print(json.dumps({k: result[k] for k in ['passed', 'targetedTests', 'onlyEmittedSourceChanges']}))

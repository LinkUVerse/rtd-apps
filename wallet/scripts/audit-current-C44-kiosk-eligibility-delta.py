#!/usr/bin/env python3
# Copyright (c) LinkU Labs, Inc.
# SPDX-License-Identifier: Apache-2.0
"""Reconstruct C43 and independently constrain C44 to actual NFT page eligibility."""
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

w = Path(__file__).resolve().parents[1]
l = w / 'migrationToGRpcOrGraphQLDoc/workLog'
op = Path.home() / '.local/state/rtd-wallet-migration/dev-20261006-03/C43-kiosk-transfer-eligibility-repair-20261007-01'
out = Path(sys.argv[1])
assert not out.exists()
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
read = lambda p: json.loads(Path(p).read_text())
names = ['20261007-default-generation-positive-C43-build-01.json',
         '20261007-default-generation-positive-C44-build-02.json',
         '20261007-default-generation-positive-C44-audit-02.json',
         '20261007-kiosk-transfer-eligibility-tests-before-01.json',
         '20261007-kiosk-details-eligibility-tests-before-05.json',
         '20261007-kiosk-transfer-eligibility-tests-after-02.json',
         '20261007-kiosk-transfer-eligibility-typecheck-01.json']
proofs = [l / n for n in names]
old, new, audit, red, details_red, green, types = map(read, proofs)
assert all(p['passed'] for p in [old, new, audit, types])
assert not red['success'] and red['numFailedTests'] == 5
assert not details_red['success'] and details_red['numFailedTests'] == 3 and details_red['numPassedTests'] == 5
assert green['success'] and green['numPassedTests'] == 100 and green['numFailedTests'] == 0
failures = [r['fullName'] for p in [red, details_red] for t in p['testResults']
            for r in t.get('assertionResults', []) if r['status'] == 'failed']
assert len(failures) == 8
rows = {}
for base in [w/'src', w/'configs', w.parent/'core/src', w.parent.parent/'rtd-ts-sdk/packages/typescript/src']:
    for p in base.rglob('*'):
        if p.is_file(): rows[str(p.relative_to(w.parent.parent))] = sha(p)
for p in [w/'package.json', w/'webpack.config.ts', w.parent/'pnpm-lock.yaml']:
    rows[str(p.relative_to(w.parent.parent))] = sha(p)
identity = lambda r: {'sha256': hashlib.sha256(json.dumps(r, sort_keys=True).encode()).hexdigest(), 'files': len(r)}
assert identity(rows) == new['sourceBefore'] == new['sourceAfter'] == audit['source'] == types['source']
before = read(op/'before.json')
assert before['sourceBefore'] == old['sourceAfter'] and len(before['files']) == 4
prior = dict(rows)
pins = {str(p): sha(p) for p in [Path(__file__).resolve(), op/'before.json', *proofs]}
for file, evidence in before['files'].items():
    p, saved = Path(file), Path(evidence['before'])
    assert sha(saved) == evidence['sha256'] and p.read_bytes() != saved.read_bytes()
    prior[str(p.relative_to(w.parent.parent))] = sha(saved)
    pins[str(p)] = sha(p); pins[str(saved)] = sha(saved)
added = Path(before['newFile'])
assert added.is_file(); del prior[str(added.relative_to(w.parent.parent))]
pins[str(added)] = sha(added)
assert identity(prior) == old['sourceAfter']
archived = read(op/'temporary-regression-archive.json')
for retired, row in archived.items():
    assert not (w.parent.parent.parent / retired).exists() and sha(row['archive']) == row['sha256']
    pins[row['archive']] = row['sha256']
assert sha(op/'executed-before-05.component.tsx.txt') == before['files'][str(w/'src/ui/app/pages/home/nft-details/index.tsx')]['sha256']
pins[str(op/'temporary-regression-archive.json')] = sha(op/'temporary-regression-archive.json')
sources = []
for build in [old, new]:
    items = {}
    for name, digest in build['artifacts'].items():
        p = Path(build['output']) / name; assert sha(p) == digest
        if name.endswith('.js.map'):
            m = read(p); assert len(m['sources']) == len(m['sourcesContent'])
            for source, content in zip(m['sources'], m['sourcesContent']):
                if not source.startswith('webpack:///webpack/'):
                    previous = items.get(source); assert previous is None or previous == content
                    items[source] = content
    sources.append(items)
assert sources[0].keys() == sources[1].keys()
changed = sorted(k for k in sources[0] if sources[0][k] != sources[1][k])
assert changed == sorted(['webpack:///./shared/rpc/nft-assets.ts',
    'webpack:///./ui/app/pages/home/nft-details/index.tsx',
    'webpack:///./ui/app/pages/home/nft-transfer/index.tsx'])
assert all(sha(f) == h for f, h in pins.items())
result = {'passed': True, 'observedAt': datetime.now(timezone.utc).isoformat(),
    'source': new['sourceAfter'], 'historicalC43SourceReconstructed': True,
    'onlyProductChanges': [*before['files'], str(added)], 'onlyEmittedSourceChanges': changed,
    'targetedTests': 100, 'initialFailingPageRegressions': 8, 'failedPageCases': failures,
    'collectionFailuresExcluded': True, 'emittedSourcesCompared': len(sources[0]),
    'allOldAndNewArtifactHashesVerified': True, 'temporaryRedTestsArchived': True,
    'inputsSha256': pins, 'newOriginInstalled': False, 'currentChromeKioskAccepted': False,
    'scope': 'Exact backups reconstruct all1119 C43 source files. Current1120-source C44 changes only shared snapshot eligibility and two actual pages/tests; all other emitted sources remain exact. Eight reproduced page failures,100 targeted tests and actual production typecheck. Collection/config failures excluded and retained. No Chrome/business/indexed-coverage acceptance.'}
with out.open('x') as f: f.write(json.dumps(result, indent=2)+'\n')
out.chmod(0o600)
print(json.dumps({k: result[k] for k in ['passed', 'targetedTests', 'onlyEmittedSourceChanges']}))

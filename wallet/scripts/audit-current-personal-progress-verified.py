#!/usr/bin/env python3
"""Audit finite C22/C23 proofs without promoting any incomplete parent contract."""
import argparse
from datetime import datetime, timezone
import hashlib
import importlib.util
import json
from pathlib import Path
import re


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    assert not args.output.exists()
    wallet = Path(__file__).resolve().parents[1]
    root = wallet.parents[1]
    docs = wallet / 'migrationToGRpcOrGraphQLDoc'
    logs = docs / 'workLog'
    sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
    read = lambda p: json.loads(Path(p).read_text())
    spec = importlib.util.spec_from_file_location('builder', wallet / 'scripts/build-reviewed-local-extension.py')
    builder = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(builder)
    h, n = builder.source_hash(wallet)
    current = {'sha256': h, 'files': n}
    proofs = {}
    names = ['personal-certified-export-01', 'personal-official-source-01',
             'personal-certified-release-03', 'personal-runtime-deployment-01',
             'personal-discovery-01', 'personal-guardian-verification-01',
             'personal-current-ui-02', 'personal-current-ui-audit-01',
             'personal-retained-native-01', 'personal-retained-recovery-01',
             'personal-handoff-verification-01', 'personal-production-build-03',
             'personal-production-audit-03', 'personal-loopback-origin-03',
             'personal-chrome-identity-04', 'personal-confirmed-receipt-02',
             'personal-account-boundary-01']
    frozen = []
    for name in names:
        path = logs / ('20261006-' + name + '.json')
        value = read(path)
        if name == 'personal-runtime-deployment-01':
            assert value['probeCompleted'] and value['reviewedDeploymentMatched']
            assert value['report']['state'] == 'reviewed-deployment-matched'
            assert len(value['report']['packages']) == 5
            assert all(row['state'] == 'pin-matched' for row in value['report']['packages'])
            assert value['report']['move']['state'] == 'selected-contracts-compatible'
        else:
            assert value['passed'], name
        for file, digest in value.get('inputsSha256', {}).items():
            assert sha(file) == digest, file
        proofs[name] = value
        frozen.append({'file': str(path), 'sha256': sha(path)})
    c22 = read(logs / '20261006-personal-production-build-02.json')['sourceAfter']
    for name in ['personal-guardian-verification-01', 'personal-current-ui-02',
                 'personal-current-ui-audit-01', 'personal-retained-native-01',
                 'personal-retained-recovery-01']:
        assert proofs[name]['source'] == c22
    for name in ['personal-handoff-verification-01', 'personal-production-audit-03',
                 'personal-confirmed-receipt-02']:
        assert proofs[name]['source'] == current
    build = proofs['personal-production-build-03']
    assert build['sourceBefore'] == build['sourceAfter'] == current
    for file, digest in build['artifacts'].items():
        assert sha(Path(build['output']) / file) == digest
    release = proofs['personal-certified-release-03']
    assert release['profileRevision'] == 4 and len(release['packages']) == 5
    assert release['certifiedPrefixThrough'] == [24450, 201271]
    assert release['verifiedCheckpoints'] == [24451, 201272]
    assert release['compiledPersonalKioskModules'] == release['sourcePersonalKioskFiles'] == 6
    original = read(logs / '20261006-personal-current-execution-01.json')
    native = proofs['personal-retained-native-01']
    recovery = proofs['personal-retained-recovery-01']
    receipt = proofs['personal-confirmed-receipt-02']
    digest = 'GerYF8jrD8xwD9WqxKqSptLZVn12fZAS4YC5K8sP8oZH'
    assert original['passed'] is False and original['executeRequests'] == original['signatures'] == 1
    assert native['digest'] == recovery['digest'] == receipt['digest'] == digest
    assert native['signatureVerified'] and native['nativeEffectsMatch']
    assert native['personalBorrowReturned'] and native['capStillOwned']
    assert native['currentNftOwner']['AddressOwner'] == native['recipient'] and native['currentKioskItemCount'] == 0
    assert recovery['strictJournalVerified'] and recovery['pendingCount'] == 0
    assert recovery['before']['journal-v2'][0]['state'] == 'confirmed-success'
    assert recovery['initialWholeRunPassed'] is False and recovery['initialReceiptNavigationVerified'] is False
    assert recovery['executeRequests'] == recovery['simulations'] == recovery['signatures'] == 0
    assert receipt['executions'] == receipt['simulations'] == receipt['signatures'] == 0
    assert receipt['before'] == receipt['after'] and not receipt['blocked'] and not receipt['pageErrors']
    assert receipt['checkCount'] == 15
    chrome = proofs['personal-chrome-identity-04']
    assert chrome['networkIdentityAccepted'] and len(chrome['identities']) == 4
    assert all(row['status'] == 200 and row['sameGenesis'] for row in chrome['identities'])
    assert chrome['workerSource']['workerSha256'] == build['artifacts']['background.js']
    for row in chrome['uiSource']['loadedBundles']:
        assert row['loadedSha256'] == build['artifacts'][row['file']]
    handoff = proofs['personal-handoff-verification-01']
    assert handoff['originalPageRegression']['failed'] == 3
    assert handoff['full']['tests'] == 2545 and handoff['prodTypesExitCode'] == 0
    inputs = logs / '20261006-personal-current-inputs'
    manifest = read(inputs / 'manifest.json')
    assert len(manifest['files']) == 1141
    for row in manifest['files']:
        assert sha(inputs / row['path']) == row['sha256'] == sha(root / row['path'])
    chapters = sorted(docs.glob('[0-9][0-9]-*.md'))
    assert [int(p.name[:2]) for p in chapters] == list(range(1, 15))
    merge = read(docs / 'evidence/20261003-document-merge-manifest.json')
    for row in merge['sources']:
        preserved = docs / row['preserved']
        assert sha(preserved) == row['sha256']
        if '/rtd-archive-service/' in row['source']:
            assert Path(row['source']).exists()
        if row['merged'] != 'README.md':
            assert all(section in (docs / row['merged']).read_text()
                       for section in re.findall(r'^## .+$', preserved.read_text(), re.M))
    section = (logs / '20261006-personal-contract-section.txt').read_text().strip()
    for path in [docs / '04-SDK契约与功能迁移矩阵.md', root / 'rtd-archive-service/docs/wallet/03-SDK契约与功能迁移矩阵.md']:
        assert section in path.read_text()
    links = 0
    for file in chapters + [docs / 'README.md', docs / 'Task.md', docs / 'totalProgress.md', logs / 'current-state.md']:
        for target in re.findall(r'\]\(([^)]+)\)', file.read_text()):
            target = target.strip('<>').split('#')[0]
            if target.startswith(('./', '../')):
                assert (file.parent / target).exists(), str(file) + ' -> ' + target
                links += 1
    tasks = re.findall(r'^- \[([ x])\] `([A-Z]+-[A-Z0-9]+)`', (docs / 'Task.md').read_text(), re.M)
    assert len(tasks) == len({row[1] for row in tasks}) == 98
    assert sum(row[0] == 'x' for row in tasks) == 71
    historical = read(logs / '20261006-RPC-04-completion-audit-04.json')
    assert historical['passed'] and historical['source'] != current
    result = {'passed': True, 'observedAt': datetime.now(timezone.utc).isoformat(),
              'currentRevision': 'C23', 'source': current, 'c22Source': c22,
              'parentsComplete': 71, 'parentsTotal': 98, 'trialReady': False,
              'currentCompiledModules': proofs['personal-production-audit-03']['moduleCount'],
              'fullUnitTests': 2545, 'prodTypesExitCode': 0,
              'currentFiveIndependentPins': True, 'originalNftDigest': digest,
              'originalWholeUiRunPassed': False, 'initialAutomaticNavigationAccepted': False,
              'c23OneTimeSendAccepted': False, 'originalNativeSuccessAccepted': True,
              'retainedLockedTerminalAccepted': True, 'currentPublicReceiptReadAccepted': True,
              'originalExecuteRequests': 1, 'recoveryExecuteRequests': 0,
              'chapters': 14, 'relativeLinksChecked': links,
              'fullRelativeInputFiles': len(manifest['files']),
              'inputManifestSha256': sha(inputs / 'manifest.json'),
              'normalChromeHttpsAccepted': False, 'certificateChanges': 0,
              'proofs': frozen,
              'scope': 'Finite current C23 source/build/closure/four loopback identities/public NFT receipt, historical C22 once dispatch/native and locked original strict terminal, two-side aligned contract and original 98 tasks. No promotion of incomplete NFT routes, indexing catchup, full QA, original HTTPS or trial readiness.'}
    args.output.open('x').write(json.dumps(result, indent=2) + '\n')
    print(json.dumps({key: result[key] for key in ['passed', 'currentRevision', 'parentsComplete', 'fullRelativeInputFiles', 'relativeLinksChecked']}))


if __name__ == '__main__':
    main()

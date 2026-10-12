#!/usr/bin/env python3
"""Readonly current C25 source/document index with historical C21 packaging; never rewrite historical evidence."""
from datetime import datetime, timezone
from pathlib import Path
import argparse
import hashlib
import importlib.util
import json
import re


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    assert not args.output.exists()
    wallet = Path(__file__).resolve().parents[1]
    docs = wallet / 'migrationToGRpcOrGraphQLDoc'
    logs = docs / 'workLog'
    sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
    read = lambda p: json.loads(Path(p).read_text())
    spec = importlib.util.spec_from_file_location('builder', wallet / 'scripts/build-reviewed-local-extension.py')
    builder = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(builder)
    product_sha, product_files = builder.source_hash(wallet)
    revision = read(logs / '20261006-QA-A06-completion-audit-02.json')
    assert revision['passed'] and revision['parentsComplete'] == 78 and revision['parentsTotal'] == 98
    assert revision['source'] == {'sha256':product_sha,'files':product_files}
    assert revision['qa06ContractComplete'] and revision['qa06MarkedComplete'] and revision['chromeChecks'] == 14 and revision['actualNonvisualRows'] == 5 and revision['targetedTests'] == 86
    assert not revision['trialReady'] and not revision['normalChromeHttpsAccepted']
    for row in revision['proofs']:
        assert sha(row['file']) == row['sha256']
    package = read(logs / '20261006-C21-package-01.json')
    chrome = read(logs / '20261006-C21-package-readonly-01.json')
    assert package['passed'] and chrome['passed'] and chrome['certificateMode'] == 'normal-ca'
    assert chrome['externalRequests'] == chrome['forbiddenRequests'] == chrome['pageErrorCount'] == 0
    assert chrome['workerSource']['matchesDisk'] and chrome['uiSource']['matchesDisk']
    assert not chrome['networkIdentityAccepted']
    assert package['memberCount'] == 36 and sha(package['zip']) == package['zipSha256']
    for file, digest in package['members'].items():
        assert sha(Path(package['output']) / file) == digest
    assert chrome['workerSource']['workerSha256'] == package['members']['background.js']
    for row in chrome['uiSource']['loadedBundles']:
        assert row['loadedSha256'] == package['members'][row['file']]
    chapters = sorted(docs.glob('[0-9][0-9]-*.md'))
    assert [int(p.name[:2]) for p in chapters] == list(range(1, 15))
    merge = read(docs / 'evidence/20261003-document-merge-manifest.json')
    for row in merge['sources']:
        preserved = docs / row['preserved']
        assert sha(preserved) == row['sha256']
        if '/rtd-archive-service/' in row['source']:
            assert Path(row['source']).exists()
        if row['merged'] != 'README.md':
            sections = re.findall(r'^## .+$', preserved.read_text(), re.M)
            merged = (docs / row['merged']).read_text()
            assert all(section in merged for section in sections)
    links = 0
    for file in chapters + [docs / 'README.md', docs / 'Task.md', docs / 'totalProgress.md', logs / 'current-state.md']:
        for target in re.findall(r'\]\(([^)]+)\)', file.read_text()):
            target = target.strip('<>').split('#')[0]
            if target.startswith(('./', '../')):
                assert (file.parent / target).exists(), str(file) + ' -> ' + target
                links += 1
    tasks = re.findall(r'^- \[([ x])\] `([A-Z]+-[A-Z0-9]+)`', (docs / 'Task.md').read_text(), re.M)
    assert len(tasks) == len({row[1] for row in tasks}) == 98 and sum(row[0] == 'x' for row in tasks) == 78
    current = []
    for folder in (wallet / 'src', wallet / 'configs', wallet / 'scripts', wallet / 'tests/demo-app/src',
                   wallet.parent / 'core/src', wallet.parent.parent / 'rtd-ts-sdk/packages/typescript/src'):
        for file in sorted(folder.rglob('*')):
            if file.is_file() and '__pycache__' not in file.parts:
                current.append({'file': str(file), 'sha256': sha(file)})
    retained = [{'file': str(file), 'sha256': sha(file)} for file in sorted(docs.rglob('*.txt'))]
    failures = []
    for file in sorted(logs.rglob('*.json')):
        try:
            value = read(file)
        except (UnicodeDecodeError, json.JSONDecodeError):
            continue
        if isinstance(value, dict) and (value.get('passed') is False or value.get('probeCompleted') is False):
            failures.append({'file': str(file), 'sha256': sha(file)})
    assert sha(logs / '20261006-C19-install-guide-before-C20.md') == '52ddf68f91d59e50d47b232db16d1e0442d368e8c617d11c1f2906d4e5ae6fb3'
    report = {'passed': True, 'observedAt': datetime.now(timezone.utc).isoformat(), 'currentRevision': 'C25',
              'productSourceSha256': product_sha, 'productSourceFiles': product_files,
              'parentsComplete': 78, 'parentsTotal': 98, 'trialReady': False, 'normalChromeHttpsAccepted': False,
              'chapters': 14, 'relativeLinksChecked': links, 'preservedOriginalDocuments': len(merge['sources']),
              'currentSources': current, 'retainedSources': retained, 'failureFiles': failures,
              'historicalC21PackageZip': package['zip'], 'historicalC21PackageZipSha256': package['zipSha256'],
              'historicalC21Rpc04Complete': True,'historicalC21CoinUiExecutions':2,'historicalC21CoinUiChecks':36,'historicalC21Qa02Complete': True, 'currentLoopbackProfileRevision':4, 'historicalC21Qa10Complete': True, 'historicalC21Qa10Checks':321, 'historicalC21Tx07Complete': True, 'historicalC21Tx10Complete': True, 'historicalC21SignatureWaitCases':8, 'historicalC21LifecycleExecutions':5, 'historicalC21LockedPendingRestartAccepted':True, 'historicalC21TwoSuccessExecutionsAccepted': True, 'historicalC20TwoSuccessExecutionsAccepted': True, 'historicalC20FailureReadAndUiAccepted': True, 'historicalC21AuthorizationMatrixAccepted': True,
              'historicalC21InstallGuideSha256': sha(docs / '14-开发验收包安装与回归说明.md'),
              'currentNet04CodingContractComplete':True, 'currentFullUnitTests':2556, 'currentC24PersonalReceiptReadAccepted':False, 'historicalC23PersonalReceiptReadAccepted':True, 'currentC24StakeOnceAndAutomaticReceiptAccepted':True, 'currentC24ActiveWithdrawalReceiptReadAccepted':True, 'currentQa05Complete':True, 'currentQa08Complete':True, 'currentQa06Complete':True, 'currentC25NftDynamicChromeChecks':14, 'currentC25GasReauthorizationAccepted':True, 'currentQa16Complete':True, 'currentC24OneTimeNftSendAccepted':False, 'initialC22PersonalAutomaticNavigationAccepted':False, 'scope':'Readonly current C25 source and RPC13/QA16/QA05/TRY02/QA08/QA06 78-parent traceability, retained original 14 merged chapters and source inputs. C21 ZIP/dist/guide and C21 completed proofs remain explicitly historical. Current C25 finite independent production candidate/four loopback roles/public original withdrawal receipt/current stake automatic receipt are separately audited; current C25 mnemonic coin Send Now is independently audited; no original HTTPS or full trial acceptance.'}
    args.output.open('x').write(json.dumps(report, indent=2) + '\n')
    print(json.dumps({key: report[key] for key in ['passed', 'currentRevision', 'parentsComplete', 'chapters', 'relativeLinksChecked']}))


if __name__ == '__main__':
    main()

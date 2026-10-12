#!/usr/bin/env python3
# Copyright (c) LinkU Labs, Inc.
# SPDX-License-Identifier: Apache-2.0
"""Audit the actual account lifecycle proof without opening any wallet profile."""
import argparse
from datetime import datetime, timezone
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
from urllib.parse import urlparse


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    assert not args.output.exists()
    wallet = Path(__file__).resolve().parents[1]
    logs = wallet / 'migrationToGRpcOrGraphQLDoc/workLog'
    sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
    read = lambda p: json.loads(Path(p).read_text())
    proof_stem = '20261006-QA-A01-reviewed-upgrade-07'
    proof = read(logs / (proof_stem + '.json'))
    assert proof['passed'] and proof['checkCount'] == len(proof['checks']) == 116
    assert proof['accountPackageUpgradeAccepted'] and proof['actualWalletPersonalMessageAccepted']
    assert proof['signatures'] == 4 and len(proof['personalMessages']) == 2
    assert {r['type'] for r in proof['personalMessages']} == {'mnemonic-derived', 'imported'}
    assert all(r['verified'] and r['personalSignatures'] == 2 and len(r['checks']) == 10 for r in proof['personalMessages'])
    assert not proof['signingErrors'] and not proof['actualWalletTransactionSigningAccepted']
    assert all(proof[k] == 0 for k in ('simulations', 'executions', 'certificateChanges', 'originalProfilesOpened'))
    assert len(set(proof['addresses'])) == 3 and proof['importedAddress'] not in proof['addresses']
    for file, digest in proof['inputsSha256'].items():
        assert sha(file) == digest
    candidate = read(logs / '20261006-NET-04-reviewed-production-build-03.json')
    older = read(logs / '20261006-indexed-event-production-build-01.json')
    stages = proof['stages']
    assert [r['label'] for r in stages] == ['created wallet', 'created wallet restart', 'older production accounts',
                                          'reviewed production upgrade accounts', 'recovered wallet', 'recovered wallet restart']
    assert len({r['profile'] for r in stages}) == 2
    for index, stage in enumerate(stages):
        package = older if index == 2 else candidate
        assert stage['observationsSettledBeforeExit'] and stage['workerSource']['matchesDisk']
        assert stage['workerSource']['workerSha256'] == package['artifacts']['background.js']
        assert stage['uiSource']['matchesDisk'] and len(stage['uiSource']['loadedBundles']) == 3
        for row in stage['uiSource']['loadedBundles']:
            assert row['loadedSha256'] == package['artifacts'][row['file']]
        assert Path(stage['profile']).is_dir()
        if index in (2, 3):
            reload = stage['workerReload']
            assert reload['reloaded'] and reload['wakeSurface'] == 'toolbar-popup'
            assert not reload['before']['matchesDisk'] and reload['after']['matchesDisk']
    assert len({r['encryptedLogicalSha256'] for r in stages[1:4]}) == 1
    checks = {r['name'] for r in proof['checks'] if r['passed']}
    for name in ('actual 12-word backup', 'actual created mnemonic SDK address', 'real recovery SDK address',
                 'actual private key imported', 'actual local network selection'):
        assert name in checks
    for label in ('created wallet restart', 'older production accounts', 'reviewed production upgrade accounts', 'recovered wallet restart'):
        for suffix in ('all accounts retained', 'all locked', 'encrypted source unchanged'):
            assert label + ' ' + suffix in checks
        addresses = proof['addresses'] + ([] if label == 'recovered wallet restart' else [proof['importedAddress']])
        for address in addresses:
            for suffix in ('wrong export', 'wrong unlock', 'correct unlock', 'actual decrypted key'):
                assert f'{label} {suffix} {address}' in checks
    for request in proof['forwardedRequests']:
        url = urlparse(request['origin'])
        assert url.scheme == 'http' and url.hostname == '127.0.0.1'
        if url.port == 39400:
            assert request['path'] in ('/rtd.rpc.v2.LedgerService/GetServiceInfo', '/rtd.rpc.v2.LedgerService/GetCheckpoint')
    failures = []
    for p in sorted(logs.glob('20261006-QA-A01-reviewed-*.json')):
        data = read(p)
        if data.get('passed') is False and 'fixture' in data:
            assert Path(data['fixture']).is_dir()
            failures.append({'file': p.name, 'sha256': sha(p), 'fixture': data['fixture'], 'stage': data['stage']})
    assert len(failures) == 8
    spec = importlib.util.spec_from_file_location('builder', wallet / 'scripts/build-reviewed-local-extension.py')
    builder = importlib.util.module_from_spec(spec); spec.loader.exec_module(builder)
    product_sha, files = builder.source_hash(wallet)
    assert candidate['sourceAfter'] == {'sha256': product_sha, 'files': files}
    browser = Path.home() / 'Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
    sdk = wallet.parent.parent / 'rtd-ts-sdk'
    profile_file = Path.home() / '.local/state/rtd-wallet-migration/dev-20261003-01/wallet-profile-20261004-03/profile.json'
    profile = read(profile_file)
    assert sha(profile_file) == candidate['profileSha256']
    evidence_files = [proof_stem + '.json', proof_stem + '.log', '20261006-QA-A01-reviewed-upgrade-06-source.cjs.txt',
                      '20261006-QA-A01-before-worker-wake-popup-source.cjs.txt',
                      '20261006-QA-A01-reviewed-account-02.json', '20261006-QA-A01-reviewed-personal-02.json',
                      '20261006-account-upgrade-owners-01.json']
    report = {'passed': True, 'observedAt': datetime.now(timezone.utc).isoformat(),
              'sourceSha256': product_sha, 'sourceFiles': files, 'accountChecks': 116,
              'actualPersonalMessageSignaturesAfterUpgrade': 4, 'accountTypes': ['mnemonic-derived', 'imported'],
              'derivedPaths': [f"m/44'/784'/{i}'/0'/0'" for i in range(3)],
              'normalMnemonicCreateAndRecoveryAccepted': True, 'encryptedUpgradePreserved': True,
              'passwordProtectionAccepted': True, 'actualLoadedPackagesVerified': True,
              'actualWorkerReloads': 2, 'ownedObservationsSettled': 6, 'testWakeSurface': 'toolbar-popup',
              'expectedGenesisDigest': profile['expectedGenesisDigest'], 'generation': profile['generation'],
              'profileRevision': profile['revision'], 'profileSha256': sha(profile_file),
              'browserVersionAfterTest': subprocess.check_output([str(browser), '--version'], text=True).strip(),
              'browserExecutableSha256': sha(browser),
              'sdkHeadAtAudit': subprocess.check_output(['git', '-C', str(sdk), 'rev-parse', 'HEAD'], text=True).strip(),
              'sdkWorkingSourceIncludedInProductHash': True,
              'simulations': 0, 'executions': 0, 'certificateChanges': 0, 'originalProfilesOpened': 0,
              'transactionSigningAccepted': False, 'normalChromeHttpsAccepted': False,
              'unexpectedTerminationRecoveryAccepted': False,
              'proofs': [{'file': f, 'sha256': sha(logs / f)} for f in evidence_files],
              'retainedFailures': failures,
              'scope': 'QA-A01 account-only contract: actual Chrome extension creation/backup/recovery/derivation/import, passwords, encrypted upgrade, and ordinary/imported PersonalMessage baselines. Monetary transaction signing, TLS, forced shutdown and full trial remain separate open tasks. Raw 07 proof conservatively left full QA-A01 pending until this independent contract audit.'}
    args.output.open('x').write(json.dumps(report, indent=2) + '\n')
    print(json.dumps({'passed': True, 'accountChecks': 116, 'actualPersonalMessageSignatures': 4, 'retainedFailures': len(failures)}))


if __name__ == '__main__':
    main()

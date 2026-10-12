#!/usr/bin/env python3
"""Read-only C20 provenance and bounded acceptance audit; historical C19 remains separate."""
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
    parser.add_argument('--funded-proof', type=Path)
    parser.add_argument('--qa09-proof', type=Path)
    args = parser.parse_args()
    assert not args.output.exists()
    wallet = Path(__file__).resolve().parents[1]
    docs = wallet / 'migrationToGRpcOrGraphQLDoc'
    logs = docs / 'workLog'
    read = lambda p: json.loads(Path(p).read_text())
    sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
    spec = importlib.util.spec_from_file_location('build', wallet / 'scripts/build-reviewed-local-extension.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    current_sha, current_count = module.source_hash(wallet)
    build_file = logs / '20261006-native-retention-production-build-01.json'
    build = read(build_file)
    audit_file = logs / '20261006-native-retention-production-audit-01.json'
    audit = read(audit_file)
    assert build['passed'] and build['sourceUnchanged'] and build['compilationErrors'] == 0
    assert build['sourceAfter'] == {'sha256': current_sha, 'files': current_count}
    assert audit['passed'] and audit['inputsUnchanged'] and audit['source'] == build['sourceAfter']
    assert (audit['moduleCount'], audit['uniqueSourceCount'], len(audit['chunks'])) == (5274, 2032, 7)
    for name, digest in build['artifacts'].items():
        assert sha(Path(build['output']) / name) == digest
    for file, digest in audit['inputsSha256'].items():
        assert sha(file) == digest
    full = logs / '20261006-native-retention-full-01.log'
    assert re.search(r'Test Files\s+178 passed \(178\)', full.read_text())
    assert re.search(r'Tests\s+2520 passed \(2520\)', full.read_text())
    types = logs / '20261006-native-retention-types-01.log'
    assert not types.read_text().strip()
    dev_file = logs / '20261006-native-retention-dev-build-01.json'
    dev = read(dev_file)
    assert dev['passed'] and dev['buildExitCode'] == 0 and dev['sourceUnchanged']
    assert (dev['sourceSha256'], dev['sourceFiles']) == (current_sha, current_count)
    for name, row in dev['compiledProfile']['bundles'].items():
        assert sha(wallet / 'dist' / name) == row['sha256']
    # Reconstruct exact C19 bytes without modifying any working source or opening a profile.
    rows = {}
    for directory in (wallet / 'src', wallet / 'configs', wallet.parent / 'core/src',
                      wallet.parent.parent / 'rtd-ts-sdk/packages/typescript/src'):
        for file in directory.rglob('*'):
            if file.is_file():
                rows[str(file.relative_to(wallet.parent.parent))] = sha(file)
    for file in (wallet / 'package.json', wallet / 'webpack.config.ts', wallet.parent / 'pnpm-lock.yaml'):
        rows[str(file.relative_to(wallet.parent.parent))] = sha(file)
    previous_file = docs / 'evidence/20261006-native-retention-c19-before/manifest.json'
    previous = read(previous_file)
    for row in previous['preservedSources']:
        assert sha(row['preserved']) == row['sha256']
        rows[str(Path(row['original']).relative_to(wallet.parent.parent))] = row['sha256']
    assert not previous['newFiles']
    historical_sha = hashlib.sha256(json.dumps(rows, sort_keys=True).encode()).hexdigest()
    assert (historical_sha, len(rows)) == (previous['priorProductSourceSha256'], previous['priorProductSourceFiles'])
    old_build = read(logs / '20261006-NET-04-reviewed-production-build-03.json')
    assert old_build['sourceAfter'] == {'sha256': historical_sha, 'files': len(rows)}
    for name, digest in old_build['artifacts'].items():
        assert sha(Path(old_build['output']) / name) == digest
    for name, digest in previous['artifactHashes'].items():
        assert sha(Path(previous['artifacts']) / name) == digest
    tasks = re.findall(r'^- \[([ x])\] `([A-Z]+-[A-Z0-9]+)`', (docs / 'Task.md').read_text(), re.M)
    assert len(tasks) == len({task[1] for task in tasks}) == 98
    accepted = False
    funded = None
    if args.funded_proof:
        funded = read(args.funded_proof)
        assert funded['passed'] and funded['checkCount'] == len(funded['checks'])
        assert funded['actualWalletTransactionSigningAccepted'] and funded['transactionSignatures'] == 2
        assert funded['personalSignatures'] == 4 and funded['signatures'] == 6
        assert funded['executeRequests'] == funded['executions'] == funded['certificateChanges'] == funded['originalProfilesOpened'] == 0
        assert len(funded['funding']) == 2 and funded['faucetRequests'] == 2
        assert {row['type'] for row in funded['personalMessages']} == {'mnemonic-derived', 'imported'}
        assert all(row['verified'] and row['signOnly']['verified'] and row['signOnly']['previewDigestMatches'] for row in funded['personalMessages'])
        assert all(row['checksEnabled'] for row in funded['simulationWire'])
        for message in funded['personalMessages']:
            same = [row for row in funded['simulationWire'] if row['bytesSha256'] == message['signOnly']['bytesSha256']]
            assert len(same) == 2 and all(not row['doGasSelection'] for row in same)
        for stage in funded['stages']:
            assert stage['workerSource']['matchesDisk'] and stage['workerSource']['workerSha256'] == build['artifacts']['background.js']
            assert stage['uiSource']['matchesDisk'] and stage['observationsSettledBeforeExit']
            for row in stage['uiSource']['loadedBundles']:
                assert row['loadedSha256'] == build['artifacts'][row['file']]
        for file, digest in funded['inputsSha256'].items():
            assert sha(file) == digest
        accepted = True
    execution_accepted = False
    if args.qa09_proof:
        qa09 = read(args.qa09_proof)
        assert qa09['passed'] and qa09['qa09ContractComplete']
        assert qa09['source'] == build['sourceAfter'] and qa09['candidate'] == build['output']
        assert qa09['currentActualSuccessfulExecutions'] == 2 and qa09['currentActualSignatures'] == 8
        assert qa09['currentFailedDigestRereadAndSignatureAccepted'] and qa09['currentFailedUiJournalUnchanged']
        assert not qa09['newC20FailedSubmissionClaimed']
        for row in qa09['proofs']:
            assert sha(row['file']) == row['sha256']
        execution_accepted = True
    report = {'passed': True, 'observedAt': datetime.now(timezone.utc).isoformat(),
              'currentRevision': 'C20', 'sourceSha256': current_sha, 'sourceFiles': current_count,
              'reconstructedHistoricalC19Sha256': historical_sha, 'historicalC19CandidateRetained': True,
              'fullTestFiles': 178, 'fullTests': 2520, 'typesAccepted': True,
              'productionCandidate': build['output'], 'productionModules': 5274, 'productionSources': 2032,
              'productionChunks': 7, 'parentsComplete': sum(mark == 'x' for mark, _ in tasks), 'parentsTotal': 98,
              'actualCurrentSignOnlyAccepted': accepted, 'actualCurrentPublicExecutionAccepted': execution_accepted,
              'currentQa09ContractAccepted': execution_accepted, 'newCurrentFailedSubmissionAccepted': False,
              'normalChromeHttpsAccepted': False, 'trialReady': False,
              'proofs': [{'file': str(file), 'sha256': sha(file)} for file in [build_file, audit_file, previous_file, full, types, dev_file] + ([args.funded_proof] if args.funded_proof else []) + ([args.qa09_proof] if args.qa09_proof else [])],
              'scope': 'Current source, dev and exact isolated production, full tests/types, exact C19 reconstruction and retained candidate. Optional funded sign-only and two approved successful executions/A09 closure are separately verified. Historical failed dispatch is not a new C20 failed submission. No all-page/browser, dev-service health, forced shutdown, HTTPS or full trial claim.'}
    args.output.open('x').write(json.dumps(report, indent=2) + '\n')
    print(json.dumps({key: report[key] for key in ['passed', 'currentRevision', 'sourceSha256', 'actualCurrentSignOnlyAccepted', 'parentsComplete']}))


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""Close only A09's explicit signing/terminal-receipt contract, with historical failure labeled."""
from datetime import datetime, timezone
from pathlib import Path
import argparse
import hashlib
import json


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    assert not args.output.exists()
    wallet = Path(__file__).resolve().parents[1]
    logs = wallet / 'migrationToGRpcOrGraphQLDoc/workLog'
    runtime = Path.home() / '.local/state/rtd-wallet-migration/dev-20261003-01'
    read = lambda p: json.loads(Path(p).read_text())
    sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
    build = read(logs / '20261006-native-retention-production-build-01.json')
    success_file = logs / '20261006-TX-reviewed-public-execution-01.json'
    success = read(success_file)
    success_audit_file = logs / '20261006-TX-reviewed-public-execution-audit-01.json'
    success_audit = read(success_audit_file)
    assert success['passed'] and success['checkCount'] == len(success['checks']) == 106
    assert success['actualWalletExecutionAccepted'] and success['actualWalletTransactionSigningAccepted']
    assert success['executeRequests'] == success['executions'] == 2 and success['signatures'] == 8
    assert success_audit['passed'] and success_audit['proofSha256'] == sha(success_file)
    assert success_audit['source'] == build['sourceAfter'] and success_audit['originalDigestLookups'] == 2
    assert success_audit['auditExecuteRequests'] == success_audit['auditSimulations'] == 0
    for file, digest in success['inputsSha256'].items():
        assert sha(file) == digest
    original_failure_file = runtime / 'dapp-execution-browser-01/fault-execution-failure-01.json'
    original = read(original_failure_file)
    assert original['passed'] and original['state'] == 'confirmed-failure' and original['dispatches'] == 1
    assert original['dappResult']['$kind'] == 'FailedTransaction'
    digest = original['digest']
    native_file = logs / '20261006-QA-A09-current-failed-native-01.json'
    native = read(native_file)
    signature_file = logs / '20261006-QA-A09-current-failed-signature-01.json'
    signature = read(signature_file)
    ui_file = logs / '20261006-QA-A09-current-failed-ui-04.json'
    ui = read(ui_file)
    assert native['passed'] and native['digest'] == digest and not native['failure']['success']
    assert native['failure']['checkpoint'] == '390790' and native['error']['$kind'] == 'MoveAbort'
    assert native['dispatches'] == native['simulations'] == 0
    assert native['standard']['bytes'] == original['bytesBase64']
    assert native['standard']['signature'] == original['dappResult']['FailedTransaction']['signatures'][0]
    assert signature['passed'] and signature['actualOriginalFailedSignatureVerified']
    assert signature['digest'] == digest and signature['sender'] == original['accountAddress']
    assert ui['passed'] and ui['checkCount'] == len(ui['checks']) == 12 and ui['digest'] == digest
    assert ui['before'] == ui['after'] and ui['before']['rows'] == []
    assert ui['originalSourceUnchanged'] and ui['workerSource']['matchesDisk']
    assert ui['workerSource']['workerSha256'] == build['artifacts']['background.js']
    for row in ui['uiSource']['loadedBundles']:
        assert row['loadedSha256'] == build['artifacts'][row['file']]
    assert len(ui['uiSource']['loadedBundles']) == 3
    assert all(ui[key] == 0 for key in ['signatures', 'simulations', 'executions', 'certificateChanges', 'originalProfilesOpened'])
    assert all(not row['method'].endswith(('/SimulateTransaction', '/ExecuteTransaction')) for row in ui['requests'])
    for file, digest_value in ui['inputsSha256'].items():
        assert sha(file) == digest_value
    failures = []
    for number in range(1, 4):
        file = logs / f'20261006-QA-A09-current-failed-ui-{number:02}.json'
        failure = read(file)
        assert not failure['passed'] and Path(failure['clone']).is_dir()
        source = logs / f'20261006-QA-A09-current-failed-ui-{number:02}-source.cjs.txt'
        assert source.is_file()
        failures.append({'file': str(file), 'sha256': sha(file), 'profile': failure['clone'], 'sourceSha256': sha(source)})
    files = [success_file, success_audit_file, original_failure_file, native_file, signature_file, ui_file,
             logs / '20261006-native-retention-revision-audit-02.json']
    report = {'passed': True, 'observedAt': datetime.now(timezone.utc).isoformat(), 'qa09ContractComplete': True,
              'currentRevision': 'C20', 'source': build['sourceAfter'], 'candidate': build['output'],
              'currentChromeSuccessChecks': 106, 'currentChromeFailedReceiptChecks': 12,
              'currentActualSignatures': 8, 'currentActualSuccessfulExecutions': 2,
              'historicalActualFailedExecutionDigest': original['digest'], 'historicalFailureDispatches': 1,
              'currentFailedDigestRereadAndSignatureAccepted': True, 'currentFailedUiJournalUnchanged': True,
              'newC20FailedSubmissionClaimed': False, 'auditSimulations': 0, 'auditExecutions': 0,
              'retainedUiFailures': failures, 'proofs': [{'file': str(file), 'sha256': sha(file)} for file in files],
              'scope': 'A09 explicit contract: current ordinary/imported fixed bytes/signatures, two one-shot successful approved executions, historical real one-shot FailedTransaction and current native BCS/signature/MoveAbort/UI reread. Failure is historical, not a new C20 failed dispatch. Sponsor/all amounts, abrupt fault lifecycle, normal HTTPS and full trial remain separately open.'}
    args.output.open('x').write(json.dumps(report, indent=2) + '\n')
    print(json.dumps({'passed': True, 'qa09ContractComplete': True, 'currentSuccessfulExecutions': 2, 'historicalFailureDispatches': 1}))


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""Read-only cross-evidence closure of TX-04 M4; no browser/profile/store/network operations."""
import hashlib
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path


def sha(file):
    return hashlib.sha256(Path(file).read_bytes()).hexdigest()


def main():
    wallet = Path(__file__).resolve().parents[1]
    logs = wallet / 'migrationToGRpcOrGraphQLDoc/workLog'
    window_file, output = map(lambda f: Path(f).resolve(), sys.argv[1:])
    assert not output.exists()
    files, rows = {}, {}
    names = {
        'build': 'default-generation-positive-C43-build',
        'closure': 'default-generation-positive-C43-audit',
        'delta': 'C43-staking-draft-delta-audit',
        'origin': 'positive-C43-origin-edge-independent',
        'indexed': 'C43-original-stake-indexed-independent',
        'live': 'C43-staking-forms-live-lock-chrome',
        'liveAudit': 'C43-staking-forms-live-lock-independent',
        'receipt': 'C43-staking-indexed-receipt-chrome',
        'receiptAudit': 'C43-staking-indexed-receipt-independent',
        'creator': 'C43-direct-NFT-retained-pending-chrome',
        'creatorAudit': 'C43-direct-NFT-retained-pending-independent',
        'cold': 'C43-staking-retained-pending-chrome',
        'coldAudit': 'C43-staking-retained-pending-independent',
    }
    stage, report = 'immutable current evidence', {}
    try:
        for key, name in names.items():
            file = logs / ('20261007-' + name + ('-02.json' if key == 'liveAudit' else '-01.json'))
            row = json.loads(file.read_text())
            assert row['passed'], str(file)
            for input_file, digest in row.get('inputsSha256', {}).items():
                assert sha(input_file) == digest, input_file
            files[key], rows[key] = file, row
        window = json.loads(window_file.read_text())
        assert window['passed'] and window['catchupAccepted'] and window['ownershipSuccessorAccepted']
        assert window['currentC43OriginRegistered'] and window['effectiveAssetWindow']['originalStakingExecutionHeightReached']
        assert (datetime.now(timezone.utc) - datetime.fromisoformat(window['observedAt'].replace('Z', '+00:00'))).total_seconds() < 300
        for file, digest in window['inputsSha256'].items():
            assert sha(file) == digest, file
        source = json.loads(subprocess.check_output([
            '/Users/changzechuan/.vfox/sdks/nodejs/bin/node', '-e',
            "console.log(JSON.stringify(require('./scripts/build-reviewed-generation-production-extension.cjs').productSource()))",
        ], cwd=wallet, text=True))
        build = rows['build']
        assert source == build['sourceAfter']
        for file, digest in build['artifacts'].items():
            assert sha(Path(build['output']) / file) == digest
        for key in ['indexed', 'live', 'liveAudit', 'receipt', 'receiptAudit', 'creator', 'creatorAudit', 'cold', 'coldAudit']:
            assert rows[key]['source'] == source, key
        assert len(rows['origin']['gates']) == 78 and len(rows['origin']['graphqlIdentities']) == 12
        assert len(rows['origin']['realTlsHandshakes']) == 3
        indexed, live, live_audit = rows['indexed'], rows['live'], rows['liveAudit']
        receipt, receipt_audit = rows['receipt'], rows['receiptAudit']
        creator, creator_audit = rows['creator'], rows['creatorAudit']
        cold, cold_audit = rows['cold'], rows['coldAudit']
        owner, h0, generation = indexed['owner'], indexed['h0'], indexed['generation']
        for key in ['live', 'liveAudit', 'receipt', 'receiptAudit', 'creator', 'creatorAudit', 'cold', 'coldAudit']:
            assert rows[key]['owner'] == owner
        for key in ['live', 'liveAudit', 'receipt', 'receiptAudit', 'creatorAudit', 'coldAudit']:
            assert rows[key]['h0'] == h0
        assert live['generation'] == live_audit['generation'] == generation
        assert indexed['originalStakeIndexedInBothProductionDomains']
        assert indexed['originalCheckpoint'] == live['originalStakingCheckpoint'] == cold['originalStakingCheckpoint'] == '332734'
        assert indexed['originalDigest'] == live['originalStakingDigest'] == cold['originalStakingDigest']
        assert indexed['stakeId'] == live['stakeId'] == cold['stakeId'] == cold_audit['freshOriginalStakeAndSystem'][0]['objectId']
        assert live['validator'] == cold['validator']
        stage = 'live lock and canonical previews'
        assert live_audit['actualCurrentFullFormsLockRefusals'] == 2
        assert live_audit['canonicalFinalEffectsVerified'] == 5 and live_audit['kindFeeSelectionsVerified'] == 3
        assert live_audit['originalSimulationFramesVerified'] == 8
        assert live_audit['signaturesReturned'] == live['signatureCount'] == live['executeRequests'] == 0
        assert live_audit['nativeLockReleaseAndSignerRestoreAccepted'] and live_audit['completeJournalUnchangedAndNormalRelock']
        assert live['initialJournal'] == live['finalJournal'] == receipt['initialJournal'] == receipt['finalJournal']
        assert all(value == [] for value in live['finalJournal'].values())
        assert receipt_audit['currentC43OriginalStakingIndexedReceiptAccepted']
        assert receipt_audit['receipts'][0]['indexCovered'] is True
        stage = 'same product pending after actual cold native owner close'
        assert creator['executeAttempts'] == 1 and creator['forwardedExecuteRequests'] == 0
        assert creator['signatureCount'] == 1 and len(creator['simulations']) == 2 and not creator['journalSeeded']
        assert creator_audit['originalProductExecuteAttempts'] == 1 and creator_audit['originalExecuteForwarded'] == 0
        assert creator['variant']['digest'] == creator_audit['digest'] == cold['variant']['digest'] == cold_audit['originalPendingDigest']
        assert creator['profile'] == cold['profile']
        assert creator['pendingJournal'] == creator['finalJournal'] == cold['initialJournal'] == cold['pendingJournal'] == cold['finalJournal']
        assert creator['encryptedBefore'] == cold['encryptedBefore']
        assert creator['variant']['scope'] == cold['variant']['scope'] == live['scopeKey']
        assert [row['kind'] for row in cold['forms']] == ['stake', 'withdraw']
        assert cold['currentC43StakingDurablePendingAccepted'] and not cold['forbiddenOperations']
        assert cold['executeAttempts'] == cold['signatureCount'] == len(cold['simulations']) == 0
        assert cold_audit['actualCurrentForms'] == 2 and cold_audit['originalPendingCreatorNotRerun']
        assert cold_audit['simulations'] == cold_audit['signatures'] == cold_audit['executeRequests'] == 0
        assert cold_audit['allThreeStoresAndEncryptedAccountRetained'] and cold_audit['currentColdLockedUnlockFreeLockAccepted']
        assert not live_audit['parentTX04Complete'] and not creator_audit['parentTX04Complete'] and not cold_audit['parentTX04Complete']
        stage = 'current owned Chrome absent and no additional operation'
        process_commands = subprocess.check_output(['ps', '-Ao', 'command='], text=True).splitlines()
        profiles = [live['profile'], creator['profile']]
        assert all(not any('Google Chrome' in command and '--user-data-dir=' + profile in command for command in process_commands) for profile in profiles)
        report = {
            'passed': True, 'observedAt': datetime.now(timezone.utc).isoformat(),
            'source': source, 'h0': h0, 'generation': generation, 'owner': owner,
            'originalStakeDigest': indexed['originalDigest'], 'originalStakeCheckpoint': '332734',
            'originalPendingDigest': creator['variant']['digest'], 'currentTX04M4Accepted': True,
            'liveCompleteFormRefusals': 2, 'liveOriginalEnabledSimulations': 8,
            'canonicalFinalEffects': 5, 'kindFeeSelections': 3, 'coldCompleteFormRefusals': 2,
            'onceProductPendingExecuteAttempt': 1, 'productExecuteForwarded': 0,
            'creatorNeverRerun': True, 'crossEvidenceJournalCipherScopeAndOriginalStakeExact': True,
            'ownedChromeAbsent': True, 'auditSimulations': 0, 'auditSignatures': 0, 'auditExecuteRequests': 0,
            'retainedLiveMissingReadBodies': live_audit['retainedOriginalReadCaptureErrors'],
            'retainedCreatorMissingRecoveryBodies': creator_audit['retainedMissingOriginalRecoveryBodies'],
            'retainedColdMissingRecoveryBodies': cold_audit['retainedOriginalMissingRecoveryBodies'],
            'parentTX04Complete': False, 'allNFTMatrixAccepted': False, 'sustainedAvailabilityAccepted': False,
            'normalChromeHttpsAccepted': False,
            'inputsSha256': {str(file): sha(file) for file in [Path(__file__).resolve(), window_file, *files.values()]},
            'scope': 'Cross-evidence current C43 M4 only: same source/artifacts/H0/generation/owner; actual live full forms and canonical previews; once never-forwarded product pending and two actual cold full routes with unchanged stores/cipher, free native lock, normal relock/exit. Prior failures and missing original bodies retained. No new operation, all NFT, sustained health or parent acceptance.',
        }
    except Exception as error:
        report = {'passed': False, 'observedAt': datetime.now(timezone.utc).isoformat(), 'stage': stage,
                  'errorType': type(error).__name__, 'message': str(error)[:800]}
        raise
    finally:
        with output.open('x', encoding='utf-8') as stream:
            json.dump(report, stream, indent=2); stream.write('\n')
        print(json.dumps({'passed': report['passed'], 'stage': report.get('stage'), 'currentTX04M4Accepted': report.get('currentTX04M4Accepted')}))


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""Join completed full-data recovery evidence; never start or alter a service."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import sys

W = Path(__file__).resolve().parents[1]
D = W / 'migrationToGRpcOrGraphQLDoc'
L = D / 'workLog'
B = Path.home() / '.local/state/rtd-wallet-migration/dev-20261006-03/publication-foundation'
inputs = {}


def read(path, **required):
    path = Path(path)
    value = json.loads(path.read_text())
    assert value.get('passed') is True, path
    assert all(value.get(k) == v for k, v in required.items()), (path, required)
    inputs[str(path)] = hashlib.sha256(path.read_bytes()).hexdigest()
    return value


def main():
    assert sys.argv[1:] in [['wal'], ['archive']]
    mode = sys.argv[1]
    read(L/'20261012-C348-full-data-comparison-01.json', completeDataComparisonAccepted=True,
         threeAccountBusinessResultsEqual=True, historicalBitmapDefectSourceAndDataFixed=True)
    read(L/'20261012-C353-complete-rebuilt-cold-01.json', allNineContainersSimultaneouslyDown=True,
         sameNineContainersAndVolumesRestarted=True, originalG3G4AndOutsideContainersUnchanged=True)
    summaries = {}
    for phase in ('cold', 'post-wal'):
        prefix = 'C354' if phase == 'cold' else 'C358'
        for kind in ('sql', 'hbase', 'rocks', 'publication', 'accounts'):
            suffix = '02' if (prefix, kind) == ('C354', 'sql') else '01'
            proof = read(L/f'20261012-{prefix}-{phase}-{kind}-{suffix}.json', fullPersistedComparisonPassed=True)
            summaries[f'{phase}-{kind}'] = proof.get('details', proof.get('comparison'))
    crash = read(L/'20261012-C357-wal-fault-recovered-01.json', actualHbaseCrashAndWalReplay=True,
         actualPostgresImmediateAndWalReplay=True, postgresCommittedPreserved=True,
         postgresUncommittedRolledBack=True, temporaryProbeTableAndDatabaseRemoved=True,
         outsideContainersAndOriginalChainsUnchanged=True)
    inventories = {}
    for role, count in [('published', 795324), ('stage', 1006772), ('replica', 795324)]:
        p = B/'C354-cold-full-data-comparison-20261012-01/parallel-02'/f's3-{role}'/'complete.json'
        inventories[role] = read(p, everyVersionAndSizeAndLatestFlagMatched=True, versions=count,
                                allObjectBodiesRepeatedAfterCold=False, priorFullBodyProofReused=True)
    read(L/'20261012-C341-published-version-resume-01.json', exactVersionsAndBytesReadBack=True,
         copiedObjects=795320, frozenPublishedThrough=709569, uncommittedTailPublished=False)
    read(L/'20261012-C345-referenced-stage-inventory-01.json', allRestoredBytesAndVersionInventoryVerified=True)
    read(B/'C346-pending-stage-restore-20261012-01/complete.json', everyRestoredByteAndVersionVerified=True,
         completeStageVersionInventoryChecked=1006772, publicationAdvanced=False)
    read(L/'20261012-C340-complete-recovery-replica-01.json', everyReplicaBodyShaAndVersionVerified=True,
         checkpointVersions=795320, metadataVersions=4)
    extra = {}
    if mode == 'archive':
        read(L/'20261012-C363-complete-wal-01.json', fullPersistentDataAndWalAccepted=True)
        read(L/'20261012-C352-recovered-archive-reader-01.json', actualRestoredSourceReplicaSqlReads=True,
             completeRestoredLedgerValidated=True, uncommittedTailDenied=True, through=709569)
        read(L/'20261012-C359-historical-fence-restored-01.json', historicalStorageFenceRestored=True,
             historicalSqlUnchanged=True, historicalPublisherImported=False, newWriterLeaseGranted=False,
             temporaryCoordinatorAndPolicyRemoved=True)
        read(L/'20261012-C361-fence-persistence-01.json', historicalFenceSurvivedRealRestart=True,
             exactContainerAndVolumeRetained=True, newPublisherAuthorized=False, objectWrites=0)
        p = read(L/'20261012-C363-post-recovery-readers-01.json', actualFourSurfaces=True,
                 threeAccountDigestsIdentical=True, archiveTransactionRead=True, signatures=0, executions=0)
        assert all(f.get('status') == 200 and 'errorType' not in f for f in p['frames'])
        read(L/'20261012-C356-backend-generation-01.json', actualBackendGenerationChanged=True,
             rebuiltSqlHbaseRocksArchiveAccountRootsActuallyUsed=True, ordinaryChromeAcceptance=True,
             originalG4Restored=True, temporaryRouteAndProxyCleaned=True)
        extra = dict(archiveOnlyRebuildAccepted=True, recoveryRuntimeReadRequests=len(p['frames']),
                     existingQueryDataRetained=True, historicalPublisherReauthorized=False,
                     independentlyAdmittedReadOnlyServices=True)
    result = dict(passed=True, at=datetime.now(timezone.utc).isoformat(),
                  package='QA-A17.6' if mode == 'wal' else 'QA-A17.9',
                  h0=crash['h0'], fixedQueryRange=[0,709569], fullPersistentDataAndWalAccepted=True,
                  comparisons=summaries, versionCounts={k:v['versions'] for k,v in inventories.items()},
                  fullBodyProofBeforeColdReused=True, everyBodyRedownloadedAfterCold=False,
                  realHbaseAndPostgresWalFaults=True, productionMultiHostHA=False,
                  newTransactions=0, parentCompletion=False, **extra,
                  inputsSha256={**inputs, str(Path(__file__)):hashlib.sha256(Path(__file__).read_bytes()).hexdigest()})
    out=L/f'20261012-C363-complete-{mode}-01.json'
    with out.open('x') as f: json.dump(result,f,ensure_ascii=False,indent=2);f.write('\n')
    print(json.dumps(dict(passed=True,package=result['package'],proof=str(out))))


if __name__ == '__main__': main()

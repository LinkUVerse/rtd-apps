#!/usr/bin/env python3
"""Verify current C19 evidence; reconstruct historical revisions without relabeling them."""
from pathlib import Path
import argparse
import hashlib
import importlib.util
import json
import re
import sys


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    assert not args.output.exists(), 'Fresh evidence required'
    wallet = Path(__file__).resolve().parents[1]
    docs = wallet / 'migrationToGRpcOrGraphQLDoc'
    logs = docs / 'workLog'
    runtime = Path.home() / '.local/state/rtd-wallet-migration/dev-20261003-01'
    foundation = runtime / 'publication-foundation'
    sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
    read = lambda p: json.loads(Path(p).read_text())
    proof = lambda name: read(logs / ('20261006-' + name + '.json'))
    inventory = proof('indexed-event-c19-source-inventory-06')
    for row in inventory['currentSources']:
        assert sha(row['file']) == row['sha256'], 'Current source changed: ' + row['file']
    retained = {}
    for row in inventory['retainedSources']:
        assert sha(row['file']) == row['sha256']
        retained.setdefault(row['sha256'], []).append(row['file'])
    historical_inputs = []
    def verify_input(filename, digest):
        if Path(filename).is_file() and sha(filename) == digest: return
        assert digest in retained, 'Missing exact historical bytes: ' + filename
        historical_inputs.append({'original':filename, 'sha256':digest, 'retained':retained[digest][0]})
    spec = importlib.util.spec_from_file_location('builder', wallet / 'scripts/build-reviewed-local-extension.py')
    builder = importlib.util.module_from_spec(spec); spec.loader.exec_module(builder)
    product_sha, product_files = builder.source_hash(wallet)
    assert (product_sha, product_files) == (inventory['productSourceSha256'], inventory['productSourceFiles'])
    rows = {}
    for folder in (wallet / 'src', wallet / 'configs', wallet.parent / 'core/src', wallet.parent.parent / 'rtd-ts-sdk/packages/typescript/src'):
        for p in folder.rglob('*'):
            if p.is_file(): rows[str(p.relative_to(wallet.parent.parent))] = sha(p)
    for p in (wallet / 'package.json', wallet / 'webpack.config.ts', wallet.parent / 'pnpm-lock.yaml'):
        rows[str(p.relative_to(wallet.parent.parent))] = sha(p)
    ancestry = []
    for folder, phase in [('20261006-indexed-event-c18-before','C18'), ('20261006-terminal-observation-c17-before','C17'), ('20261006-egress-action-before','E5'), ('20261006-private-egress-e4-before','E4'),
                           ('20261006-context-mutation-before','E3'), ('20261006-canonical-egress-c16-before','C16')]:
        backup = read(docs / 'evidence' / folder / 'manifest.json')
        for row in backup['preservedSources']:
            original = Path(row['original']) if 'original' in row else wallet / row['path']
            preserved = Path(row['preserved']) if 'preserved' in row else wallet / row['backup']
            assert sha(preserved) == row['sha256']
            key = str(original.relative_to(wallet.parent.parent))
            if key in rows: rows[key] = row['sha256']
        for filename in backup['newFiles']:
            key = str((wallet / filename).relative_to(wallet.parent.parent))
            if key in rows: del rows[key]
        digest = hashlib.sha256(json.dumps(rows, sort_keys=True).encode()).hexdigest()
        assert (digest,len(rows)) == (backup['priorProductSourceSha256'],backup['priorProductSourceFiles']), phase
        ancestry.append({'phase':phase,'sourceSha256':digest,'sourceFiles':len(rows)})
    current_build = proof('indexed-event-c19-build-01')
    assert current_build['passed'] and current_build['buildExitCode'] == 0 and current_build['sourceUnchanged']
    assert (current_build['sourceSha256'],current_build['sourceFiles']) == (product_sha,product_files)
    for filename, row in current_build['compiledProfile']['bundles'].items(): assert sha(wallet / 'dist' / filename) == row['sha256']
    full = (logs / '20261006-QA-A12-full-01.log').read_text()
    assert re.search(r'Test Files\s+178 passed \(178\)', full)
    assert re.search(r'Tests\s+2514 passed \(2514\)', full)
    assert not (logs / '20261006-QA-A12-types-01.log').read_text().strip()
    production = proof('indexed-event-production-build-01'); audit = proof('indexed-event-production-audit-01')
    assert production['passed'] and production['sourceUnchanged'] and production['currentDevelopmentDistUnchanged']
    assert audit['passed'] and audit['inputsUnchanged'] and audit['source'] == production['sourceAfter'] == {'sha256':product_sha,'files':product_files}
    assert len(audit['chunks']) == 7 and len(audit['entrypoints']) == 5
    assert audit['moduleCount'] == 5274 and audit['uniqueSourceCount'] == 2032
    for name, digest in production['artifacts'].items(): assert sha(Path(production['output']) / name) == digest
    for name, digest in audit['inputsSha256'].items(): verify_input(name,digest)
    native_counts = {}
    for name,count,fixture in [('egress-action-native-03',65,'egress-action-native-03'),
                               ('egress-action-transport-native-01',33,'egress-action-transport-native-01'),
                               ('ui-native-guard-04',5,'ui-native-guard-04'),
                               ('context-mutation-native-04',47,'context-mutation-native-04'),
                               ('canonical-egress-native-02',44,'canonical-egress-store-20261006-02')]:
        d = proof(name); assert d['passed'] and d['checkCount'] == len(d['checks']) == count
        for k in ('signatures','executions','certificateChanges','originalProfileWrites','productionDatabasesOpened'):
            if k in d: assert d[k] == 0
        for k in ('inputsSha256','compilerInputsSha256'):
            for f,digest in d.get(k,{}).items(): verify_input(f,digest)
        if 'compilerMetafileSha256' in d: assert sha(runtime / fixture / 'compiler-metafile.json') == d['compilerMetafileSha256']
        for f,digest in d.get('fixtureFilesSha256',{}).items(): assert sha(runtime / fixture / 'extension' / f) == digest
        native_counts[name] = count
    browser = proof('indexed-event-c19-readonly-01')
    assert browser['passed'] and browser['certificateMode'] == 'normal-ca'
    assert browser['uiSource']['matchesDisk'] and browser['workerSource']['matchesDisk']
    assert browser['externalRequests'] == browser['forbiddenRequests'] == browser['pageErrorCount'] == 0
    assert browser['workerSource']['workerSha256'] == sha(wallet / 'dist/background.js')
    for row in browser['uiSource']['loadedBundles']:
        assert row['matchesDisk'] and row['loadedSha256'] == sha(wallet / 'dist' / row['file'])
    journal = proof('indexed-event-c19-original-journals-01')
    assert journal['passed'] and journal['dispatches'] == journal['simulations'] == 0 and journal['lookups'] == 7
    assert journal['certificateMode'].startswith('normal-ca')
    prior = proof('message-budget-original-journals-02')
    assert [(r['directory'],r['logicalSha256']) for r in journal['profiles']] == [(r['directory'],r['logicalSha256']) for r in prior['profiles']]
    for row in journal['profiles']:
        worker = row['workerProvenance'].get('after',row['workerProvenance']['before'])
        assert worker['matchesDisk'] and worker['workerSha256'] == sha(wallet / 'dist/background.js')
    launcher = wallet.parents[1] / 'link-u-smart-contract/all-in-one-deploy/localDeploy'
    sys.path.insert(0,str(launcher))
    from build_wallet_query_revision import identity
    source = wallet.parents[1] / 'rtd'; current = identity(source)
    deployed = read(foundation / 'message-budget-debug-install-20261006-01/installed-provenance.json')
    assert all(deployed.get(k) == v for k,v in current.items())
    for name,digest in deployed['binaries'].items(): assert sha(source / 'target/debug' / name) == digest
    owners = proof('indexed-event-c19-owners-01')
    assert owners['passed'] and len(owners['nativeProcesses']) == 11 and all(r['ownedCommandMatched'] for r in owners['nativeProcesses'])
    assert owners['consumerAllocation'] == {'indexer':4,'consistent':1,'writer':1}
    sql = proof('c17-sql-observation-01')
    assert sql['readOnlyTls'] and sql['strictHistoryValidated'] and not sql['stateChanged']
    assert sql['dispatches'] == sql['simulations'] == 0 and len(sql['originalWatermarks']) == 22
    from run_wallet_display_history_replay import validate_coverage
    validate_coverage(sql['coverage'],read(foundation / 'display-history-replay-20261005-01/plan.json'),bounded=False)
    previous = proof('producer-sql-observation-02')
    for r in sql['originalWatermarks']:
        old = next(o for o in previous['originalWatermarks'] if o['pipeline'] == r['pipeline'])
        assert r['readerLo'] == old['readerLo'] == 0 and r['checkpointHi'] >= old['checkpointHi']
    signing = proof('terminal-observation-c18-real-lifecycle-01')
    assert signing['passed'] and signing['certificateMode'] == 'normal-ca'
    assert signing['bundleSha256'] == sha(wallet / 'dist/background.js')
    assert signing['dispatchRequests'] == 0 and signing['simulationRequests'] == 27
    assert len(signing['dapp']['signReturnHold']['cases']) == 8
    assert signing['dapp']['networkSwitch']['passed'] and signing['dapp']['signReturnHold']['completeSigningReturnMatrix']
    execution = proof('terminal-observation-c18-public-execution-01')
    assert execution['passed'] and execution['certificateMode'] == 'normal-ca'
    assert execution['bundleSha256'] == signing['bundleSha256']
    assert execution['dispatchRequests'] == 1 and execution['simulationRequests'] == 3
    e = execution['dapp']['execution']
    assert e['signatureVerified'] and e['effectsSuccess'] and e['persistedAcrossBrowserRestart']
    formal = [r for r in execution['simulationWire'] if r['bytesSha256'] is not None]
    assert len(formal) == 2 and all(r['bytesSha256'] == e['bytesSha256'] for r in formal)
    assert read(runtime / 'c18-public-execution-20261006-01/restart-verified.json')['digest'] == e['digest']
    snapshot = proof('c17-common-snapshot-reader-02')
    domains = proof('display-query-domains-after-01')
    assert snapshot['proof']['checkpoint'] == '586007' and domains['probeCompleted']
    assert snapshot['ownedCount'] == 3
    assert sum(v['state'] == 'snapshot-verified' for v in domains['report']['domains'].values()) == 7
    assert domains['report']['domains']['names']['state'] == 'unconfigured' and not domains['allDomainsVerified']
    qa = proof('QA-A11-completion-audit-01'); assert qa['passed']
    for r in qa['proofs']: assert sha(logs / r['file']) == r['sha256']
    binding = read(foundation / 'native-query-stack/graphql/coverage-binding.json')
    result = read(foundation / 'graphql-display-coverage-20261006-01/result.json')
    assert result['applied'] and result['queryPipelines'] == 23
    assert result['originalIndexerConfigUnchanged'] and result['stopSignalRepeated'] is False
    assert binding['sourceId'] == sql['coverage']['sourceId']
    qa18 = proof('QA-A18-completion-audit-01'); assert qa18['passed'] and qa18['sourceSha256'] == ancestry[0]['sourceSha256']
    for row in qa18['proofs']: assert sha(logs / row['file']) == row['sha256']
    qa12 = proof('QA-A12-completion-audit-01')
    assert qa12['passed'] and qa12['sourceSha256'] == product_sha
    assert (qa12['actualTransactions'],qa12['actualEvents'],qa12['actualTypedEvents']) == (16,13,5)
    assert qa12['faultFixturesSeparated'] and not qa12['normalChromeHttpsAccepted']
    for row in qa12['proofs']: assert sha(logs / row['file']) == row['sha256']
    staking = proof('RPC-11-completion-audit-01')
    assert staking['passed'] and staking['sourceSha256'] == product_sha
    assert staking['actualActivePositions'] == 1 and staking['actualRateRows'] == 4
    assert staking['exactArchivedBytesMatched'] and staking['actualEstimatedReward'] == '0'
    assert staking['syntheticScaleRates'] == 10000 and staking['syntheticActiveRatePages'] == 200
    assert not staking['productionScaleAccepted'] and not staking['chromeStakingAccepted']
    assert staking['simulations'] == staking['executions'] == 0
    for row in staking['proofs']: assert sha(logs / row['file']) == row['sha256']
    for name in ('RPC-11-scale-fixture-02', 'RPC-11-independent-audit-02'):
        for filename, digest in proof(name).get('inputsSha256', {}).items(): verify_input(filename, digest)
    release = proof('NET-04-independent-release-audit-01')
    assert release['passed'] and release['certifiedCheckpoints'] == 24451 and release['configuredPackages'] == 4
    assert release['wrongPinRejected'] and not release['serviceDeploymentVerified']
    for row in release['proofs']: assert sha(logs / row['file']) == row['sha256']
    controlled_release = proof('NET-04-controlled-release-audit')
    assert controlled_release['passed'] and controlled_release['compiledModules'] == 3
    for filename,digest in controlled_release['inputsSha256'].items(): verify_input(filename,digest)
    candidate = proof('NET-04-reviewed-production-build-03')
    candidate_audit = proof('NET-04-reviewed-production-audit-01')
    assert candidate['passed'] and candidate['sourceUnchanged'] and candidate['currentDevelopmentDistUnchanged']
    assert candidate['sourceAfter'] == {'sha256': product_sha, 'files': product_files}
    assert candidate['reviewedRelease']['compiled']['passed'] and candidate['reviewedRelease']['inputsUnchanged']
    for filename,digest in candidate['artifacts'].items(): assert sha(Path(candidate['output']) / filename) == digest
    assert candidate_audit['passed'] and candidate_audit['moduleCount'] == 5274 and candidate_audit['uniqueSourceCount'] == 2032
    for filename,digest in candidate_audit['inputsSha256'].items(): verify_input(filename,digest)
    package = proof('TRY-06-package-01')
    assert package['passed'] and package['memberCount'] == len(package['members']) == 36
    assert sha(package['zip']) == package['zipSha256']
    for filename,digest in package['members'].items(): assert sha(Path(package['output']) / filename) == digest
    for name in ('TRY-06-completion-audit-01',):
        completed = proof(name)
        assert completed['passed'] and not completed['trialReady'] and not completed['normalChromeHttpsAccepted']
        for row in completed['proofs']: assert sha(logs / row['file']) == row['sha256']
    install = proof('TRY-07-completion-audit-01')
    assert install['passed'] and sha(docs / install['guide']) == install['guideSha256']
    rollback = proof('REL-03-package-rollback-11')
    assert rollback['passed'] and rollback['checkCount'] == len(rollback['checks']) == 51
    assert rollback['profileConfigurationSeededFixture'] and not rollback['actualProfileSaveAccepted'] and not rollback['wrongGenesisAccepted']
    assert all(rollback[k] == 0 for k in ('signatures','simulations','executions','certificateChanges','originalProfilesOpened'))
    assert len(rollback['stages']) == 3
    expected_background = [production['artifacts']['background.js'],candidate['artifacts']['background.js'],production['artifacts']['background.js']]
    for stage,expected in zip(rollback['stages'],expected_background):
        assert stage['workerSource']['matchesDisk'] and stage['workerSource']['workerSha256'] == expected
        assert len(stage['uiSource']['loadedBundles']) == 3 and stage['uiSource']['matchesDisk']
        assert stage['preserved'] == rollback['baseline'] and stage['recoveryRejected']
        assert stage['customPreviewFailure']['permissionDenied'] and not stage['customPreviewFailure']['chainMismatchObserved']
    assert rollback['baseline']['journalVersion'] == 3 and rollback['baseline']['pendingCount'] == rollback['baseline']['recordCount'] == 1
    for filename,digest in rollback['inputsSha256'].items(): verify_input(filename,digest)
    rollback_failures = proof('REL-03-retained-failures-01')
    assert not rollback_failures['passed'] and len(rollback_failures['attempts']) == 9
    for row in rollback_failures['attempts']:
        assert Path(row['fixture']).is_dir()
        for item in row['files']: assert sha(logs / item['file']) == item['sha256']
    rollback_task = next(line for line in (docs / 'Task.md').read_text().splitlines() if '`REL-03`' in line)
    assert rollback_task.startswith('- [ ]')
    account = proof('QA-A01-reviewed-account-02')
    assert account['passed'] and account['checkCount'] == len(account['checks']) == 50
    assert len(account['stages']) == 4 and len(account['addresses']) == 3
    assert not account['actualWalletSigningAccepted'] and account['signatures'] == account['executions'] == 0
    personal = proof('QA-A01-reviewed-personal-02')
    assert personal['passed'] and personal['checkCount'] == len(personal['checks']) == 55
    assert personal['actualWalletPersonalMessageAccepted'] and personal['signatures'] == 4
    assert personal['executions'] == personal['simulations'] == 0 and len(personal['personalMessages']) == 2
    assert {r['type'] for r in personal['personalMessages']} == {'mnemonic-derived','imported'}
    for report in (account,personal):
        for filename,digest in report['inputsSha256'].items(): verify_input(filename,digest)
        for stage in report['stages']:
            assert stage['workerSource']['workerSha256'] == candidate['artifacts']['background.js']
            assert stage['uiSource']['matchesDisk'] and len(stage['uiSource']['loadedBundles']) == 3
    for name in ('QA-A01-account-finite-audit-01','QA-A01-personal-finite-audit-01'):
        finite = proof(name); assert finite['passed']
        for item in finite['proofs']: assert sha(logs / item['file']) == item['sha256']
    upgrade_failure = proof('QA-A01-reviewed-upgrade-04')
    assert not upgrade_failure['passed'] and len(upgrade_failure['checks']) == 75
    assert upgrade_failure['signatures'] == 'not-counted'
    assert any('尚有未完成' in r['message'] for r in upgrade_failure['signingErrors'])
    diagnostic = proof('QA-A01-upgrade-canonical-diagnostic-02')
    assert diagnostic['passed'] and diagnostic['exists'] and len(diagnostic['rows']) == 1
    assert not diagnostic['rows'][0]['faults'] and len(diagnostic['rows'][0]['pending']) == 1
    qa01 = proof('QA-A01-completion-audit-03')
    assert qa01['passed'] and qa01['accountChecks'] == 116 and qa01['actualPersonalMessageSignaturesAfterUpgrade'] == 4
    assert qa01['encryptedUpgradePreserved'] and qa01['ownedObservationsSettled'] == 6 and qa01['actualWorkerReloads'] == 2
    for item in qa01['proofs']: assert sha(logs / item['file']) == item['sha256']
    for item in qa01['retainedFailures']:
        assert sha(logs / item['file']) == item['sha256'] and Path(item['fixture']).is_dir()
    upgrade = proof('QA-A01-reviewed-upgrade-07')
    assert upgrade['passed'] and upgrade['checkCount'] == 116 and upgrade['signatures'] == 4
    for filename,digest in upgrade['inputsSha256'].items(): verify_input(filename,digest)
    assert next(line for line in (docs / 'Task.md').read_text().splitlines() if '`QA-A01`' in line).startswith('- [x]')
    matrix = proof('QA-A12-pagination-matrix-05')
    assert sha(wallet / 'scripts/probe-indexed-pagination-matrix.ts') == matrix['scriptSha256']
    assert sha(wallet / 'src/shared/rpc/indexed-lists.ts') == matrix['implementationSha256']
    terminal = proof('terminal-observation-native-03')
    assert terminal['passed'] and terminal['checkCount'] == len(terminal['checks']) == 5
    assert all(terminal[k] == 0 for k in ['signatures','executions','certificateChanges','originalProfileWrites','productionDatabasesOpened'])
    for row in terminal['preservedInputs']:
        assert sha(row['preserved']) == row['sha256']
        verify_input(row['original'],row['sha256'])
    assert sha(Path(terminal['fixture']) / 'bundle.js') == terminal['bundleSha256']
    merge = read(docs / 'evidence/20261003-document-merge-manifest.json')
    for row in merge['sources']: assert sha(docs / row['preserved']) == row['sha256']
    chapters = sorted(docs.glob('[0-9][0-9]-*.md'))
    assert [int(p.name[:2]) for p in chapters] == list(range(1,15))
    tasks = re.findall(r'^- \[([ x])\] `([A-Z]+-[A-Z0-9]+)`',(docs / 'Task.md').read_text(),re.M)
    assert len(tasks) == len({i for _,i in tasks}) == 98
    assert sum(m == 'x' for m,_ in tasks) == 65
    links = 0
    for p in chapters + [docs / 'Task.md',docs / 'README.md',logs / 'current-state.md',logs / '20261006-egress-producer-implementation.md']:
        for raw in re.findall(r'\]\(([^)]+)\)',p.read_text()):
            target = raw.strip('<>').split('#')[0]
            if target.startswith('./') or target.startswith('../'):
                assert (p.parent / target).exists(), 'Broken local link: ' + str(p) + ' -> ' + target
                links += 1
    for f in inventory['failureFiles']: assert sha(f['file']) == f['sha256']
    assert proof('egress-sql-observation-02-failure')['passed'] is False
    report = {'passed':True,'productSourceSha256':product_sha,'productSourceFiles':product_files,
              'currentFullWalletFiles':178,'currentFullWalletTests':2514,'parentsComplete':65,'parentsTotal':98,
              'configuredDevPackagesIndependentlyReviewed':4,'loadableCandidatePackageAccepted':True,'candidateChromeHttpsAccepted':False,'candidatePersonalMessageSigningAccepted':True,'candidateTransactionSigningAccepted':False,'candidateExecutionAccepted':False,
              'finiteProductionPackageRollbackChecks':51,'actualProfileRollbackAccepted':False,'wrongGenesisCustomPreviewAccepted':False,'rollbackParentComplete':False,
              'finiteReviewedAccountChecks':50,'reviewedPersonalMessageSignatures':4,'reviewedTransactionSigningAccepted':False,'reviewedAccountUpgradeSigningAccepted':True,'accountParentComplete':True,'reviewedAccountUpgradeChecks':116,'reviewedPersonalMessageSignaturesAfterUpgrade':4,
              'finiteStakingInterfaceAccepted':True,'stakingProductionScaleAccepted':False,'stakingChromeAccepted':False,
              'trialReady':False,'currentDevelopmentRevision':'C19','currentSignOnlyAccepted':False,'currentPublicExecutionAccepted':False,'historicalC18SigningAccepted':True,'currentBackgroundUnchangedFromC18':True,
              'normalChromeCaVerified':browser['networkIdentityAccepted'],'currentLoadedUiScripts':len(browser['uiSource']['loadedBundles']),
              'currentProductionChunks':7,'currentProductionEntries':5,'currentProductionModuleRows':5274,'currentProductionSourceContents':2032,
              'historicalNativeFiniteCounts':native_counts,'currentTerminalObservationNativeChecks':5,'historicalSourceAncestry':ancestry,'exactHistoricalInputResolutions':historical_inputs,
              'originalJournals':7,'originalJournalLookups':7,'originalJournalDispatches':0,
              'observedSqlMinimum':min(r['checkpointHi'] for r in sql['originalWatermarks']),
              'observedDisplayThrough':sql['coverage']['checkpointHi'],'commonBusinessSnapshotAccepted':True,'allDomainsVerified':False,
              'preservedOriginalDocuments':len(merge['sources']),'localLinks':links,'ownedNativeProcesses':11,
              'scope':'Current C19 build, readonly UI/worker, original seven journals, tests/types/production closure and finite fixtures. Historical E3/E4/C16 reconstructed; C18 transaction signing/execution separate. Current reviewed candidate has 50 account checks and 4 actual PersonalMessage signatures; transaction signing/execution unaccepted. Actual 116-check QA-A01 upgrade/recovery and 4 post-upgrade PersonalMessage signatures passed using a toolbar-popup wake surface; prior failures retained, no cleanup workaround accepted. Finite 51-check package rollback preserves encrypted key, future dummy journal and seeded profile; actual profile rollback and wrong H0 identity preview unaccepted. Seven configured domains/common S accepted; all domains, normal HTTPS, service authority, full lifecycle and trial outstanding.'}
    args.output.open('x').write(json.dumps(report,indent=2)+'\n'); print(json.dumps(report))


if __name__ == '__main__':
    main()

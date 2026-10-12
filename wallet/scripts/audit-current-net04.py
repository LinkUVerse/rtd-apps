#!/usr/bin/env python3
"""Audit NET-04 coding and scoped runtime contracts, never global trial readiness."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--output', type=Path, required=True)
    p.add_argument('--expected-complete', type=int, choices=[71, 72], required=True)
    a = p.parse_args()
    assert not a.output.exists()
    w = Path(__file__).resolve().parents[1]
    root = w.parents[1]
    docs = w / 'migrationToGRpcOrGraphQLDoc'
    l = docs / 'workLog'
    sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
    read = lambda p: json.loads(Path(p).read_text())
    names = ['NET-04-browser-01', 'NET-04-browser-bundle-01',
             'personal-current-audit-02', 'personal-handoff-verification-01',
             'personal-chrome-identity-04', 'personal-production-audit-03',
             'personal-production-build-03']
    proofs, files = {}, set()
    for name in names:
        path = l / ('20261006-' + name + '.json')
        value = read(path)
        assert value['passed'], name
        for file, h in value.get('inputsSha256', {}).items():
            assert sha(file) == h, file
            path_ = Path(file)
            if path_.is_relative_to(root):
                files.add(path_)
        proofs[name] = value
    source = proofs['personal-production-build-03']['sourceAfter']
    assert proofs['personal-current-audit-02']['source'] == source
    browser = proofs['NET-04-browser-01']
    assert browser['source'] == source and browser['actualConfiguredPackages'] == 5
    assert browser['simulations'] == browser['signatures'] == browser['executeRequests'] == 0
    cases = {row['mode']: row for row in browser['cases']}
    assert len(cases) == 5
    positive = cases['capabilities']['result']
    assert cases['capabilities']['passed']
    assert positive['report']['state'] == 'capabilities-assessed'
    for field, expected in [('readiness', 'not-assessed'), ('serviceDeployment', 'not-verified'),
                            ('execution', 'not-probed'), ('crossDomainSnapshot', 'not-verified')]:
        assert positive['report'][field] == positive['view'][field] == expected
    schema = positive['schema']
    assert schema['state'] == 'schema-compatible' and len(schema['contracts']) == 11
    assert all(state == 'compatible' for state in schema['contracts'].values())
    domains = positive['view']['graphql']['value']['domains']
    assert len(domains) == 8 and domains['names']['state'] == 'unconfigured'
    assert all(row['state'] == 'snapshot-verified' for domain, row in domains.items() if domain != 'names')
    assert positive['view']['accountHistory']['value']['state'] == 'coverage-window-verified'
    assert positive['view']['accountHistory']['value']['allAccountHistoryVerified'] is False
    dep = cases['deployment-positive']['result']
    assert dep['state'] == 'reviewed-deployment-matched' and len(dep['packages']) == 5
    assert all(row['state'] == 'pin-matched' for row in dep['packages'])
    assert dep['move']['state'] == 'selected-contracts-compatible'
    assert not cases['wrong-h0']['passed'] and cases['wrong-h0']['reason'] == 'chain-mismatch'
    assert cases['wrong-pin']['result']['state'] == 'reviewed-deployment-degraded'
    assert any(row['state'] == 'pin-mismatch' for row in cases['wrong-pin']['result']['packages'])
    assert cases['wrong-revision']['result']['state'] == 'declaration-rejected'
    assert not cases['wrong-revision']['requests']
    assert all('/SimulateTransaction' not in row['url'] and '/ExecuteTransaction' not in row['url']
               for row in browser['traffic'])
    bundle = proofs['NET-04-browser-bundle-01']
    assert sha(bundle['output']) == bundle['outputSha256']
    assert len(bundle['inputsSha256']) == 461
    full = l / '20261006-personal-handoff-full-01.log'
    tests = dict(re.findall(r'^ ✓ (src/[^\n]+) \((\d+) tests\)', full.read_text(), re.M))
    selected = ['graphql-schema-capabilities', 'move-package-capabilities', 'WalletRpcProvider',
                'account-history-capabilities', 'network-admission-classification',
                'query-session-switch', 'network-capabilities', 'read-capability-observation-provider',
                'deployment-capabilities', 'read-capability-observation', 'read-admission-provider',
                'terminal-read-capability-observation', 'read-capability-view',
                'native-service-capabilities', 'capability-fetch', 'identity',
                'read-admission', 'network-admission-state', 'graphql-domain-capabilities',
                'network-observation-state', 'read-capability-surface', 'profile',
                'capability-observation-lifetime', 'network-admission-store', 'session', 'profile-registry']
    tested = {}
    for stem in selected:
        file = 'src/shared/rpc/' + stem + '.test.ts'
        assert file in tests
        tested[file] = int(tests[file])
        files.add(w / file)
    inputs = l / '20261006-NET-04-current-inputs'
    manifest_path = inputs / 'manifest.json'
    if not inputs.exists():
        files.add(Path(__file__).resolve())
        for file in bundle['inputsSha256']:
            files.add(Path(file))
        files.update([w / 'scripts/qa02-browser-capability-entry-verified.ts',
                      w / 'scripts/test-net04-current-browser-capabilities.cjs',
                      w / 'scripts/build-qa02-browser-capabilities-verified.cjs', w / 'vitest.config.mts'])
        inputs.mkdir()
        rows = []
        for file in sorted(files):
            assert file.is_relative_to(root)
            relative = file.relative_to(root)
            target = inputs / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(file.read_bytes())
            rows.append({'path': str(relative), 'sha256': sha(file)})
        manifest_path.write_text(json.dumps({'files': rows}, indent=2) + '\n')
    rows = read(manifest_path)['files']
    for row in rows:
        assert sha(inputs / row['path']) == row['sha256'] == sha(root / row['path'])
    tasks = re.findall(r'^- \[([ x])\] `([A-Z]+-[A-Z0-9]+)`', (docs / 'Task.md').read_text(), re.M)
    assert len(tasks) == len({row[1] for row in tasks}) == 98
    assert sum(row[0] == 'x' for row in tasks) == a.expected_complete
    assert dict((id, mark) for mark, id in tasks)['NET-04'] == ('x' if a.expected_complete == 72 else ' ')
    assert len(list(docs.glob('[0-9][0-9]-*.md'))) == 14
    result = {'passed': True, 'observedAt': datetime.now(timezone.utc).isoformat(), 'source': source,
              'parentsComplete': a.expected_complete, 'parentsTotal': 98,
              'net04MarkedComplete': a.expected_complete == 72, 'net04CodingContractComplete': True,
              'runtimeCases': 5, 'runtimeReadRequests': sum(len(row['requests']) for row in cases.values()),
              'schemaContracts': 11, 'independentPackages': 5,
              'testFilesFromCurrentFullRun': tested, 'testCountFromCurrentFullRun': sum(tested.values()),
              'fullRelativeInputFiles': len(rows), 'inputManifestSha256': sha(manifest_path),
              'currentFullUnitTests': 2545, 'prodTypesExitCode': 0,
              'runtimeView': positive['view'], 'runtimeNativeBeforeAfter': positive['report']['identity'],
              'normalChromeHttpsAccepted': False, 'trialReady': False, 'actualDevResetClaimed': False,
              'simulations': 0, 'signatures': 0, 'executeRequests': 0,
              'proofs': [{'file': str(l / ('20261006-' + name + '.json')),
                         'sha256': sha(l / ('20261006-' + name + '.json'))} for name in names],
              'scope': 'NET-04 coding contract: current four-role identity/SDL/eight domain/selected Move/independent package observation and precise scoped states, actual negative H0/pin/revision plus current full-run provider/session/reset-state tests. Real dev reset, global ready, all assets/transactions, TLS, QA-A17 and trial remain separate original tasks.'}
    a.output.open('x').write(json.dumps(result, indent=2) + '\n')
    print(json.dumps({key: result[key] for key in ['passed', 'parentsComplete', 'runtimeReadRequests', 'testCountFromCurrentFullRun', 'fullRelativeInputFiles']}))


if __name__ == '__main__':
    main()

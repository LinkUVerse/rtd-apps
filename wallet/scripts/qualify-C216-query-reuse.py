"""Audit C216 compiled source changes and verification; no UI acceptance claim."""
from pathlib import Path
import datetime
import hashlib
import json
import subprocess

W = Path(__file__).resolve().parent.parent
L = W / 'migrationToGRpcOrGraphQLDoc/workLog'
read = lambda p: json.loads(p.read_text())
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
old_file = L / '20261010-default-generation-positive-C210-build-01.json'
new_file = L / '20261010-default-generation-positive-C216-build-02.json'
closure_file = L / '20261010-default-generation-positive-C216-closure-02.json'
old, new, closure = map(read, [old_file, new_file, closure_file])
assert old['passed'] and new['passed'] and closure['passed']
source = json.loads(subprocess.check_output([
    'node', '-e', 'console.log(JSON.stringify(require("./scripts/build-reviewed-generation-production-extension.cjs").productSource()))'
], cwd=W, text=True))
assert source == new['sourceBefore'] == new['sourceAfter'] == closure['source']
for f, digest in closure['inputsSha256'].items():
    assert sha(Path(f)) == digest

def modules(directory):
    result = {}
    for path in directory.glob('*.js.map'):
        data = read(path)
        for name, content in zip(data['sources'], data['sourcesContent']):
            # Runtime bootstrap is compiler-generated; all application and dependency sources stay in scope.
            if name.startswith('webpack:///webpack/'):
                continue
            if name in result:
                assert result[name] == content, name
            result[name] = content
    return result

before, after = modules(Path(old['output'])), modules(Path(new['output']))
removed = sorted(before.keys() - after.keys())
assert removed == []
added = sorted(after.keys() - before.keys())
assert added == ['webpack:///./shared/rpc/fullnode-read-queue.ts']
changed = sorted(k for k in before.keys() & after.keys() if before[k] != after[k])
expected = {'webpack:///../../core/src/rpc/asset-hooks.ts', 'webpack:///../../core/src/rpc/coin.ts', 'webpack:///../../core/src/rpc/history-hooks.ts', 'webpack:///../../core/src/rpc/staking-hooks.ts', 'webpack:///./shared/rpc/graphql-snapshot.ts', 'webpack:///./shared/rpc/snapshot-query-queue.ts', 'webpack:///./ui/app/hooks/useGetAllBalances.ts', 'webpack:///./shared/rpc/fullnode-reader.ts'}

assert set(changed) == expected, changed
old_background = read(Path(old['output']) / 'background.js.map')
new_background = read(Path(new['output']) / 'background.js.map')
bg_old = dict(zip(old_background['sources'],old_background['sourcesContent']))
bg_new = dict(zip(new_background['sources'],new_background['sourcesContent']))
bg_changed = sorted(k for k in bg_old.keys() & bg_new.keys() if bg_old[k] != bg_new[k] and not k.startswith('webpack:///webpack/'))
assert set(bg_changed) == {'webpack:///./shared/rpc/graphql-snapshot.ts', 'webpack:///./shared/rpc/snapshot-query-queue.ts', 'webpack:///./shared/rpc/fullnode-reader.ts'}
assert all(k in added or k.startswith('webpack:///webpack/') for k in bg_new.keys()-bg_old.keys())
assert all(k.startswith('webpack:///webpack/') for k in bg_old.keys()-bg_new.keys())

assert read(Path(old['output']) / 'manifest.json') == read(Path(new['output']) / 'manifest.json')
assert old['profileSha256'] == new['profileSha256']
assert old['reviewedRelease']['registrySha256'] == new['reviewedRelease']['registrySha256']
checks = [L / f'20261010-C216-{name}.log' for name in [
    'typecheck-prod-01', 'typecheck-rpc-01', 'full-regression-02']]
assert checks[0].read_text() == checks[1].read_text() == ''
assert 'Tests  2819 passed (2819)' in checks[2].read_text()
targeted = L / '20261010-C216-fixed-window-02.log'
assert 'Tests  216 passed (216)' in targeted.read_text()
live = L / '20261010-C216-live-reuse-02.json'
live_data = read(live)
assert live_data['passed']
assert [x['requestCount'] for x in live_data['samples']] == [4, 4, 4, 11, 3]
asset_tests = L / '20261010-C216-asset-reuse-01.log'
assert 'Tests  53 passed (53)' in asset_tests.read_text()
pages = L / '20261010-C216-live-pages-01.json'
page_data = read(pages)
assert page_data['passed'] and page_data['signatures'] == page_data['executions'] == 0
assert [x['operation'] for x in page_data['calls'][-5:]] == ['WalletHistoryCoverage', 'WalletSnapshotAdmissionAndPin', 'WalletAccountHistory', 'WalletHistoryCoverage', 'WalletSnapshotRevalidate']
assert all(x['status'] == 200 for x in page_data['calls'])
inputs = [Path(__file__), old_file, new_file, closure_file, *checks, targeted, live, asset_tests, pages]
result = {
    'passed': True, 'observedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'currentSource': source, 'productionModuleChanges': changed,
    'productionModuleChangesExpected': True, 'removedUnusedModule': removed,
    'backgroundChangesReviewed': True, 'backgroundModuleChanges': bg_changed, 'addedModules': added,
    'profileRegistryAndManifestUnchanged': True, 'regressionTestsPassed': 2819,
    'ordinaryBrowserFixAccepted': False,
    'inputsSha256': {str(p): sha(p) for p in inputs},
}
output = L / '20261010-C216-source-and-checks-01.json'
with output.open('x') as stream:
    json.dump(result, stream, indent=2)
    stream.write('\n')
print(json.dumps({'passed': True, 'productionModuleChanges': changed, 'source': source}))

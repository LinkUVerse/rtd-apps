"""Audit C211 compiled source changes and verification; no UI acceptance claim."""
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
new_file = L / '20261010-default-generation-positive-C211-build-01.json'
closure_file = L / '20261010-default-generation-positive-C211-closure-01.json'
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
assert added == []
changed = sorted(k for k in before.keys() & after.keys() if before[k] != after[k])
expected = {'webpack:///../../core/src/rpc/coin.ts', 'webpack:///../../core/src/rpc/history-hooks.ts', 'webpack:///../../core/src/rpc/staking-hooks.ts', 'webpack:///./shared/rpc/graphql-snapshot.ts', 'webpack:///./shared/rpc/snapshot-query-queue.ts', 'webpack:///./ui/app/hooks/useGetAllBalances.ts'}

assert set(changed) == expected, changed
old_background = read(Path(old['output']) / 'background.js.map')
new_background = read(Path(new['output']) / 'background.js.map')
bg_old = dict(zip(old_background['sources'],old_background['sourcesContent']))
bg_new = dict(zip(new_background['sources'],new_background['sourcesContent']))
bg_changed = sorted(k for k in bg_old.keys() & bg_new.keys() if bg_old[k] != bg_new[k] and not k.startswith('webpack:///webpack/'))
assert set(bg_changed) == {'webpack:///./shared/rpc/graphql-snapshot.ts', 'webpack:///./shared/rpc/snapshot-query-queue.ts'}
assert all(k in added or k.startswith('webpack:///webpack/') for k in bg_new.keys()-bg_old.keys())
assert all(k.startswith('webpack:///webpack/') for k in bg_old.keys()-bg_new.keys())

assert read(Path(old['output']) / 'manifest.json') == read(Path(new['output']) / 'manifest.json')
assert old['profileSha256'] == new['profileSha256']
assert old['reviewedRelease']['registrySha256'] == new['reviewedRelease']['registrySha256']
checks = [L / f'20261010-C211-{name}.log' for name in [
    'typecheck-prod-02', 'typecheck-rpc-02', 'full-regression-02']]
assert checks[0].read_text() == checks[1].read_text() == ''
assert 'Tests  2789 passed (2789)' in checks[2].read_text()
inputs = [Path(__file__), old_file, new_file, closure_file, *checks]
result = {
    'passed': True, 'observedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'currentSource': source, 'productionModuleChanges': changed,
    'productionModuleChangesExpected': True, 'removedUnusedModule': removed,
    'backgroundChangesReviewed': True, 'backgroundModuleChanges': bg_changed, 'addedModules': added,
    'profileRegistryAndManifestUnchanged': True, 'regressionTestsPassed': 2789,
    'ordinaryBrowserFixAccepted': False,
    'inputsSha256': {str(p): sha(p) for p in inputs},
}
output = L / '20261010-C211-source-and-checks-01.json'
with output.open('x') as stream:
    json.dump(result, stream, indent=2)
    stream.write('\n')
print(json.dumps({'passed': True, 'productionModuleChanges': changed, 'source': source}))

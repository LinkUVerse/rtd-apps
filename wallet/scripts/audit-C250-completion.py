from pathlib import Path
import json, hashlib, datetime, subprocess

W = Path(__file__).resolve().parent.parent
L = W / 'migrationToGRpcOrGraphQLDoc/workLog'
names = ['20261011-C249-execution-audit-02.json', '20261011-C250-browser-balances-audit-01.json',
         '20261011-C250-source-and-checks-01.json', '20261011-C250-ordinary-upgrade-installed-01.json',
         '20261011-C250-ordinary-bytecode-01.json']
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
values = []
for name in names:
    v = json.loads((L / name).read_text())
    assert v['passed']
    values.append(v)
    for filename, digest in v.get('inputsSha256', {}).items():
        p = Path(filename)
        if not p.is_absolute():
            p = W / p
        assert sha(p) == digest, filename
transfer, browser, qualification, installed, bytecode = values
assert transfer['postWriteHomeAccepted'] is False and browser['postWriteHomeAccepted'] is True
assert transfer['execution']['digest'] == browser['writeTransaction']
assert transfer['defect']['nativeCurrent'] == browser['expectedCurrentAtomic']['0xd50b47e5956effdff99b840cc1a34eb7e23a6a1997ec2e324ff4960b7f27077c']
assert browser['executionRequests'] == 0 and browser['warmAdditionalListBalances'] == 0
source = json.loads(subprocess.check_output(['node', '-e', 'console.log(JSON.stringify(require("./scripts/build-reviewed-generation-production-extension.cjs").productSource()))'], cwd=W, text=True))
assert source == qualification['currentSource'] == installed['source']
proof = {'passed': True, 'observedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
         'scope': 'C249 successful dev transfer plus C250 installed current-balance correction; not full QA or REL',
         'currentSource': source, 'C249TransferConfirmed': True, 'C250CurrentDisplayAccepted': True,
         'C250FreshNavigationReuseAccepted': True, 'C249P3Accepted': True, 'C250P3Accepted': True,
         'parentCompletion': False, 'inputsSha256': {str(L/n): sha(L/n) for n in names}}
proof['inputsSha256'][str(Path(__file__))] = sha(Path(__file__))
with (L / '20261011-C250-completion-01.json').open('x') as f:
    json.dump(proof, f, indent=2)
    f.write('\n')
print(json.dumps({'passed': True, 'C249P3Accepted': True, 'C250P3Accepted': True, 'source': source}))

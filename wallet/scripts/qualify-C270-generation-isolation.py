#!/usr/bin/env python3
"""Correlate actual C51 generation UI with captured reads and installed source."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import re
import sys

W = Path(__file__).resolve().parents[1]
L = W / 'migrationToGRpcOrGraphQLDoc/workLog'
files = [Path(__file__)]
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def read(p):
    files.append(p)
    return json.loads(p.read_text())
def wallet(s): return s.split('HTML 内容 RTD Wallet, URL:')[1].split('弹出式按钮 标签页搜索')[0]
def fields(s):
    result = {}
    for line in s.splitlines():
        m = re.match(r'\s*\d+ 文本栏 \((?:settable|disabled)\) ([^,]+)(?:, Value: (.*))?$', line)
        if m and m[1] != '地址和搜索栏': result[m[1]] = m[2] or ''
    start = s.index('同链合约配置（JSON）, Value: ') + len('同链合约配置（JSON）, Value: ')
    result['packages'] = json.JSONDecoder().raw_decode(s[start:])[0]
    return result
output = Path(sys.argv[1]).resolve()
assert output.parent == L and not output.exists()
ui = read(L/'20261011-C270-native-ui-03.json')['states']
network = read(L/'20261011-C270-network-audit-03.json')
assert network['passed'] and network['everyCapturedFrameClassified']
for name, digest in network['inputsSha256'].items():
    p = Path(name); p = p if p.is_absolute() else W/p
    assert sha(p) == digest; files.append(p)
baseline = fields(ui['baselineNetwork']['ax'])
assert fields(ui['finalRestoredConfig']['ax']) == baseline
assert baseline['配置标识'] == 'c51-tls-acceptance' and baseline['配置版本'] == '2'
assert fields(ui['finalRestoreReady']['ax'])['配置版本'] == '1'
original = fields(ui['generationIsolationDraftBefore']['ax'])
changed = fields(ui['generationIsolationDraft']['ax'])
assert {k for k in changed if changed[k] != original[k]} == {'部署代次'}
assert changed['部署代次'] == 'c270-generation-mismatch'
for name in ['oldGenerationHiddenReady', 'restoredGenerationHiddenComplete']:
    assert 'link Migration Display V2 Migration Display V2,' in wallet(ui[name]['ax'])
for name in ['newGenerationHiddenEmpty', 'originalHiddenPreferenceCleared']:
    view = wallet(ui[name]['ax'])
    assert '暂无资产' in view and 'link Migration Display V2' not in view
for name in ['baselineAssets', 'newGenerationAssetsSettled', 'newGenerationReloadSettled', 'finalAssetsReady']:
    view = wallet(ui[name]['ax'])
    assert 'link Migration Display V2,' in view and 'link 暂无媒体,' in view
assert '修改现有网络时必须增加配置版本' in wallet(ui['firstRestored']['ax'])
assert '149.99 M' in wallet(ui['finalHomeRestored']['ax'])
for account in ['0x3270…dcb7', '0x9d76…e5bc', '0xd50b…077c', '0xbad0…0456']:
    assert account in wallet(ui['finalAccounts']['ax'])
entries = read(L/'20261011-C270-generation-isolation-01.har')['log']['entries']
new_reads = [r for r in network['reports'] if r.get('profileGeneration') == 'c270-generation-mismatch']
assert len(new_reads) == 3 and all(r['accepted'] for r in new_reads)
assert entries[125]['startedDateTime'] > ui['generationIsolationSaveClick']['at']
assert entries[130]['startedDateTime'] > ui['newGenerationReloadClick']['at']
assert entries[133]['startedDateTime'] < ui['newGenerationReloadSettled']['at']
assert entries[147]['startedDateTime'] > ui['finalRestoreReady']['at']
assert entries[148]['response']['_error'] == 'net::ERR_ABORTED'
assert entries[153]['startedDateTime'] < ui['restoredGenerationHiddenComplete']['at']
installed = read(L/'20261011-C257-ordinary-bytecode-01.json')
assert installed['completeInstalledBytecodeAccepted']
matched = set()
for script in installed['scripts']:
    p = Path(script['artifact']); files.append(p)
    assert sha(p) == script['sha256']
    source_map = read(p.with_suffix(p.suffix+'.map'))
    for name, source in zip(source_map['sources'], source_map['sourcesContent']):
        if name.startswith('webpack:///./shared/rpc/'):
            local = W/'src/shared/rpc'/name.removeprefix('webpack:///./shared/rpc/')
            assert local.read_text() == source; matched.add(local); files.append(local)
assert len(matched) == 106
provider = W/'src/shared/rpc/WalletRpcProvider.ts'
assert 'selection.profile.expectedGenesisDigest,\n        selection.profile.generation,' in provider.read_text()
for p in [W/'src/ui/app/pages/home/hidden-assets/HiddenAssetsProvider.tsx', W/'src/background/NetworkEnv.ts']:
    files.append(p)
proof = dict(passed=True, observedAt=datetime.now(timezone.utc).isoformat(),
    scope='Current C257 ordinary Chrome client configuration generation, durable hidden preferences and restored original profile; not actual backend generation reset or full QA-A17',
    originalFieldsAndPackagesRestored=True, savedOriginalRevision=1, originalAccounts=4,
    oldGenerationHiddenPreserved=True, newGenerationHiddenEmpty=True, newGenerationReloadPassed=True,
    originalAssetVisibilityRestored=True, currentBalanceVisible=True, rejectedSameIdRevisionRollback=True,
    capturedRequests=190, productionAssetReadOperations=len(network['reports']),
    productionNewGenerationReadOperations=len(new_reads), installedRpcModulesMatched=len(matched),
    noTransactions=True, backendGenerationChanged=False, parentCompletion=False,
    correctedExpectation='Client profile generation namespaces cache/journal/preferences; it need not equal Display history source generation.',
    inputsSha256={str(p):sha(p) for p in dict.fromkeys(files)})
with output.open('x') as f:
    json.dump(proof, f, ensure_ascii=False, indent=2); f.write('\n')
print(json.dumps({k:v for k,v in proof.items() if k != 'inputsSha256'}, ensure_ascii=False))

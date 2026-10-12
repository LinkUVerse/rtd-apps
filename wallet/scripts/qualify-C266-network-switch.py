#!/usr/bin/env python3
"""Correlate real UI, HAR and fixture events; verify restoration and exact cleanup."""
from pathlib import Path
from datetime import datetime, timezone, timedelta
import hashlib
import json
import re
import sys

W = Path(__file__).resolve().parents[1]
L = W/'migrationToGRpcOrGraphQLDoc/workLog'
OP = Path.home()/'.local/state/rtd-wallet-migration/dev-20261006-03/publication-foundation/C266-network-late-read-20261011-01'
files = [Path(__file__)]
def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def read(p):
    p = Path(p); files.append(p)
    return json.loads(p.read_text())
def date(s): return datetime.fromisoformat(s.replace('Z','+00:00'))
def wallet(s): return s.split('HTML 内容 RTD Wallet, URL:')[1].split('弹出式按钮 标签页搜索')[0]
def fields(s):
    values = {}
    for line in s.splitlines():
        match = re.match(r'\s*\d+ 文本栏 \((?:settable|disabled)\) ([^,]+)(?:, Value: (.*))?$',line)
        if match and match[1] != '地址和搜索栏': values[match[1]] = match[2] or ''
    start = s.index('同链合约配置（JSON）, Value: ') + len('同链合约配置（JSON）, Value: ')
    values['packages'] = json.JSONDecoder().raw_decode(s[start:])[0]
    return values

output = Path(sys.argv[1]).resolve(); assert output.parent == L and not output.exists()
ui = read(L/'20261011-C266-native-ui-04.json')['states']
baseline = read(L/'20261011-C266-baseline-ui-01.json')
har = read(L/'20261011-C266-network-switch-01.har')['log']['entries']
replay = read(L/'20261011-C266-network-audit-01.json'); assert replay['passed']
for path, digest in replay['inputsSha256'].items():
    path = Path(path); path = path if path.is_absolute() else W/path
    assert sha(path) == digest; files.append(path)
assert fields(baseline['ax']) == fields(ui['restorationSaved']['ax'])
assert fields(ui['noGraphqlSaved']['ax'])['GraphQL（可选）'] == ''
assert fields(ui['aliasSaved']['ax'])['GraphQL（可选）'] == 'http://127.0.0.1:41957/c266/graphql'
for name in ['aliasAssetsReady','restoredAssetsReady']:
    view = wallet(ui[name]['ax'])
    assert 'link Migration Display V2,' in view and 'link 暂无媒体,' in view
for name in ['noGraphqlSaved','noGraphqlAssets','afterLateRelease']:
    view = wallet(ui[name]['ax'])
    assert '未接纳数据' in view and 'link Migration Display V2,' not in view and 'link 暂无媒体,' not in view
assert '149.99 M' in wallet(ui['finalRestoredHome']['ax'])
for account in ['0x3270…dcb7','0x9d76…e5bc','0xd50b…077c','0xbad0…0456']:
    assert account in wallet(ui['accountsPreserved']['ax'])
events_path = OP/'events.jsonl'; files.append(events_path)
events = [json.loads(line) for line in events_path.read_text().splitlines()]
requests = [e for e in events if e['event']=='request' and e.get('arm')=='browser-switch-01']; assert len(requests)==1
request = requests[0]; rid = request['id']
def event(kind):
    selected = [e for e in events if e['event']==kind and e.get('id')==rid]
    assert len(selected)==1; return selected[0]
held, upstream, closed, release = [event(k) for k in ['held','upstream-response','downstream-close','release']]
click = date(ui['switchClickStarted']['at'])
assert date(held['at']) < click < date(closed['at']) < date(release['at']) < date(ui['afterLateRelease']['at'])
assert (date(closed['at'])-click).total_seconds() < 1
assert closed['writableEnded'] is False and release['downstreamDestroyed'] is True
assert held['delayMs']==10000 and release['responseSha256']==upstream['responseSha256']
request_path, response_path = OP/f'{rid}-request.json', OP/f'{rid}-response.bin'
files += [request_path,response_path]
assert sha(request_path)==request['requestSha256'] and sha(response_path)==release['responseSha256']
assert b'Migration Display V2' in response_path.read_bytes()
matches = [(i,e) for i,e in enumerate(har) if e['request']['url'].endswith('/c266/graphql')
           and e['request'].get('postData',{}).get('text')==request_path.read_text()
           and abs((date(e['startedDateTime'])-date(request['at'])).total_seconds())<.1]
assert len(matches)==1; index, wire = matches[0]
assert index==47 and wire['response']['status']==0 and wire['response']['_error']=='net::ERR_ABORTED'
wire_end = date(wire['startedDateTime'])+timedelta(milliseconds=wire['time'])
assert abs((wire_end-date(closed['at'])).total_seconds())<.1
assert not [e for e in har if '/c266/graphql' in e['request']['url'] and date(e['startedDateTime'])>date(closed['at'])]
assert not [e for e in har if date(ui['noGraphqlSaved']['at'])<date(e['startedDateTime'])<date(ui['restorationDraft']['at']) and '/graphql' in e['request']['url']]
for e in har:
    assert not any(x in e['request']['url'] for x in ['ExecuteTransaction','SimulateTransaction','json-rpc'])
for name in ['alias-prepared.json','alias-applied.json','alias-restored.json','cleanup.json']:
    assert read(OP/name)['passed']
cleanup = read(OP/'cleanup.json'); assert cleanup['port42970Closed'] and cleanup['sharedPublisherSignals']==0
assert any(e['event']=='stopped' and e['reason']=='owned-termination' for e in events)
readiness = read(L/'20261011-C266-proxy-readiness-02.json'); assert readiness['passed']
# Confirm source equality against installed bytes already observed in real Chrome.
installed = read(L/'20261011-C257-ordinary-bytecode-01.json'); assert installed['completeInstalledBytecodeAccepted']
mapped = set()
for script in installed['scripts']:
    path = Path(script['artifact']); assert sha(path)==script['sha256']; files.append(path)
    sm = read(path.with_suffix(path.suffix+'.map'))
    for name, source in zip(sm['sources'],sm['sourcesContent']):
        if name.startswith('webpack:///./shared/rpc/'):
            local = W/'src/shared/rpc'/name.removeprefix('webpack:///./shared/rpc/')
            assert local.read_text()==source; files.append(local); mapped.add(str(local))
assert len(mapped)==106
proof = dict(passed=True,observedAt=datetime.now(timezone.utc).isoformat(),
    scope='Current C257 ordinary Chrome same-H0/generation URL removal, old in-flight asset cancellation and restoration; not complete QA-A17',
    requests=len(har),graphql=53,native=7,media=2,assetCyclesAccepted=12,cancelledAssetCycle=1,
    oldResponseReceivedThenHeld=True,bodyBytesPreserved=True,closedAfterClickMs=(date(closed['at'])-click).total_seconds()*1000,
    releaseAfterCancelMs=(date(release['at'])-date(closed['at'])).total_seconds()*1000,
    harCancelIndex=index,lateUiStayedRejected=True,postSwitchOldUrlRequests=0,
    originalNetworkFieldsAndPackagesRestored=True,originalAccounts=4,installedRpcModulesMatched=len(mapped),
    testFixtureCleaned=True,originalGatewayRestored=True,actualNatural1800SecondExitObserved=False,
    browserPermissionGrantActorVerified=False,
    permissionHistory='Direct new-port prompt initially declined. A second prompt disappeared after an action was rejected as user-changed; actor is not established. Final test uses existing origin alias.',
    noTransactions=True,fullDifferentH0GenerationMatrixPassed=False,parentCompletion=False,
    inputsSha256={str(p):sha(p) for p in dict.fromkeys(files)})
with output.open('x') as f: json.dump(proof,f,ensure_ascii=False,indent=2); f.write('\n')
output.chmod(0o600)
print(json.dumps({k:v for k,v in proof.items() if k!='inputsSha256'},ensure_ascii=False))

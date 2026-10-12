#!/usr/bin/env python3
"""Exact C27 source delta, full checks and bounded real Chrome evidence; no parent completion inference."""
import argparse, hashlib, importlib.util, json, re, shutil
from pathlib import Path
from datetime import datetime, timezone

def main():
    p = argparse.ArgumentParser(); p.add_argument('--output', type=Path, required=True); p.add_argument('--snapshot', type=Path, required=True); a = p.parse_args()
    assert not a.output.exists() and not a.snapshot.exists()
    w = Path(__file__).resolve().parents[1]; l = w / 'migrationToGRpcOrGraphQLDoc/workLog'; root = w.parent.parent
    sha = lambda f: hashlib.sha256(Path(f).read_bytes()).hexdigest()
    read = lambda f: json.loads(Path(f).read_text())
    spec = importlib.util.spec_from_file_location('builder', w/'scripts/build-reviewed-local-extension.py'); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    h, n = m.source_hash(w); source = {'sha256': h, 'files': n}
    assert source == {'sha256':'fa8728c6e7f1e745a78691d5d904198ef10707b54d591a3e2a26b736163d2591','files':1111}
    before_file = l/'20261006-C26-before-cold-read-ui-01.json'; before = read(before_file)
    changed = []
    for name, digest in before['rows'].items():
        assert sha(Path(before['snapshot'])/name) == digest
        if sha(root/name) != digest: changed.append(name)
    assert set(changed) == {'rtd-apps/wallet/src/ui/app/hooks/useGetAllBalances.ts','rtd-apps/wallet/src/ui/app/pages/home/tokens/TokensDetails.tsx','rtd-apps/wallet/src/ui/app/i18n/messages/en.ts','rtd-apps/wallet/src/ui/app/i18n/messages/zh-CN.ts'}
    names = ['20261006-C27-name-production-build-01.json','20261006-C27-name-production-audit-01.json','20261006-C27-name-production-chrome-03.json','20261006-C27-current-settings-ui-01.json','20261006-C27-name-loopback-origin-01.json','20261006-current-settings-native-admission-01.json']
    build, audit, chrome, ui, origin, diagnostic = [read(l/name) for name in names]
    assert all(value['passed'] for value in [build,audit,chrome,ui,origin,diagnostic])
    assert build['sourceAfter'] == build['sourceBefore'] == audit['source'] == ui['source'] == source
    assert build['sourceUnchanged'] and build['currentDevelopmentDistUnchanged'] and build['compilationErrors'] == 0
    for name,digest in build['artifacts'].items(): assert sha(Path(build['output'])/name) == digest
    assert chrome['networkIdentityAccepted'] and len(chrome['identities']) == 4 and all(r['status']==200 and r['sameGenesis'] for r in chrome['identities'])
    assert chrome['externalRequests'] == chrome['forbiddenRequests'] == chrome['pageErrorCount'] == chrome['certificateChanges'] == 0
    assert not chrome['normalChromeHttpsAccepted']
    for value in [chrome,ui]:
        assert value['workerSource']['workerSha256'] == build['artifacts']['background.js']
        assert value['workerSource']['matchesDisk'] and value['uiSource']['matchesDisk']
        for row in value['uiSource']['loadedBundles']: assert row['loadedSha256'] == build['artifacts'][row['file']]
    assert len(ui['checks']) == 21 and all(row['passed'] for row in ui['checks']) and ui['normalBrowserRestart'] and ui['retainedAccountLocked']
    assert ui['simulations'] == [] and ui['signatures'] == ui['executeRequests'] == ui['certificateChanges'] == ui['originalProfilesOpened'] == 0
    assert ui['errors'] == ui['forbidden'] == []
    assert origin['retainedOrigins'] == 9 and origin['actualOrigin'] == 'chrome-extension://' + chrome['actualExtensionId']
    assert diagnostic['originalProfilePreserved'] and diagnostic['originalProfilesOpened'] == 0
    for value in [audit,chrome,ui,origin,diagnostic]:
        for name,digest in value['inputsSha256'].items(): assert sha(name) == digest
    full = (l/'20261006-C27-full-unit-01.log').read_text(); assert '182 passed (182)' in full and '2568 passed (2568)' in full and not re.search(r'Test Files.*failed',full)
    assert (l/'20261006-C27-types-01.log').read_text() == ''
    tasks = re.findall(r'^- \[([ x])\] `([A-Z]+-[A-Z0-9]+)`',(l.parent/'Task.md').read_text(),re.M); assert len(tasks)==98 and sum(mark=='x' for mark,_ in tasks)==78
    a.snapshot.mkdir(mode=0o700); rows={}
    for base in (w/'src',w/'configs',w.parent/'core/src',root/'rtd-ts-sdk/packages/typescript/src'):
        for f in base.rglob('*'):
            if f.is_file(): rows[str(f.relative_to(root))]=sha(f)
    for f in (w/'package.json',w/'webpack.config.ts',w.parent/'pnpm-lock.yaml'): rows[str(f.relative_to(root))]=sha(f)
    assert len(rows)==n
    for name,digest in rows.items():
        target=a.snapshot/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(root/name,target);assert sha(target)==digest
    manifest={'source':source,'rows':rows,'previousSnapshot':before['snapshot'],'changedOriginalFiles':changed,'newFiles':['rtd-apps/wallet/src/ui/app/hooks/useGetAllBalances.test.ts']}
    (a.snapshot/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    files=[l/name for name in names]+[before_file,l/'20261006-C27-full-unit-01.log',l/'20261006-C27-types-01.log',Path(__file__).resolve()]
    result={'passed':True,'observedAt':datetime.now(timezone.utc).isoformat(),'currentRevision':'C27','source':source,'fullUnitFiles':182,'fullUnitTests':2568,'browserSettingsChecks':21,'parentsComplete':78,'parentsTotal':98,'trialReady':False,'normalChromeHttpsAccepted':False,'snapshotManifest':str(a.snapshot/'manifest.json'),'snapshotManifestSha256':sha(a.snapshot/'manifest.json'),'proofs':[{'file':str(f),'sha256':sha(f)} for f in files],'scope':'Four original product files and one six-test hook addition only. Local account visibility during disabled balance reads, real retained settings/locked Chrome restart and four loopback identities. No orphan admission recovery, positive name/NFT/hiding or full product acceptance.'}
    a.output.open('x').write(json.dumps(result,indent=2)+'\n');print(json.dumps({k:result[k] for k in ['passed','currentRevision','fullUnitTests','parentsComplete']}))
if __name__=='__main__':main()

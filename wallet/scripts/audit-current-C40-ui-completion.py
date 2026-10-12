#!/usr/bin/env python3
"""Audit current C40 UI contract, keeping backend/TLS/full migration gates separate."""
import argparse,json,hashlib,importlib.util
from pathlib import Path
from datetime import datetime,timezone

def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--output',type=Path,required=True);a=p.parse_args();assert not a.output.exists()
 w=Path(__file__).resolve().parents[1];l=w/'migrationToGRpcOrGraphQLDoc/workLog';sha=lambda f:hashlib.sha256(Path(f).read_bytes()).hexdigest();read=lambda f:json.loads(Path(f).read_text())
 names=['20261007-C40-coding-verification-01.json','20261007-C40-ui-preferences-apps-chrome-01.json','20261007-C40-ui-preferences-independent-audit-02.json','20261007-C40-connections-cipher-chrome-03.json','20261007-C40-auto-lock-alarm-chrome-01.json','20261007-default-generation-positive-C40-build-01.json','20261007-default-generation-positive-C40-audit-01.json','20261006-default-generation-positive-C39-build-01.json','20261007-positive-C40-origin-registration-02.json','20261007-positive-C40-edge-audit-01.json','20261007-C40-foundation-audit-01.json','20261007-retired-C39-loopback-cleanup-01.json']
 files=[l/n for n in names];coding,prefs,native,connections,alarm,build,closure,previous,registration,edge,foundation,cleanup=map(read,files)
 assert all(v['passed'] for v in [coding,prefs,native,connections,alarm,build,closure,previous,registration,edge,foundation,cleanup])
 for v in [prefs,native,connections,alarm,coding]:assert v['source']==build['sourceAfter']
 for v in [prefs,connections,alarm]:
  assert v['signatures']==v['executeRequests']==0
  sims=v['simulations'];assert sims==0 or sims==[]
  assert not v.get('forbidden',v.get('blocked',[]))
  assert v['initialJournal']==v['finalJournal']=={'journal-v2':[],'pending-scopes-v2':[],'metadata-v2':[]}
 for v in [prefs,native,connections,alarm,coding,closure,previous]:
  for f,h in v.get('inputsSha256',{}).items():assert sha(f)==h,(v.get('scope','')[:30],f)
 for record in [build,previous]:
  for f,h in record['artifacts'].items():assert sha(Path(record['output'])/f)==h
 spec=importlib.util.spec_from_file_location('builder',w/'scripts/build-reviewed-local-extension.py');builder=importlib.util.module_from_spec(spec);spec.loader.exec_module(builder);h,n=builder.source_hash(w);assert {'sha256':h,'files':n}==build['sourceAfter']==build['sourceBefore']
 assert len(prefs['checks'])==32 and all(v['passed'] for v in prefs['checks']);assert len(connections['checks'])==10 and all(v['passed'] for v in connections['checks']);assert not connections['errors']
 assert connections['encryptedBefore']==connections['encryptedAfter']==connections['encryptedCold'];assert connections['encryptedBefore']['type']=='imported' and connections['encryptedBefore']['count']==1
 for sources in [connections['initialSources'],connections['restartSources']]:
  assert sources['workerSource']['workerSha256']==build['artifacts']['background.js'];assert sources['uiSource']['matchesDisk']
  for r in sources['uiSource']['loadedBundles']:assert r['loadedSha256']==build['artifacts'][r['file']]
 for locale in ['en','zh-CN']:
  approvals=[r for r in connections['connections'] if r['locale']==locale and 'approve' in r];assert len(approvals)==2 and {r['approve'] for r in approvals}=={True,False}
  for r in approvals:
   assert ('Approve Connection' if locale=='en' else '批准连接') in r['text'];assert ('PERMISSIONS REQUESTED' if locale=='en' else '申请的权限') in r['text'];assert r['popupSource']['matchesDisk']
   for row in r['popupSource']['loadedBundles']:assert row['loadedSha256']==build['artifacts'][row['file']]
  rev=[r for r in connections['connections'] if r['locale']==locale and r.get('revokedByActualWalletUi')];assert len(rev)==1 and rev[0]['authorization']==[];assert ('Disconnect' if locale=='en' else '断开连接') in rev[0]['revokeText']
 assert alarm['automaticLockedAccount'] and alarm['clockChanges']==alarm['syntheticAlarmEvents']==0 and alarm['restoredMinutes']==10
 assert alarm['fired']['firedAt']>=alarm['fired']['scheduledTime'] and alarm['fired']['firedAt']-alarm['observedStart']>=55000
 assert alarm['encryptedBefore']==alarm['encryptedAfter']==connections['encryptedBefore']['encryptedProjectionSha256']
 def maps(record):
  rows={}
  for f in record['artifacts']:
   if f.endswith('.js.map'):
    m=read(Path(record['output'])/f)
    for name,content in zip(m['sources'],m.get('sourcesContent',[])):rows.setdefault(name,set()).add(content)
  return rows
 old,current=maps(previous),maps(build);assert old.keys()==current.keys()
 changed=sorted(name for name in old if old[name]!=current[name]);expected=['webpack:///./ui/app/components/rtd-apps/'+name for name in ['ConnectedAppsCard.tsx','RtdAppEmpty.tsx','index.tsx']]+['webpack:///./ui/app/i18n/messages/'+name for name in ['en.ts','zh-CN.ts']];assert changed==sorted(expected),changed
 assert build['artifacts']['dapp-interface.js']==previous['artifacts']['dapp-interface.js'] and build['artifacts']['content-script.js']==previous['artifacts']['content-script.js']
 assert len(edge['gates'])==60 and len(edge['graphqlIdentities'])==9 and len(edge['realTlsHandshakes'])==3
 assert registration['retainedTwentySevenExactContainers'] and not registration['accountTlsRestarted'];assert foundation['runningCount']==28 and foundation['healthyCount']==14;assert cleanup['currentContainersPreserved']==28 and cleanup['volumesRemoved']==cleanup['imagesRemoved']==0
 out={'passed':True,'observedAt':datetime.now(timezone.utc).isoformat(),'source':build['sourceAfter'],'completedParentContract':'QA-A22','actualPreferenceUiChecks':32,'actualConnectionAndCipherChecks':10,'actualNaturalAutoLockAlarmVerified':True,'sourceMapIdentityCompared':len(current),'changedRuntimeSources':changed,'unchangedDappAndContentBytes':True,'completeJournalAndEncryptedAccountsRetained':True,'inputsSha256':{str(f):sha(f) for f in [*files,Path(__file__).resolve()]},'auditSimulations':0,'auditSignatures':0,'auditExecuteRequests':0,'scope':'QA-A22 current C40 UI/non-RPC presentation: bilingual actual settings, four themes, protected imported-account normal/cold unlock/lock and natural auto-lock alarm, hidden/restored scoped assets and nonvisual classification, support links/network menu, real localized connection approval/rejection and card revocation, explicit catalog/connected empty and unavailable fiat. 32+10 actual checks and natural Chrome alarm, raw snapshot/native audit, five-only changed runtime sources against retained C39. Historical ownership stays historical. Does not accept indexed transfers/names, timer behavior on other platforms, ordinary Chrome HTTPS/native permissions or full migration/REL02; no trading repetition.'}
 a.output.write_text(json.dumps(out,indent=2)+'\n');a.output.chmod(0o600);print(json.dumps({'passed':True,'parent':'QA-A22','runtimeSources':len(current),'uiChecks':42}))
if __name__=='__main__':main()

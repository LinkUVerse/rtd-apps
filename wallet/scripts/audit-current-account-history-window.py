#!/usr/bin/env python3
"""Re-read actual current activity response and UI scope; this is not full A13 acceptance."""
import argparse,hashlib,json
from pathlib import Path
from datetime import datetime,timezone

def main():
    p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);a=p.parse_args();assert not a.output.exists()
    w=Path(__file__).resolve().parents[1];l=w/'migrationToGRpcOrGraphQLDoc/workLog';sha=lambda f:hashlib.sha256(Path(f).read_bytes()).hexdigest();read=lambda f:json.loads(Path(f).read_text())
    f=l/'20261006-QA-A13-current-window-ui-03.json';v=read(f);b=read(l/'20261006-C28-name-production-build-01.json');assert v['passed'] and v['source']==b['sourceAfter'] and len(v['checks'])==7 and all(c['passed']for c in v['checks'])
    assert v['errors']==v['forbidden']==v['simulations']==[] and v['signatures']==v['executeRequests']==v['certificateChanges']==v['originalProfilesOpened']==0
    assert v['workerSource']['matchesDisk'] and v['workerSource']['workerSha256']==b['artifacts']['background.js'] and v['uiSource']['matchesDisk']
    for row in v['uiSource']['loadedBundles']:assert row['loadedSha256']==b['artifacts'][row['file']]
    for name,h in v['inputsSha256'].items():assert sha(name)==h
    assert len(v['historyResponses'])==1;r=v['historyResponses'][0];assert sha(r['file'])==r['sha256'];raw=read(r['file']);assert not raw.get('errors')
    page=raw['data']['accountHistory'];assert r['status']==200 and page['checkpointLo']==670805 and page['checkpointHi']==726884 and page['transactions']==[] and page['totalTransactions']==0 and page['hasNextPage'] is False and page['nextCursor'] is None
    expected={'registrationComplete':False,'completeForRegisteredKiosks':True,'completeForDiscoveredOwnerTokens':True,'completeForDiscoveredCapabilities':True,'allAccountActivityCertified':False,'allAccountTransfersCertified':False}
    assert r['coverage']==expected and {k:page[k]for k in expected}==expected
    assert '检查点 670805–726884'in v['activityText'] and '尚不能证明账户历史全集'in v['activityText'] and '此窗口内未发现受支持的账户活动。'in v['activityText']
    inputs=[f,l/'20261006-C28-name-production-build-01.json',Path(r['file']),Path(__file__).resolve()]
    out={'passed':True,'observedAt':datetime.now(timezone.utc).isoformat(),'source':v['source'],'window':{'lo':670805,'hi':726884},'transactions':0,'coverage':expected,'browserChecks':7,'parentQA13Complete':False,'inputsSha256':{str(f):sha(f)for f in inputs},'scope':'Current actual production admitted fixed-window empty account page, six exact flags, UI explicitly scoped rather than all-account empty. No positive sender/receive/object/Kiosk/token/capability history or all-account completeness claim.'}
    a.output.open('x').write(json.dumps(out,indent=2)+'\n');print(json.dumps({'passed':True,'parentQA13Complete':False,'browserChecks':7}))

if __name__=='__main__':main()

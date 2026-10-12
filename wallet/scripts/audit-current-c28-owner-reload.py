#!/usr/bin/env python3
"""Bounded production reload addendum; do not mistake cancellation for mandatory adoption."""
import argparse,hashlib,json,subprocess
from pathlib import Path
from datetime import datetime,timezone

def main():
    p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);a=p.parse_args();assert not a.output.exists()
    w=Path(__file__).resolve().parents[1];l=w/'migrationToGRpcOrGraphQLDoc/workLog';sha=lambda f:hashlib.sha256(Path(f).read_bytes()).hexdigest();read=lambda f:json.loads(Path(f).read_text())
    inputs=[l/'20261006-C28-observation-owner-audit-01.json',l/'20261006-C28-current-owner-reload-02.json',l/'20261006-C28-current-settings-ui-03.json',l/'20261006-C28-name-production-build-01.json'];core,reload,settings,build=[read(f)for f in inputs]
    assert all(v['passed'] for v in [core,reload,settings,build]) and reload['source']==core['source']==build['sourceAfter']
    for row in core['proofs']:assert sha(row['file'])==row['sha256']
    for f,h in reload['inputsSha256'].items():assert sha(f)==h
    assert len(reload['checks'])==9 and all(row['passed'] for row in reload['checks'])
    assert reload['errors']==reload['forbidden']==[] and reload['simulations']==reload['signatures']==reload['executeRequests']==reload['certificateChanges']==reload['originalProfilesOpened']==0
    assert reload['originalProfilePreserved'] and len(reload['reserved']['owners'])==1
    assert reload['reserved']['admission'][0]['pending'][0]['id']==reload['reserved']['owners'][0]['id']
    assert reload['final']['owners']==[] and all(row['pending']==row['faults']==[]for row in reload['final']['admission'])
    assert reload['admitted']['status']=='success' and any(r['coinType'].endswith('::migration_coin::MIGRATION_COIN')and r['balance']=='1500000'for r in reload['admitted']['balances'])
    assert reload['workerSource']['matchesDisk'] and reload['workerSource']['workerSha256']==build['artifacts']['background.js'] and reload['uiSource']['matchesDisk']
    for row in reload['uiSource']['loadedBundles']:assert row['loadedSha256']==build['artifacts'][row['file']]
    assert len(reload['heldFrames'])==1
    for row in reload['heldFrames']:assert row['status']==200 and sha(row['file'])==row['sha256']
    code="const fs=require('fs'),{GrpcTypes}=require('rtd-typescript/grpc');const r=JSON.parse(fs.readFileSync(process.argv[1])).heldFrames[0],b=fs.readFileSync(r.file);if(b[0]!==0)throw Error('frame');console.log(GrpcTypes.GetServiceInfoResponse.fromBinary(b.subarray(5,5+b.readUInt32BE(1))).chainId)"
    assert subprocess.run(['node','-e',code,str(inputs[1])],cwd=w,capture_output=True,text=True,check=True).stdout.strip()=='3tEPxLxUysGx4gfr8UEycvH7xohMWuwKVbTX5np4TCYj'
    for row in reload['retainedOriginalFiles']:assert sha(Path(settings['fixture'])/'profile'/row['file'])==row['sha256']
    result={'passed':True,'observedAt':datetime.now(timezone.utc).isoformat(),'source':core['source'],'checks':9,'sameTicketMandatoryForReload':False,'productionBrowserSameTicketAdoptionSeparatelyPassed':True,'inputsSha256':{str(f):sha(f)for f in inputs+[Path(__file__).resolve()]},'scope':'Actual document reload following withheld real owned identity response, fresh full balance restored and pending/markers clear. Native cancellation can settle original physical work and complete its ticket; this case does not infer unfinished-work completion or require adoption. Whole-browser same-ticket recovery is separately audited. No power loss, BFCache, signing, execution or full parent claim.'}
    a.output.open('x').write(json.dumps(result,indent=2)+'\n');print(json.dumps({'passed':True,'checks':9}))

if __name__=='__main__':main()

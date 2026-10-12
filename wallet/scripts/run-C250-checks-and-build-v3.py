from pathlib import Path
import os,json,subprocess,concurrent.futures,datetime,hashlib
w=Path(__file__).resolve().parent.parent;l=w/'migrationToGRpcOrGraphQLDoc/workLog'
old=json.loads((l/'20261011-default-generation-positive-C241-build-01.json').read_text())
env={k:os.environ[k] for k in ['PATH','HOME','TMPDIR'] if k in os.environ}
out=Path.home()/'.local/state/rtd-wallet-migration/dev-20261006-03/certified-positive-production-C250-20261011-01'
profile=Path.home()/'.local/state/rtd-wallet-migration/dev-20261006-03/publication-foundation/C46-isolated-browser-gateway-20261007-01/profile.json'
assert hashlib.sha256(profile.read_bytes()).hexdigest()==old['profileSha256']
checks=[('regression',['pnpm','exec','vitest','run','--maxWorkers=2']),('rpc',['pnpm','exec','tsc','--noEmit','-p','configs/ts/tsconfig.rpc.json']),('production',['pnpm','exec','tsc','--noEmit','-p','configs/ts/tsconfig.prod.json'])]
def run(check):
 name,argv=check;p=l/('20261011-C250-'+name+'-02.log')
 with p.open('x') as f:
  p.chmod(0o600);r=subprocess.run(argv,cwd=w,env=env,stdout=f,stderr=subprocess.STDOUT)
 row={'label':name,'argv':argv,'processExitCode':r.returncode,'log':str(p)};print(json.dumps({'label':name,'exitCode':r.returncode}),flush=True);return row
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:rows=list(pool.map(run,checks))
if all(x['processExitCode']==0 for x in rows):
 rows.append(run(('build',['node','--max-old-space-size=12288','scripts/build-reviewed-generation-production-extension.cjs',str(out),str(profile),str(l/'20261011-default-generation-positive-C250-build-01.json'),old['reviewedRelease']['registryFile'],old['reviewedRelease']['reviewFile']])))
proof={'passed':all(x['processExitCode']==0 for x in rows),'checks':rows,'observedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'inputsSha256':{str(Path(x['log'])):hashlib.sha256(Path(x['log']).read_bytes()).hexdigest() for x in rows}}
with (l/'20261011-C250-checks-build-02.json').open('x') as f:json.dump(proof,f,indent=2);f.write('\n')
raise SystemExit(0 if proof['passed'] else 1)

# coding: utf-8
from pathlib import Path
from datetime import datetime,timezone
import hashlib,json,os,plistlib,socket,subprocess,time,urllib.request
W=Path(__file__).resolve().parent.parent; L=W/'migrationToGRpcOrGraphQLDoc/workLog'; out=L/'20261010-C204-existing-ordinary-chrome-started-01.json';assert not out.exists()
oldFile=L/'20261007-C51-ordinary-chrome-started-01.json';old=json.loads(oldFile.read_text());op=Path(old['operation']);profile=op/'profile';assert profile.is_dir();exe=Path('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');info=exe.parent.parent/'Info.plist';version=plistlib.loads(info.read_bytes())['CFBundleShortVersionString']
commands=subprocess.check_output(['ps','-Ao','command='],text=True).splitlines();assert not any(str(exe) in x and '--user-data-dir='+str(profile) in x for x in commands)
with socket.socket() as s:assert s.connect_ex(('127.0.0.1',41996))!=0
subprocess.run(['codesign','--verify','--deep','--strict',str(exe.parent.parent.parent)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
argv=[str(exe),'--user-data-dir='+str(profile),'--remote-debugging-port=41996','--remote-debugging-address=127.0.0.1','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-sync','chrome://extensions/']
assert not any('load-extension' in a or 'ignore-certificate' in a or 'disable-extensions-except' in a for a in argv)
log=L/'20261010-C204-existing-ordinary-chrome-startup-private.log'
with log.open('xb') as f:
 os.chmod(log,0o600);p=subprocess.Popen(argv,stdout=f,stderr=subprocess.STDOUT,start_new_session=True)
endpoint=None
for _ in range(60):
 assert p.poll() is None
 try:
  with urllib.request.urlopen('http://127.0.0.1:41996/json/version',timeout=1) as r:endpoint=json.load(r)
  break
 except Exception:time.sleep(.2)
assert endpoint and endpoint['Browser']=='Chrome/'+version
sha=lambda f:hashlib.sha256(Path(f).read_bytes()).hexdigest()
r={'passed':True,'observedAt':datetime.now(timezone.utc).isoformat(),'setupOnly':True,'ordinaryChromeVersion':version,'browserPid':p.pid,'profile':str(profile),'devtoolsPort':41996,'existingAuthorizedProfileReused':True,'normalOfficialBrowserSignatureVerified':True,'originalDailyProfileOpened':False,'newInstallation':False,'certificateChanges':0,'credentialEntries':0,'termsAccepted':False,'uiAcceptance':False,'inputsSha256':{str(f):sha(f) for f in [Path(__file__),oldFile,exe,info]}}
out.write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:r[k] for k in ['passed','ordinaryChromeVersion','browserPid','existingAuthorizedProfileReused']}))

// Actual empty CFT renderer/worker Origin and exact permissions, before gateway start.
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS='1';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {chromium}=require('@playwright/test');
const wallet=path.resolve(__dirname,'..'),logs=path.join(wallet,'migrationToGRpcOrGraphQLDoc/workLog');
const read=f=>JSON.parse(fs.readFileSync(f)),sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
async function main(){
 const[output]=process.argv.slice(2);assert(output&&!fs.existsSync(output));
 const rt=path.join(os.homedir(),'.local/state/rtd-wallet-migration/dev-20261006-03');
 const buildFile=path.join(logs,'20261008-default-generation-positive-C109-build-01.json');
 const profileFile=path.join(rt,'publication-foundation/C109-current-core-gateway-20261008-01/profile.json');
 const sourceFile=path.join(logs,'20261008-C109-production-source-independent-01.json');
 const source=read(sourceFile),build=read(buildFile),profile=read(profileFile);
 require('./lib/C109-product-source-lineage.cjs').validate(source.originalSource,buildFile);
 assert.equal(build.profileSha256,sha(profileFile));
 const owned=path.join(rt,'current-C109-origin-20261008-01');assert(!fs.existsSync(owned));fs.mkdirSync(owned,{mode:0o700});
 const origins=[...Object.values(profile.endpoints),profile.faucetUrl].filter(Boolean).map(u=>new URL(u).origin+'/*');
 const attempts=[],files=[__filename,buildFile,profileFile,sourceFile,path.join(__dirname,'lib/C109-product-source-lineage.cjs'),path.join(__dirname,'lib/current-extension-worker.cjs'),path.join(__dirname,'lib/current-extension-ui-source.cjs')];
 let context,result;
 try{
  context=await chromium.launchPersistentContext(path.join(owned,'profile'),{executablePath:path.join(os.homedir(),'Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),headless:true,args:[`--disable-extensions-except=${build.output}`,`--load-extension=${build.output}`]});
  await context.route('**/*',route=>{const req=route.request();if(/^https?:/.test(req.url())){attempts.push({url:req.url(),method:req.method()});return route.abort();}return route.continue();});
  const initial=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');
  const loaded=await require('./lib/current-extension-worker.cjs').ensure(context,initial,build.output),worker=loaded.worker;
  const extensionId=new URL(worker.url()).hostname;assert.match(extensionId,/^[a-p]{32}$/);
  const page=await context.newPage(),base=new URL('ui.html',worker.url()).href;
  const ui=await require('./lib/current-extension-ui-source.cjs').inspect(context,page,build.output,Object.keys(build.artifacts).filter(f=>f.endsWith('.js')&&!['background.js','content-script.js','dapp-interface.js','egress-gate.js'].includes(f)),{url:base,navigate:async()=>{await page.goto(base);await page.locator('button,a,input').first().waitFor();}});
  const permissions=await page.evaluate(async origins=>({all:await chrome.permissions.contains({origins}),each:await Promise.all(origins.map(async origin=>({origin,contained:await chrome.permissions.contains({origins:[origin]})}))),unknownPort:await chrome.permissions.contains({origins:['http://127.0.0.1:41999/*']})}),origins);
  assert(permissions.all&&permissions.each.every(p=>p.contained)&&!permissions.unknownPort);
  assert(attempts.every(r=>r.method==='POST'&&origins.includes(new URL(r.url).origin+'/*')&&(['/graphql','/account/graphql'].includes(new URL(r.url).pathname)||/\/(GetServiceInfo|GetAvailableRange)$/.test(new URL(r.url).pathname))));
  await context.close();context=null;
  for(const[f,h]of Object.entries(build.artifacts))assert.equal(sha(path.join(build.output,f)),h);
  require('./lib/C109-product-source-lineage.cjs').validate(source.originalSource,buildFile);
  result={passed:true,preparedOnly:true,observedAt:new Date().toISOString(),owned,source:build.sourceAfter,origin:'chrome-extension://'+extensionId,extensionId,workerSource:loaded.evidence.after??loaded.evidence.before,uiSource:ui,permissions,profileClosed:true,profilesOpened:1,networkRequests:0,networkRequestsCountScope:'forwarded HTTP after interception',forwardedHttpRequests:0,allObservedHttpAttemptsAborted:true,httpAttemptsIntercepted:attempts.length,observedHttpAttempts:attempts,simulations:0,signatures:0,executeRequests:0,sourceKeysRead:false,parentCompletion:false,inputsSha256:Object.fromEntries(files.map(f=>[f,sha(f)]))};
 }catch(e){result={passed:false,errorType:e.name,message:String(e.message).slice(0,900),observedHttpAttempts:attempts,parentCompletion:false};process.exitCode=1;}
 finally{if(context)await context.close();fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:result.passed,origin:result.origin,errorType:result.errorType,message:result.message}));}
}
main().catch(e=>{console.error(JSON.stringify({passed:false,errorType:e.name,message:String(e.message).slice(0,500)}));process.exitCode=1;});

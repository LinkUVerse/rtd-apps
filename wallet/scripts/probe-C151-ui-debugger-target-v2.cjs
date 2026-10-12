// Diagnose native UI debugger attachment without accounts, signing or execution.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {chromium}=require('@playwright/test');
(async()=>{
 const logs=path.resolve(__dirname,'../migrationToGRpcOrGraphQLDoc/workLog'),out=path.join(logs,'20261009-C151-ui-debugger-target-02.json');assert(!fs.existsSync(out));
 const build=JSON.parse(fs.readFileSync(path.join(logs,'20261009-default-generation-positive-C136-build-01.json'))),profile=path.join(os.homedir(),'.local/state/rtd-wallet-migration/dev-20261006-03/ui-debugger-C151-empty-20261009-02');assert(!fs.existsSync(profile));
 let context,cdp,root;const report={passed:false,diagnosticOnly:true,profile,accountsCreated:0,signatures:0,executeRequests:0,nftBusinessRequests:0};
 try{
  context=await chromium.launchPersistentContext(profile,{executablePath:path.join(os.homedir(),'Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),headless:true,args:['--disable-extensions-except='+build.output,'--load-extension='+build.output]});
  await context.route('**/*',r=>/^https?:/.test(r.request().url())?r.abort():r.continue());
  const worker=context.serviceWorkers()[0]??await context.waitForEvent('serviceworker');const page=await context.newPage(),base=new URL('ui.html',worker.url()).href;

  cdp=await context.newCDPSession(page);report.parsed=[];report.contexts=[];cdp.on('Debugger.scriptParsed',e=>report.parsed.push({url:e.url,scriptId:e.scriptId}));cdp.on('Runtime.executionContextCreated',e=>report.contexts.push({origin:e.context.origin,name:e.context.name,auxData:e.context.auxData}));
  await cdp.send('Runtime.enable');report.enabled=await cdp.send('Debugger.enable');await cdp.send('Runtime.evaluate',{expression:'true'});await page.waitForTimeout(500);
  report.beforeNavigationCount=report.parsed.length;await page.goto(base);await page.locator('button,a,input').first().waitFor({timeout:30000});await page.waitForTimeout(500);report.afterNavigationCount=report.parsed.length;report.afterNavigationUrls=report.parsed.map(s=>s.url);await cdp.send('Debugger.disable');await cdp.send('Debugger.enable');report.afterReenableCount=report.parsed.length;report.afterReenableUrls=report.parsed.map(s=>s.url);await page.reload();await page.locator('button,a,input').first().waitFor({timeout:30000});await cdp.send('Runtime.evaluate',{expression:'true'});await page.waitForTimeout(500);
  root=await context.browser().newBrowserCDPSession();report.targets=(await root.send('Target.getTargets')).targetInfos.filter(t=>t.url.startsWith('chrome-extension:')).map(t=>({url:t.url,type:t.type,targetId:t.targetId}));
  report.passed=true;report.acceptedScope='UI native debugger diagnostics only';
 }catch(e){report.errorType=e.name;report.message=e.message;process.exitCode=1}
 finally{if(root)await root.detach();if(cdp)await cdp.detach();if(context)await context.close();report.ownBrowserNormallyClosed=true;report.observedAt=new Date().toISOString();fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify(report));}
})().catch(e=>{console.error(e.message);process.exitCode=1});

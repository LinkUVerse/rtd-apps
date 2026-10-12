// Load the real Explorer production build with a closed network and finite SDK fixtures.
const {chromium}=require('@playwright/test');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
(async()=>{
 const output=process.argv[2];assert(output&&!fs.existsSync(output));
 const root=path.resolve(__dirname,'../../rtd-explorer/src/explorer/dist');
 const server=http.createServer((request,response)=>{
  const name=new URL(request.url,'http://127.0.0.1').pathname;
  const file=path.resolve(root,'.'+name);const target=file.startsWith(root+path.sep)&&fs.existsSync(file)&&fs.statSync(file).isFile()?file:path.join(root,'index.html');
  response.setHeader('Content-Type',target.endsWith('.js')?'text/javascript':target.endsWith('.css')?'text/css':target.endsWith('.svg')?'image/svg+xml':'text/html');fs.createReadStream(target).pipe(response);
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;const methods=[],errors=[];let externalBlocked=0,result;
 try{
  browser=await chromium.launch({headless:true,executablePath:path.join(require('node:os').homedir(),'Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')});const context=await browser.newContext();
  await context.route('**/*',async route=>{
   const request=route.request(),url=new URL(request.url());
   if(url.hostname==='127.0.0.1'&&url.port===String(server.address().port))return route.continue();
   if(url.hostname!=='checkpoint.test'){externalBlocked++;return route.abort();}
   const body=request.postDataJSON();assert(typeof body.method==='string');methods.push(body.method);
   const result=body.method==='rtd_getLatestCheckpointSequenceNumber'?'0':body.method==='rtdx_getReferenceGasPrice'?'1000':body.method==='rtd_getCheckpoints'?{data:[],nextCursor:null,hasNextPage:false}:undefined;
   await route.fulfill({contentType:'application/json',body:JSON.stringify({jsonrpc:'2.0',id:body.id,...(result===undefined?{error:{code:-32601,message:'Fixture method unavailable'}}:{result})})});
  });
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.name));
  await page.goto(`http://127.0.0.1:${server.address().port}/?network=${encodeURIComponent('https://checkpoint.test')}`,{waitUntil:'domcontentloaded'});
  await page.getByTestId('home-page').waitFor({timeout:20000});
  await page.getByText('Reference Gas Price',{exact:true}).waitFor();
  await page.getByText('1,000',{exact:true}).waitFor();
  assert(!methods.some(value=>/get(?:NetworkMetrics|AddressMetrics|AllEpochAddressMetrics|MoveCallMetrics)$/.test(value)));
  assert.equal(errors.length,0);
  result={passed:true,observedAt:new Date().toISOString(),browser:browser.version(),productionBuildLoaded:true,homeRendered:true,actualSdkReferenceGasPriceRendered:true,methods,unimplementedAnalyticsRequests:0,pageErrorCount:errors.length,externalBlocked,liveChainRequests:0,scope:'Actual production Explorer entry, home render and SDK fixture flow only; statistics cards are currently inactive in Home and are covered separately by component tests. All external destinations blocked; no real Explorer service/data or wallet/core trial claim.'};
 }catch(error){result={passed:false,errorType:error.name,pageErrorCount:errors.length,methods,externalBlocked,scope:'Startup failure; no real chain requests'};process.exitCode=1;}
 finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify(result));}
})().catch(error=>{console.error(JSON.stringify({passed:false,errorType:error.name}));process.exitCode=1;});

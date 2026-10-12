const assert=require('node:assert/strict');
const {expect}=require('@playwright/test');
module.exports=async({page,setStage,evidenceDirectory,accountId,accountAddress})=>{
 const trace=[];const requests=new Map();const started=Date.now();
 page.on('request',request=>{if(new URL(request.url()).pathname!=='/graphql')return;const body=request.postDataJSON();const query=body?.query??'';const entry={ms:Date.now()-started,kind:query.includes('objects(first:')?'owned':query.includes('dynamicFields(first:')?'fields':query.includes('dynamicField(')?'field':query.includes('multiGetObjects')?'objects':query.includes('balances(')?'balances':'other',checkpoint:query.match(/checkpoint\(sequenceNumber: ([0-9]+)/)?.[1]};trace.push(entry);requests.set(request,entry);});
 page.on('requestfinished',request=>{const entry=requests.get(request);if(entry)entry.done=Date.now()-started;});
 page.on('requestfailed',request=>{const entry=requests.get(request);if(entry){entry.failed=request.failure()?.errorText;entry.done=Date.now()-started;}});
 const base=page.url().split('#')[0];
 const runtimeErrors=[];page.on('pageerror',error=>runtimeErrors.push(error.name+': '+error.message.slice(0,300))); 
 setStage('staking: real validator list for empty portfolio');
 await page.goto(`${base}#/stake`);
 const rows=page.getByTestId('validator-list-item');
 await expect(rows.first()).toBeVisible({timeout:60000}).catch(async error => {
  console.error(JSON.stringify({stakingDiagnostic:{route:new URL(page.url()).hash,errors:await page.locator('.bg-issue-light').allTextContents(),headings:await page.getByRole('heading').allTextContents(),rowCount:await rows.count(),trace,runtimeErrors,bodyText:(await page.locator("body").innerText()).slice(0,1500)}}));throw error;
 });
 const count=await rows.count();assert(count>0);
 await rows.first().click();
 const next=page.getByTestId('select-validator-cta');
 await expect(next).toBeVisible();await next.click();
 await page.waitForURL(/#\/stake\/new\?address=/);
 const validator=new URLSearchParams(new URL(page.url()).hash.split('?')[1]).get('address');
 assert.match(validator,/^0x[0-9a-f]{64}$/);
 setStage('staking: fresh balance and amount form');
 const amount=page.getByTestId('stake-amount-input');
 await expect(amount).toBeVisible({timeout:60000}).catch(async error=>{console.error(JSON.stringify({stakingFormDiagnostic:{bodyText:(await page.locator("body").innerText()).slice(0,1800),trace}}));throw error;});
 setStage("staking: reject zero amount");
 await amount.fill('0');await amount.blur();
 const review=page.getByRole('button',{name:/^(Review transaction|预览交易)$/});
 await expect(review).toBeDisabled();
 setStage('staking: allow one RTD preview');
 await amount.fill('1');await amount.blur();
 await expect(review).toBeEnabled();
 let preview, execution;
 if(process.env.RTD_TEST_STAKING_PREVIEW==='1') {
  setStage('staking: actual Fullnode preparation preview');
  await review.click();
  const confirm=page.getByRole('button',{name:/^(立即质押|Stake Now)$/});
  await expect(confirm).toBeVisible({timeout:60000});
  await expect(confirm).toBeEnabled();
  const paragraphs=await page.locator('p').allTextContents();
  assert(paragraphs.some(text=>text.includes(validator)));
  assert(paragraphs.some(text=>/1000000000/.test(text)));
  const digestLine=paragraphs.find(text=>/(交易摘要|Transaction Digest|Transaction digest)/.test(text));
  const gasLine=paragraphs.find(text=>/(Gas 预算|Gas budget|Gas Budget)/.test(text));
  assert(digestLine,'preview digest missing');assert(gasLine,'preview gas missing');
  preview={digestLine,gasLine,atomicAmount:'1000000000',validator};
  if(evidenceDirectory) {
   execution=await require('./test-staking-execution.cjs')({page,confirm,preview,evidenceDirectory,accountId,accountAddress,setStage});
  } else {
   await page.getByRole('button',{name:/^(返回|Back)$/}).click();
   await expect(amount).toBeVisible();
  }
 }
 // Final approval is allowed only with a retained execution directory.

 assert.equal(await page.getByText('正在核对原交易',{exact:true}).count(),0);
 await page.goto(`${base}#/tokens`);
 return {passed:true,validators:count,validator,preview,execution,checks:['real GraphQL-backed validator list for empty staking portfolio','validator selection navigates to matching address','fresh-balance staking amount form renders; zero rejects and one RTD permits preview'],transactionApprovalClicks:execution?1:0,scope:execution?'actual staking UI preview and one retained execution; no active-position reward or withdrawal UI acceptance':preview?'actual staking UI preview and return to form; no submission, active-position reward or withdrawal acceptance':'navigation and form admission only; no stake submission, active-position reward or withdrawal UI acceptance'};
};

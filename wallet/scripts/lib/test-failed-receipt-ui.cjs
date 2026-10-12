const assert=require('node:assert/strict');
const {expect}=require('@playwright/test');
const {journal}=require('./test-dapp-execution.cjs');
module.exports=async({page,setStage})=>{
 const digest='Ag91tYoNP1iPCcFUUmK8Fs77nSsB3DkynZ8NpyyGzUFj';
 setStage('existing on-chain failure read-only receipt');
 const before=await journal(page);assert.equal(before.length,0,'disposable readonly profile must not have execution records');
 const requests=[],responses=[],failures=[];
 const observe=request=>{if(request.url().includes('.LedgerService/'))requests.push(request.url());};
 const responded=response=>{if(response.url().includes('.LedgerService/'))responses.push({url:response.url(),status:response.status()});};
 const failed=request=>{if(request.url().includes('.LedgerService/'))failures.push({url:request.url(),error:request.failure()?.errorText});};
 page.context().on('request',observe);page.context().on('response',responded);page.context().on('requestfailed',failed);
 try{
  await page.goto(page.url().split('#')[0]+'#/receipt?txdigest='+digest+'&from=tokens');
  for(let attempt=0;attempt<3;attempt++){
   try{await expect(page.getByTestId('transaction-status')).toHaveText('交易失败',{timeout:20000});break;}
   catch(error){if(attempt===2)throw error;const refresh=page.getByRole('button',{name:'刷新交易详情',exact:true});if(await refresh.isVisible())await refresh.click();}
  }
  await expect(page.getByText(/InsufficientGas|insufficient gas/i,{exact:false}).first()).toBeVisible();
  assert(requests.some(url=>url.startsWith('https://127.0.0.1:39603/archive/')&&url.endsWith('.LedgerService/GetTransaction')),'must read original archive transaction');
  assert(requests.every(url=>new URL(url).hostname==='127.0.0.1'));
  assert.equal(new URLSearchParams(new URL(page.url()).hash.split('?')[1]).get('txdigest'),digest);
  assert.deepEqual(await journal(page),before,'viewing chain failure must not manufacture journal entries');
  return {digest,checkpoint:'20776',status:'failed',failureReasonVisible:true,archiveTransactionReads:requests.filter(url=>url.includes(':39603/')&&url.endsWith('.LedgerService/GetTransaction')).length,journalUnchanged:true,responses,failures,scope:'existing real InsufficientGas archive transaction shown in actual receipt UI; no new wallet submission or fabricated pending/terminal journal'};
 }catch(error){console.error(JSON.stringify({receiptDiagnostic:{requests,responses,failures,message:String(error.message).slice(0,450),route:new URL(page.url()).hash,statuses:await page.getByTestId('transaction-status').allTextContents(),archiveReads:requests.filter(url=>url.includes(':39603/')).length,refreshButtons:await page.getByRole('button',{name:'刷新交易详情',exact:true}).count()}}));throw error;}finally{page.context().off('request',observe);page.context().off('response',responded);page.context().off('requestfailed',failed);}
};

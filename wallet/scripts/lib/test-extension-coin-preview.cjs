const assert=require('node:assert/strict');
const {expect}=require('@playwright/test');
module.exports=async({page,accountAddress,setStage,execute,amountText='0.000000001',atomicAmount='1'})=>{
 const base=page.url().split('#')[0];
 setStage('coin: open native transfer form');
 await page.goto(`${base}#/send?type=${encodeURIComponent('0x2::rtd::RTD')}`);
 const amount=page.getByTestId('coin-amount-input');
 try{
  await expect(amount).toBeVisible({timeout:60000});
  await amount.fill(amountText);await amount.blur();
  await page.locator('[name="to"]').fill(accountAddress);await page.locator('[name="to"]').blur();
  setStage('coin: prepare transfer preview');
  const review=page.getByRole('button',{name:/^(检查|Review)$/});
  await expect(review).toBeEnabled({timeout:60000});await review.click();
  setStage('coin: final approval available');
  const send=page.getByRole('button',{name:/^(立即发送|Send Now)$/});
  await expect(send).toBeVisible({timeout:60000});await expect(send).toBeEnabled();
  assert.equal(await page.getByText('当前链账户正在签名或恢复，请稍后查看结果',{exact:true}).count(),0);
  await expect(page.getByText(/^(交易有效期|Transaction validity)$/)).toBeVisible();
  const validityDisplayed = await page.getByText(/^(交易未设置有效期|No transaction expiration|最后有效 epoch（含）|Last valid epoch \(inclusive\))$/).count() > 0;
  assert(validityDisplayed, 'final-byte validity must be displayed before approval');
  let execution;
  if(execute) execution=await execute({send});
  else {await page.getByRole('button',{name:/^(返回|Back)$/}).click();await expect(amount).toBeVisible();}
  return {passed:true,atomicAmount,recipient:accountAddress,approvalEnabled:true,validityDisplayed,execution,approvalClicks:execute?1:0,scope:execute?'real coin form and retained one-time execution; chain failure acceptance excluded':'real coin form preparation and return only; no execution or chain failure acceptance'};
 }catch(error){console.error(JSON.stringify({coinPreviewDiagnostic:{route:new URL(page.url()).hash,body:(await page.locator('body').innerText()).slice(0,2200)}}));throw error;}
 finally{await page.goto(`${base}#/tokens`);}
};

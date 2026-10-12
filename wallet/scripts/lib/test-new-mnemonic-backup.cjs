const assert=require('node:assert/strict');
const {expect}=require('@playwright/test');
const {Ed25519Keypair}=require('rtd-typescript/keypairs/ed25519');
module.exports=async({page,setStage})=>{
 setStage('new account: backup phrase page');
 await page.waitForURL(/#\/accounts\/backup\//);
 const box=page.locator('.theme-card').filter({has:page.locator('.break-all')}).last();
 setStage('new account: reveal backup phrase');
 const reveal=box.getByRole('button');
 await expect(reveal).toHaveCount(1);await reveal.click();
 const words=await box.locator('.break-all .absolute').innerText();
 const phrase=words.trim().split(/\s+/).join(' ');
 assert([12,15,18,21,24].includes(phrase.split(' ').length),'invalid mnemonic word count');
 // The random test secret remains in memory; never log it or write it to evidence.
 const key=Ed25519Keypair.deriveKeypair(phrase);
 await reveal.click();await expect(box.locator('.break-all .absolute')).toHaveCount(0);
 setStage('new account: backup acknowledgement gate');
 await expect(page.getByRole('button',{name:/^(打开 RTD 钱包|Open RTD Wallet)$/})).toBeDisabled();
 await page.locator('label').filter({has:page.locator('input[name=agree]')}).click();
 await page.getByRole('link',{name:/^(打开 RTD 钱包|Open RTD Wallet)$/}).click();
 return key;
};

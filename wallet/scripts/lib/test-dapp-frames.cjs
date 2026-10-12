const assert=require('node:assert/strict');
const http=require('node:http');
const {expect}=require('@playwright/test');
module.exports=async({context,demo,extensionPage,server,setStage})=>{
 const foreignServer=http.createServer(server.listeners('request')[0]);
 await new Promise(resolve=>foreignServer.listen(0,'127.0.0.1',resolve));
 let popups=0;const count=()=>popups++;
 context.on('page',count);
 try{
  const urls=[demo.url(),`http://127.0.0.1:${foreignServer.address().port}/`];
  const results=[];
  for(const [index,url] of urls.entries()){
   setStage(`iframe ${index}: independent wallet injection absent`);
   const name=`wallet-frame-${index}`;
   await demo.evaluate(({name,url})=>new Promise(resolve=>{const frame=document.createElement('iframe');frame.name=name;frame.src=url;frame.onload=()=>resolve();document.body.append(frame);}),{name,url});
   const frame=demo.frame({name});assert(frame);
   await frame.getByRole('button',{name:'Inspect wallet authorization',exact:true}).click();
   assert.deepEqual(JSON.parse(await frame.getByTestId('wallet-authorization').innerText()),[]);
   await expect(frame.getByRole('button',{name:'Connect',exact:true})).toBeDisabled();
   setStage(`iframe ${index}: direct postMessage cannot borrow parent bridge`);
   const id=`frame-probe-${index}`;
   await demo.evaluate(id=>{window.__frameReplies=[];window.addEventListener('message',event=>{if(event.data?.target==='rtd_in-page'&&event.data.payload?.id===id)window.__frameReplies.push(event.data.payload);});},id);
   await frame.evaluate(id=>{parent.postMessage({target:'rtd_content-script',payload:{id,payload:{type:'get-account'}}},'*');parent.postMessage({target:'rtd_content-script',payload:{id,payload:{type:'acquire-permissions-request',permissions:['viewAccount','suggestTransactions']}}},'*');parent.postMessage({target:'rtd_content-script',payload:{id,payload:{type:'disconnect-app'}}},'*');},id);
   // Top-level roundtrip sent after the child's postMessages proves the bridge still works.
   const response=await demo.evaluate(()=>new Promise((resolve,reject)=>{const id=crypto.randomUUID();const timer=setTimeout(()=>reject(new Error('parent bridge timeout')),10000);const listener=event=>{if(event.source===window&&event.data?.target==='rtd_in-page'&&event.data.payload?.id===id){clearTimeout(timer);window.removeEventListener('message',listener);resolve(event.data.payload.payload);}};window.addEventListener('message',listener);window.postMessage({target:'rtd_content-script',payload:{id,payload:{type:'get-account'}}});}));
   assert.equal(response.type,'get-account-response');
   assert.deepEqual(await demo.evaluate(()=>window.__frameReplies),[]);
   assert.equal(await extensionPage.evaluate(async origin=>!!(await chrome.storage.local.get('permissions')).permissions?.[origin],new URL(demo.url()).origin),true);
   results.push({frame:index===0?'same-origin':'cross-origin',injected:false,parentBridgeIgnored:true});
  }
  setStage('malformed page messages do not terminate wallet bridge');
  await demo.evaluate(()=>{for(const data of [null,undefined,7,'unrelated',{}, {target:'rtd_content-script'}, {target:'rtd_content-script',payload:{id:'bad',payload:null}}, {target:'rtd_in-page',payload:null}])window.postMessage(data);});
  const network=await demo.evaluate(()=>new Promise((resolve,reject)=>{const id=crypto.randomUUID();const timer=setTimeout(()=>reject(new Error('bridge terminated')),10000);const listener=event=>{if(event.source===window&&event.data?.target==='rtd_in-page'&&event.data.payload?.id===id){clearTimeout(timer);window.removeEventListener('message',listener);resolve(event.data.payload.payload);}};window.addEventListener('message',listener);window.postMessage({target:'rtd_content-script',payload:{id,payload:{type:'get-network'}}});}));
  assert.equal(network.type,'set-network');
  assert.equal(popups,0);
  return {passed:true,results,popups,malformedMessagesSurvived:true,scope:'direct child-to-parent postMessage; same-origin scripts can access parent JavaScript and are not an origin security boundary'};
 }finally{
  context.off('page',count);
  await demo.evaluate(()=>document.querySelectorAll('iframe[name^="wallet-frame-"]').forEach(frame=>frame.remove()));
  foreignServer.closeAllConnections();await new Promise(resolve=>foreignServer.close(resolve));
 }
};

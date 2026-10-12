// Observe the existing UI -> background response, without sending, replacing or
// invoking any production method. Never copy signed bytes, tokens or key material.
const crypto=require('node:crypto'),assert=require('node:assert/strict');
async function observe(worker){
 const key='__C187ApprovalCommands_'+crypto.randomUUID().replaceAll('-','');
 await worker.evaluate(key=>{
  if(Object.hasOwn(globalThis,key))throw Error('Observer already exists');
  const state={rows:[],commands:[],ports:new Map()};
  const connect=port=>{if(port.name!=='rtd_ui<->background')return;
   const message=m=>{const p=m?.payload;if(p?.type==='method-payload'&&(['prepareDappTransaction','signDappPrepared'].includes(p.method)||/^recover.*Execution$/.test(p.method))){state.commands.push({observedAt:new Date().toISOString(),method:p.method,requestId:p.args?.requestId??null,senderUrl:port.sender?.url??null});}if(p?.type!=='transaction-request-response')return;
    state.rows.push({observedAt:new Date().toISOString(),txID:p.txID,approved:p.approved,txResultError:typeof p.txResultError==='string'?p.txResultError.slice(0,4096):null,txSignedPresent:Boolean(p.txSigned),senderUrl:port.sender?.url??null});};
   const disconnect=()=>{port.onMessage.removeListener(message);port.onDisconnect.removeListener(disconnect);state.ports.delete(port);};
   state.ports.set(port,{message,disconnect});port.onMessage.addListener(message);port.onDisconnect.addListener(disconnect);
  };
  state.connect=connect;globalThis[key]=state;chrome.runtime.onConnect.addListener(connect);
 },key);
 const snapshot=()=>worker.evaluate(key=>{const s=globalThis[key];if(!s)throw Error('Observer missing');return{rows:s.rows,commands:s.commands,observerSentMessages:0,productionMethodsInvoked:0,sourceEdited:false,listenerOnly:true};},key);
 const close=async()=>{const rows=await snapshot();const cleanup=await worker.evaluate(key=>{const s=globalThis[key];if(!s)throw Error('Observer missing');chrome.runtime.onConnect.removeListener(s.connect);for(const[port,{message,disconnect}]of s.ports){port.onMessage.removeListener(message);port.onDisconnect.removeListener(disconnect);}return{ownListenersRemoved:true,ownMemoryRemoved:delete globalThis[key],sourceEdited:false};},key);assert(cleanup.ownListenersRemoved&&cleanup.ownMemoryRemoved);return{...rows,cleanup};};
 return{snapshot,close};
}
module.exports={observe};

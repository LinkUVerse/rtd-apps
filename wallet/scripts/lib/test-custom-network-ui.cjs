const assert=require('node:assert/strict');
const {expect}=require('@playwright/test');
module.exports=async({page,setStage})=>{
 setStage('custom network settings');
 const base=page.url().split('#')[0];
 if(process.env.RTD_TEST_LEGACY_NETWORK==='1'){
  setStage('legacy empty custom network fixture');
  // This script is called only in the disposable account-lifecycle profile; no transaction scenario is allowed.
  await page.evaluate(async()=>{await chrome.storage.local.remove(['wallet_network_v2','wallet_custom_profile_v2']);await chrome.storage.local.set({rtd_Env:'customRPC',rtd_Env_RPC:''});});
  await page.goto(base+'#/tokens?menu=%2Fnetwork');await page.reload();
  await expect(page.getByLabel('Fullnode gRPC-Web',{exact:true})).toHaveValue('');
  await expect(page.getByLabel('配置版本',{exact:true})).toHaveValue('1');
  await page.getByRole('button',{name:/^(自定义 RPC|Custom RPC)$/}).click();
  await expect(page.getByLabel('Fullnode gRPC-Web',{exact:true})).toBeVisible();
  const stored=await page.evaluate(()=>chrome.storage.local.get(['wallet_network_v2','wallet_custom_profile_v2','rtd_Env','rtd_Env_RPC']));
  assert.equal(stored.rtd_Env,'customRPC');assert.equal(stored.rtd_Env_RPC,'');
  assert.equal(stored.wallet_network_v2,undefined);assert.equal(stored.wallet_custom_profile_v2,undefined);
  return {legacyRepairOnly:true,formAvailable:true,noFabricatedEndpoints:true,legacyPreserved:true,saved:false};
 }
 await page.goto(base+'#/tokens?menu=%2Fnetwork');
 await page.getByRole('button',{name:/^(自定义 RPC|Custom RPC)$/}).click();
 const multi=process.env.RTD_TEST_CUSTOM_MULTI_NETWORK==='1';
 const profile={id:multi?'readonly-four-service-ui':'readonly-local-ui',displayName:'本机只读配置验收',sdkNetwork:'localnet',walletStandardChain:'rtd:localnet',expectedGenesisDigest:'3tEPxLxUysGx4gfr8UEycvH7xohMWuwKVbTX5np4TCYj',generation:'dev-20261003-01',revision:1,endpoints:{fullnodeGrpcWeb:'http://127.0.0.1:39400'},packages:{}};
 if(multi) Object.assign(profile.endpoints,{graphqlUrl:'https://127.0.0.1:39600/graphql',archiveGrpcWeb:'https://127.0.0.1:39603/archive',accountHistoryUrl:'https://127.0.0.1:39606/account/graphql'});
 const labels={'配置标识':profile.id,'网络名称':profile.displayName,'SDK 网络标签':profile.sdkNetwork,'钱包标准链标签（rtd:...）':profile.walletStandardChain,'完整创世摘要 H0':profile.expectedGenesisDigest,'部署代次':profile.generation,'配置版本':'1','Fullnode gRPC-Web':profile.endpoints.fullnodeGrpcWeb};
 if(multi)Object.assign(labels,{'GraphQL（可选）':profile.endpoints.graphqlUrl,'归档 gRPC-Web（可选）':profile.endpoints.archiveGrpcWeb,'账户历史服务（可选）':profile.endpoints.accountHistoryUrl});
 for(const [label,value] of Object.entries(labels))await page.getByLabel(label,{exact:true}).fill(value);
 // Continue only if the native API confirms a pre-existing grant. Never fake permissions or bypass a prompt.
 const permitted=await page.evaluate(()=>chrome.permissions.contains({origins:['http://127.0.0.1:39400/*']}));
 if(!multi)assert.equal(permitted,true,'requires already granted loopback permission');
 // The four-service fresh-profile scenario must obtain missing grants through the real product submit.
 const origins=Object.values(profile.endpoints).map(url=>new URL(url).origin+'/*');
 const beforePermission=await page.evaluate(origins=>chrome.permissions.contains({origins}),origins);
 setStage('custom fullnode identity preflight');
 await page.getByRole('button',{name:'授权服务地址并预检',exact:true}).click();
 const confirm=page.getByRole('button',{name:'确认保存并切换',exact:true});
 try{await expect(confirm).toBeEnabled({timeout:process.env.RTD_TEST_CUSTOM_HEADED==='1'?120000:30000});}catch(error){
  const diagnostics={customPreflightPassed:false,alert:await page.getByRole('alert').allTextContents(),
    nativePermissions:await page.evaluate(origins=>chrome.permissions.contains({origins}),origins)};
  process.stderr.write(JSON.stringify(diagnostics)+'\n');throw error;
 }
 await expect(page.getByText(multi?'已核验：fullnode、graphql、archive。请核对后确认保存。':'已核验：fullnode。请核对后确认保存。',{exact:true})).toBeVisible();
 assert.equal(await page.evaluate(origins=>chrome.permissions.contains({origins}),origins),true,'actual native service permissions required');
 if(multi)await expect(page.getByText('账户历史覆盖将在读取时验证；领币服务与链的对应关系需由部署配置保证。',{exact:true})).toBeVisible();
 const before=await page.evaluate(()=>chrome.storage.local.get('wallet_network_v2'));
 assert.notEqual(before.wallet_network_v2?.env,'customRPC');
 setStage('custom confirm persists and switches');await confirm.click();
 await expect.poll(async()=> (await page.evaluate(()=>chrome.storage.local.get('wallet_network_v2'))).wallet_network_v2?.env).toBe('customRPC');
 const stored=await page.evaluate(()=>chrome.storage.local.get(['wallet_network_v2','wallet_custom_profile_v2']));
 assert.equal(stored.wallet_network_v2.profile.id,profile.id);
 assert.equal(stored.wallet_network_v2.profile.revision,1);
 assert.deepEqual(stored.wallet_network_v2.profile,stored.wallet_custom_profile_v2);
 await expect(page.getByLabel('配置版本',{exact:true})).toHaveValue('2');
 let finalStored=stored;let revisionRefused=false,revocationRefused=false,requiredPermissionRemovalRefused=false;
 if(multi){
  setStage('custom four-role repeated revision refusal');
  await page.getByLabel('配置版本',{exact:true}).fill('1');
  await page.getByRole('button',{name:'授权服务地址并预检',exact:true}).click();await expect(confirm).toBeEnabled({timeout:process.env.RTD_TEST_CUSTOM_HEADED==='1'?120000:30000});await confirm.click();
  await expect(page.getByRole('alert')).toHaveText('修改现有网络时必须增加配置版本');
  assert.deepEqual((await page.evaluate(()=>chrome.storage.local.get('wallet_network_v2'))).wallet_network_v2,stored.wallet_network_v2);revisionRefused=true;
  await page.getByLabel('配置版本',{exact:true}).fill('2');
  await page.getByRole('button',{name:'授权服务地址并预检',exact:true}).click();await expect(confirm).toBeEnabled({timeout:process.env.RTD_TEST_CUSTOM_HEADED==='1'?120000:30000});await confirm.click();
  await expect(page.getByLabel('配置版本',{exact:true})).toHaveValue('3');
  finalStored=await page.evaluate(()=>chrome.storage.local.get(['wallet_network_v2','wallet_custom_profile_v2']));
  assert.equal(finalStored.wallet_network_v2.profile.revision,2);assert.deepEqual(finalStored.wallet_network_v2.profile,finalStored.wallet_custom_profile_v2);
  assert.deepEqual(finalStored.wallet_network_v2.profile.endpoints,profile.endpoints);
  setStage('custom native permission revocation refuses prepared save');
  await page.getByRole('button',{name:'授权服务地址并预检',exact:true}).click();await expect(confirm).toBeEnabled({timeout:process.env.RTD_TEST_CUSTOM_HEADED==='1'?120000:30000});
  const httpsOrigins=origins.filter(url=>url.startsWith('https:'));
  let removed=false;
  try{removed=await page.evaluate(origins=>chrome.permissions.remove({origins}),httpsOrigins);}catch(error){
   assert.match(String(error.message),/You cannot remove required permissions/);
   const actual=await page.evaluate(()=>chrome.permissions.getAll());assert(actual.origins.includes('<all_urls>'));
   assert.equal(await page.evaluate(origins=>chrome.permissions.contains({origins}),origins),true);
   assert.deepEqual((await page.evaluate(()=>chrome.storage.local.get('wallet_network_v2'))).wallet_network_v2,finalStored.wallet_network_v2);
   requiredPermissionRemovalRefused=true;
  }
  if(requiredPermissionRemovalRefused){
   // Real manifest content-script hosts are required; the API cannot revoke them. No revocation proof claimed.
   await page.getByRole('button',{name:'返回修改',exact:true}).click();
  }else{
   assert.equal(removed,true);
   assert.equal(await page.evaluate(origins=>chrome.permissions.contains({origins}),origins),false);
   await confirm.click();await expect(page.getByRole('alert')).toHaveText('网络服务权限已撤销，请重新预检');
   assert.deepEqual((await page.evaluate(()=>chrome.storage.local.get('wallet_network_v2'))).wallet_network_v2,finalStored.wallet_network_v2);revocationRefused=true;
   setStage('custom restore permissions through actual submit');
   await page.getByRole('button',{name:'授权服务地址并预检',exact:true}).click();await expect(confirm).toBeEnabled({timeout:process.env.RTD_TEST_CUSTOM_HEADED==='1'?120000:30000});
   assert.equal(await page.evaluate(origins=>chrome.permissions.contains({origins}),origins),true);
   await page.getByRole('button',{name:'返回修改',exact:true}).click();
  }
 }
 return {profile:finalStored.wallet_network_v2.profile,preflightRoles:multi?['fullnode','graphql','archive']:['fullnode'],
  origins,permissionBefore:beforePermission,permissionAfter:true,revisionRefused,revocationRefused,requiredPermissionRemovalRefused,
  permissionMode:multi?'actual native contains/request/remove through product submit; precise SPKI, no normal CA claim':'native contains/request using existing loopback host grant; no new prompt accepted',saved:true};
};
module.exports.verifyRestart=async({page,evidence,setStage})=>{
 setStage('custom configuration survives full browser restart');
 if(evidence.legacyRepairOnly){
  const stored=await page.evaluate(()=>chrome.storage.local.get(['wallet_network_v2','rtd_Env','rtd_Env_RPC']));
  assert.equal(stored.rtd_Env,'customRPC');assert.equal(stored.rtd_Env_RPC,'');assert.equal(stored.wallet_network_v2,undefined);
  evidence.persistedAcrossBrowserRestart=true;return;
 }
 const stored=await page.evaluate(()=>chrome.storage.local.get(['wallet_network_v2','wallet_custom_profile_v2']));
 assert.equal(stored.wallet_network_v2.env,'customRPC');
 assert.deepEqual(stored.wallet_network_v2.profile,evidence.profile);
 assert.deepEqual(stored.wallet_custom_profile_v2,evidence.profile);
 assert.equal(await page.evaluate(origins=>chrome.permissions.contains({origins}),evidence.origins),true);
 evidence.nativePermissionsPersistedAcrossRestart=true;
 evidence.persistedAcrossBrowserRestart=true;
};

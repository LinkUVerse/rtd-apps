const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
async function inspect(context,page,extension,requiredFiles=[],navigation){
 const cdp=await context.newCDPSession(page),scripts=new Map();
 try{
  const base=new URL('./',navigation?.url??page.url()).href;
  assert(requiredFiles.every(file=>file===path.basename(file)&&file.endsWith('.js')&&fs.existsSync(path.join(extension,file))));
  const resources=navigation?[base+'ui.js']:await page.evaluate(()=>{const base=new URL('./',location.href).href;return Array.from(new Set([...Array.from(document.scripts,s=>s.src),...performance.getEntriesByType('resource').map(r=>r.name)].filter(url=>url.startsWith(base)&&url.endsWith('.js'))));});
  const expected=Array.from(new Set(resources.concat(requiredFiles.map(file=>base+file))));
  assert(expected.some(url=>url.endsWith('/ui.js')),'Rendered UI must have its bootstrap resource: '+JSON.stringify({page:page.url(),expected}));
  let notify;const parsed=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('UI debugger script lookup timeout: '+JSON.stringify({base,expected,parsed:Array.from(scripts.keys())}))),10000);notify=()=>{if(expected.every(url=>scripts.has(url))&&scripts.size>=2){clearTimeout(timer);resolve();}};});parsed.catch(()=>{});
  cdp.on('Debugger.scriptParsed',e=>{if(e.url.startsWith(base)&&e.url.endsWith('.js')){scripts.set(e.url,e.scriptId);notify();}});
  await cdp.send('Debugger.enable');if(navigation)await navigation.navigate();await cdp.send('Runtime.evaluate',{expression:'true'});await parsed;const loaded=[];
  for(const[url,id]of scripts){const file=new URL(url).pathname.slice(1);assert(!file.includes('/'));const{scriptSource}=await cdp.send('Debugger.getScriptSource',{scriptId:id});const disk=fs.readFileSync(path.join(extension,file),'utf8');assert.equal(scriptSource,disk);loaded.push({file,loadedSha256:sha(scriptSource),diskSha256:sha(disk),matchesDisk:true})}
  const bootstrap=loaded.find(r=>r.file==='ui.js');assert(bootstrap);assert(loaded.length>=2&&loaded.some(r=>r.file!=='ui.js'));
  return{...bootstrap,loadedBundles:loaded,matchesDisk:true,scope:'Actual loaded independent bootstrap and all extension JS reported by native Debugger after UI rendered'};
 }finally{await cdp.detach()}
}
module.exports={inspect};

// Test-only static dApp build. Preserve current wallet product and all old artifacts.
const fs = require('node:fs'),path = require('node:path'),assert = require('node:assert/strict'),crypto = require('node:crypto');
const esbuild = require(require.resolve('esbuild',{paths:[path.dirname(require.resolve('tsx'))]}));
const wallet = path.resolve(__dirname,'..'),sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
async function main() {
  const [directory,output] = process.argv.slice(2);assert(directory && output && !fs.existsSync(directory) && !fs.existsSync(output));
  assert.equal(path.dirname(path.resolve(directory)), '/Users/changzechuan/.local/state/rtd-wallet-migration/dev-20261006-03');
  assert(path.basename(directory).startsWith('C164-validity-demo-'));
  const lineage = require('./lib/C136-product-source-lineage.cjs'),q = JSON.parse(fs.readFileSync(lineage.qualificationFile));
  const source = lineage.validate(q.originalSource,q.buildFile);
  const entry = path.join(__dirname,'fixtures/C114-validity-demo.mjs'),html = path.join(__dirname,'fixtures/C114-validity-demo.html');
  const result = await esbuild.build({entryPoints:[entry],bundle:true,write:false,platform:'browser',format:'esm',target:'chrome130',
    outfile:path.join(path.resolve(directory),'main.js'),metafile:true,sourcemap:'external',sourcesContent:true});
  const inputs = Object.fromEntries(Object.keys(result.metafile.inputs).map(f => [path.resolve(wallet,f),sha(path.resolve(wallet,f))]));
  const files = Object.fromEntries(result.outputFiles.map(f => [path.basename(f.path),f.contents]));
  assert(files['main.js'] && files['main.js.map']);const map = JSON.parse(Buffer.from(files['main.js.map']).toString());
  assert.equal(map.sources.length,map.sourcesContent.length);
  const mappedInputs = {};
  for (let i = 0;i < map.sources.length;i++) {const file = path.resolve(directory,map.sources[i]);assert.equal(fs.readFileSync(file,'utf8'),map.sourcesContent[i]);mappedInputs[file] = sha(file)}
  assert.deepEqual(lineage.validate(q.originalSource,q.buildFile),source);
  fs.mkdirSync(directory,{mode:0o700});fs.writeFileSync(path.join(directory,'index.html'),fs.readFileSync(html),{flag:'wx',mode:0o600});
  for (const [name,bytes] of Object.entries(files)) fs.writeFileSync(path.join(directory,name),bytes,{flag:'wx',mode:0o600});
  const proof = {passed:true,observedAt:new Date().toISOString(),preparedOnly:true,directory:path.resolve(directory),source,
    sourceMapAllDiskSourcesEqual:true,sourceCount:map.sources.length,sourceUnchanged:true,
    artifacts:Object.fromEntries(['index.html','main.js','main.js.map'].map(f => [f,sha(path.join(directory,f))])),
    networkRequests:0,profilesOpened:0,signatures:0,executeRequests:0,parentCompletion:false,
    inputsSha256:{...inputs,...mappedInputs,[__filename]:sha(__filename),[html]:sha(html),[lineage.qualificationFile]:sha(lineage.qualificationFile)}};
  fs.writeFileSync(output,JSON.stringify(proof,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:true,preparedOnly:true,sources:map.sources.length,sourceUnchanged:true}));
}
if (require.main === module) main().catch(e => {console.error(JSON.stringify({passed:false,errorType:e.name,message:String(e.message).slice(0,400)}));process.exitCode = 1});

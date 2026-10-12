// Verify the actual current name reader API and retained eight-case probe without IO.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const crypto=require('node:crypto'),ts=require('typescript');
const wallet=path.resolve(__dirname,'..');
const [output,typecheckFile]=process.argv.slice(2);
assert(output&&typecheckFile&&!fs.existsSync(output));
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const old=path.join(__dirname,'probe-current-positive-C39-names-diagnostic.ts');
const fresh=path.join(__dirname,'probe-current-positive-names-v3.ts');
const readerFile=path.join(wallet,'src/shared/rpc/name-reader.ts');
let io=0,result;
try{
 const checked=JSON.parse(fs.readFileSync(typecheckFile,'utf8'));
 assert(checked.passed&&checked.compilerExitCode===0);
 for(const[file,hash]of Object.entries(checked.inputsSha256))assert.equal(sha(file),hash);
 const source=fs.readFileSync(fresh,'utf8');
 const tree=ts.createSourceFile(fresh,source,ts.ScriptTarget.Latest,true);
 assert.equal(tree.parseDiagnostics.length,0);
 const calls=[];const visit=node=>{
  if(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression))calls.push(node.expression.getText(tree));
  ts.forEachChild(node,visit);
 };visit(tree);
 assert(calls.includes('reader.defaultName')&&calls.includes('reader.resolve')&&!calls.includes('reader.reverse'));
 const cases=s=>s.slice(s.indexOf('  const cases = ['),s.indexOf('  const originalFetch ='));
 assert.equal(cases(source),cases(fs.readFileSync(old,'utf8')));
 assert.equal((cases(source).match(/mode:/g)||[]).length,8);
 const readerSource=fs.readFileSync(readerFile,'utf8');
 assert(readerSource.includes('minimumCheckpoint: startHeight'));
 assert(readerSource.includes('BigInt(snapshot.proof.checkpoint) + 20n'));
 const originalFetch=globalThis.fetch;
 globalThis.fetch=()=>{io++;throw Error('Qualification network prohibited');};
 try{
  const {WalletNameReader}=require('tsx/cjs/api').require(readerFile,__filename);
  assert.equal(typeof WalletNameReader.prototype.defaultName,'function');
  assert.equal(typeof WalletNameReader.prototype.resolve,'function');
  assert.equal(WalletNameReader.prototype.reverse,undefined);
  assert.equal(io,0);
 }finally{globalThis.fetch=originalFetch;}
 assert(source.includes('inputsSha256, frames')&&source.includes('paths, frames, inputsSha256'));
 assert(source.includes("credentials: 'omit', redirect: 'error'"));
 assert(source.includes('Unsupported read request body'));
 assert(source.includes('input.clone().arrayBuffer()')&&source.includes('ArrayBuffer.isView(body)'));
 const product=require('./build-reviewed-generation-production-extension.cjs').productSource();
 assert.equal(product.files,1120);
 assert.equal(product.sha256,'a03cb96c62e2ae6d7908a8506fc1411a0e92aa1a0cb27b69f49783659ab12521');
 const files=[__filename,old,fresh,readerFile,path.resolve(typecheckFile)];
 result={passed:true,observedAt:new Date().toISOString(),preparedOnly:true,
  actualProductionPrototypeInspected:true,defaultNameAndResolvePresent:true,obsoleteReverseAbsent:true,
  eightOriginalCasesHeld:true,originalReaderFreshnessHeld:true,rawFramesBothOutcomesHeld:true,
  compilerExitCode:0,productSource:product,requests:io,simulations:0,signatures:0,executeRequests:0,
  parentAcceptance:false,inputsSha256:Object.fromEntries(files.map(file=>[file,sha(file)])),
  scope:'AST, selected actual TypeScript dependencies and loaded production NameReader prototype with fetch prohibited. Eight original cases and full initial-height/final20-checkpoint freshness remain. Current defaultName call and raw request/response/source pins now retained. No eight-case production run, current name positive, Chrome or QA-A15 acceptance.'};
}catch(error){result={passed:false,observedAt:new Date().toISOString(),errorType:error.name,
 message:String(error.message).slice(0,700),requests:io,parentAcceptance:false};process.exitCode=1;}
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
console.log(JSON.stringify({passed:result.passed,requests:io,errorType:result.errorType,message:result.message}));

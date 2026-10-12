// Offline tool qualification: retained full bytes and isolated DOM/registry mocks.
const fs = require('node:fs'),path = require('node:path'),vm = require('node:vm'),crypto = require('node:crypto');
const assert = require('node:assert/strict'),{Transaction} = require('rtd-typescript/transactions'),{bcs} = require('rtd-typescript/bcs');
const variants = require('./lib/C114-nft-validity-variants.cjs'),contract = require('./lib/C114-nft-wire-contract-v3.cjs');
const environment = require('./lib/C113-current-nft-environment.cjs'),lineage = require('./lib/C109-product-source-lineage.cjs');
const wallet = path.resolve(__dirname,'..'),logs = path.join(wallet,'migrationToGRpcOrGraphQLDoc/workLog');
const read = file => JSON.parse(fs.readFileSync(file)),sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const pins = p => {for (const [f,h] of Object.entries(p.inputsSha256 ?? {})) assert.equal(sha(f),h)};
function inverse(q) {let value = fs.readFileSync(q.new,'utf8');assert.equal(sha(q.new),q.candidateSha256);assert.equal(sha(q.old),q.originalSha256);
  for (const d of [...q.deltas].reverse()) {assert.equal(value.split(d.toText).length-1,d.count);value = value.split(d.toText).join(d.fromText)}assert.equal(value,fs.readFileSync(q.old,'utf8'))}
async function main() {
  const [output] = process.argv.slice(2);assert(output && !fs.existsSync(output));
  const oldFile = path.join(logs,'20261007-C48-nft-execution-browser-01.json'),old = read(oldFile);
  const oldAuditFile = path.join(logs,'20261007-C48-nft-execution-browser-independent-02.json');const oldAudit = read(oldAuditFile);assert(old.passed && oldAudit.passed);pins(oldAudit);
  const prepFile = path.join(logs,'20261008-C114-real-validity-driver-prepared-01.json'),prep = read(prepFile);assert(prep.passed);pins(prep);
  inverse(prep.completeDriverInverse);inverse(prep.completeNegativeGuardInverse);
  const archiveFile = path.join(logs,'20261008-C114-real-validity-before-implementation-01.json'),archive = read(archiveFile);
  assert(archive.passed && archive.files.length === 12);for (const f of archive.files) assert.equal(sha(f.archive),f.sha256);
  const demoFile = path.join(logs,'20261008-C114-validity-demo-build-02.json'),demo = require('./lib/C114-real-nft-validity-ui.cjs').validateDemo(demoFile);
  const entryFile = path.join(__dirname,'fixtures/C114-validity-demo.mjs'),entry = fs.readFileSync(entryFile,'utf8');
  const imports = "import {getWallets} from 'rtd-wallet-standard';\nimport {Transaction} from 'rtd-typescript/transactions';\n";
  assert.equal(entry.split(imports).length-1,1);assert(!entry.includes('signAndExecuteTransaction'));assert(!entry.includes('signPersonalMessage'));
  const source = lineage.validate(read(lineage.qualificationFile).originalSource,environment.buildFile);
  const rows = [],currentFetch = globalThis.fetch;let networkAttempts = 0;
  globalThis.fetch = () => {networkAttempts++;throw Error('Offline qualification forbids network')};
  try {
    assert.equal(old.previews.length,6);
    for (const previous of old.previews) {
      const base = previous.approval.prepared,original = contract.canonical(base.bytesBase64),before = JSON.stringify(base);
      const changed = await variants.build(base);assert.deepEqual(changed.map(v => v.name),[...variants.names]);
      const node = id => ({id,disabled:false,textContent:'',onclick:null}),elements = Object.fromEntries(['connect','request','disconnect','accounts','input','result','error'].map(id => [id,node(id)]));
      const account = {address:original.V1.sender},captured = [];let disconnects = 0;
      const walletMock = {name:'RTD Wallet qualification mock',accounts:[],features:{
        'standard:connect':{connect:async () => {walletMock.accounts = [account];return {accounts:[account]}}},
        'standard:events':{on:() => () => {}},
        'standard:disconnect':{disconnect:async () => {walletMock.accounts = [];disconnects++}},
        'rtd:signTransaction':{signTransaction:async input => {captured.push({chain:input.chain,account:input.account,json:await input.transaction.toJSON()});throw Error('User rejected the request')}}}};
      const location = {href:'http://127.0.0.1:12345/'},sandbox = {getWallets:() => ({get:() => [walletMock],on:() => () => {}}),Transaction,
        document:{getElementById:id => elements[id]},TextDecoder,Uint8Array,URL,atob,location};
      vm.runInNewContext(entry.replace(imports,''),sandbox,{filename:entryFile,timeout:1000});
      assert.equal(elements.request.disabled,true);await elements.connect.onclick();assert.equal(elements.request.disabled,false);
      for (const variant of changed) {
        const actual = contract.canonical(variant.bytesBase64),expected = structuredClone(original),window = original.V1.expiration[original.V1.expiration.$kind];
        if (variant.name === 'expirationNone') expected.V1.expiration = {$kind:'None',None:true};
        else if (variant.name === 'expiredEpoch') expected.V1.expiration = {$kind:'Epoch',Epoch:'0'};
        else if (variant.name === 'expirationLargeEpoch') expected.V1.expiration = {$kind:'Epoch',Epoch:'9007199254740993'};
        else if (variant.name.startsWith('validDuring')) {const {allowedProposers,...rest} = window;expected.V1.expiration = {$kind:'ValidDuring',ValidDuring:rest};
          if (variant.name === 'validDuringMinTimestamp') expected.V1.expiration.ValidDuring.minTimestamp = '1';
          if (variant.name === 'validDuringMaxTimestamp') expected.V1.expiration.ValidDuring.maxTimestamp = '18446744073709551615';
        } else if (variant.name === 'windowMinTimestamp') expected.V1.expiration[original.V1.expiration.$kind].minTimestamp = '1';
        else if (variant.name === 'windowMaxTimestamp') expected.V1.expiration[original.V1.expiration.$kind].maxTimestamp = '18446744073709551615';
        assert.deepEqual(actual,contract.canonical(Buffer.from(bcs.TransactionData.serialize(expected).toBytes()).toString('base64')));
        assert.equal(variant.digest,require('./lib/C88-post-write-bytes.cjs').typed('TransactionData',Buffer.from(variant.bytesBase64,'base64')));
        const url = new URL(location.href);url.searchParams.set('authorization',Buffer.from(variant.json).toString('base64'));location.href = url.href;
        await elements.request.onclick();assert.equal(elements.error.textContent,'User rejected the request');assert.equal(elements.result.textContent,'');
        const received = captured.at(-1);assert.equal(received.chain,'rtd:localnet');assert.equal(received.account.address,account.address);assert.equal(received.json,variant.json);
        assert.equal(Buffer.from(await Transaction.from(received.json).build()).toString('base64'),variant.bytesBase64);
        const rendered = JSON.parse(elements.input.textContent);assert.equal(rendered.digest,variant.digest);assert.deepEqual(rendered.expiration,JSON.parse(JSON.stringify(variant.expiration)));
        rows.push({scenario:previous.label,variant:variant.name,digest:variant.digest,expiration:variant.expiration,canonicalBytesHeld:true,
          exactJsonAtMockWalletBoundary:true,mockedDomAndRegistryOnly:true,noSignerInvoked:true});
      }
      assert.equal(captured.length,9);await elements.disconnect.onclick();assert.equal(disconnects,1);assert.equal(elements.accounts.textContent,'[]');assert.equal(elements.request.disabled,true);
      assert.equal(JSON.stringify(base),before);
    }
  } finally {globalThis.fetch = currentFetch}
  assert.equal(rows.length,54);assert.equal(networkAttempts,0);assert.deepEqual(source,demo.source);
  const files = [__filename,oldFile,oldAuditFile,prepFile,archiveFile,demoFile,entryFile,
    require.resolve('./lib/C114-nft-validity-variants.cjs'),require.resolve('./lib/C114-real-nft-validity-ui.cjs'),
    require.resolve('./lib/C114-nft-wire-contract-v3.cjs'),...environment.pins];
  const proof = {passed:true,observedAt:new Date().toISOString(),preparedOnly:true,source,completeDriverAndGuardInversesHeld:true,
    original12ArchivedBytesHeld:true,completeCanonicalJsonVariants:54,exactMockWalletBoundaryRequests:54,rows,
    mockQualificationOnly:true,networkAttempts,profilesOpened:0,signatures:0,executeRequests:0,
    actualCurrentValidityUiAccepted:false,actualSponsoredExecutionAccepted:false,fullNFTAuthorizationAccepted:false,parentCompletion:false,
    inputsSha256:Object.fromEntries(files.map(f => [f,sha(f)]))};
  fs.writeFileSync(output,JSON.stringify(proof,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:true,preparedOnly:true,canonicalVariants:54,mockRequests:54,networkAttempts:0}));
}
if (require.main === module) main().catch(e => {console.error(JSON.stringify({passed:false,errorType:e.name,message:String(e.message).slice(0,600)}));process.exitCode = 1});

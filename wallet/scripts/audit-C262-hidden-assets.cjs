// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Audit saved native UI and browser traffic; never touch wallet storage or keys.
const fs = require('node:fs'), assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { GrpcTypes } = require('rtd-typescript/grpc');
const L = 'migrationToGRpcOrGraphQLDoc/workLog', files = [__filename];
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
function read(name) { const p = `${L}/${name}`; files.push(p); return JSON.parse(fs.readFileSync(p)); }
function frame(b, type, response) {
  assert(b.length >= 5 && b[0] === 0);
  const end = 5 + b.readUInt32BE(1); assert(end <= b.length);
  if (response) {
    assert.equal(b[end], 128); assert.equal(end + 5 + b.readUInt32BE(end + 1), b.length);
    assert.match(b.subarray(end + 5).toString(), /(?:^|\r\n)grpc-status:\s*0\r\n/);
  } else assert.equal(end, b.length);
  return type.fromBinary(b.subarray(5, end));
}
const fixture = read('20261011-C262-existing-display-01.json');
const media = read('20261011-C262-media-recovery-01.json');
const ui = read('20261011-C262-native-ui-01.json').states;
assert(fixture.passed && fixture.hideEligible && media.passed);
function wallet(name) {
  assert(ui[name]?.ax); const start = ui[name].ax.indexOf('HTML 内容 RTD Wallet'); assert(start >= 0);
  return ui[name].ax.slice(start);
}
for (const name of ['assetsReady', 'reloadRestoredReady']) {
  assert(wallet(name).includes(`objectId=${fixture.objectId}`));
  assert(wallet(name).includes('link Migration Display V2'));
  assert(wallet(name).includes('link 暂无媒体'));
}
assert(!wallet('hiddenActionCorrected').includes(`objectId=${fixture.objectId}`));
assert(wallet('hiddenActionCorrected').includes('已移至 已隐藏资产'));
for (const name of ['hiddenReady','reloadHiddenReady','returnHiddenReady']) {
  assert(wallet(name).includes('标题 已隐藏资产'));
  assert(wallet(name).includes(`objectId=${fixture.objectId}`));
}
assert.match(wallet('otherAccount'), /单选按钮 RTD 命运链结 0xbad0…0456, Value: 1/);
assert.match(wallet('returnAccount'), /单选按钮 RTD 命运链结 0x3270…dcb7, Value: 1/);
for (const name of ['otherHidden','restoredHidden']) {
  assert(wallet(name).includes('标题 已隐藏资产'));
  assert(wallet(name).includes('文本 暂无资产'));
  assert(!wallet(name).includes(`objectId=${fixture.objectId}`));
}
const entries = read('20261011-C262-hidden-assets-01.har').log.entries;
const counts = {}, exceptions = [], native = [], graphql = [], images = [];
const fixturePath = '/Users/changzechuan/.local/state/rtd-wallet-migration/dev-20261006-03/C262-display-media-20261011-01/fixture.json';
files.push(fixturePath); const png = JSON.parse(fs.readFileSync(fixturePath));
for (const [index,e] of entries.entries()) {
  const u = new URL(e.request.url), m = u.pathname.split('/').pop();
  assert.equal(u.hostname,'127.0.0.1'); counts[m] = (counts[m] ?? 0) + 1;
  assert(!e.request.postData?.text.includes('"jsonrpc"'));
  if (e.response.status === 0) {
    assert.equal(m,'graphql'); assert.equal(e.response._error,'net::ERR_ABORTED');
    exceptions.push({index,at:e.startedDateTime,error:e.response._error}); continue;
  }
  assert.equal(e.response.status,200); assert(!e._error && !e.response._error);
  if (m === 'display-v2.png') {
    assert.equal(u.href,'http://127.0.0.1:41718/display-v2.png'); assert.equal(e.request.method,'GET');
    assert.equal(e.response.content.encoding,'base64');
    const bytes = Buffer.from(e.response.content.text,'base64'); assert.equal(sha(bytes),png.pngSha256);
    images.push({index,at:e.startedDateTime,sha256:sha(bytes),bytes:bytes.length}); continue;
  }
  assert.equal(e.request.method,'POST');
  if (m === 'graphql') {
    assert.equal(u.href,'http://127.0.0.1:41957/graphql');
    const q=JSON.parse(e.request.postData.text), r=JSON.parse(e.response.content.text);
    assert(!r.errors?.length && r.data);
    const h0=r.data.walletGenesis?.digest ?? r.data.checkpoint?.digest;
    if(h0) assert.equal(h0,fixture.h0);
    if(r.data.walletSnapshot) assert.equal(r.data.walletSnapshot.sequenceNumber,Number(fixture.snapshot));
    graphql.push({index,at:e.startedDateTime,operation:q.query.split('{')[0].trim(),durationMs:e.time});
    continue;
  }
  assert.equal(u.origin,'http://127.0.0.1:41750');
  assert(['GetServiceInfo','ListBalances'].includes(m)); assert.equal(e.response.content.encoding,'base64');
  const req=frame(Buffer.from(e.request.postData.text,'latin1'),GrpcTypes[m+'Request'],false);
  const res=frame(Buffer.from(e.response.content.text,'base64'),GrpcTypes[m+'Response'],true);
  if(m==='GetServiceInfo')assert.equal(res.chainId,fixture.h0);
  native.push({index,method:m,request:req,response:res});
}
assert.equal(entries.length,149); assert.equal(exceptions.length,6); assert.equal(images.length,5);
assert.equal(native.length,48); assert.equal(graphql.length,90);
const result={passed:true,observedAt:new Date().toISOString(),scope:'C257 ordinary Chrome hide, page reload, account isolation and restore. Native read frames and media fully decoded; GraphQL structure and snapshot checked, not full production-reader replay.',
  hiddenAcceptance:true,persistedAfterPageReload:true,accountIsolationAccepted:true,restoredAfterPageReload:true,
  account:fixture.owner,objectId:fixture.objectId,snapshot:fixture.snapshot,requests:entries.length,counts,exceptions,native,graphql,images,
  allCapturedFramesAccountedFor:true,graphqlBusinessReplayAccepted:false,chainWrites:0,signatures:0,executions:0,
  originalC256PendingUntouched:true,postTransferIndexAccepted:false,parentCompletion:false,
  inputsSha256:Object.fromEntries(files.map(p=>[p,sha(fs.readFileSync(p))]))};
fs.writeFileSync(`${L}/20261011-C262-hidden-audit-01.json`,JSON.stringify(result,(_k,v)=>typeof v==='bigint'?String(v):v,2)+'\n',{flag:'wx',mode:0o600});
console.log(JSON.stringify({passed:true,hiddenAcceptance:true,requests:entries.length,counts,exceptions:exceptions.length,native:native.length,images:images.length,parentCompletion:false}));

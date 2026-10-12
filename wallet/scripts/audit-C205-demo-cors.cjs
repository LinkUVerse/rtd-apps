// Offline verification of ordinary Chrome's unmodified, sanitized network export.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), a = require('node:assert/strict');
const { GrpcTypes } = require('rtd-typescript/grpc');
const logs = path.resolve(__dirname, '../migrationToGRpcOrGraphQLDoc/workLog');
const input = path.join(logs, '20261010-C205-demo-cors-01.har');
const entries = JSON.parse(fs.readFileSync(input)).log.entries;
const origin = 'http://127.0.0.1:41960';
const headers = (list, name) => list.filter(x => x.name.toLowerCase() === name).map(x => x.value);
a.equal(entries.length, 8);
const pairs = new Map();
for (const e of entries) {
  a(['POST', 'OPTIONS'].includes(e.request.method));
  // Chrome keeps provisional headers for POSTs blocked before dispatch.
  // The actual OPTIONS below must still carry the exact webpage Origin.
  if (e.request.method === 'POST' && e.response.status === 0) {
    a.deepEqual(headers(e.request.headers, 'origin'), []);
    a.deepEqual(headers(e.request.headers, 'referer'), [origin + '/']);
  } else a.deepEqual(headers(e.request.headers, 'origin'), [origin]);
  a.deepEqual(headers(e.request.headers, 'authorization'), []);
  a.deepEqual(headers(e.request.headers, 'cookie'), []);
  a.equal(e.request.cookies.length, 0);
  const port = new URL(e.request.url).port;
  a(['41750','41903','41957','41959'].includes(port));
  const pair = pairs.get(port) ?? {};
  a(!pair[e.request.method]); pair[e.request.method] = e; pairs.set(port, pair);
  if (e.request.method === 'POST') {
    a(e._initiator.stack.callFrames.some(f => f.url === origin + '/cors-acceptance.js'));
  } else {
    a.deepEqual(headers(e.request.headers, 'access-control-request-method'), ['POST']);
  }
}
const native = pairs.get('41750');
a.equal(native.OPTIONS.response.status, 200);
a.equal(native.POST.response.status, 200);
a.deepEqual(headers(native.POST.response.headers, 'access-control-allow-origin'), ['*']);
a.deepEqual(headers(native.POST.response.headers, 'access-control-allow-credentials'), []);
const c = native.POST.response.content;
const b = Buffer.from(c.text, c.encoding === 'base64' ? 'base64' : 'utf8');
a.equal(b[0], 0); const n = b.readUInt32BE(1), t = b.subarray(5 + n);
a.equal(t[0], 128); a.equal(t.readUInt32BE(1), t.length - 5);
a.deepEqual(t.subarray(5).toString().split('\r\n').filter(v => /^grpc-status:/i.test(v)).map(v => v.split(':')[1].trim()), ['0']);
a.equal(GrpcTypes.GetServiceInfoResponse.fromBinary(b.subarray(5, 5+n)).chainId, 'BkuLHhdtnoK7yLxo2eQuvcjHtdyipE7MMyxgTJiyHGg4');
for (const port of ['41903','41957','41959']) {
  const pair = pairs.get(port); a(pair.POST && pair.OPTIONS);
  a.equal(pair.POST.response.status, 0); a.equal(pair.POST.response._error, 'net::ERR_FAILED');
  a(!pair.POST.response.content.text);
  if (port === '41903') {
    a.equal(pair.OPTIONS.response.status, 200);
    a.deepEqual(headers(pair.OPTIONS.response.headers, 'access-control-allow-origin'), []);
  } else a.equal(pair.OPTIONS.response.status, 403);
}
const inputs = [input, __filename, path.resolve(__dirname,'../tests/demo-app/cors-acceptance.html'), path.resolve(__dirname,'../tests/demo-app/cors-acceptance.js')];
const result = {passed:true, observedAt:new Date().toISOString(), origin,
  nativeWebCorsAccepted:true, privateQueryWebCorsDenialsAccepted:true,
  nativeGrpcMessageAndTrailerDecoded:true, privateArchiveAllowedWebOriginAccepted:false,
  privateGraphqlAllowedWebOriginAccepted:false, privateAccountAllowedWebOriginAccepted:false,
  authorizationHeaders:0, cookieHeaders:0, executeRequests:0, signatures:0,
  parentCompletion:false, fullDemoCorsMatrixAccepted:false,
  inputsSha256:Object.fromEntries(inputs.map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')]))};
fs.writeFileSync(path.join(logs,'20261010-C205-demo-cors-audit-01.json'), JSON.stringify(result,null,2)+'\n', {flag:'wx',mode:0o600});
console.log(JSON.stringify({passed:true,nativeWebCorsAccepted:true,privateQueryWebCorsDenialsAccepted:true,parentCompletion:false}));

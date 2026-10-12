// Offline audit of ordinary Chrome registry changes; no network or transaction IO.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GrpcTypes } from 'rtd-typescript/grpc';
import { DOMAIN_BCS, NAME_RECORD_BCS } from '../src/shared/rpc/name-reader';
const [harFile, profileFile, output] = process.argv.slice(2);
assert(!existsSync(output));
const profile = JSON.parse(readFileSync(profileFile, 'utf8'));
const entries = JSON.parse(readFileSync(harFile, 'utf8')).log.entries;
const counts: Record<string, number> = {}, exceptions: unknown[] = [], names: any[] = [], identities: any[] = [];
const wrong = '0x' + '6'.padStart(64, '0');
function frame(bytes: Buffer, type: any) {
  assert(bytes.length >= 10 && bytes[0] === 0);
  const end = 5 + bytes.readUInt32BE(1);
  assert.equal(bytes[end], 128);
  assert.equal(end + 5 + bytes.readUInt32BE(end + 1), bytes.length);
  assert.match(bytes.subarray(end + 5).toString(), /(?:^|\r\n)grpc-status:\s*0\r\n/);
  return type.fromBinary(bytes.subarray(5, end));
}
for (const [index, entry] of entries.entries()) {
  const url = new URL(entry.request.url), method = url.pathname.split('/').at(-1)!;
  assert.equal(url.hostname, '127.0.0.1');
  assert(['43150', '43203', '43210', '43211'].includes(url.port));
  counts[method] = (counts[method] ?? 0) + 1;
  assert(!entry.request.postData?.text?.includes('"jsonrpc"'));
  if (entry.response.status !== 200 || !entry.response.content.text) {
    exceptions.push({ index, method, status: entry.response.status, error: entry.response._error });
    continue;
  }
  if (method === 'GetServiceInfo') {
    const response = frame(Buffer.from(entry.response.content.text, 'base64'), GrpcTypes.GetServiceInfoResponse);
    assert.equal(response.chainId, profile.expectedGenesisDigest);
    identities.push({ index, endpoint: url.origin + url.pathname, h0: response.chainId });
  }
  if (method !== 'graphql') continue;
  const request = JSON.parse(entry.request.postData.text);
  const response = JSON.parse(entry.response.content.encoding === 'base64'
    ? Buffer.from(entry.response.content.text, 'base64').toString() : entry.response.content.text);
  if (response.errors?.length) { exceptions.push({ index, method, graphqlErrors: response.errors }); continue; }
  if (response.data?.walletGenesis) assert.equal(response.data.walletGenesis.digest, profile.expectedGenesisDigest);
  if (![wrong, profile.packages.name.forwardRegistry].includes(request.variables?.parent)) continue;
  const name = DOMAIN_BCS.parse(Buffer.from(request.variables.name.bcs, 'base64')).labels.reverse().join('.');
  const snapshot = response.data.walletSnapshot, field = snapshot.query.address.field;
  const record = field ? NAME_RECORD_BCS.parse(Buffer.from(field.value.bcs, 'base64')) : null;
  names.push({ index, at: entry.startedDateTime, parent: request.variables.parent, name, checkpoint: snapshot.sequenceNumber, record });
}
assert.equal(counts.ExecuteTransaction ?? 0, 0);
assert.equal(counts.VerifySignature ?? 0, 0);
const negative = names.filter(r => r.parent === wrong && r.name === 'wallet-renamed.rtd');
assert(negative.length > 0);
for (const row of negative) assert.equal(row.record, null);
const restored = names.filter(r => r.index > negative.at(-1).index && r.parent === profile.packages.name.forwardRegistry && r.name === 'wallet-renamed.rtd');
assert(restored.length > 0);
for (const row of restored) assert.equal(row.record.target_address, '0xbad0f77037d2352d281607a6237bf559180c85228baf91b7144a5fa021f20456');
assert(identities.some(r => r.endpoint.includes(':43150/')));
assert(identities.some(r => r.endpoint.includes(':43203/')));
const result = { passed: true, observedAt: new Date().toISOString(), requests: entries.length, counts, exceptions, names, identities,
  wrongRegistryReturnedNoRecipient: true, restoredRegistryReturnedCurrentRecipient: true, executeRequests: 0, signatureChecks: 0,
  scope: 'Saved actual ordinary Chrome name fields and fullnode/archive H0. Wrong H0 UI preflight and disabled send state are separate native UI observations. This proves changed configuration and recovery, not an on-chain registry-root replacement or every asynchronous ordering.',
  inputsSha256: Object.fromEntries([process.argv[1], harFile, profileFile].map(f => [resolve(f), createHash('sha256').update(readFileSync(f)).digest('hex')])) };
writeFileSync(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify({ passed: true, requests: entries.length, wrongFields: negative.length, restoredFields: restored.length, exceptions: exceptions.length, executions: 0 }));

// Saved ordinary Chrome frames only. Never signs or dispatches transactions.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { DOMAIN_BCS, NAME_RECORD_BCS } from '../src/shared/rpc/name-reader';
const [harFile, nativeFile, renewFile, renameFile, output] = process.argv.slice(2);
assert(!existsSync(output));
const native = JSON.parse(readFileSync(nativeFile, 'utf8'));
assert(native.passed);
const entries = JSON.parse(readFileSync(harFile, 'utf8')).log.entries;
const counts: Record<string, number> = {}, cases: Record<string, unknown[]> = {}, failures: unknown[] = [];
for (const [index, entry] of entries.entries()) {
  const url = new URL(entry.request.url), method = url.pathname.split('/').at(-1)!;
  assert.equal(url.hostname, '127.0.0.1');
  assert(['43150', '43210', '43211', '43203'].includes(url.port));
  counts[method] = (counts[method] ?? 0) + 1;
  assert(!entry.request.postData?.text?.includes('"jsonrpc"'));
  if (entry.response.status !== 200 || !entry.response.content.text) {
    failures.push({ index, method, status: entry.response.status, grpcStatus: entry.response.headers.find((h: any) => h.name.toLowerCase() === 'grpc-status')?.value });
    continue;
  }
  if (method !== 'graphql') continue;
  const request = JSON.parse(entry.request.postData.text);
  const response = JSON.parse(entry.response.content.encoding === 'base64'
    ? Buffer.from(entry.response.content.text, 'base64').toString() : entry.response.content.text);
  assert(!response.errors?.length);
  if (response.data?.walletGenesis) assert.equal(response.data.walletGenesis.digest, native.h0);
  if (request.variables?.parent !== native.forwardRegistry || !request.variables?.name?.type?.endsWith('::domain::Domain')) continue;
  const name = DOMAIN_BCS.parse(Buffer.from(request.variables.name.bcs, 'base64')).labels.reverse().join('.');
  const snapshot = response.data.walletSnapshot, field = snapshot.query.address.field;
  const record = field ? NAME_RECORD_BCS.parse(Buffer.from(field.value.bcs, 'base64')) : null;
  (cases[name] ??= []).push({ at: entry.startedDateTime, checkpoint: snapshot.sequenceNumber, record });
}
assert.equal(counts.ExecuteTransaction ?? 0, 1);
assert.equal(counts.VerifySignature ?? 0, 1);
const renew=JSON.parse(readFileSync(renewFile,'utf8')),rename=JSON.parse(readFileSync(renameFile,'utf8'));
assert(renew.passed && rename.passed && renew.action==='renew' && rename.action==='rename');
assert.equal(renew.h0,native.h0);assert.equal(rename.h0,native.h0);
const renewed=(cases['expired-migration.rtd'] as any[]).filter(r=>BigInt(r.checkpoint)>=BigInt(renew.checkpoint));assert(renewed.length);
for(const row of renewed){assert.equal(row.record.expiration_timestamp_ms,'1791902647739');assert.equal(row.record.target_address,native.sender);}
const removed=(cases['wallet-migration.rtd'] as any[]).filter(r=>BigInt(r.checkpoint)>=BigInt(rename.checkpoint));assert(removed.length);for(const row of removed)assert.equal(row.record,null);
const renamed=(cases['wallet-renamed.rtd'] as any[]).filter(r=>BigInt(r.checkpoint)>=BigInt(rename.checkpoint));assert(renamed.length);for(const row of renamed)assert.equal(row.record.target_address,native.rows[0].decoded.value.target_address);
const proof = { passed: true, observedAt: new Date().toISOString(), counts, cases, failures,
  requests: entries.length, executeRequests: 1, signatureChecks: 1, capturesOverlapTransferAudit: true,
  scope: 'Ordinary Chrome saved reads after exactly one fixture renewal and one rename: current indexed expiry, removed old name and new name target. Native current-field validation separately proved. Capture overlaps the already-audited one C278 name transfer, not an additional execution.',
  inputsSha256: Object.fromEntries([resolve(process.argv[1]), harFile, nativeFile, renewFile, renameFile].map(f => [resolve(f), createHash('sha256').update(readFileSync(f)).digest('hex')])) };
writeFileSync(output, JSON.stringify(proof, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify({ passed: true, requests: entries.length, counts, names: Object.keys(cases), failures: failures.length }));

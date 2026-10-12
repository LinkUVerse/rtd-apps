// Compare the already captured actual production reads; never repeat a transaction.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { stableBusiness } from './probe-C280-cold-business';
const [beforeFile, afterFile, output] = process.argv.slice(2);
const before = JSON.parse(readFileSync(beforeFile, 'utf8'));
const after = JSON.parse(readFileSync(afterFile, 'utf8'));
assert(before.passed);
// The captured run reached the final comparison; only undefined-vs-omitted fields failed.
assert.equal(after.error?.name, 'AssertionError');
assert.equal(Object.keys(after.data.transactions).length, 3);
assert.deepEqual(stableBusiness(after.data), stableBusiness(before.data));
assert.equal(after.executions + after.simulations + after.signatures, 0);
assert.equal(after.h0, before.h0);
assert(after.frames.every((f: any) => f.status === 200 && !f.error));
const origins = [...new Set(after.frames.map((f: any) => new URL(f.url).origin))];
assert.deepEqual(origins.sort(), ['http://127.0.0.1:43150', 'https://127.0.0.1:43203', 'https://127.0.0.1:43210', 'https://127.0.0.1:43211'].sort());
const normalized = stableBusiness(after.data);
const inputs = [beforeFile, afterFile, process.argv[1], require.resolve('./probe-C280-cold-business')];
const result = {
 passed: true, observedAt: new Date().toISOString(), h0: after.h0,
 beforeAfterBusinessIdentical: true, capturedRequests: after.frames.length, origins,
 owners: Object.keys(normalized.owners), objects: Object.values(normalized.owners).reduce((n: number, r: any) => n + r.objects.length, 0),
 originalTransactions: Object.keys(normalized.transactions).length, executions: 0, simulations: 0, signatures: 0,
 stableBusinessSha256: createHash('sha256').update(JSON.stringify(normalized)).digest('hex'),
 inputsSha256: Object.fromEntries(inputs.map(f => [f, createHash('sha256').update(readFileSync(f)).digest('hex')])),
 scope: 'Offline symmetric JSON normalization of complete actual before/after production reads. Original failed final assertion retained; no service request repeated. Browser restoration audited separately.',
};
writeFileSync(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(result));

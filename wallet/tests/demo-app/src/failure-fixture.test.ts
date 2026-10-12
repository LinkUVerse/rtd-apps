import { expect, it } from 'vitest';
import { normalizeRtdAddress } from 'rtd-typescript/utils';
import { failureFixtureTransaction } from './failure-fixture';
const pkg=normalizeRtdAddress('0xa'),gate=normalizeRtdAddress('0xb');
const query=`?failurePackage=${pkg}&failureGate=${gate}`;
it('ordinary demo does not gain a fixture transaction',()=>expect(failureFixtureTransaction(new URL('http://127.0.0.1:5181'),'localnet')).toBeNull());
it('builds exactly the configured visit, without gas or additional commands',()=>{
 const tx=failureFixtureTransaction(new URL('http://127.0.0.1:5181/'+query),'localnet')!;
 expect(tx.getData().commands).toHaveLength(1);
 expect(tx.getData().commands[0]).toMatchObject({MoveCall:{package:pkg,module:'execution_gate',function:'visit',typeArguments:[]}});
 expect(tx.getData().inputs).toMatchObject([{UnresolvedObject:{objectId:gate}}]);
});
it.each(['https://example.test/','http://localhost:5181/','https://127.0.0.1/'])('refuses non-fixture origin %s',origin=>expect(()=>failureFixtureTransaction(new URL(origin+query),'localnet')).toThrow());
it('refuses a different chain and malformed/partial bindings',()=>{
 expect(()=>failureFixtureTransaction(new URL('http://127.0.0.1/'+query),'mainnet')).toThrow();
 expect(()=>failureFixtureTransaction(new URL('http://127.0.0.1/?failurePackage=invalid&failureGate='+gate),'localnet')).toThrow();
 expect(()=>failureFixtureTransaction(new URL('http://127.0.0.1/?failureGate='+gate),'localnet')).toThrow();
});

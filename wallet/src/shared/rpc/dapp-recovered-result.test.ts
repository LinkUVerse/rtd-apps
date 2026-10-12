import { expect, it } from 'vitest';
import { parseGrpcTransactionResponse } from 'rtd-typescript/grpc';
import { Ed25519Keypair } from 'rtd-typescript/keypairs/ed25519';
import { executionFixture, sender, testKey } from '../../../tests/unit/rpc/execution-fixtures';
import { recoveredDappResult } from './dapp-recovered-result';
import { toBase64 } from 'rtd-typescript/utils';
async function fixture(success = true) {
  const f = await executionFixture();
  const result = parseGrpcTransactionResponse(f.result(success), { include: {
    effects: true, transaction: true, bcs: true, balanceChanges: true, objectTypes: true, events: true,
  } });
  return { f, details: { bindingKey: 'binding', readSessionKey: 'session', source: 'fullnode' as const,
    transaction: result.Transaction ?? result.FailedTransaction! } };
}
it.each([true, false])('recovers the original ordinary signature and terminal effects (success=%s)', async (success) => {
  const { f, details } = await fixture(success);
  const result = await recoveredDappResult(details, f.receipt(success), 'binding', sender);
  expect(result).toEqual({ digest: f.digest, bytes: toBase64(details.transaction.bcs), signature: details.transaction.signatures[0], effects: f.receipt(success).effectsBase64 });
});
it('missing details do not invent a signature for a durable receipt', async () => {
  const { f } = await fixture();
  await expect(recoveredDappResult(null, f.receipt(), 'binding', sender)).rejects.toThrow('暂不可用');
});
it.each(['digest', 'effects', 'bytes', 'binding', 'sender', 'multiple-signatures'])('rejects mismatched %s', async (kind) => {
  const { f, details } = await fixture();
  if (kind === 'digest') details.transaction.digest = 'wrong';
  if (kind === 'effects') details.transaction.effects.bcs = new Uint8Array([1]);
  if (kind === 'bytes') details.transaction.bcs = new Uint8Array([1]);
  if (kind === 'binding') details.bindingKey = 'other';
  if (kind === 'multiple-signatures') details.transaction.signatures.push(details.transaction.signatures[0]);
  await expect(recoveredDappResult(details, f.receipt(), 'binding', kind === 'sender' ? '0x7' : sender)).rejects.toThrow();
});
it('does not accept another approved byte sequence', async () => {
  const { f, details } = await fixture();
  await expect(recoveredDappResult(details, f.receipt(), 'binding', sender, 'different')).rejects.toThrow('不一致');
});
it('verifies signature ownership instead of trusting its position', async () => {
  const { f, details } = await fixture();
  const other = Ed25519Keypair.fromSecretKey(new Uint8Array(32).fill(8));
  details.transaction.signatures = [(await other.signTransaction(details.transaction.bcs)).signature];
  await expect(recoveredDappResult(details, f.receipt(), 'binding', sender)).rejects.toThrow('address');
});
it('a personal-message signature is not a TransactionData authorization', async () => {
  const { f, details } = await fixture();
  details.transaction.signatures = [(await testKey.signPersonalMessage(details.transaction.bcs)).signature];
  await expect(recoveredDappResult(details, f.receipt(), 'binding', sender)).rejects.toThrow('Transaction');
});

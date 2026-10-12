import { expect, it } from 'vitest';
import type { WalletPreparedTransaction } from 'rtd-apps-core/src/rpc/WalletRpcContext';
import { encodePreparedTransaction, decodePreparedTransaction } from './prepared-wire';

it('preserves nested BCS byte arrays across actual Chrome-style JSON roundtrip', () => {
  const prepared = { digest: 'd', bytesBase64: 'AA==', simulation: {
    $kind: 'Transaction', Transaction: { bcs: new Uint8Array([0, 255]), effects: { bcs: new Uint8Array([3, 7]) } },
    commandResults: [{ returnValues: [{ bcs: new Uint8Array() }] }],
  } } as unknown as WalletPreparedTransaction;
  const wire = JSON.parse(JSON.stringify(encodePreparedTransaction(prepared)));
  const restored = decodePreparedTransaction(wire);
  expect(restored).toEqual(prepared);
  const bytes = restored.simulation.Transaction!.effects.bcs!;
  expect(new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint8(1)).toBe(7);
});
it.each(['{"$walletBytes":"AA", "extra":1}', '{"$walletBytes":3}', '{"$walletBytes":"AA"}', '{"$kind":"unknown"}'])('rejects malformed wire data %s', simulationJson => {
  expect(() => decodePreparedTransaction({ simulationJson } as any)).toThrow();
});

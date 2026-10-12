import { GrpcTypes } from 'rtd-typescript/grpc';
import { toBase58 } from 'rtd-typescript/utils';
import { expect, it, vi } from 'vitest';
import { WalletArchiveCheckpointReader, type ArchiveCheckpointSelector } from './archive-checkpoint-reader';
import { WalletReadSession } from './session';
import { validateNetworkProfile } from './profile';
import { profileFixture } from './profile-fixture';
import { grpcResponse } from '../../../tests/unit/rpc/execution-fixtures';
const digest = toBase58(new Uint8Array(32).fill(8));
function setup(mode = 'ok') {
  const session = new WalletReadSession(validateNetworkProfile(profileFixture())); let infos = 0;
  const fetch = vi.fn<typeof globalThis.fetch>(async (url, init) => {
    expect(init?.credentials).toBe('omit'); expect(init?.redirect).toBe('error');
    expect(new Headers(init?.headers).has('x-rtd-visible-checkpoint')).toBe(false);
    if (String(url).endsWith('/GetServiceInfo')) {
      infos++;
      return grpcResponse(GrpcTypes.GetServiceInfoResponse.toBinary(GrpcTypes.GetServiceInfoResponse.create({
        chainId: mode === 'wrong-chain' ? digest : session.profile.expectedGenesisDigest,
        checkpointHeight: mode === 'regress' && infos === 2 ? 9n : 10n,
        lowestAvailableCheckpoint: mode === 'missing-bound' ? undefined : mode === 'drift' && infos === 2 ? 1n : 0n,
      })));
    }
    expect(String(url)).toBe(`${session.profile.endpoints.archiveGrpcWeb}/rtd.rpc.v2.LedgerService/GetCheckpoint`.replace('//rtd.rpc', '/rtd.rpc'));
    const request = GrpcTypes.GetCheckpointRequest.fromBinary(new Uint8Array(await new Response(init?.body).arrayBuffer()).subarray(5));
    expect(request.checkpointId.oneofKind).not.toBeUndefined();
    expect(request.readMask?.paths).toEqual(['sequence_number', 'digest']);
    if (mode === 'closed') session.close();
    return grpcResponse(GrpcTypes.GetCheckpointResponse.toBinary(GrpcTypes.GetCheckpointResponse.create({ checkpoint: mode === 'missing' ? undefined : {
      sequenceNumber: mode === 'outside' ? 11n : mode === 'wrong-height' ? 8n : 7n,
      digest: mode === 'wrong-digest' ? session.profile.expectedGenesisDigest : digest,
    } })));
  });
  return { reader: new WalletArchiveCheckpointReader(session, { fetch }), fetch };
}
it('supports explicit height and full digest without returning latest or certificate claims', async () => {
  for (const selector of [{ sequenceNumber: '7' }, { digest }]) {
    const f = setup(); const result = await f.reader.checkpoint(selector);
    expect(result).toMatchObject({ sequenceNumber: '7', digest, verification: 'service-reference', coverage: { lower: '0', upper: '10' } });
    expect(f.fetch).toHaveBeenCalledTimes(3);
  }
});
it.each(['wrong-chain', 'regress', 'missing-bound', 'drift', 'missing', 'wrong-height', 'closed'])('rejects %s without fallback', async mode => {
  await expect(setup(mode).reader.checkpoint({ sequenceNumber: '7' })).rejects.toThrow();
});
it.each(['outside', 'wrong-digest'])('rejects digest lookup %s', async mode => {
  await expect(setup(mode).reader.checkpoint({ digest })).rejects.toThrow();
});
it('rejects missing, ambiguous, latest, malformed and overflowing selectors before any request', async () => {
  for (const selector of [undefined, {}, { sequenceNumber: '01' }, { sequenceNumber: 'latest' }, { sequenceNumber: '18446744073709551616' }, { digest: 'short' }, { sequenceNumber: '7', digest }]) {
    const f = setup(); await expect(f.reader.checkpoint(selector as ArchiveCheckpointSelector)).rejects.toThrow(); expect(f.fetch).not.toHaveBeenCalled();
  }
});
it('rejects height outside admitted range before GetCheckpoint', async () => {
  const f = setup(); await expect(f.reader.checkpoint({ sequenceNumber: '11' })).rejects.toThrow(); expect(f.fetch).toHaveBeenCalledTimes(1);
});

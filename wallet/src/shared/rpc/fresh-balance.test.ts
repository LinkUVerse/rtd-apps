import { describe, expect, it, vi } from 'vitest';
import { GrpcTypes } from 'rtd-typescript/grpc';
import { normalizeStructTag } from 'rtd-typescript/utils';
import { WalletFullnodeReader } from './fullnode-reader';
import { WalletReadSession } from './session';
import { validateNetworkProfile } from './profile';
import { profileFixture } from './profile-fixture';
import { grpcResponse } from '../../../tests/unit/rpc/execution-fixtures';

const coinType = normalizeStructTag('0x2::rtd::RTD');
function fixture(balance?: GrpcTypes.Balance, late?: () => Promise<void>, wrongFinal = false) {
  const session = new WalletReadSession(validateNetworkProfile(profileFixture()));
  let identities = 0;
  const fetch = vi.fn<typeof globalThis.fetch>(async (url, init) => {
    if (String(url).endsWith('/GetServiceInfo')) return grpcResponse(GrpcTypes.GetServiceInfoResponse.toBinary({
      chainId: session.profile.expectedGenesisDigest, checkpointHeight: ++identities === 2 && wrongFinal ? 9n : 10n,
    }));
    expect(String(url)).toContain('/rtd.rpc.v2.StateService/GetBalance');
    const request = GrpcTypes.GetBalanceRequest.fromBinary((init!.body as Uint8Array).subarray(5));
    expect(request.coinType).toBe(coinType);
    expect(request.owner).toMatch(/^0x0+b$/);
    await late?.();
    return grpcResponse(GrpcTypes.GetBalanceResponse.toBinary({ balance }));
  });
  return { session, fetch, reader: new WalletFullnodeReader(session, { fetch }) };
}
describe('Fullnode新鲜余额区分Coin与地址资金', () => {
  it('同会话并发读取复用业务请求但保留前后身份检查', async () => {
    const f = fixture({ coinType, balance: 0n });
    const other = new WalletFullnodeReader(f.session, { fetch: f.fetch });
    const [a, b] = await Promise.all([f.reader.balance('0xb', coinType), other.balance('0xb', coinType)]);
    expect(a).toEqual(b);
    expect(f.fetch).toHaveBeenCalledTimes(3);
    await f.reader.balance('0xb', coinType);
    expect(f.fetch).toHaveBeenCalledTimes(6);
  });
  it('共享业务响应不绕过任一调用者的读后水位检查', async () => {
    const f = fixture({ coinType, balance: 0n }, undefined, true);
    const outcomes = await Promise.allSettled([f.reader.balance('0xb', coinType), f.reader.balance('0xb', coinType)]);
    expect(outcomes.map(x => x.status)).toEqual(['rejected', 'rejected']);
    expect(f.fetch).toHaveBeenCalledTimes(3);
  });
  it.each([
    [{ coinType, balance: 0n }, ['0', '0', '0']],
    [{ coinType, balance: 9007199254740993n, addressBalance: 9007199254740993n }, ['9007199254740993', '0', '9007199254740993']],
    [{ coinType, balance: 9n, coinBalance: 4n, addressBalance: 5n }, ['9', '4', '5']],
  ] as const)('保留精度并按服务端编码合同识别省略的零分量', async (raw, expected) => {
    const f = fixture(raw);
    const result = await f.reader.balance('0xb', coinType);
    expect([result.balance, result.coinBalance, result.addressBalance]).toEqual(expected);
    expect(Object.isFrozen(result)).toBe(true);
    expect(f.fetch).toHaveBeenCalledTimes(3);
  });
  it.each([undefined, {}, { coinType }, { coinType, balance: 1n },
    { coinType: '0x3::other::OTHER', balance: 0n },
    { coinType, balance: 3n, coinBalance: 2n, addressBalance: 2n },
  ])('缺少必需字段、错类型或不一致总额不伪造零余额', async raw => {
    await expect(fixture(raw).reader.balance('0xb', coinType)).rejects.toThrow();
  });
  it('迟到数据与读取期间水位倒退均拒绝', async () => {
    const raw = { coinType, balance: 0n };
    await expect(fixture(raw, undefined, true).reader.balance('0xb', coinType)).rejects.toThrow();
    let f: ReturnType<typeof fixture>;
    f = fixture(raw, async () => f.session.close());
    await expect(f.reader.balance('0xb', coinType)).rejects.toThrow('会话');
  });
});

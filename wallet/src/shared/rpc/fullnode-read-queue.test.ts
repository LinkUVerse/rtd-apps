import { describe, expect, it, vi } from 'vitest';
import { queuedFullnodeRead, type FullnodeReadMethod } from './fullnode-read-queue';
import { WalletReadSession } from './session';
import { validateNetworkProfile } from './profile';
import { profileFixture } from './profile-fixture';

function fixture() {
  const session = new WalletReadSession(validateNetworkProfile(profileFixture()));
  const transport = vi.fn<typeof fetch>();
  const send = vi.fn(async (_signal: AbortSignal) => ({ bytes: new Uint8Array([7]), balance: 3n }));
  function read(options: {
    session?: WalletReadSession; transport?: typeof fetch; timeout?: number;
    method?: FullnodeReadMethod; bytes?: Uint8Array; signal?: AbortSignal;
  } = {}) {
    return queuedFullnodeRead(options.session ?? session, options.transport ?? transport,
      options.timeout ?? 1000, options.method ?? 'GetBalance', options.bytes ?? new Uint8Array([1]),
      options.signal ?? new AbortController().signal, send);
  }
  return { session, transport, send, read };
}

describe('Fullnode 派发前只读请求复用', () => {
  it('不同事件任务仍复用尚未派发的相同读取', async () => {
    const f = fixture();
    await Promise.all([0, 1].map(() => new Promise((resolve, reject) => {
      setTimeout(() => { void f.read().then(resolve, reject); }, 0);
    })));
    expect(f.send).toHaveBeenCalledTimes(1);
    await f.read();
    expect(f.send).toHaveBeenCalledTimes(2);
  });
  it('合并相同请求，每个调用者得到独立可变响应，完成后重新请求', async () => {
    const f = fixture();
    const [a, b] = await Promise.all([f.read(), f.read()]);
    expect(f.send).toHaveBeenCalledTimes(1);
    expect(a).toEqual(b);
    a.bytes[0] = 9;
    expect(b.bytes[0]).toBe(7);
    await f.read();
    expect(f.send).toHaveBeenCalledTimes(2);
  });

  it.each(['session', 'transport', 'timeout', 'method', 'bytes'] as const)('%s 不同不得混用', async key => {
    const f = fixture();
    const changes = {
      session: new WalletReadSession(f.session.profile), transport: vi.fn<typeof fetch>(),
      timeout: 2000, method: 'GetObject' as const, bytes: new Uint8Array([2]),
    };
    await Promise.all([f.read(), f.read({ [key]: changes[key] })]);
    expect(f.send).toHaveBeenCalledTimes(2);
  });

  it('已发出的请求不满足后来读取的新鲜度要求', async () => {
    const f = fixture();
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    f.send.mockImplementation(async () => { await gate; return { bytes: new Uint8Array([7]), balance: 3n }; });
    const first = f.read();
    await vi.waitFor(() => expect(f.send).toHaveBeenCalledTimes(1));
    const second = f.read();
    await vi.waitFor(() => expect(f.send).toHaveBeenCalledTimes(2));
    release();
    await Promise.all([first, second]);
  });

  it('一个订阅者取消不影响其他订阅者，全部取消才中断传输', async () => {
    const f = fixture();
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    f.send.mockImplementation(async () => { await gate; return { bytes: new Uint8Array([7]), balance: 3n }; });
    const a = new AbortController(), b = new AbortController();
    const first = f.read({ signal: a.signal }), second = f.read({ signal: b.signal });
    const outcomes = Promise.allSettled([first, second]);
    await vi.waitFor(() => expect(f.send).toHaveBeenCalledTimes(1));
    const shared = f.send.mock.calls[0][0];
    a.abort();
    expect(shared.aborted).toBe(false);
    b.abort();
    expect(shared.aborted).toBe(true);
    release();
    expect((await outcomes).map(x => x.status)).toEqual(['rejected', 'rejected']);
  });

  it('取消第一个调用仍让另一个正常完成', async () => {
    const f = fixture(), a = new AbortController();
    const first = f.read({ signal: a.signal }), second = f.read();
    const outcomes = Promise.allSettled([first, second]);
    a.abort();
    expect((await outcomes).map(x => x.status)).toEqual(['rejected', 'fulfilled']);
    expect(f.send).toHaveBeenCalledTimes(1);
  });

  it('会话关闭拒绝忽略取消的迟到响应', async () => {
    const f = fixture();
    f.send.mockImplementation(async () => { f.session.close(); return { bytes: new Uint8Array([7]), balance: 3n }; });
    const outcomes = await Promise.allSettled([f.read(), f.read()]);
    expect(outcomes.map(x => x.status)).toEqual(['rejected', 'rejected']);
    expect(f.send).toHaveBeenCalledTimes(1);
  });

  it('失败同时传给订阅者而不自动重试', async () => {
    const f = fixture();
    f.send.mockRejectedValue(new Error('upstream failure'));
    const outcomes = await Promise.allSettled([f.read(), f.read()]);
    expect(outcomes.map(x => x.status)).toEqual(['rejected', 'rejected']);
    expect(f.send).toHaveBeenCalledTimes(1);
  });
});

// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
/** Owned by one content-script port. A sibling tab cannot cancel this map's requests. */
export class ConnectionRequests {
  private readonly active = new Map<string, AbortController>();
  begin(id: string) {
    if (typeof id !== 'string' || !id || id.length > 200 || this.active.has(id))
      throw new Error('交易请求标识无效或重复');
    if (this.active.size >= 64) throw new Error('待处理交易请求过多');
    const controller = new AbortController();
    this.active.set(id, controller);
    return { signal: controller.signal, finish: () => this.active.delete(id) };
  }
  cancel(id: unknown) {
    if (typeof id !== 'string' || !id || id.length > 200) throw new Error('取消请求标识无效');
    this.active.get(id)?.abort(new Error('dApp已取消交易请求'));
  }
  disconnect() {
    for (const controller of this.active.values()) controller.abort(new Error('dApp连接已断开'));
  }
}

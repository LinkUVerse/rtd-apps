import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchSnapshotRead } from "./snapshot-read-retry";

afterEach(() => vi.useRealTimers());
describe("快照只读 HTTP 有界重试", () => {
  it.each([408, 429, 502, 503, 504])(
    "临时状态 %s 最多两次重试",
    async (status) => {
      vi.useFakeTimers();
      const fetch = vi
        .fn()
        .mockImplementation(
          async () => new Response("unavailable", { status }),
        );
      const init = {
        method: "POST",
        body: "fixed query",
        signal: new AbortController().signal,
      };
      const pending = fetchSnapshotRead(
        fetch,
        "https://example.test/graphql",
        init,
      );
      await vi.runAllTimersAsync();
      expect((await pending).status).toBe(status);
      expect(fetch).toHaveBeenCalledTimes(3);
      for (const call of fetch.mock.calls)
        expect(call).toEqual(["https://example.test/graphql", init]);
    },
  );
  it.each([200, 400, 401, 403, 404, 500])(
    "非重试状态 %s 原样返回",
    async (status) => {
      const response = new Response("original body", { status });
      const fetch = vi.fn().mockResolvedValue(response);
      expect(await fetchSnapshotRead(fetch, "https://example.test", {})).toBe(
        response,
      );
      expect(await response.text()).toBe("original body");
      expect(fetch).toHaveBeenCalledTimes(1);
    },
  );
  it("浏览器无法分类的网络异常不重试", async () => {
    const error = new TypeError("Failed to fetch");
    const fetch = vi.fn().mockRejectedValue(error);
    await expect(
      fetchSnapshotRead(fetch, "https://example.test", {}),
    ).rejects.toBe(error);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("等待期间取消，终止后续请求", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 503 }));
    const pending = fetchSnapshotRead(fetch, "https://example.test", {
      signal: controller.signal,
    });
    const assertion = expect(pending).rejects.toBe("closed");
    await vi.advanceTimersByTimeAsync(100);
    controller.abort("closed");
    await assertion;
    await vi.runAllTimersAsync();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("全部尝试共用同一截止信号，退避不刷新预算", async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0);
    try {
      const controller = new AbortController();
      const fetch = vi
        .fn()
        .mockImplementation(async () => new Response(null, { status: 503 }));
      setTimeout(() => controller.abort("deadline"), 350);
      const pending = fetchSnapshotRead(fetch, "https://example.test", {
        signal: controller.signal,
      });
      const assertion = expect(pending).rejects.toBe("deadline");
      await vi.runAllTimersAsync();
      await assertion;
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(
        fetch.mock.calls.every((call) => call[1].signal === controller.signal),
      ).toBe(true);
    } finally {
      vi.restoreAllMocks();
    }
  });
  it("开始前取消不发请求，忽略取消的迟到响应也不交付", async () => {
    const controller = new AbortController();
    controller.abort("closed");
    const fetch = vi.fn().mockResolvedValue(new Response("ok"));
    await expect(
      fetchSnapshotRead(fetch, "https://example.test", {
        signal: controller.signal,
      }),
    ).rejects.toBe("closed");
    expect(fetch).not.toHaveBeenCalled();
    const active = new AbortController();
    const late = vi.fn().mockImplementation(async () => {
      active.abort("changed");
      return new Response("ok");
    });
    await expect(
      fetchSnapshotRead(late, "https://example.test", {
        signal: active.signal,
      }),
    ).rejects.toBe("changed");
    expect(late).toHaveBeenCalledTimes(1);
  });
  it("遵守 Retry-After，恢复后停止重试", async () => {
    vi.useFakeTimers();
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, { status: 429, headers: { "Retry-After": "2" } }),
      )
      .mockResolvedValue(new Response("ok"));
    const pending = fetchSnapshotRead(fetch, "https://example.test", {});
    await vi.advanceTimersByTimeAsync(1999);
    expect(fetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(await (await pending).text()).toBe("ok");
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it.each(["120", "9".repeat(400)])(
    "超预算服务器退避不抢先重试或消费正文 %#",
    async (retryAfter) => {
      const fetch = vi.fn().mockResolvedValue(
        new Response("later", {
          status: 429,
          headers: { "Retry-After": retryAfter },
        }),
      );
      expect(
        await (
          await fetchSnapshotRead(fetch, "https://example.test", {})
        ).text(),
      ).toBe("later");
      expect(fetch).toHaveBeenCalledTimes(1);
    },
  );
});

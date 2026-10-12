import { describe, expect, it, vi } from "vitest";
import {
  WalletContextController,
  type WalletContextStore,
} from "./wallet-context-controller";

function fixture(worker = true) {
  const pending = new Set<object>();
  const store: WalletContextStore = {
    startEpoch: vi.fn(async () => undefined),
    beginMutation: vi.fn(async () => {
      const token = Object.freeze({});
      pending.add(token);
      return token;
    }),
    finishMutation: vi.fn(async (token) => {
      if (!pending.delete(token)) throw new Error("not owned");
    }),
  };
  return {
    store,
    pending,
    controller: new WalletContextController(store, () => worker),
  };
}
describe("background context mutation ownership", () => {
  it("construction and importing a controller perform no epoch IO", () => {
    const { store } = fixture();
    expect(store.startEpoch).not.toHaveBeenCalled();
  });
  it("UI cannot initialize or perform a write", async () => {
    const { store, controller } = fixture(false);
    const write = vi.fn();
    await expect(controller.initialize()).rejects.toThrow("后台");
    await expect(controller.mutate(write)).rejects.toThrow("后台");
    expect(store.startEpoch).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
  });
  it("concurrent calls await one startup and retain separate mutation tokens", async () => {
    const { controller, store, pending } = fixture();
    let ready!: () => void;
    vi.mocked(store.startEpoch).mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          ready = resolve;
        }),
    );
    const write = vi.fn(() => {
      expect(pending.size).toBeGreaterThan(0);
    });
    const a = controller.mutate(write),
      b = controller.mutate(write);
    await Promise.resolve();
    expect(store.startEpoch).toHaveBeenCalledTimes(1);
    expect(write).not.toHaveBeenCalled();
    ready();
    await Promise.all([a, b]);
    expect(write).toHaveBeenCalledTimes(2);
    expect(store.beginMutation).toHaveBeenCalledTimes(2);
    expect(pending.size).toBe(0);
  });
  it("startup failure is cached and cannot trigger another epoch or external write", async () => {
    const { controller, store } = fixture();
    vi.mocked(store.startEpoch).mockRejectedValue(new Error("disk"));
    const write = vi.fn();
    await expect(controller.mutate(write)).rejects.toThrow("disk");
    await expect(controller.mutate(write)).rejects.toThrow("disk");
    expect(store.startEpoch).toHaveBeenCalledTimes(1);
    expect(store.beginMutation).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
  });
  it("begin failure prevents external mutation", async () => {
    const { controller, store } = fixture();
    vi.mocked(store.beginMutation).mockRejectedValue(new Error("durability"));
    const write = vi.fn();
    await expect(controller.mutate(write)).rejects.toThrow("durability");
    expect(write).not.toHaveBeenCalled();
  });
  it("failed external operation preserves its pending and does not invoke finish", async () => {
    const { controller, store, pending } = fixture();
    await expect(
      controller.mutate(() => {
        throw new Error("unknown write");
      }),
    ).rejects.toThrow("unknown write");
    expect(pending.size).toBe(1);
    expect(store.finishMutation).not.toHaveBeenCalled();
  });
  it("finish failure cannot report mutation success", async () => {
    const { controller, store, pending } = fixture();
    vi.mocked(store.finishMutation).mockRejectedValue(
      new Error("unknown commit"),
    );
    await expect(controller.mutate(() => "written")).rejects.toThrow(
      "unknown commit",
    );
    expect(pending.size).toBe(1);
  });
  it("one concurrent failure retains only its own pending", async () => {
    const { controller, pending } = fixture();
    const results = await Promise.allSettled([
      controller.mutate(() => {
        throw new Error("fail");
      }),
      controller.mutate(() => "ok"),
    ]);
    expect(results.map((r) => r.status)).toEqual(["rejected", "fulfilled"]);
    expect(pending.size).toBe(1);
  });
});

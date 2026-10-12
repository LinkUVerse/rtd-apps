import { beforeEach, expect, it, vi } from "vitest";
import { profileFixture } from "../shared/rpc/profile-fixture";
import { networkBindingKey } from "../shared/rpc/profile";
import { withWalletContextMutation } from "./wallet-context-mutation";
const f = vi.hoisted(() => ({
  store: {} as Record<string, any>,
  set: vi.fn(),
  permission: vi.fn(),
  probe: vi.fn(),
}));
vi.mock("webextension-polyfill", () => ({
  default: {
    storage: {
      local: {
        get: async (defaults: any) => ({ ...defaults, ...f.store }),
        set: f.set,
      },
    },
    permissions: { contains: f.permission },
  },
}));
// Unit-only barrier stub; real native-IDB ordering is tested separately.
vi.mock("./wallet-context-mutation", () => ({
  withWalletContextMutation: vi.fn(async (operation: () => unknown) =>
    operation(),
  ),
}));
vi.mock("../shared/rpc/identity", () => ({ probeNetworkIdentity: f.probe }));
it("failed durable barrier prevents network storage and changed notification", async () => {
  const changed = vi.fn();
  network.on("changed", changed);
  vi.mocked(withWalletContextMutation).mockRejectedValueOnce(
    new Error("barrier unavailable"),
  );
  await expect(
    network.setActiveNetwork({ env: "mainnet", customRpcUrl: null } as any),
  ).rejects.toThrow("barrier unavailable");
  expect(f.set).not.toHaveBeenCalled();
  expect(changed).not.toHaveBeenCalled();
});
it("invalid custom review is rejected before creating a context mutation", async () => {
  const before = vi.mocked(withWalletContextMutation).mock.calls.length;
  await expect(
    network.confirmCustomProfile("unknown-review"),
  ).rejects.toThrow();
  expect(vi.mocked(withWalletContextMutation).mock.calls.length).toBe(before);
  expect(f.set).not.toHaveBeenCalled();
});
let network: typeof import("./NetworkEnv").default;
beforeEach(async () => {
  vi.resetModules();
  f.store = { rtd_Env: "local", rtd_Env_RPC: "http://legacy.example" };
  f.set.mockReset().mockImplementation(async (value) => {
    Object.assign(f.store, structuredClone(value));
  });
  f.permission.mockReset().mockResolvedValue(true);
  f.probe.mockReset().mockImplementation(async (session) => ({
    state: "identity-verified",
    bindingKey: networkBindingKey(session.profile),
    observedAt: Date.now(),
    endpoints: ["fullnode", "graphql", "archive"].map((role) => ({
      role,
      state: "verified",
      genesisDigest: session.profile.expectedGenesisDigest,
    })),
  }));
  network = (await import("./NetworkEnv")).default;
});
it("does not persist a preview; confirmation writes versioned profile and preserves legacy data", async () => {
  const changed = vi.fn();
  network.on("changed", changed);
  const p = await network.prepareCustomProfile(profileFixture());
  expect(f.set).not.toHaveBeenCalled();
  const saved = await network.confirmCustomProfile(p.token);
  expect(saved.env).toBe("customRPC");
  expect(await network.getActiveNetwork()).toEqual(saved);
  expect(f.store.rtd_Env_RPC).toBe("http://legacy.example");
  expect(changed).toHaveBeenCalledWith(saved);
  await expect(network.confirmCustomProfile(p.token)).rejects.toThrow();
});
it("denied permission prevents all network probes and storage", async () => {
  f.permission.mockResolvedValue(false);
  await expect(network.prepareCustomProfile(profileFixture())).rejects.toThrow(
    "授权",
  );
  expect(f.probe).not.toHaveBeenCalled();
  expect(f.set).not.toHaveBeenCalled();
});
it("revoked permission prevents saving even after a valid preview", async () => {
  const p = await network.prepareCustomProfile(profileFixture());
  f.permission.mockResolvedValue(false);
  await expect(network.confirmCustomProfile(p.token)).rejects.toThrow("撤销");
  expect(f.set).not.toHaveBeenCalled();
});
it("old custom URLs remain unconfigured and cannot be saved as trusted profiles", async () => {
  f.store.rtd_Env = "customRPC";
  expect(await network.getActiveNetwork()).toEqual({
    env: "customRPC",
    customRpcUrl: "http://legacy.example",
  });
  await expect(
    network.setActiveNetwork({
      env: "customRPC",
      customRpcUrl: "https://new.example",
    } as any),
  ).rejects.toThrow("预检");
  expect(f.set).not.toHaveBeenCalled();
});
it("network changes after preview invalidate confirmation", async () => {
  const p = await network.prepareCustomProfile(profileFixture());
  await network.setActiveNetwork({ env: "mainnet", customRpcUrl: null } as any);
  await expect(network.confirmCustomProfile(p.token)).rejects.toThrow("失效");
  expect((await network.getActiveNetwork()).env).toBe("mainnet");
});
it("failed storage never announces a network switch", async () => {
  const changed = vi.fn();
  network.on("changed", changed);
  const p = await network.prepareCustomProfile(profileFixture());
  f.set.mockRejectedValue(new Error("disk full"));
  await expect(network.confirmCustomProfile(p.token)).rejects.toThrow(
    "disk full",
  );
  expect(changed).not.toHaveBeenCalled();
  expect((await network.getActiveNetwork()).env).toBe("local");
});
it("same identity requires a strictly increased revision", async () => {
  await network.confirmCustomProfile(
    (await network.prepareCustomProfile(profileFixture())).token,
  );
  const p = await network.prepareCustomProfile(profileFixture());
  await expect(network.confirmCustomProfile(p.token)).rejects.toThrow("版本");
});

it("switching away and back still invalidates an old review", async () => {
  const p = await network.prepareCustomProfile(profileFixture());
  await network.setActiveNetwork({ env: "mainnet", customRpcUrl: null } as any);
  await network.setActiveNetwork({ env: "local", customRpcUrl: null } as any);
  await expect(network.confirmCustomProfile(p.token)).rejects.toThrow("失效");
});
it("switching to a built-in preserves the saved custom profile", async () => {
  await network.confirmCustomProfile(
    (await network.prepareCustomProfile(profileFixture())).token,
  );
  const saved = structuredClone(f.store.wallet_custom_profile_v2);
  await network.setActiveNetwork({ env: "local", customRpcUrl: null } as any);
  expect(f.store.wallet_custom_profile_v2).toEqual(saved);
});

it("restores saved configuration after a built-in switch and a worker module restart", async () => {
  await network.confirmCustomProfile(
    (await network.prepareCustomProfile(profileFixture())).token,
  );
  await network.setActiveNetwork({ env: "local", customRpcUrl: null } as any);
  vi.resetModules();
  network = (await import("./NetworkEnv")).default;
  expect((await network.getSavedCustomProfile())?.id).toBe("local");
  expect((await network.getActiveNetwork()).env).toBe("local");
  const old = await network.prepareCustomProfile(profileFixture());
  await expect(network.confirmCustomProfile(old.token)).rejects.toThrow("版本");
  const next = await network.prepareCustomProfile({
    ...profileFixture(),
    revision: 2,
  });
  await network.confirmCustomProfile(next.token);
  expect((await network.getSavedCustomProfile())?.revision).toBe(2);
});
it("has no invented custom configuration on a fresh install", async () => {
  expect(await network.getSavedCustomProfile()).toBeNull();
  expect(f.set).not.toHaveBeenCalled();
});
it("does not overwrite corrupted saved configuration while reading it", async () => {
  f.store.wallet_custom_profile_v2 = { schemaVersion: 500 };
  await expect(network.getSavedCustomProfile()).rejects.toThrow();
  expect(f.store.wallet_custom_profile_v2).toEqual({ schemaVersion: 500 });
  expect(f.set).not.toHaveBeenCalled();
});

it.each([false, 0, "", [], "invalid", 42])(
  "rejects malformed versioned selection %j without legacy fallback or writes",
  async (value) => {
    f.store.wallet_network_v2 = value;
    f.store.rtd_Env = "customRPC";
    const original = structuredClone(f.store);
    await expect(network.getActiveNetwork()).rejects.toThrow(
      "已保存的网络配置无效",
    );
    await expect(
      network.prepareCustomProfile(profileFixture()),
    ).rejects.toThrow("已保存的网络配置无效");
    expect(f.store).toEqual(original);
    expect(f.set).not.toHaveBeenCalled();
    expect(f.probe).not.toHaveBeenCalled();
  },
);

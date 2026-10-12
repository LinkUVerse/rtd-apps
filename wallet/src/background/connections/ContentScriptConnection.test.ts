import { beforeEach, expect, it, vi } from "vitest";
import { Subject } from "rxjs";
const m = vi.hoisted(() => ({
  permission: vi.fn(),
  allowed: vi.fn(),
  execute: vi.fn(),
  remove: vi.fn(),
  barrier: vi.fn(),
}));
vi.mock("webextension-polyfill", () => ({
  default: { runtime: { id: "own-extension" } },
}));
vi.mock("../wallet-context-mutation", () => ({
  withWalletContextMutation: m.barrier,
}));
vi.mock("./Connection", () => ({
  Connection: class {
    onDisconnect = new Subject<void>();
    send = vi.fn();
  },
}));
vi.mock("../Permissions", () => ({
  default: {
    getPermission: m.permission,
    hasPermissions: m.allowed,
    delete: m.remove,
  },
}));
vi.mock("../Transactions", () => ({
  default: { executeOrSignTransaction: m.execute },
}));
vi.mock("../accounts", () => ({ getAccountsStatusData: vi.fn() }));
vi.mock("../NetworkEnv", () => ({ default: {} }));
vi.mock("../qredo", () => ({ requestUserApproval: vi.fn() }));
vi.mock("_src/shared/experimentation/features", () => ({
  FEATURES: {},
  growthbook: {},
}));
import { ContentScriptConnection } from "./ContentScriptConnection";
function connection() {
  return new ContentScriptConnection({
    sender: {
      id: "own-extension",
      origin: "https://dapp.test",
      url: "https://dapp.test/path",
      tab: { id: 9 },
      frameId: 0,
      documentId: "opaque-native-doc",
      documentLifecycle: "active",
    },
  } as any);
}
function send(c: ContentScriptConnection, id: string, payload: any) {
  return (c as any).handleMessage({ id, payload });
}
const transaction = {
  type: "transaction",
  account: "0x7",
  chain: "rtd:localnet",
  data: "source",
};
beforeEach(() => {
  vi.clearAllMocks();
  m.barrier.mockImplementation(async (operation) => operation());
  m.permission.mockResolvedValue({ allowed: true });
  m.allowed.mockResolvedValue(true);
});
it("cancels during permission lookup before any approval is requested", async () => {
  const c = connection();
  let release!: (v: any) => void;
  m.permission.mockReturnValue(
    new Promise((r) => {
      release = r;
    }),
  );
  const task = send(c, "request", {
    type: "execute-transaction-request",
    transaction,
  });
  await send(c, "cancel", {
    type: "cancel-transaction-request",
    requestId: "request",
  });
  release({ allowed: true });
  await task;
  expect(m.execute).not.toHaveBeenCalled();
  expect(c.send).toHaveBeenCalledWith(
    expect.objectContaining({
      id: "request",
      payload: expect.objectContaining({
        error: true,
        message: "dApp已取消交易请求",
      }),
    }),
  );
});
it("sibling connection cannot cancel the request and owner cancellation reaches live execution", async () => {
  const a = connection(),
    b = connection();
  let signal!: AbortSignal;
  m.execute.mockImplementation((_args, _connection, s) => {
    signal = s;
    return new Promise((_resolve, reject) =>
      s.addEventListener("abort", () => reject(s.reason)),
    );
  });
  const task = send(a, "request", {
    type: "execute-transaction-request",
    transaction,
  });
  await vi.waitFor(() => expect(m.execute).toHaveBeenCalled());
  await send(b, "cancel", {
    type: "cancel-transaction-request",
    requestId: "request",
  });
  expect(signal.aborted).toBe(false);
  await send(a, "cancel", {
    type: "cancel-transaction-request",
    requestId: "request",
  });
  await task;
  expect(signal.aborted).toBe(true);
});
it("disconnect during permissions does not create a late approval", async () => {
  const c = connection();
  let release!: (v: any) => void;
  m.permission.mockReturnValue(
    new Promise((r) => {
      release = r;
    }),
  );
  const task = send(c, "request", {
    type: "sign-transaction-request",
    transaction: {
      account: "0x7",
      chain: "rtd:localnet",
      transaction: "source",
    },
  });
  (c.onDisconnect as any).next();
  release({ allowed: true });
  await task;
  expect(m.execute).not.toHaveBeenCalled();
});

it("disconnect acknowledgment follows durable permission deletion for the browser origin", async () => {
  const c = connection();
  let release!: () => void;
  m.remove.mockReturnValue(
    new Promise<void>((resolve) => {
      release = resolve;
    }),
  );
  const task = send(c, "disconnect", {
    type: "disconnect-app",
    origin: "https://forged.test",
  });
  expect(m.remove).toHaveBeenCalledWith("https://dapp.test");
  expect(c.send).not.toHaveBeenCalled();
  release();
  await task;
  expect(c.send).toHaveBeenCalledWith({
    id: "disconnect",
    payload: { type: "done" },
  });
});

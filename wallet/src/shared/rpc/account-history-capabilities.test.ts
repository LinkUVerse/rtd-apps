// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { toBase58 } from "rtd-typescript/utils";
import {
  historyFixture,
  historyRow,
} from "../../../tests/unit/rpc/history-fixtures";
import { sender } from "../../../tests/unit/rpc/execution-fixtures";
import {
  buildSchema,
  parse,
  validate,
  getOperationAST,
  type GraphQLObjectType,
} from "graphql";
import { probeAccountHistoryCapabilities } from "./account-history-capabilities";
import {
  HISTORY_COVERAGE_QUERY,
  HISTORY_PAGE_QUERY,
  HISTORY_NATIVE_COVERAGE,
  WalletAccountHistoryServiceError,
} from "./account-history-protocol";
import { WalletAccountHistoryReader } from "./account-history-reader";
import { classifyWalletReadError } from "./read-error";
import { validateNetworkProfile } from "./profile";
import { WalletReadSession } from "./session";

describe("账户能力复用生产协议／全分页reader", () => {
  it("coverage-only只有两次扩展coverage及原生三次窗口准入，没有owner/page能力", async () => {
    const f = await historyFixture(),
      r = await probeAccountHistoryCapabilities(f.native.session, {
        fetch: f.fetch,
      });
    expect(r).toMatchObject({
      state: "coverage-window-verified",
      accountScope: "not-probed",
      window: {
        checkpointLo: 0,
        checkpointHi: 25,
        allAccountActivityCertified: false,
      },
      protocol: "rtd-account-history-two-root",
      allAccountHistoryVerified: false,
    });
    expect(f.requests).toHaveLength(2);
    expect(f.native.requests).toHaveLength(2);
    expect(f.requests.every((p) => p.query === HISTORY_COVERAGE_QUERY)).toBe(
      true,
    );
    expect(r).not.toHaveProperty("coverage");
    expect(r).not.toHaveProperty("ready");
    expect(r).not.toHaveProperty("client");
  });
  it("显式账户完整消费原两页／native事实，输出hash及原样范围flag，无地址／业务payload", async () => {
    const f = await historyFixture({
      rows: [
        (await historyRow(1n, true, 22)).row,
        (await historyRow(2n, false, 21)).row,
      ],
    });
    const r = await probeAccountHistoryCapabilities(f.native.session, {
      fetch: f.fetch,
      address: sender,
      pageSize: 1,
    });
    expect(r).toMatchObject({
      state: "scoped-window-verified",
      accountSha256: createHash("sha256").update(sender).digest("hex"),
      totalTransactions: 2,
      snapshotVerification: "service-binding-only",
      cursorVerification: "service-authenticated-opaque",
      coverage: {
        registrationComplete: true,
        completeForRegisteredKiosks: true,
        allAccountActivityCertified: false,
        allAccountTransfersCertified: false,
      },
      allAccountHistoryVerified: false,
    });
    expect(
      f.requests.filter((p) => p.query === HISTORY_PAGE_QUERY),
    ).toHaveLength(2);
    expect(r).not.toHaveProperty("address");
    expect(r).not.toHaveProperty("transactions");
    expect(Object.isFrozen(r)).toBe(true);
    await probeAccountHistoryCapabilities(f.native.session, {
      fetch: f.fetch,
      address: sender,
      pageSize: 1,
    });
    expect(f.requests).toHaveLength(8);
  });
  it("真实协议空页可以是声明范围的零计数，但不能宣称全集", async () => {
    const f = await historyFixture({ rows: [] }),
      r = await probeAccountHistoryCapabilities(f.native.session, {
        fetch: f.fetch,
        address: sender,
      });
    expect(r).toMatchObject({
      state: "scoped-window-verified",
      totalTransactions: 0,
      allAccountHistoryVerified: false,
    });
    expect(
      f.requests.filter((p) => p.query === HISTORY_PAGE_QUERY),
    ).toHaveLength(1);
  });
  it.each(["history", "native"])(
    "%s入口缺失明确unconfigured零IO",
    async (role) => {
      const f = await historyFixture(),
        endpoints = { ...f.native.profile.endpoints };
      if (role === "history") delete endpoints.accountHistoryUrl;
      else delete endpoints.graphqlUrl;
      const session = new WalletReadSession(
        validateNetworkProfile({ ...f.native.profile, endpoints }),
      );
      const r = await probeAccountHistoryCapabilities(session, {
        fetch: f.fetch,
        address: sender,
      });
      expect(r).toMatchObject({
        state: "unconfigured",
        reason: role === "history" ? "account-endpoint" : "native-endpoint",
      });
      expect(f.fetch).not.toHaveBeenCalled();
    },
  );
  it("要求未来minimumCheckpoint时不把旧扩展窗口冒作已追平", async () => {
    const f = await historyFixture(),
      r = await probeAccountHistoryCapabilities(f.native.session, {
        fetch: f.fetch,
        address: sender,
        minimumCheckpoint: "26",
      });
    expect(r).toMatchObject({ state: "syncing", reason: "coverage" });
    expect(f.requests).toHaveLength(1);
    expect(f.native.requests).toHaveLength(0);
  });
  it.each(["chain-coverage", "chain-page", "native-chain"])(
    "%s错误角色保留并优先阻止可用报告",
    async (fault) => {
      const f = await historyFixture({
        alter: (data) => {
          if (fault === "chain-coverage" && data.accountHistoryCoverage)
            data.accountHistoryCoverage.chainId = toBase58(
              new Uint8Array(32).fill(9),
            );
          if (fault === "chain-page" && data.accountHistory) {
            data.accountHistory.chainId = toBase58(new Uint8Array(32).fill(9));
            data.accountHistory.totalTransactions = -1;
          }
        },
        nativeAlter: (data) => {
          if (fault === "native-chain")
            data.walletGenesis.digest = toBase58(new Uint8Array(32).fill(9));
        },
      });
      await expect(
        probeAccountHistoryCapabilities(f.native.session, {
          fetch: f.fetch,
          address: sender,
        }),
      ).rejects.toMatchObject({
        name: "NetworkIdentityError",
        role: fault === "native-chain" ? "graphql" : "accountHistory",
        reason: "chain-mismatch",
      });
    },
  );
  it.each([
    "partial",
    "extra-root",
    "null-data",
    "null-envelope",
    "bad-json",
    "bad-mime",
    "http",
    "throw",
    "oversize",
  ])("coverage %s分类不发布成功", async (fault) => {
    const f = await historyFixture();
    const fetch: typeof globalThis.fetch = async (url, init) => {
      if (String(url) !== f.native.profile.endpoints.accountHistoryUrl)
        return f.fetch(url, init);
      if (fault === "http") return new Response(null, { status: 503 });
      if (fault === "throw") throw new TypeError("synthetic transport failure");
      if (fault === "bad-json")
        return new Response("{", {
          headers: { "content-type": "application/json" },
        });
      if (fault === "bad-mime")
        return new Response("{}", { headers: { "content-type": "text/html" } });
      if (fault === "oversize")
        return new Response(new Uint8Array(2 * 1024 * 1024 + 1), {
          headers: { "content-type": "application/json" },
        });
      const response = await f.fetch(url, init),
        body = await response.json();
      if (fault === "partial") body.errors = [{ message: "synthetic partial" }];
      if (fault === "extra-root") body.data.other = true;
      if (fault === "null-data") body.data = null;
      return Response.json(fault === "null-envelope" ? null : body);
    };
    const r = await probeAccountHistoryCapabilities(f.native.session, {
      fetch,
    });
    expect(r).toMatchObject({
      state: ["http", "throw"].includes(fault) ? "unavailable" : "incomplete",
      reason: ["http", "throw"].includes(fault)
        ? "transport"
        : fault === "partial"
          ? "partial"
          : fault === "oversize"
            ? "budget"
            : "response",
    });
    expect(r).not.toHaveProperty("window");
  });
  it.each([
    [{ code: "BUSY" }, "busy", "exhausted"],
    [{ code: "DEPENDENCY_UNAVAILABLE" }, "dependency", "unavailable"],
    [
      {
        code: "HISTORY_UNAVAILABLE",
        reason: "UPSTREAM_HTTP_ERROR",
        upstreamStatus: 503,
      },
      "upstream",
      "unavailable",
    ],
    [
      { code: "HISTORY_UNAVAILABLE", reason: "UPSTREAM_TIMEOUT" },
      "upstream",
      "unavailable",
    ],
    [
      { code: "HISTORY_UNAVAILABLE", reason: "UPSTREAM_TRANSPORT_ERROR" },
      "upstream",
      "unavailable",
    ],
    [
      { code: "HISTORY_UNAVAILABLE", reason: "SNAPSHOT_CHANGED" },
      "changed",
      null,
    ],
    [
      { code: "HISTORY_UNAVAILABLE", reason: "COVERAGE_CHANGED" },
      "changed",
      null,
    ],
  ] as const)(
    "单一已审核服务错误%j拒绝data且保留公共分类",
    async (extensions, reason, kind) => {
      const f = await historyFixture();
      const fetch: typeof globalThis.fetch = async (url, init) => {
        const response = await f.fetch(url, init);
        if (String(url) !== f.native.profile.endpoints.accountHistoryUrl)
          return response;
        const body = await response.json();
        return Response.json({
          ...body,
          errors: [{ message: "untrusted server text", extensions }],
        });
      };
      const r = await probeAccountHistoryCapabilities(f.native.session, {
        fetch,
      });
      expect(r).toMatchObject({
        state: kind === null ? "incomplete" : "unavailable",
        reason,
      });
      expect(r).not.toHaveProperty("window");
      expect(f.requests).toHaveLength(1);
      expect(f.native.requests).toHaveLength(0);
      if (kind !== null) {
        try {
          await new WalletAccountHistoryReader(f.native.session, {
            fetch,
          }).read(sender);
          expect.fail("service failure was admitted");
        } catch (error) {
          expect(error).toBeInstanceOf(WalletAccountHistoryServiceError);
          expect(classifyWalletReadError(error)).toMatchObject({
            kind,
            retryableRead: true,
          });
          expect(String(error)).not.toContain("untrusted server text");
          expect(error).toMatchObject({ reason });
          if ("upstreamStatus" in extensions)
            expect(error).toMatchObject({ upstreamStatus: 503 });
        }
      }
    },
  );
  it.each(
    [
      [
        {
          extensions: {
            code: "HISTORY_UNAVAILABLE",
            reason: "UPSTREAM_HTTP_ERROR",
            upstreamStatus: "503",
          },
        },
      ],
      [
        {
          extensions: {
            code: "HISTORY_UNAVAILABLE",
            reason: "UPSTREAM_HTTP_ERROR",
            upstreamStatus: 600,
          },
        },
      ],
      [
        {
          extensions: {
            code: "HISTORY_UNAVAILABLE",
            reason: "UPSTREAM_HTTP_ERROR",
            upstreamStatus: 503.5,
          },
        },
      ],
      [
        {
          extensions: {
            code: "HISTORY_UNAVAILABLE",
            reason: "UPSTREAM_HTTP_ERROR",
          },
        },
      ],
      [
        {
          extensions: { code: "HISTORY_UNAVAILABLE", reason: "CHAIN_MISMATCH" },
        },
      ],
      [{ extensions: { code: "BUSY", internal: "untrusted private data" } }],
      [{ extensions: { code: "DEPENDENCY_UNAVAILABLE", reason: "unknown" } }],
      [{ extensions: null }],
      [null],
      [
        { extensions: { code: "BUSY" } },
        { extensions: { code: "BAD_REQUEST" } },
      ],
    ].map((errors) => [errors]),
  )(
    "未知／畸形／混合服务错误仍整组partial，不信任服务错链诊断",
    async (errors) => {
      const f = await historyFixture();
      const fetch: typeof globalThis.fetch = async (url, init) => {
        const response = await f.fetch(url, init);
        if (String(url) !== f.native.profile.endpoints.accountHistoryUrl)
          return response;
        return Response.json({ ...(await response.json()), errors });
      };
      expect(
        await probeAccountHistoryCapabilities(f.native.session, { fetch }),
      ).toMatchObject({ state: "incomplete", reason: "partial" });
      expect(f.requests).toHaveLength(1);
      expect(f.native.requests).toHaveLength(0);
    },
  );
  it("owner上游503后最终原生已知错链仍优先，五次读取内不自动重试", async () => {
    const f = await historyFixture({
      nativeAlter: (data, request) => {
        if (request.query.includes('WalletSnapshotRevalidate'))
          data.walletGenesis.digest = toBase58(new Uint8Array(32).fill(9));
      },
    });
    const fetch: typeof globalThis.fetch = async (url, init) => {
      const response = await f.fetch(url, init);
      if (
        String(url) === f.native.profile.endpoints.accountHistoryUrl &&
        JSON.parse(String(init?.body)).query === HISTORY_PAGE_QUERY
      )
        return Response.json({
          data: null,
          errors: [
            {
              extensions: {
                code: "HISTORY_UNAVAILABLE",
                reason: "UPSTREAM_HTTP_ERROR",
                upstreamStatus: 503,
              },
            },
          ],
        });
      return response;
    };
    await expect(
      probeAccountHistoryCapabilities(f.native.session, {
        fetch,
        address: sender,
      }),
    ).rejects.toMatchObject({
      name: "NetworkIdentityError",
      role: "graphql",
      reason: "chain-mismatch",
    });
    expect(f.requests).toHaveLength(3);
    expect(f.native.requests).toHaveLength(2);
  });
  it.each([
    "lower",
    "upper",
    "digest",
    "flags",
    "string-checkpoint",
    "float-checkpoint",
    "unsafe-checkpoint",
  ])("coverage %s不相容／变化不能接纳窗口", async (fault) => {
    const f = await historyFixture({
      alter: (data, _request, round) => {
        const c = data.accountHistoryCoverage;
        if (!c) return;
        if (fault === "lower" && round > 1) c.checkpointLo = 1;
        if (fault === "upper" && round > 1) c.checkpointHi = 24;
        if (fault === "digest" && round > 1)
          c.checkpointDigest = toBase58(new Uint8Array(32).fill(9));
        if (fault === "flags" && round > 1)
          c.allAccountActivityCertified = true;
        if (fault === "string-checkpoint") c.checkpointHi = "25";
        if (fault === "float-checkpoint") c.checkpointHi = 25.1;
        if (fault === "unsafe-checkpoint") c.checkpointHi = 9007199254740992;
      },
    });
    const r = await probeAccountHistoryCapabilities(f.native.session, {
      fetch: f.fetch,
    });
    expect(r).toMatchObject({
      state: "incomplete",
      reason: ["lower", "upper", "digest", "flags"].includes(fault)
        ? "changed"
        : "response",
    });
  });
  it("发布上界推进保留原已验证固定窗口，不提升为最新全集", async () => {
    const f = await historyFixture({
      alter: (data, _request, round) => {
        if (data.accountHistoryCoverage && round > 1) {
          data.accountHistoryCoverage.checkpointHi = 26;
          data.accountHistoryCoverage.checkpointDigest = toBase58(
            new Uint8Array(32).fill(9),
          );
        }
      },
    });
    expect(
      await probeAccountHistoryCapabilities(f.native.session, {
        fetch: f.fetch,
      }),
    ).toMatchObject({
      state: "coverage-window-verified",
      window: { checkpointHi: 25 },
      allAccountHistoryVerified: false,
    });
  });
  it.each(["flag-null", "flag-missing", "snapshot", "count", "facts"])(
    "生产page %s错误不会从capability wrapper逃逸",
    async (fault) => {
      const f = await historyFixture({
        alter: (data) => {
          const p = data.accountHistory;
          if (!p) return;
          if (fault === "flag-null") p.registrationComplete = null;
          if (fault === "flag-missing")
            delete p.completeForDiscoveredOwnerTokens;
          if (fault === "snapshot") p.snapshot = "wrong";
          if (fault === "count") p.totalTransactions = 2;
          if (fault === "facts")
            p.transactions[0].transaction.effects.effectsBcs = "AA==";
        },
      });
      expect(
        await probeAccountHistoryCapabilities(f.native.session, {
          fetch: f.fetch,
          address: sender,
        }),
      ).toMatchObject({ state: "incomplete", reason: "response" });
    },
  );
  it("nullable flags与未注册的限定集合逐字保留", async () => {
    const f = await historyFixture({
      alter: (data) => {
        if (data.accountHistory) {
          data.accountHistory.registrationComplete = false;
          data.accountHistory.completeForDiscoveredOwnerTokens = null;
          data.accountHistory.completeForDiscoveredCapabilities = null;
          data.accountHistory.allAccountTransfersCertified = null;
        }
      },
    });
    expect(
      await probeAccountHistoryCapabilities(f.native.session, {
        fetch: f.fetch,
        address: sender,
      }),
    ).toMatchObject({
      state: "scoped-window-verified",
      coverage: {
        registrationComplete: false,
        completeForDiscoveredOwnerTokens: null,
        completeForDiscoveredCapabilities: null,
        allAccountTransfersCertified: null,
      },
      allAccountHistoryVerified: false,
    });
  });
  it("局部page失败后结束extension错链仍优先，部分页不泄露", async () => {
    const f = await historyFixture({
      alter: (data, _request, round) => {
        if (data.accountHistory) data.accountHistory.totalTransactions = -1;
        if (data.accountHistoryCoverage && round > 1)
          data.accountHistoryCoverage.chainId = toBase58(
            new Uint8Array(32).fill(9),
          );
      },
    });
    await expect(
      probeAccountHistoryCapabilities(f.native.session, {
        fetch: f.fetch,
        address: sender,
      }),
    ).rejects.toMatchObject({
      role: "accountHistory",
      reason: "chain-mismatch",
    });
  });
  it("非空错误页后结束native错链仍优先", async () => {
    const f = await historyFixture({
      alter: (data) => {
        if (data.accountHistory) data.accountHistory.totalTransactions = -1;
      },
      nativeAlter: (data, request) => {
        if (request.query.includes("Revalidate"))
          data.walletGenesis.digest = toBase58(new Uint8Array(32).fill(9));
      },
    });
    await expect(
      probeAccountHistoryCapabilities(f.native.session, {
        fetch: f.fetch,
        address: sender,
      }),
    ).rejects.toMatchObject({ role: "graphql", reason: "chain-mismatch" });
  });
  it("保留原生snapshot显式HTTP退避，不改成账户API重试", async () => {
    const f = await historyFixture();
    let injected = false,
      nativePosts = 0;
    const fetch: typeof globalThis.fetch = (url, init) => {
      if (String(url) === f.native.profile.endpoints.graphqlUrl) {
        ++nativePosts;
        if (!injected) {
          injected = true;
          return Promise.resolve(new Response(null, { status: 503 }));
        }
      }
      return f.fetch(url, init);
    };
    expect(
      await probeAccountHistoryCapabilities(f.native.session, { fetch }),
    ).toMatchObject({ state: "coverage-window-verified" });
    expect(nativePosts).toBe(3);
    expect(f.requests).toHaveLength(2);
  });
  it("错误类仍走统一UI链身份分类", async () => {
    const f = await historyFixture({
      alter: (data) => {
        if (data.accountHistoryCoverage)
          data.accountHistoryCoverage.chainId = toBase58(
            new Uint8Array(32).fill(9),
          );
      },
    });
    try {
      await f.reader.read(sender);
      throw new Error("Expected failure");
    } catch (error) {
      expect(classifyWalletReadError(error).kind).toBe("identity");
    }
  });
  it.each(["caller", "session", "deadline"])(
    "生产reader %s取消可结束忽略abort的transport，迟到不发第二请求",
    async (abort) => {
      const f = await historyFixture(),
        controller = new AbortController(),
        entered = Promise.withResolvers<void>();
      let release: (r: Response) => void = () => {};
      const fetch = vi.fn<typeof globalThis.fetch>((_url, _init) => {
        entered.resolve();
        return new Promise((r) => {
          release = r;
        });
      });
      const reader = new WalletAccountHistoryReader(f.native.session, {
        fetch,
        timeoutMs: abort === "deadline" ? 80 : 30000,
      });
      const promise = reader.read(sender, controller.signal),
        assertion = expect(promise).rejects.toBeDefined();
      await entered.promise;
      if (abort === "caller")
        controller.abort(new Error("synthetic cancellation"));
      else if (abort === "session") f.native.session.close();
      await assertion;
      release(Response.json({ data: {} }));
      await new Promise((r) => setTimeout(r, 10));
      expect(fetch).toHaveBeenCalledTimes(1);
    },
  );
  it("四个body未完成的取消read保留共享名额，另一个scope不能提前fetch", async () => {
    const entered = Promise.withResolvers<void>(),
      releases: (() => void)[] = [];
    const streams: ReadableStream<Uint8Array>[] = [];
    const rows = await Promise.all(
      Array.from({ length: 4 }, async () => {
        const f = await historyFixture(),
          controller = new AbortController();
        const fetch = vi.fn<typeof globalThis.fetch>(() => {
          const stream = new ReadableStream<Uint8Array>({
            start(body) {
              releases.push(() => body.close());
              if (releases.length === 4) entered.resolve();
            },
          });
          streams.push(stream);
          return Promise.resolve(
            new Response(stream, {
              headers: { "content-type": "application/json" },
            }),
          );
        });
        return { f, controller, fetch };
      }),
    );
    const promises = rows.map(({ f, controller, fetch }) =>
      new WalletAccountHistoryReader(f.native.session, { fetch }).read(
        sender,
        controller.signal,
      ),
    );
    const assertions = promises.map((p) => expect(p).rejects.toBeDefined());
    await entered.promise;
    await vi.waitFor(() => expect(streams.every((s) => s.locked)).toBe(true));
    rows.forEach(({ controller }) =>
      controller.abort(new Error("synthetic cancellation")),
    );
    await Promise.all(assertions);
    const next = await historyFixture();
    await expect(
      new WalletAccountHistoryReader(next.native.session, {
        fetch: next.fetch,
        timeoutMs: 50,
      }).read(sender),
    ).rejects.toBeDefined();
    expect(next.fetch).not.toHaveBeenCalled();
    releases.forEach((release) => release());
    await new Promise((r) => setTimeout(r, 10));
    expect(rows.every(({ fetch }) => fetch.mock.calls.length === 1)).toBe(true);
  });
  it("新session／角色变更重读，旧session不发布", async () => {
    const f = await historyFixture();
    await probeAccountHistoryCapabilities(f.native.session, { fetch: f.fetch });
    f.native.session.close();
    await expect(
      probeAccountHistoryCapabilities(f.native.session, { fetch: f.fetch }),
    ).rejects.toMatchObject({ name: "StaleWalletSessionError" });
    expect(f.requests).toHaveLength(2);
    const session = new WalletReadSession(f.native.profile),
      r = await probeAccountHistoryCapabilities(session, { fetch: f.fetch });
    expect(r.readSessionKey).not.toBe(f.native.session.cacheKey);
    expect(f.requests).toHaveLength(4);
  });
  it("取消后才到的响应头等待异步body cleanup，未清理前不释放名额", async () => {
    const entered = Promise.withResolvers<void>(),
      responses: (() => void)[] = [],
      cleanups: (() => void)[] = [];
    const rows = await Promise.all(
      Array.from({ length: 4 }, async () => {
        const f = await historyFixture(),
          controller = new AbortController();
        const fetch = vi.fn<typeof globalThis.fetch>(
          () =>
            new Promise<Response>((resolve) => {
              const stream = new ReadableStream<Uint8Array>({
                cancel: () =>
                  new Promise<void>((done) => {
                    cleanups.push(done);
                  }),
              });
              responses.push(() =>
                resolve(
                  new Response(stream, {
                    headers: { "content-type": "application/json" },
                  }),
                ),
              );
              if (responses.length === 4) entered.resolve();
            }),
        );
        return { f, controller, fetch };
      }),
    );
    const assertions = rows.map(({ f, controller, fetch }) =>
      expect(
        new WalletAccountHistoryReader(f.native.session, { fetch }).read(
          sender,
          controller.signal,
        ),
      ).rejects.toBeDefined(),
    );
    try {
      await entered.promise;
      rows.forEach(({ controller }) =>
        controller.abort(new Error("synthetic cancellation")),
      );
      await Promise.all(assertions);
      responses.forEach((release) => release());
      await vi.waitFor(() => expect(cleanups).toHaveLength(4));
      const next = await historyFixture();
      await expect(
        new WalletAccountHistoryReader(next.native.session, {
          fetch: next.fetch,
          timeoutMs: 50,
        }).read(sender),
      ).rejects.toBeDefined();
      expect(next.fetch).not.toHaveBeenCalled();
    } finally {
      cleanups.forEach((done) => done());
    }
    await new Promise((r) => setTimeout(r, 10));
    expect(rows.every(({ fetch }) => fetch.mock.calls.length === 1)).toBe(true);
  });
  it("超预算body的异步取消清理继续持有leaf，外层总期限仍可结束", async () => {
    const entered = Promise.withResolvers<void>(),
      cleanups: (() => void)[] = [];
    const rows = await Promise.all(
      Array.from({ length: 4 }, async () => {
        const f = await historyFixture();
        const fetch = vi.fn<typeof globalThis.fetch>(() => {
          const stream = new ReadableStream<Uint8Array>({
            start(body) {
              body.enqueue(new Uint8Array(2 * 1024 * 1024 + 1));
            },
            cancel: () =>
              new Promise<void>((done) => {
                cleanups.push(done);
                if (cleanups.length === 4) entered.resolve();
              }),
          });
          return Promise.resolve(
            new Response(stream, {
              headers: { "content-type": "application/json" },
            }),
          );
        });
        return { f, fetch };
      }),
    );
    const assertions = rows.map(({ f, fetch }) =>
      expect(
        new WalletAccountHistoryReader(f.native.session, {
          fetch,
          timeoutMs: 100,
        }).read(sender),
      ).rejects.toBeDefined(),
    );
    try {
      await entered.promise;
      await Promise.all(assertions);
      const next = await historyFixture();
      await expect(
        new WalletAccountHistoryReader(next.native.session, {
          fetch: next.fetch,
          timeoutMs: 50,
        }).read(sender),
      ).rejects.toBeDefined();
      expect(next.fetch).not.toHaveBeenCalled();
    } finally {
      cleanups.forEach((done) => done());
    }
    await new Promise((r) => setTimeout(r, 10));
    expect(rows.every(({ fetch }) => fetch.mock.calls.length === 1)).toBe(true);
  });
});

describe("两根自定义协议的独立源码／SDL合同", () => {
  const root = resolve("migrationToGRpcOrGraphQLDoc"),
    manifest: {
      official: { path: string; sha256: string }[];
      local: { file: string; sha256: string }[];
    } = JSON.parse(
      readFileSync(
        resolve(
          root,
          "evidence/official/20261006-C36-account-history-retention/manifest.json",
        ),
        "utf8",
      ),
    );
  it.each(manifest.official)("固定官方规范sha保持：$path", (row) => {
    expect(
      createHash("sha256")
        .update(readFileSync(resolve(root, row.path)))
        .digest("hex"),
    ).toBe(row.sha256);
  });
  it.each(manifest.local)("当前自定义服务源sha保持：$file", (row) => {
    expect(
      createHash("sha256").update(readFileSync(row.file)).digest("hex"),
    ).toBe(row.sha256);
  });
  it("实际source SDL只允许两根；整个生产selection与nullable flag精确对齐", () => {
    const file = manifest.local.find((r) =>
      r.file.endsWith("/schema.graphql"),
    )!;
    const schema = buildSchema(readFileSync(file.file, "utf8"));
    expect(Object.keys(schema.getQueryType()!.getFields())).toEqual([
      "accountHistoryCoverage",
      "accountHistory",
    ]);
    for (const query of [HISTORY_COVERAGE_QUERY, HISTORY_PAGE_QUERY]) {
      const ast = parse(query);
      expect(validate(schema, ast)).toEqual([]);
      const operation = getOperationAST(ast)!;
      expect(operation.operation).toBe("query");
      expect(operation.selectionSet.selections).toHaveLength(1);
    }
    const page = schema.getType("AccountHistoryPage") as GraphQLObjectType;
    expect(String(page.getFields().allAccountActivityCertified.type)).toBe(
      "Boolean!",
    );
    expect(String(page.getFields().allAccountTransfersCertified.type)).toBe(
      "Boolean",
    );
    const api = readFileSync(
      manifest.local.find((r) => r.file.endsWith("/graphql_api.py"))!.file,
      "utf8",
    );
    expect(api).toContain(
      "Exactly one account history query is allowed per request.",
    );
  });
  it("scope snapshot包括未返回注册集，不伪造客户端HMAC／SHA验证", () => {
    const source = readFileSync(
      manifest.local.find((r) => r.file.endsWith("/activity_pages.py"))!.file,
      "utf8",
    );
    expect(source).toContain('"registrations": registrations');
    expect(source).toContain(
      "snapshot = hashlib.sha256(canonical(binding)).hexdigest()",
    );
    expect(source).toContain('hmac.digest(signing_key, raw, "sha256")');
    expect(HISTORY_NATIVE_COVERAGE).toHaveLength(5);
    expect(Object.isFrozen(HISTORY_NATIVE_COVERAGE[1].filters)).toBe(true);
  });
});

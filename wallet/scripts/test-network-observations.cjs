#!/usr/bin/env node
// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Actual Chromium storage/worker restart; controlled reports, zero chain requests or signing.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { chromium } = require("@playwright/test");
(async () => {
  const temporary = fs.mkdtempSync(
    path.join(os.tmpdir(), "rtd-network-observations-"),
  );
  const bundle = path.join(temporary, "bundle.js"),
    profileDir = path.join(temporary, "profile");
  execFileSync(
    "pnpm",
    [
      "exec",
      "esbuild",
      "tests/unit/rpc/network-observation-browser-harness.ts",
      "--bundle",
      "--platform=browser",
      "--format=iife",
      "--global-name=NetworkHarness",
      `--outfile=${bundle}`,
    ],
    { cwd: path.resolve(__dirname, ".."), stdio: "pipe" },
  );
  const worker = `importScripts('/bundle.js'); const instance = crypto.randomUUID(); self.addEventListener('install',e=>e.waitUntil(self.skipWaiting()));self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));self.addEventListener('message',e=>e.waitUntil((async()=>{const H=NetworkHarness,p=H.validateNetworkProfile(H.profileFixture()),s=new H.WalletNetworkObservations({databaseName:'restart-observations'});let reset=false;try{await s.capture(p)}catch(error){reset=error.name==='TransactionNetworkResetError'}const row=await H.rawRow('restart-observations',H.networkObservationScope(p));e.ports[0].postMessage({instance,reset,state:row?.state,highest:row?.highest});})()));`;
  const server = http.createServer((req, res) => {
    res.setHeader("Cache-Control", "no-store");
    if (req.url === "/bundle.js" || req.url === "/worker.js") {
      res.setHeader("Content-Type", "text/javascript");
      res.end(req.url === "/bundle.js" ? fs.readFileSync(bundle) : worker);
    } else {
      res.setHeader("Content-Type", "text/html");
      res.end('<!doctype html><script src="/bundle.js"></script>');
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  let context,
    failed = true;
  const seenRequests = [],
    tests = [];
  const launch = async () => {
    const ctx = await chromium.launchPersistentContext(profileDir, {
      executablePath:
        process.env.RTD_OBSERVATIONS_CHROMIUM ??
        path.join(
          os.homedir(),
          "Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
        ),
      headless: true,
    });
    await ctx.route("**/*", (route) => {
      seenRequests.push(route.request().url());
      if (new URL(route.request().url()).origin !== origin)
        return route.abort();
      return route.continue();
    });
    return ctx;
  };
  try {
    context = await launch();
    let page = await context.newPage();
    await page.goto(origin);
    tests.push(
      ...(await page.evaluate(async () => {
        const H = NetworkHarness,
          p = H.validateNetworkProfile(H.profileFixture()),
          scope = H.networkObservationScope(p),
          results = [];
        const check = (ok, why) => {
          if (!ok) throw new Error(why);
        };
        const reject = async (operation, reason) => {
          try {
            await operation();
          } catch (e) {
            check(
              e.reason === reason || e.name === reason,
              `wrong rejection: ${e.name}/${e.reason}`,
            );
            return;
          }
          throw new Error(`missing rejection ${reason}`);
        };
        const store = (databaseName) =>
          new H.WalletNetworkObservations({ databaseName });
        const seed = async (name, fullnode = "100", archive = "80") => {
          const s = store(name);
          await s.observe(
            p,
            await s.capture(p),
            H.report(p, fullnode, archive),
          );
          return s;
        };
        // IDB request success is deliberately earlier than the durable-complete authorization barrier.
        const s = store("complete-observations"),
          before = await s.capture(p);
        const originalPut = IDBObjectStore.prototype.put,
          originalTx = IDBDatabase.prototype.transaction;
        let putSuccess = false,
          completed = false,
          settled = false,
          durability;
        IDBDatabase.prototype.transaction = function (...args) {
          const tx = originalTx.apply(this, args);
          if (
            this.name === "complete-observations" &&
            args[1] === "readwrite"
          ) {
            durability = tx.durability;
            tx.addEventListener("complete", () => {
              completed = true;
              check(!settled, "authorization before complete");
            });
          }
          return tx;
        };
        IDBObjectStore.prototype.put = function (...args) {
          const r = originalPut.apply(this, args);
          if (this.transaction.db.name === "complete-observations")
            r.addEventListener("success", () => {
              putSuccess = true;
              check(
                !settled && !completed,
                "request success released authorization",
              );
            });
          return r;
        };
        try {
          await s.observe(p, before, H.report(p)).then(() => {
            settled = true;
          });
        } finally {
          IDBObjectStore.prototype.put = originalPut;
          IDBDatabase.prototype.transaction = originalTx;
        }
        check(
          putSuccess && completed && settled && durability === "strict",
          "strict complete barrier missing",
        );
        check(
          (await store("complete-observations").capture(p)).highest.fullnode ===
            "100",
          "new connection lost positive height",
        );
        results.push(
          "原生strict事务：put success不准入，complete后发布；新连接保留水位",
        );
        const abort = await seed("abort-observations"),
          abortBefore = await abort.capture(p);
        const oldRow = await H.rawRow("abort-observations", scope);
        let successBeforeAbort = false;
        IDBObjectStore.prototype.put = function (...args) {
          const r = originalPut.apply(this, args),
            tx = this.transaction;
          if (tx.db.name === "abort-observations")
            r.addEventListener("success", () => {
              successBeforeAbort = true;
              tx.abort();
            });
          return r;
        };
        try {
          await reject(
            () => abort.observe(p, abortBefore, H.report(p, "101", "81")),
            "unavailable",
          );
        } finally {
          IDBObjectStore.prototype.put = originalPut;
        }
        check(
          successBeforeAbort &&
            JSON.stringify(oldRow) ===
              JSON.stringify(await H.rawRow("abort-observations", scope)),
          "aborted success changed row",
        );
        results.push("put已成功后原生abort：授权拒绝、旧水位逐字段保持");
        // A reset write must also finish; a failed reset cannot pretend that quarantine was durable.
        IDBObjectStore.prototype.put = function (...args) {
          const r = originalPut.apply(this, args),
            tx = this.transaction;
          if (tx.db.name === "abort-observations")
            r.addEventListener("success", () => tx.abort());
          return r;
        };
        try {
          await reject(
            () => abort.observe(p, abortBefore, H.report(p, "99", "81")),
            "unavailable",
          );
        } finally {
          IDBObjectStore.prototype.put = originalPut;
        }
        check(
          JSON.stringify(oldRow) ===
            JSON.stringify(await H.rawRow("abort-observations", scope)),
          "failed reset corrupted prior row",
        );
        results.push("隔离写入abort不冒充已持久化，旧记录保持且准入拒绝");
        IDBDatabase.prototype.transaction = function (...args) {
          if (this.name === "abort-observations" && args[1] === "readwrite")
            args[2] = { durability: "relaxed" };
          return originalTx.apply(this, args);
        };
        try {
          await reject(
            () => abort.observe(p, abortBefore, H.report(p, "101", "81")),
            "unavailable",
          );
        } finally {
          IDBDatabase.prototype.transaction = originalTx;
        }
        check(
          JSON.stringify(oldRow) ===
            JSON.stringify(await H.rawRow("abort-observations", scope)),
          "relaxed accepted or wrote",
        );
        results.push("受控relaxed原生事务不得签发许可或更新旧记录");
        const deleted = await seed("deleted-observations"),
          deletedBefore = await deleted.capture(p);
        await H.rawRow("deleted-observations", scope, (os) => os.delete(scope));
        await reject(
          () => deleted.observe(p, deletedBefore, H.report(p, "101")),
          "corrupt",
        );
        check(
          (await H.rawRow("deleted-observations", scope)) === undefined,
          "missing prior row automatically bootstrapped",
        );
        results.push("探测期间已存在记录被删除：拒绝重建旧scope");
        const corrupt = await seed("corrupt-observations"),
          corruptRow = await H.rawRow("corrupt-observations", scope);
        await H.rawRow("corrupt-observations", scope, (os) =>
          os.put({ ...corruptRow, unexpected: "fixture" }),
        );
        const corruptBefore = await H.rawRow("corrupt-observations", scope);
        await reject(() => store("corrupt-observations").capture(p), "corrupt");
        check(
          JSON.stringify(corruptBefore) ===
            JSON.stringify(await H.rawRow("corrupt-observations", scope)),
          "corrupt row repaired implicitly",
        );
        results.push("损坏未知字段保守拒绝、不自动清空修复");
        const future = await H.rawDatabase("future-observations", 2);
        future.close();
        await reject(
          () => store("future-observations").capture(p),
          "unavailable",
        );
        const stillFuture = await H.rawDatabase("future-observations", 2);
        check(stillFuture.version === 2, "future schema downgraded");
        stillFuture.close();
        const wrong = await H.rawDatabase("wrong-observations", 1, "other");
        wrong.close();
        await reject(() => store("wrong-observations").capture(p), "corrupt");
        const stillWrong = await H.rawDatabase("wrong-observations");
        check(
          stillWrong
            .transaction("observations-v1")
            .objectStore("observations-v1").keyPath === "other",
          "wrong key repaired",
        );
        stillWrong.close();
        results.push("未来版本／错误keyPath保留数据库并拒绝准入");
        await reject(
          () =>
            new H.WalletNetworkObservations({
              indexedDB: {
                open() {
                  throw new DOMException("fixture", "SecurityError");
                },
              },
            }).capture(p),
          "unavailable",
        );
        results.push("受控IDB安全拒绝不降为内存许可");
        const timeout = new H.WalletNetworkObservations({
          indexedDB: {
            open() {
              return {};
            },
          },
          timeoutMs: 20,
        });
        await reject(() => timeout.capture(p), "unavailable");
        results.push("受控open不响应按期限拒绝，没有隐式重建／准入");
        const roles = await seed("roles-observations", "100", "200");
        await roles.observe(
          p,
          await roles.capture(p),
          H.report(p, "101", null),
        );
        const highs = (await store("roles-observations").capture(p)).highest;
        check(
          highs.fullnode === "101" && highs.archive === "200",
          "native roles replaced each other",
        );
        await reject(
          async () =>
            roles.observe(p, await roles.capture(p), H.report(p, "102", "199")),
          "TransactionNetworkResetError",
        );
        results.push("两个原生角色独立，暂不可用保留归档水位，真正倒退写隔离");
        const restart = await seed("restart-observations");
        await reject(
          async () =>
            restart.observe(
              p,
              await restart.capture(p),
              H.report(p, "99", "81"),
            ),
          "TransactionNetworkResetError",
        );
        await reject(
          () => store("restart-observations").capture(p),
          "TransactionNetworkResetError",
        );
        const alias = H.validateNetworkProfile({
          ...p,
          id: "alias",
          revision: p.revision + 1,
        });
        await reject(
          () => store("restart-observations").capture(alias),
          "TransactionNetworkResetError",
        );
        const next = H.validateNetworkProfile({ ...p, generation: "dev-next" });
        await restart.observe(
          next,
          await restart.capture(next),
          H.report(next, "1", "0"),
        );
        check(
          (await H.rawRow("restart-observations", scope)).state ===
            "reset-required" &&
            (await restart.capture(next)).highest.fullnode === "1",
          "new generation erased old reset",
        );
        results.push(
          "隔离跨连接／别名／revision保持，新generation独立且保留旧记录",
        );
        return results;
      })),
    );
    const other = await context.newPage();
    await other.goto(origin);
    const capture = (target) =>
      target.evaluate(async () => {
        const H = NetworkHarness,
          p = H.validateNetworkProfile(H.profileFixture());
        return new H.WalletNetworkObservations({
          databaseName: "race-observations",
        }).capture(p);
      });
    const [first, second] = await Promise.all([capture(page), capture(other)]);
    await other.evaluate(async (before) => {
      const H = NetworkHarness,
        p = H.validateNetworkProfile(H.profileFixture());
      await new H.WalletNetworkObservations({
        databaseName: "race-observations",
      }).observe(p, before, H.report(p, "102", "82"));
    }, second);
    const late = await page.evaluate(async (before) => {
      const H = NetworkHarness,
        p = H.validateNetworkProfile(H.profileFixture()),
        s = new H.WalletNetworkObservations({
          databaseName: "race-observations",
        });
      try {
        await s.observe(p, before, H.report(p));
        return { accepted: true };
      } catch (e) {
        return { reason: e.reason, after: await s.capture(p) };
      }
    }, first);
    assert.equal(late.reason, "stale");
    assert.deepEqual(late.after.highest, { fullnode: "102", archive: "82" });
    tests.push("两个实际窗口首次并发：迟到低响应拒绝、不误隔离或降低最高水位");
    const [a, b] = await Promise.all([capture(page), capture(other)]);
    const write = (target, before, height, archive) =>
      target.evaluate(
        async ({ before, height, archive }) => {
          const H = NetworkHarness,
            p = H.validateNetworkProfile(H.profileFixture());
          try {
            await new H.WalletNetworkObservations({
              databaseName: "race-observations",
            }).observe(p, before, H.report(p, height, archive));
            return "accepted";
          } catch (error) {
            return error.reason ?? error.name;
          }
        },
        { before, height, archive },
      );
    const outcomes = await Promise.all([
      write(page, a, "103", "83"),
      write(other, b, "104", "84"),
    ]);
    assert(
      outcomes.every((state) => state === "accepted" || state === "stale"),
    );
    assert.deepEqual((await capture(page)).highest, {
      fullnode: "104",
      archive: "84",
    });
    tests.push(
      "两个窗口同时提交原生readwrite事务：最高水位保留、无丢失更新／误隔离",
    );
    await page.reload();
    assert.deepEqual((await capture(page)).highest, {
      fullnode: "104",
      archive: "84",
    });
    tests.push("实际页面重载保留已经提交的原生水位");
    const cdp = await context.newCDPSession(page),
      versions = [];
    cdp.on("ServiceWorker.workerVersionUpdated", (event) =>
      versions.push(...event.versions),
    );
    await cdp.send("ServiceWorker.enable");
    await page.evaluate(async () => {
      await navigator.serviceWorker.register("/worker.js");
      await navigator.serviceWorker.ready;
    });
    const send = () =>
      page.evaluate(async () => {
        const reg = await navigator.serviceWorker.ready;
        return new Promise((resolve, reject) => {
          const c = new MessageChannel();
          const timer = setTimeout(
            () => reject(new Error("worker deadline")),
            10000,
          );
          c.port1.onmessage = (event) => {
            clearTimeout(timer);
            resolve(event.data);
          };
          reg.active.postMessage("read", [c.port2]);
        });
      });
    const beforeStop = await send();
    assert.equal(beforeStop.reset, true);
    const version = versions.findLast(
      (v) =>
        v.scriptURL === `${origin}/worker.js` && v.runningStatus === "running",
    );
    assert(version, "running service worker missing");
    await cdp.send("ServiceWorker.stopWorker", {
      versionId: version.versionId,
    });
    const afterStop = await send();
    assert.notEqual(afterStop.instance, beforeStop.instance);
    assert.deepEqual(
      { ...afterStop, instance: null },
      { ...beforeStop, instance: null },
    );
    tests.push("实际service worker停止并重新启动：新实例仍读到同scope隔离");
    await cdp.detach();
    const browserVersion = await page.evaluate(() => navigator.userAgent);
    await context.close();
    context = await launch();
    page = await context.newPage();
    await page.goto(origin);
    const restored = await page.evaluate(async () => {
      const H = NetworkHarness,
        p = H.validateNetworkProfile(H.profileFixture()),
        s = new H.WalletNetworkObservations({
          databaseName: "restart-observations",
        });
      let rejected = false;
      try {
        await s.capture(p);
      } catch (e) {
        rejected = e.name === "TransactionNetworkResetError";
      }
      const row = await H.rawRow(
        "restart-observations",
        H.networkObservationScope(p),
      );
      return { rejected, state: row.state, highest: row.highest };
    });
    assert.deepEqual(restored, {
      rejected: true,
      state: "reset-required",
      highest: { fullnode: "100", archive: "80" },
    });
    tests.push("实际整个Chromium关闭后同profile重启：水位及隔离保持");
    assert(
      seenRequests.every((url) => new URL(url).origin === origin),
      "unexpected network request",
    );
    console.log(
      JSON.stringify(
        {
          passed: true,
          count: tests.length,
          tests,
          browserVersion,
          chainRequests: 0,
          signingCalls: 0,
          simulations: 0,
          executions: 0,
          scope:
            "Native Chromium IndexedDB/window/worker/browser restart with controlled identity reports; no wallet extension, live chain, or physical power-loss acceptance",
        },
        null,
        2,
      ),
    );
    failed = false;
  } finally {
    if (context) await context.close().catch(() => {});
    await new Promise((resolve) => server.close(resolve));
    if (!failed) fs.rmSync(temporary, { recursive: true, force: true });
    else
      console.error(
        JSON.stringify({ passed: false, retainedFixture: temporary }),
      );
  }
})().catch((error) => {
  console.error(
    JSON.stringify({
      passed: false,
      errorName: error.name,
      message: error.message,
    }),
  );
  process.exitCode = 1;
});

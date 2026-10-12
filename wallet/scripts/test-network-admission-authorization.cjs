#!/usr/bin/env node
// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Real guard + SDK + native IDB, in an isolated public-fixture browser profile.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { chromium } = require("@playwright/test");
(async () => {
  const temporary = fs.mkdtempSync(
    path.join(os.tmpdir(), "rtd-admission-authorization-"),
  );
  const bundle = path.join(temporary, "bundle.js"),
    tests = [],
    pageErrors = [],
    externalAttempts = [];
  let context,
    server,
    failed = true;
  try {
    execFileSync(
      "pnpm",
      [
        "exec",
        "esbuild",
        "tests/unit/rpc/network-admission-authorization-browser-harness.ts",
        "--bundle",
        "--platform=browser",
        "--format=iife",
        "--global-name=AuthorizationHarness",
        `--outfile=${bundle}`,
      ],
      { cwd: path.resolve(__dirname, ".."), stdio: "pipe" },
    );
    const worker = `importScripts('/bundle.js');const instance=crypto.randomUUID();self.addEventListener('install',e=>e.waitUntil(self.skipWaiting()));self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));self.addEventListener('message',e=>e.waitUntil((async()=>{const H=AuthorizationHarness,p=H.validateNetworkProfile(H.profileFixture()),session=new H.WalletReadSession(p),f=H.networkIdentityFixture();let reason;try{await H.assertTransactionNetworkIdentity(session,{fetch:f.fetch})}catch(e){reason=e.reason}finally{session.close()}const row=await new H.WalletNetworkAdmissionStore().capture(p);e.ports[0].postMessage({instance,reason,requests:f.requests.length,faults:row.faults.length,pending:row.pending.length});})()));`;
    server = http.createServer((req, res) => {
      res.setHeader("Cache-Control", "no-store");
      res.setHeader(
        "Content-Security-Policy",
        "default-src 'self'; connect-src 'none'; worker-src 'self'; script-src 'self'",
      );
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
    const launch = async () => {
      const ctx = await chromium.launchPersistentContext(
        path.join(temporary, "profile"),
        {
          executablePath:
            process.env.RTD_ADMISSION_CHROMIUM ??
            path.join(
              os.homedir(),
              "Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
            ),
          headless: true,
        },
      );
      ctx.on("page", (p) => p.on("pageerror", (e) => pageErrors.push(e.name)));
      ctx.on("request", (r) => {
        if (new URL(r.url()).origin !== origin) externalAttempts.push(true);
      });
      await ctx.route("**/*", (r) =>
        new URL(r.request().url()).origin === origin ? r.continue() : r.abort(),
      );
      return ctx;
    };
    context = await launch();
    let page = await context.newPage();
    await page.goto(origin);
    const cases = await page.evaluate(async () => {
      const H = AuthorizationHarness,
        p = H.validateNetworkProfile(H.profileFixture()),
        prefix = "RtdWallet NetworkAdmission:test:authorization-",
        sessions = [],
        fixtures = [],
        results = [];
      const check = (ok, label) => {
        if (!ok) throw new Error(label);
      };
      const reject = async (run, reason) => {
        try {
          await run();
        } catch (e) {
          check(
            [e.reason, e.code, e.name].includes(reason),
            "wrong sanitized rejection",
          );
          return;
        }
        throw new Error("expected rejection missing");
      };
      const fixture = (alter) => {
        const f = H.networkIdentityFixture(alter);
        fixtures.push(f);
        return f;
      };
      const session = (profile = p) => {
        const s = new H.WalletReadSession(profile);
        sessions.push(s);
        return s;
      };
      const stores = (name) => ({
        admission: new H.WalletNetworkAdmissionStore({
          databaseName: prefix + name,
        }),
        observations: new H.WalletNetworkObservations({
          databaseName: "RtdWallet AuthorizationObservations:test:" + name,
        }),
      });
      const authorize = (s, stores, f, extra = {}) =>
        H.assertTransactionNetworkIdentity(s, {
          ...stores,
          fetch: f.fetch,
          ...extra,
        });
      const wrong = H.toBase58(new Uint8Array(32).fill(9));
      const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const hookPut = async (name, predicate, run) => {
        const original = IDBObjectStore.prototype.put;
        IDBObjectStore.prototype.put = function (value, ...args) {
          const request = original.call(this, value, ...args);
          if (this.transaction.db.name === prefix + name && predicate(value))
            request.addEventListener("success", () => this.transaction.abort());
          return request;
        };
        try {
          await run();
        } finally {
          IDBObjectStore.prototype.put = original;
        }
      };
      try {
        {
          const db = stores("healthy"),
            f = fixture(),
            s = session(),
            answer = await authorize(s, db, f);
          const row = await db.admission.capture(p);
          check(
            answer.state === "identity-verified" &&
              f.requests.length === 3 &&
              row.pending.length === 0 &&
              row.faults.length === 0 &&
              !Object.hasOwn(answer, "ready"),
            "healthy native identity admission",
          );
          results.push(
            "真实SDK三角色帧＋两个native库：strict占位／原高度／完成／末检后身份结果，不生成ready",
          );
        }
        {
          const db = stores("transient"),
            f = fixture((r) => (r === "fullnode" ? { unavailable: true } : {}));
          await reject(() => authorize(session(), db, f), "UNAVAILABLE");
          const row = await db.admission.capture(p);
          check(
            row.pending.length === 0 && row.faults.length === 0,
            "settled transient fabricated fault",
          );
          const good = fixture();
          check(
            (await authorize(session(), db, good)).state ===
              "identity-verified" && good.requests.length === 3,
            "fresh transient retry",
          );
          results.push(
            "完整返回的Fullnode暂不可用不伪造Fault，完成占位仍拒绝本次，下一次重新探测",
          );
        }
        {
          const db = stores("abort-begin"),
            f = fixture();
          await hookPut(
            "abort-begin",
            (v) => v.pending.length === 1,
            async () =>
              await reject(() => authorize(session(), db, f), "unavailable"),
          );
          check(
            f.requests.length === 0 &&
              (await db.admission.capture(p)) === undefined,
            "begin abort reached SDK",
          );
          results.push("实际守卫native begin的put成功后abort：SDK身份IO为0");
        }
        {
          const db = stores("abort-positive"),
            f = fixture();
          await hookPut(
            "abort-positive",
            (v) => v.pending.length === 0,
            async () =>
              await reject(() => authorize(session(), db, f), "unavailable"),
          );
          const row = await db.admission.capture(p);
          check(
            row.pending.length === 1 && row.faults.length === 0,
            "positive abort cleared pending",
          );
          const good = fixture();
          await reject(
            () => authorize(session(), stores("abort-positive"), good),
            "reviewing",
          );
          check(
            good.requests.length === 0,
            "new observer bypassed positive abort",
          );
          results.push(
            "正常完成native abort仅尝试一次，保留占位，新实例0探测／不授权",
          );
        }
        {
          const db = stores("abort-negative"),
            f = fixture((r) => (r === "graphql" ? { digest: wrong } : {}));
          await hookPut(
            "abort-negative",
            (v) => v.faults.length > 0,
            async () =>
              await reject(() => authorize(session(), db, f), "unavailable"),
          );
          const row = await db.admission.capture(p);
          check(
            row.pending.length === 1 && row.faults.length === 0,
            "negative abort forgot reservation",
          );
          const good = fixture();
          await reject(
            () => authorize(session(), stores("abort-negative"), good),
            "reviewing",
          );
          check(
            good.requests.length === 0,
            "new observer bypassed negative abort",
          );
          results.push(
            "实际canonical错链的native完成abort保留占位，新session／实例不能成功洗掉",
          );
        }
        {
          const db = stores("cancel"),
            f = fixture();
          let release;
          const wait = new Promise((resolve) => (release = resolve));
          let entered = 0;
          const fetch = async (...args) => {
            entered++;
            await wait;
            return f.fetch(...args);
          };
          await reject(
            () => authorize(session(), db, f, { fetch, timeoutMs: 100 }),
            "TimeoutError",
          );
          check(entered > 0, "cancel probe never started");
          let row = await db.admission.capture(p);
          check(
            row.pending.length === 1 && row.faults.length === 0,
            "cancellation invented completion",
          );
          const good = fixture();
          await reject(
            () => authorize(session(), stores("cancel"), good),
            "reviewing",
          );
          check(good.requests.length === 0, "cancel pending bypassed");
          release();
          await sleep(150);
          row = await db.admission.capture(p);
          check(
            row.pending.length === 1 && row.faults.length === 0,
            "late response cleared pending",
          );
          results.push(
            "实际SDK超时早于忽略abort叶子settle：native占位保持，迟到帧不解锁",
          );
        }
        {
          const db = stores("account-fault"),
            area = { kind: "identity", role: "accountHistory" },
            ticket = await db.admission.begin(p, [area]);
          await db.admission.complete(p, ticket, [
            { ...area, reason: "chain-mismatch" },
          ]);
          const f = fixture();
          await reject(() => authorize(session(), db, f), "quarantined");
          check(
            f.requests.length === 0,
            "account negative bypassed three-role guard",
          );
          results.push(
            "独立accountHistory身份负面阻止三入口授权，未伪造第四入口bookend",
          );
        }
        {
          const db = stores("domain"),
            area = { kind: "graphql-domain", domain: "assets" },
            ticket = await db.admission.begin(p, [area]);
          await db.admission.complete(p, ticket, [
            { ...area, reason: "schema" },
          ]);
          const f = fixture();
          check(
            (await authorize(session(), db, f)).state === "identity-verified" &&
              (await db.admission.capture(p)).faults.length === 1,
            "domain fault became identity fault",
          );
          results.push(
            "领域schema负面保留而不伪造identity错误；领域业务门槛仍另行接入",
          );
        }
        {
          const db = stores("height-reset");
          await authorize(session(), db, fixture());
          await reject(
            () =>
              authorize(
                session(),
                db,
                fixture((r) => (r === "fullnode" ? { height: 99n } : {})),
              ),
            "TransactionNetworkResetError",
          );
          const changed = H.validateNetworkProfile({
              ...H.profileFixture(),
              revision: p.revision + 1,
            }),
            good = fixture();
          await reject(
            () => authorize(session(changed), db, good),
            "TransactionNetworkResetError",
          );
          check(
            good.requests.length === 0,
            "revision bypassed native height reset",
          );
          const next = H.validateNetworkProfile({
            ...H.profileFixture(),
            generation: "dev-2",
          });
          check(
            (await authorize(session(next), db, fixture())).state ===
              "identity-verified",
            "new generation fixture rejected",
          );
          results.push(
            "旧native高度reset持续；仅改revision仍0探测拒绝，独立新generation夹具保持原合同",
          );
        }
        {
          const db = stores("closed-negative"),
            s = session(),
            f = fixture((r) => (r === "graphql" ? { digest: wrong } : {}));
          let release;
          const wait = new Promise((resolve) => (release = resolve));
          let entered = false;
          const admission = {
            assertClear: db.admission.assertClear.bind(db.admission),
            begin: db.admission.begin.bind(db.admission),
            complete: async (...args) => {
              entered = true;
              await wait;
              return db.admission.complete(...args);
            },
          };
          const result = authorize(s, { ...db, admission }, f).then(
            () => {
              throw new Error("closed identity published");
            },
            (e) => e.name,
          );
          for (let i = 0; !entered && i < 200; i++) await sleep(10);
          check(entered, "known negative completion never entered");
          s.close();
          release();
          check(
            (await result) === "StaleWalletSessionError",
            "closed session wrong result",
          );
          const row = await db.admission.capture(p);
          check(
            row.faults.length === 1 && row.pending.length === 0,
            "close masked known negative write",
          );
          results.push(
            "错链落盘等待期间关闭session：native负面先保存，当前结果仍撤销",
          );
        }
        {
          const bad = fixture((r) =>
            r === "graphql" ? { digest: wrong } : {},
          );
          await reject(
            () =>
              H.assertTransactionNetworkIdentity(session(), {
                fetch: bad.fetch,
              }),
            "chain-mismatch",
          );
          const good = fixture();
          await reject(
            () =>
              H.assertTransactionNetworkIdentity(session(), {
                fetch: good.fetch,
              }),
            "quarantined",
          );
          const row = await new H.WalletNetworkAdmissionStore().capture(p);
          check(
            row.faults.length === 1 &&
              row.pending.length === 0 &&
              good.requests.length === 0,
            "default production store not wired",
          );
          results.push(
            "未注入admission的真实production默认守卫持久隔离；新session正常帧0调用",
          );
        }
        return {
          tests: results,
          fixtureTransportRequests: fixtures.reduce(
            (n, f) => n + f.requests.length,
            0,
          ),
        };
      } finally {
        sessions.forEach((s) => s.close());
      }
    });
    tests.push(...cases.tests);
    const readDefault = async (page) =>
      page.evaluate(async () => {
        const H = AuthorizationHarness,
          p = H.validateNetworkProfile(H.profileFixture()),
          s = new H.WalletReadSession(p),
          f = H.networkIdentityFixture();
        let reason;
        try {
          await H.assertTransactionNetworkIdentity(s, { fetch: f.fetch });
        } catch (e) {
          reason = e.reason;
        } finally {
          s.close();
        }
        const row = await new H.WalletNetworkAdmissionStore().capture(p);
        return {
          reason,
          requests: f.requests.length,
          faults: row.faults.length,
          pending: row.pending.length,
        };
      });
    const second = await context.newPage();
    await second.goto(origin);
    const cross = await readDefault(second);
    assert.deepEqual(cross, {
      reason: "quarantined",
      requests: 0,
      faults: 1,
      pending: 0,
    });
    tests.push("第二页独立默认守卫重读已存负面，0SDK探测");
    const cdp = await context.newCDPSession(page);
    let versions = [];
    cdp.on(
      "ServiceWorker.workerVersionUpdated",
      (e) => (versions = e.versions),
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
          const channel = new MessageChannel(),
            timer = setTimeout(
              () => reject(new Error("controlled worker timeout")),
              10000,
            );
          channel.port1.onmessage = (e) => {
            clearTimeout(timer);
            resolve(e.data);
          };
          reg.active.postMessage("read", [channel.port2]);
        });
      });
    const before = await send();
    assert.deepEqual(
      { ...before, instance: null },
      { ...cross, instance: null },
    );
    const version = versions.findLast(
      (v) =>
        v.scriptURL === `${origin}/worker.js` && v.runningStatus === "running",
    );
    assert(version, "controlled worker missing");
    await cdp.send("ServiceWorker.stopWorker", {
      versionId: version.versionId,
    });
    const after = await send();
    assert.notEqual(before.instance, after.instance);
    assert.deepEqual(
      { ...after, instance: null },
      { ...before, instance: null },
    );
    tests.push("真实service worker停启后默认授权守卫仍重读原负面并0探测拒绝");
    await cdp.detach();
    const browserVersion = await page.evaluate(() => navigator.userAgent);
    await context.close();
    context = await launch();
    page = await context.newPage();
    await page.goto(origin);
    assert.deepEqual(await readDefault(page), cross);
    tests.push(
      "整个Chromium正常关闭重启：默认生产守卫持续拒绝，不依赖旧WeakMap／client",
    );
    assert.equal(pageErrors.length, 0, "native async fixture assertion failed");
    assert.equal(externalAttempts.length, 0, "unexpected external request");
    console.log(
      JSON.stringify(
        {
          passed: true,
          count: tests.length,
          tests,
          browserVersion,
          fixtureTransportRequests: cases.fixtureTransportRequests,
          pageErrorCount: pageErrors.length,
          externalRequestAttempts: externalAttempts.length,
          chainRequests: 0,
          simulations: 0,
          signingCalls: 0,
          executions: 0,
          scope:
            "Actual transaction identity guard and SDK with controlled public frames, native independent admission/height stores, abort/cancellation and default instance/window/worker/graceful browser restart; no real extension UI, chain, journal or final authorization-race/physical durability/trial acceptance",
        },
        null,
        2,
      ),
    );
    failed = false;
  } finally {
    if (context) await context.close().catch(() => {});
    if (server?.listening)
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

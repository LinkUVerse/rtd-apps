#!/usr/bin/env node
// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Production store in isolated native Chromium. No wallet profile, chain or signing.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { chromium } = require("@playwright/test");
(async () => {
  const temporary = fs.mkdtempSync(
    path.join(os.tmpdir(), "rtd-network-admission-"),
  );
  const bundle = path.join(temporary, "bundle.js");
  let context;
  let server;
  let failed = true;
  const tests = [];
  const seenRequests = [];
  const pageErrors = [];
  const externalAttempts = [];
  try {
    execFileSync(
      "pnpm",
      [
        "exec",
        "esbuild",
        "tests/unit/rpc/network-admission-browser-harness.ts",
        "--bundle",
        "--platform=browser",
        "--format=iife",
        "--global-name=AdmissionHarness",
        `--outfile=${bundle}`,
      ],
      { cwd: path.resolve(__dirname, ".."), stdio: "pipe" },
    );
    const worker = `importScripts('/bundle.js');const instance=crypto.randomUUID();self.addEventListener('install',e=>e.waitUntil(self.skipWaiting()));self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));self.addEventListener('message',e=>e.waitUntil((async()=>{const H=AdmissionHarness,p=H.validateNetworkProfile(H.profileFixture()),s=new H.WalletNetworkAdmissionStore({databaseName:'RtdWallet NetworkAdmission:test:restart'});const row=await s.capture(p);let rejected=false;try{await s.assertClear(p,[{kind:'graphql-domain',domain:'balances'}])}catch(e){rejected=e.reason==='quarantined'}e.ports[0].postMessage({instance,rejected,faults:row.faults.length,pending:row.pending.length});})()));`;
    server = http.createServer((req, res) => {
      seenRequests.push(req.url);
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
      ctx.on("page", (opened) =>
        opened.on("pageerror", (error) => pageErrors.push(error.name)),
      );
      ctx.on("request", (request) => {
        if (new URL(request.url()).origin !== origin)
          externalAttempts.push(true);
      });
      await ctx.route("**/*", (route) =>
        new URL(route.request().url()).origin === origin
          ? route.continue()
          : route.abort(),
      );
      return ctx;
    };
    context = await launch();
    let page = await context.newPage();
    await page.goto(origin);
    tests.push(
      ...(await page.evaluate(async () => {
        const H = AdmissionHarness;
        const p = H.validateNetworkProfile(H.profileFixture());
        const binding = H.networkBindingKey(p);
        const prefix = "RtdWallet NetworkAdmission:test:";
        const balance = { kind: "graphql-domain", domain: "balances" };
        const assets = { kind: "graphql-domain", domain: "assets" };
        const display = { kind: "move-group", group: "display" };
        const identity = { kind: "identity", role: "graphql" };
        const schema = { ...assets, reason: "schema" };
        const wrong = { ...identity, reason: "chain-mismatch" };
        const results = [];
        const check = (ok, label) => {
          if (!ok) throw new Error(label);
        };
        const reject = async (run, reason) => {
          try {
            await run();
          } catch (e) {
            check(e.reason === reason, "unexpected sanitized rejection: expected=" + reason + "; actual=" + String(e.reason));
            return;
          }
          throw new Error("expected rejection absent");
        };
        const s = (name, options = {}) =>
          new H.WalletNetworkAdmissionStore({
            ...options,
            databaseName: prefix + name,
          });
        const raw = (name) => H.rawRow(prefix + name, binding);
        const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        const delayed = (request, property, ms) => {
          Object.defineProperty(request, property, {
            configurable: true,
            set(handler) {
              request.addEventListener(property.slice(2), (e) =>
                setTimeout(() => handler.call(request, e), ms),
              );
            },
          });
        };
        const hookedPut = async (name, hook, run) => {
          const original = IDBObjectStore.prototype.put;
          IDBObjectStore.prototype.put = function (...args) {
            const request = original.apply(this, args);
            if (this.transaction.db.name === prefix + name)
              hook(request, this.transaction);
            return request;
          };
          try {
            await run();
          } finally {
            IDBObjectStore.prototype.put = original;
          }
        };
        {
          const name = "commit-order",
            store = s(name);
          let resolved = false,
            successes = 0,
            completes = 0,
            syntheticIO = 0;
          const originalTransaction = IDBDatabase.prototype.transaction;
          IDBDatabase.prototype.transaction = function (...args) {
            const tx = originalTransaction.apply(this, args);
            if (this.name === prefix + name && args[1] === "readwrite")
              tx.addEventListener("complete", () => {
                completes++;
                check(!resolved, "promise before native complete");
              });
            return tx;
          };
          try {
            await hookedPut(
              name,
              (request, tx) =>
                request.addEventListener("success", () => {
                  successes++;
                  check(
                    !resolved && (successes !== 1 || syntheticIO === 0),
                    "put success published too early",
                  );
                  check(
                    tx.durability === "strict",
                    "write durability not strict",
                  );
                }),
              async () => {
                const ticket = await store.begin(p, [balance]);
                resolved = true;
                syntheticIO++;
                check(
                  Object.isFrozen(ticket) &&
                    Object.isFrozen(ticket.areas) &&
                    Object.isFrozen(ticket.areas[0]),
                  "mutable ticket",
                );
                check(
                  (await raw(name)).pending.length === 1,
                  "begin missing committed pending",
                );
                await reject(
                  () => s(name).assertClear(p, [balance]),
                  "reviewing",
                );
                resolved = false;
                await store.complete(p, ticket, []);
                resolved = true;
              },
            );
          } finally {
            IDBDatabase.prototype.transaction = originalTransaction;
          }
          check(
            successes === 2 && completes === 2 && syntheticIO === 1,
            "native commit counts",
          );
          results.push(
            "native strict占位先于合成观察IO；put success不发布，transaction complete后返回冻结ticket",
          );
        }
        {
          const name = "abort-begin",
            store = s(name);
          let observed = 0;
          await hookedPut(
            name,
            (request, tx) =>
              request.addEventListener("success", () => {
                observed++;
                tx.abort();
              }),
            async () =>
              await reject(() => store.begin(p, [assets]), "unavailable"),
          );
          check(
            observed === 1 && (await raw(name)) === undefined,
            "aborted begin wrote pending",
          );
          results.push(
            "begin的native put成功后abort：不返回ticket，原行仍不存在",
          );
        }
        {
          const name = "decision",
            store = s(name),
            ticket = await store.begin(p, [assets]);
          await hookedPut(
            name,
            (request, tx) =>
              request.addEventListener("success", () => tx.abort()),
            async () =>
              await reject(
                () => store.complete(p, ticket, [schema]),
                "unavailable",
              ),
          );
          let row = await raw(name);
          check(
            row.pending.length === 1 && row.faults.length === 0,
            "aborted completion changed row",
          );
          await reject(() => store.complete(p, ticket, []), "stale");
          await store.complete(p, ticket, [schema]);
          row = await raw(name);
          check(
            row.pending.length === 0 && row.faults.length === 1,
            "same negative retry missing",
          );
          await reject(() => store.complete(p, ticket, [schema]), "stale");
          results.push(
            "完成abort保留占位；负面首次决定锁定、空决定拒绝、相同负面重试提交、重复完成拒绝",
          );
        }
        {
          const name = "ownership",
            store = s(name),
            ticket = await store.begin(p, [balance]);
          await reject(
            () => store.complete(p, structuredClone(ticket), []),
            "stale",
          );
          await reject(() => s(name).complete(p, ticket, []), "stale");
          const other = H.validateNetworkProfile({
            ...H.profileFixture(),
            revision: p.revision + 1,
          });
          await reject(() => store.complete(other, ticket, []), "stale");
          check(
            (await raw(name)).pending.length === 1,
            "foreign completion cleared row",
          );
          await store.complete(p, ticket, []);
          results.push("复制ticket、其它实例和其它binding不具原观察所有权");
        }
        {
          const name = "mutation",
            options = { databaseName: prefix + name };
          const store = new H.WalletNetworkAdmissionStore(options);
          options.databaseName = prefix + "changed-options";
          const mutable = structuredClone(p),
            areas = [{ ...assets }];
          const operation = store.begin(mutable, areas);
          mutable.revision++;
          areas[0].domain = "balances";
          const ticket = await operation;
          check(
            ticket.areas[0].domain === "assets" &&
              (await raw(name)).pending.length === 1,
            "begin input mutation changed decision",
          );
          const faults = [{ ...schema }],
            completionProfile = structuredClone(p);
          const done = store.complete(completionProfile, ticket, faults);
          faults[0].domain = "balances";
          completionProfile.revision++;
          const row = await done;
          check(
            row.faults[0].domain === "assets",
            "completion mutation changed decision",
          );
          await store.assertClear(p, [balance]);
          const targets = [{ ...assets }],
            clear = store.assertClear(p, targets);
          targets[0].domain = "balances";
          await reject(() => clear, "quarantined");
          results.push(
            "options、profile、areas、完成Fault与assertClear输入均在await前复制",
          );
        }
        {
          const name = "concurrent",
            a = s(name),
            b = s(name);
          const both = await Promise.allSettled([
            a.begin(p, [balance]),
            b.begin(p, [balance]),
          ]);
          check(
            both.filter((r) => r.status === "fulfilled").length === 1,
            "overlapping observers both admitted",
          );
          const win =
            both[0].status === "fulfilled"
              ? [a, both[0].value]
              : [b, both[1].value];
          check(
            both.find((r) => r.status === "rejected").reason.reason ===
              "reviewing",
            "concurrent loser wrong failure",
          );
          await win[0].complete(p, win[1], []);
          results.push("两个实例同area并发reserve：native事务只准入一个原观察");
        }
        {
          const name = "merge",
            a = s(name),
            b = s(name);
          const [ta, tb] = await Promise.all([
            a.begin(p, [assets]),
            b.begin(p, [display]),
          ]);
          await Promise.all([
            a.complete(p, ta, [schema]),
            b.complete(p, tb, [{ ...display, reason: "abi" }]),
          ]);
          const row = await raw(name);
          check(
            row.faults.length === 2 && row.pending.length === 0,
            "concurrent lost fault",
          );
          await a.assertClear(p, [balance]);
          await reject(() => b.assertClear(p, [assets]), "quarantined");
          await reject(() => a.assertClear(p, [display]), "quarantined");
          results.push(
            "独立area并发完成合并两个负面；assets／Display隔离不阻止独立balances",
          );
        }
        {
          const name = "late-negative",
            a = s(name),
            b = s(name);
          const ta = await a.begin(p, [balance]),
            tb = await b.begin(p, [identity]);
          await reject(() => a.assertClear(p, [assets]), "reviewing");
          await b.complete(p, tb, [wrong]);
          await a.complete(p, ta, []);
          check(
            (await raw(name)).faults.length === 1,
            "old positive removed identity negative",
          );
          await reject(() => a.assertClear(p, [balance]), "quarantined");
          const changed = H.validateNetworkProfile({
            ...H.profileFixture(),
            revision: p.revision + 1,
          });
          check(
            (await a.capture(changed)) === undefined,
            "changed binding inherited positive/negative row",
          );
          await reject(() => a.assertClear(p), "quarantined");
          results.push(
            "晚到identity负面全binding阻止；旧正面不擦除，新binding不删除旧行",
          );
        }
        {
          const name = "scope",
            store = s(name),
            ticket = await store.begin(p, [balance]);
          await reject(() => store.complete(p, ticket, [schema]), "corrupt");
          await store.complete(p, ticket, []);
          results.push("超出ticket area的Fault拒绝且不锁定无效完成决定");
        }
        {
          const name = "simultaneous-complete",
            store = s(name),
            ticket = await store.begin(p, [assets]);
          const first = store.complete(p, ticket, [schema]);
          await reject(() => store.complete(p, ticket, [schema]), "stale");
          await first;
          results.push("同原对象同时complete拒绝第二个，只有一个提交");
        }
        for (const [name, version, options] of [
          ["future-version", 3, {}],
          ["wrong-keypath", 1, { keyPath: "scope" }],
          ["extra-index", 1, { index: true }],
          ["extra-store", 1, { extraStore: true }],
          ["auto-increment", 1, { autoIncrement: true }],
        ]) {
          const db = await H.rawDatabase(prefix + name, version, options);
          db.close();
          await reject(() => s(name).capture(p), "corrupt");
          results.push(`native库精确合同拒绝：${name}`);
        }
        {
          const name = "corrupt-row";
          await H.rawRow(prefix + name, binding, (store) =>
            store.put({
              schemaVersion: 1,
              bindingKey: binding,
              faults: [],
              pending: [],
              unexpected: true,
            }),
          );
          await reject(() => s(name).capture(p), "corrupt");
          await reject(() => s(name).begin(p, [balance]), "corrupt");
          results.push("native已存未知字段行拒绝读／观察，不自动修复或覆盖");
        }
        {
          const name = "relaxed",
            original = IDBDatabase.prototype.transaction;
          IDBDatabase.prototype.transaction = function (stores, mode, options) {
            return original.call(
              this,
              stores,
              mode,
              this.name === prefix + name && mode === "readwrite"
                ? { durability: "relaxed" }
                : options,
            );
          };
          try {
            await reject(() => s(name).begin(p, [balance]), "unavailable");
          } finally {
            IDBDatabase.prototype.transaction = original;
          }
          check((await raw(name)) === undefined, "downgraded strict accepted");
          results.push("native属性被降为relaxed时拒绝占位");
        }
        {
          const name = "blocked",
            db = await H.rawDatabase(prefix + name);
          db.onversionchange = () => {};
          const upgrade = indexedDB.open(prefix + name, 2);
          upgrade.onerror = () => {};
          await new Promise((resolve) => (upgrade.onblocked = resolve));
          await reject(
            () => s(name, { timeoutMs: 80 }).capture(p),
            "unavailable",
          );
          db.close();
          await new Promise((resolve) => {
            upgrade.onsuccess = () => {
              upgrade.result.close();
              resolve();
            };
            upgrade.onerror = resolve;
          });
          await sleep(40);
          results.push(
            "真实待升级连接阻塞open：期限内拒绝，释放后迟到结果不准入",
          );
        }
        {
          const name = "late-open",
            db = await H.rawDatabase(prefix + name);
          db.close();
          let lateClosed = 0;
          const close = IDBDatabase.prototype.close;
          IDBDatabase.prototype.close = function () {
            if (this.name === prefix + name) lateClosed++;
            return close.call(this);
          };
          const factory = {
            open(name, version) {
              const request = indexedDB.open(name, version);
              delayed(request, "onsuccess", 180);
              return request;
            },
          };
          try {
            await reject(
              () => s(name, { indexedDB: factory, timeoutMs: 60 }).capture(p),
              "unavailable",
            );
            await sleep(200);
            check(lateClosed === 1, "late open connection not closed");
          } finally {
            IDBDatabase.prototype.close = close;
          }
          results.push("native open成功回调迟到：立即超时拒绝并关闭迟到db");
        }
        {
          const name = "late-get",
            original = IDBObjectStore.prototype.get,
            txOriginal = IDBDatabase.prototype.transaction;
          IDBObjectStore.prototype.get = function (...args) {
            const request = original.apply(this, args);
            if (this.transaction.db.name === prefix + name)
              delayed(request, "onsuccess", 180);
            return request;
          };
          IDBDatabase.prototype.transaction = function (...args) {
            const tx = txOriginal.apply(this, args);
            if (this.name === prefix + name) delayed(tx, "oncomplete", 180);
            return tx;
          };
          try {
            await reject(
              () => s(name, { timeoutMs: 60 }).begin(p, [balance]),
              "unavailable",
            );
            await sleep(210);
          } finally {
            IDBObjectStore.prototype.get = original;
            IDBDatabase.prototype.transaction = txOriginal;
          }
          check(
            (await raw(name)) === undefined,
            "late get wrote/published pending",
          );
          results.push("native get／complete回调迟到：未转换／写入／返回成功");
        }
        {
          const name = "one-deadline",
            db = await H.rawDatabase(prefix + name);
          db.close();
          const factory = {
            open(name, version) {
              const r = indexedDB.open(name, version);
              delayed(r, "onsuccess", 150);
              return r;
            },
          };
          const original = IDBDatabase.prototype.transaction;
          IDBDatabase.prototype.transaction = function (...args) {
            const tx = original.apply(this, args);
            if (this.name === prefix + name) delayed(tx, "oncomplete", 150);
            return tx;
          };
          let elapsed;
          try {
            const started = performance.now();
            await reject(
              () =>
                s(name, { indexedDB: factory, timeoutMs: 250 }).begin(p, [
                  balance,
                ]),
              "unavailable",
            );
            elapsed = performance.now() - started;
            await sleep(180);
          } finally {
            IDBDatabase.prototype.transaction = original;
          }
          check(
            elapsed >= 230 && elapsed < 295,
            "open and transaction did not share one deadline",
          );
          check(
            (await raw(name)).pending.length === 1,
            "native committed pending absent after late complete",
          );
          await reject(() => s(name).assertClear(p, [balance]), "reviewing");
          results.push(
            "open＋事务共用250ms期限，迟到complete不发布ticket；已提交占位仍保守阻止",
          );
        }
        {
          const name = "request-error",
            store = s(name),
            ticket = await store.begin(p, [assets]);
          const original = IDBObjectStore.prototype.put;
          IDBObjectStore.prototype.put = function (value) {
            return this.transaction.db.name === prefix + name
              ? this.add(value)
              : original.call(this, value);
          };
          try {
            await reject(
              () => store.complete(p, ticket, [schema]),
              "unavailable",
            );
          } finally {
            IDBObjectStore.prototype.put = original;
          }
          check(
            (await raw(name)).pending.length === 1,
            "native ConstraintError cleared pending",
          );
          await reject(() => store.complete(p, ticket, []), "stale");
          await store.complete(p, ticket, [schema]);
          results.push(
            "native ConstraintError立即拒绝并保留负面决定／原占位，原决定可重试",
          );
        }
        {
          const name = "restart",
            store = s(name),
            ta = await store.begin(p, [assets]),
            tb = await store.begin(p, [balance]);
          await store.complete(p, ta, [schema]);
          const ti = await store.begin(p, [identity]);
          await store.complete(p, ti, [wrong]);
          globalThis.restartStore = store;
          globalThis.restartTicket = tb;
          const row = await store.capture(p);
          check(
            row.faults.length === 2 && row.pending.length === 1,
            "restart seed wrong",
          );
          results.push(
            "重启夹具通过本生产store提交两个负面及一个未完成观察，原ticket只保存在旧页内存",
          );
        }
        {
          const a = s("final-gap"),
            b = s("final-gap");
          let legacy = 0,
            started = 0;
          await a.assertClear(p, [assets]);
          const ticket = await b.begin(p, [assets]);
          await b.complete(p, ticket, [schema]);
          legacy++;
          check(legacy === 1, "legacy check no longer demonstrates its gap");
          await reject(
            () =>
              a.runIfClear(p, [assets], () => {
                started++;
                return Promise.resolve("action");
              }),
            "quarantined",
          );
          check(
            started === 0 && (await a.capture(p)).faults.length === 1,
            "final gate leaked or cleared the committed fault",
          );
          results.push("旧检查后可出现Fault；原生最终门槛零动作并保留负面");
        }
        {
          const a = s("final-pending"),
            b = s("final-pending");
          let started = 0;
          const ticket = await b.begin(p, [assets]);
          await reject(
            () =>
              a.runIfClear(p, [assets], () => {
                started++;
                return Promise.resolve();
              }),
            "reviewing",
          );
          check(
            started === 0 && (await a.capture(p)).pending.length === 1,
            "final gate removed observer pending",
          );
          await b.complete(p, ticket, []);
          check(
            (await a.runIfClear(p, [assets], () => {
              started++;
              return Promise.resolve(7);
            })) === 7 && started === 1,
            "completed observation did not admit exactly once",
          );
          results.push("pending阻止最终动作；原观察完成后只启动一次");
        }
        {
          const a = s("final-async"),
            b = s("final-async");
          let started = 0,
            release;
          const held = new Promise((resolve) => {
            release = resolve;
          });
          const action = a.runIfClear(p, [assets], () => {
            started++;
            return held;
          });
          const until = Date.now() + 2000;
          while (started === 0) {
            check(Date.now() < until, "final action did not start");
            await sleep(5);
          }
          const ticket = await b.begin(p, [assets]);
          await b.complete(p, ticket, [schema]);
          check(
            (await b.capture(p)).faults.length === 1,
            "async action blocked committing a fresh fault",
          );
          release("signature-fixture");
          check(
            (await action) === "signature-fixture",
            "first action result changed",
          );
          let released = 0;
          await reject(
            () =>
              a.runIfClear(p, [assets], () => {
                released++;
                return Promise.resolve();
              }),
            "quarantined",
          );
          check(
            released === 0,
            "asynchronous result released through a committed fault",
          );
          results.push(
            "异步动作不持有IDB事务；期间Fault仍可提交并阻止另一次结果交付",
          );
        }
        {
          const a = s("final-errors"),
            original = new Error("local action failed");
          let started = 0;
          for (const asyncFailure of [false, true]) {
            let caught;
            try {
              await a.runIfClear(p, [assets], () => {
                started++;
                if (!asyncFailure) throw original;
                return Promise.reject(original);
              });
            } catch (e) {
              caught = e;
            }
            check(
              caught === original,
              "action error relabelled as storage failure",
            );
          }
          check(
            started === 2 && (await a.capture(p)) === undefined,
            "action was repeated or fault invented",
          );
          results.push("同步／异步动作错误保持原对象且不重复动作");
        }
        {
          const a = s("final-open-failure", {
            indexedDB: {
              open() {
                throw new Error("private fixture error");
              },
            },
          });
          let started = 0;
          await reject(
            () =>
              a.runIfClear(p, [assets], () => {
                started++;
                return Promise.resolve();
              }),
            "unavailable",
          );
          check(started === 0, "unavailable storage started action");
          results.push("最终门槛原生存储不可用时零动作");
        }
        {
          const name = "final-queued",
            a = s(name),
            db = await H.rawDatabase(prefix + name);
          let started = 0;
          const tx = db.transaction("admission-v1", "readwrite", {
            durability: "strict",
          });
          tx.objectStore("admission-v1").put({
            schemaVersion: 1,
            bindingKey: binding,
            faults: [schema],
            pending: [],
          });
          const committed = new Promise((resolve, reject) => {
            tx.oncomplete = resolve;
            tx.onabort = () => reject(new Error("writer aborted"));
          });
          const action = a.runIfClear(p, [assets], () => {
            started++;
            return Promise.resolve();
          });
          await reject(() => action, "quarantined");
          await committed;
          db.close();
          check(
            started === 0 && (await a.capture(p)).faults.length === 1,
            "queued native write was overtaken by action",
          );
          results.push("先排队的原生write事务不会被最终读取／动作越过");
        }
        {
          const name = "final-abort-after-start",
            a = s(name);
          let started = 0;
          const original = IDBObjectStore.prototype.get;
          IDBObjectStore.prototype.get = function (...args) {
            const request = original.apply(this, args),
              tx = this.transaction;
            if (tx.db.name === prefix + name)
              Object.defineProperty(request, "onsuccess", {
                set(handler) {
                  request.addEventListener("success", (event) => {
                    handler.call(request, event);
                    tx.abort();
                  });
                },
              });
            return request;
          };
          try {
            await reject(
              () =>
                a.runIfClear(p, [assets], () => {
                  started++;
                  return Promise.reject(
                    new Error("discarded action rejection"),
                  );
                }),
              "unavailable",
            );
          } finally {
            IDBObjectStore.prototype.get = original;
          }
          check(
            started === 1 && (await a.capture(p)) === undefined,
            "abort repeated action or invented stored state",
          );
          await sleep(20);
          results.push(
            "动作开始后原生读取abort拒绝交付；不重复动作且丢弃Promise拒绝被接住",
          );
        }
        return results;
      })),
    );
    const second = await context.newPage();
    await second.goto(origin);
    const cross = await second.evaluate(async () => {
      const H = AdmissionHarness,
        p = H.validateNetworkProfile(H.profileFixture()),
        s = new H.WalletNetworkAdmissionStore({
          databaseName: "RtdWallet NetworkAdmission:test:restart",
        });
      const row = await s.capture(p);
      let rejected = false;
      try {
        await s.assertClear(p, [
          { kind: "graphql-domain", domain: "balances" },
        ]);
      } catch (e) {
        rejected = e.reason === "quarantined";
      }
      let cannotComplete = false;
      try {
        await s.complete(p, row.pending[0], []);
      } catch (e) {
        cannotComplete = e.reason === "stale";
      }
      return {
        faults: row.faults.length,
        pending: row.pending.length,
        rejected,
        cannotComplete,
      };
    });
    assert.deepEqual(cross, {
      faults: 2,
      pending: 1,
      rejected: true,
      cannotComplete: true,
    });
    tests.push("独立第二页读到已提交负面／占位；读取ticket不能获得原所有权");
    const cdp = await context.newCDPSession(page);
    let versions = [];
    cdp.on("ServiceWorker.workerVersionUpdated", (event) => {
      versions = event.versions;
    });
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
            () => reject(new Error("controlled worker timeout")),
            10000,
          );
          c.port1.onmessage = (e) => {
            clearTimeout(timer);
            resolve(e.data);
          };
          reg.active.postMessage("read", [c.port2]);
        });
      });
    const before = await send();
    assert.deepEqual(
      { ...before, instance: null },
      { instance: null, rejected: true, faults: 2, pending: 1 },
    );
    const version = versions.findLast(
      (v) =>
        v.scriptURL === `${origin}/worker.js` && v.runningStatus === "running",
    );
    assert(version, "running controlled service worker missing");
    await cdp.send("ServiceWorker.stopWorker", {
      versionId: version.versionId,
    });
    const after = await send();
    assert.notEqual(before.instance, after.instance);
    assert.deepEqual(
      { ...after, instance: null },
      { ...before, instance: null },
    );
    tests.push("实际service worker停止／重启：新实例仍读取相同负面／占位");
    await cdp.detach();
    const browserVersion = await page.evaluate(() => navigator.userAgent);
    await context.close();
    context = await launch();
    page = await context.newPage();
    await page.goto(origin);
    const reboot = await page.evaluate(async () => {
      const H = AdmissionHarness,
        p = H.validateNetworkProfile(H.profileFixture()),
        s = new H.WalletNetworkAdmissionStore({
          databaseName: "RtdWallet NetworkAdmission:test:restart",
        });
      const row = await s.capture(p);
      let rejected = false,
        cannotComplete = false;
      try {
        await s.assertClear(p);
      } catch (e) {
        rejected = e.reason === "quarantined";
      }
      try {
        await s.complete(p, row.pending[0], []);
      } catch (e) {
        cannotComplete = e.reason === "stale";
      }
      return {
        faults: row.faults.length,
        pending: row.pending.length,
        rejected,
        cannotComplete,
      };
    });
    assert.deepEqual(reboot, cross);
    tests.push(
      "整个Chromium正常关闭后原profile重启：负面／占位保留、原对象所有权丢失",
    );
    assert(
      seenRequests.every((url) =>
        ["/", "/bundle.js", "/worker.js", "/favicon.ico"].includes(url),
      ),
      "unexpected local request",
    );
    assert.equal(pageErrors.length, 0, "native fixture event assertion failed");
    assert.equal(externalAttempts.length, 0, "external request attempted");
    console.log(
      JSON.stringify(
        {
          passed: true,
          count: tests.length,
          tests,
          browserVersion,
          pageErrorCount: pageErrors.length,
          externalRequestAttempts: externalAttempts.length,
          chainRequests: 0,
          signingCalls: 0,
          simulations: 0,
          executions: 0,
          scope:
            "Isolated native Chromium IndexedDB strict transaction/public fixture concurrency, abort, deadline and graceful browser/worker restart; no wallet extension wiring, chain, physical crash/power loss or trial acceptance",
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

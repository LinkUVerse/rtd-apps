#!/usr/bin/env node
// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Current production fence + native IDB/BC in an isolated public-fixture browser profile.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { chromium } = require("@playwright/test");
(async () => {
  const temporary = fs.mkdtempSync(
      path.join(os.tmpdir(), "rtd-read-admission-"),
    ),
    bundle = path.join(temporary, "bundle.js"),
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
        "tests/unit/rpc/read-admission-browser-harness.ts",
        "--bundle",
        "--platform=browser",
        "--format=iife",
        "--global-name=ReadAdmissionHarness",
        `--outfile=${bundle}`,
      ],
      { cwd: path.resolve(__dirname, ".."), stdio: "pipe" },
    );
    const worker = `importScripts('/bundle.js');self.onmessage=async e=>{const H=ReadAdmissionHarness,p=H.validateNetworkProfile(H.profileFixture()),s=new H.WalletNetworkAdmissionStore({databaseName:e.data.database});try{const t=await s.begin(p,[{kind:'identity',role:'accountHistory'}]);const r=await s.complete(p,t,[{kind:'identity',role:'accountHistory',reason:'chain-mismatch'}]);self.postMessage({faults:r.faults.length,pending:r.pending.length});}catch(e){self.postMessage({reason:e.reason});}};`;
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
    const writer = await context.newPage();
    await page.goto(origin);
    await writer.goto(origin);
    const prefix = "RtdWallet NetworkAdmission:test:read-provider-";
    const init = async (database, hold = false) => {
      await page.evaluate(
        async ({ database, hold }) => {
          const H = ReadAdmissionHarness;
          globalThis.readObserver?.stop();
          const p = H.validateNetworkProfile(H.profileFixture()),
            session = new H.WalletReadSession(p),
            store = database
              ? new H.WalletNetworkAdmissionStore({ databaseName: database })
              : new H.WalletNetworkAdmissionStore();
          const o = {
            p,
            session,
            store,
            reads: 0,
            publications: 0,
            release: undefined,
            stop: () => {},
          };
          const capture = async (profile) => {
            o.reads++;
            const row = await store.capture(profile);
            if (hold && o.reads === 1)
              await new Promise((resolve) => {
                o.release = resolve;
              });
            return row;
          };
          o.gate = database
            ? new H.WalletReadAdmission(session, {
                capture,
                subscribe: (fn) => store.subscribe(fn),
              })
            : new H.WalletReadAdmission(session);
          globalThis.readObserver = o;
          o.stop = o.gate.start();
          if (!hold) await o.gate.refresh();
        },
        { database, hold },
      );
    };
    const state = () =>
      page.evaluate(() => {
        const o = readObserver,
          v = o.gate.getSnapshot();
        return {
          phase: v.view.phase,
          balances: v.view.blocked.includes("balances"),
          assets: v.view.blocked.includes("assets"),
          aborted: o.session.signal.aborted,
          identity: !!v.identityFault,
          reads: o.reads,
          publications: o.publications,
        };
      });
    const wait = async (predicate) => {
      for (let i = 0; i < 300; i++) {
        const value = await state();
        if (predicate(value)) return value;
        await page.waitForTimeout(20);
      }
      throw new Error("native current view timeout");
    };
    const commit = async (database, fault, notify = true) =>
      writer.evaluate(
        async ({ database, fault, notify }) => {
          const H = ReadAdmissionHarness,
            p = H.validateNetworkProfile(H.profileFixture()),
            store = database
              ? new H.WalletNetworkAdmissionStore({ databaseName: database })
              : new H.WalletNetworkAdmissionStore();
          const BC = globalThis.BroadcastChannel;
          if (!notify) globalThis.BroadcastChannel = undefined;
          try {
            const { reason, ...area } = fault,
              ticket = await store.begin(p, [area]);
            const row = await store.complete(p, ticket, [fault]);
            return { faults: row.faults.length, pending: row.pending.length };
          } finally {
            globalThis.BroadcastChannel = BC;
          }
        },
        { database, fault, notify },
      );
    const run = async (operation) =>
      page.evaluate(async (operation) => {
        const o = readObserver;
        try {
          const result = await o.gate.run(operation, async () => {
            o.publications++;
            return 1;
          });
          return { result };
        } catch (e) {
          return { reason: e.reason ?? e.name };
        }
      }, operation);
    await init(prefix + "healthy");
    assert.equal((await state()).balances, false);
    assert.deepEqual(await run("balances"), { result: 1 });
    tests.push(
      "native current clear is only a negative fence, not capability/authorization",
    );
    await init(prefix + "pending");
    const firstKey = await page.evaluate(
      () => readObserver.gate.getSnapshot().view.keys.balances,
    );
    await writer.evaluate(async (database) => {
      const H = ReadAdmissionHarness,
        p = H.validateNetworkProfile(H.profileFixture()),
        s = new H.WalletNetworkAdmissionStore({ databaseName: database });
      globalThis.writerObservation = {
        p,
        s,
        t: await s.begin(p, [{ kind: "identity", role: "archive" }]),
      };
    }, prefix + "pending");
    let observed = await wait((s) => s.balances && s.phase === "observed");
    assert.equal(observed.aborted, false);
    assert.deepEqual(await run("balances"), { reason: "reviewing" });
    tests.push(
      "cross-page native pending prevents new facts without closing transport",
    );
    await writer.evaluate(async () => {
      const o = writerObservation;
      await o.s.complete(o.p, o.t, []);
    });
    await wait((s) => !s.balances && s.phase === "observed");
    assert.notEqual(
      await page.evaluate(
        () => readObserver.gate.getSnapshot().view.keys.balances,
      ),
      firstKey,
    );
    tests.push(
      "only the original owner completion restores reads using new ephemeral keys",
    );
    await commit(prefix + "pending", {
      kind: "identity",
      role: "graphql",
      reason: "chain-mismatch",
    });
    await wait((s) => s.identity && s.aborted);
    assert.deepEqual(await run("freshBalance"), { reason: "quarantined" });
    tests.push(
      "cross-page committed identity negative closes old readers and blocks every new fact",
    );
    await init(prefix + "display");
    await commit(prefix + "display", {
      kind: "move-group",
      group: "display",
      reason: "abi",
    });
    observed = await wait(
      (s) => s.assets && s.phase === "observed" && !s.balances,
    );
    assert.equal(observed.aborted, false);
    assert.deepEqual(await run("balances"), { result: 1 });
    assert.deepEqual(await run("assets"), { reason: "quarantined" });
    tests.push(
      "native Display ABI negative withdraws dependent assets and preserves independent balances",
    );
    const reads = (await state()).reads;
    await writer.evaluate((database) => {
      const c = new BroadcastChannel(database + ":invalidate:v1");
      c.postMessage({ faults: [], pending: [], ready: true });
      c.close();
    }, prefix + "display");
    await page.waitForTimeout(50);
    assert.equal((await state()).reads, reads); // the forged frame triggers no native read
    await writer.evaluate((database) => {
      const c = new BroadcastChannel(database + ":invalidate:v1");
      c.postMessage("network-admission-invalidated:v1");
      c.close();
    }, prefix + "display");
    await wait((s) => s.reads > reads && s.phase === "observed");
    assert.deepEqual(await run("assets"), { reason: "quarantined" });
    tests.push(
      "forged positive broadcast is ignored; valid notification must reread the still-negative native row",
    );
    await init(prefix + "worker");
    const result = await writer.evaluate(
      (database) =>
        new Promise((resolve) => {
          const w = new Worker("/worker.js");
          w.onmessage = (e) => {
            w.terminate();
            resolve(e.data);
          };
          w.postMessage({ database });
        }),
      prefix + "worker",
    );
    assert.deepEqual(result, { faults: 1, pending: 0 });
    await wait((s) => s.identity && s.aborted);
    tests.push(
      "dedicated worker native completion triggers cross-context identity withdrawal",
    );
    await init(prefix + "late", true);
    await wait((s) => s.reads === 1);
    await commit(prefix + "late", {
      kind: "identity",
      role: "fullnode",
      reason: "incompatible",
    });
    await page.evaluate(() => readObserver.release());
    await wait((s) => s.identity && s.aborted);
    assert.equal((await state()).publications, 0);
    tests.push(
      "held old native capture delivery cannot restore a positive after invalidation; fresh reread retains fault",
    );
    await init(prefix + "lost");
    await commit(
      prefix + "lost",
      { kind: "identity", role: "archive", reason: "chain-mismatch" },
      false,
    );
    assert.deepEqual(await run("balances"), { reason: "quarantined" });
    assert.equal((await state()).publications, 0);
    tests.push(
      "lost/unsupported cross-context broadcast never bypasses the native pre-read fence",
    );
    await init(prefix + "poll");
    await commit(
      prefix + "poll",
      { kind: "identity", role: "accountHistory", reason: "chain-mismatch" },
      false,
    );
    await wait((s) => s.identity && s.aborted);
    tests.push(
      "bounded fallback polling rereads native identity fault without any message",
    );
    await init(prefix + "abort");
    const abort = await writer.evaluate(async (database) => {
      const H = ReadAdmissionHarness,
        p = H.validateNetworkProfile(H.profileFixture()),
        s = new H.WalletNetworkAdmissionStore({ databaseName: database }),
        original = IDBObjectStore.prototype.put;
      let notifications = 0;
      const stop = s.subscribe(() => notifications++);
      IDBObjectStore.prototype.put = function (value, ...args) {
        const r = original.call(this, value, ...args);
        r.addEventListener("success", () => this.transaction.abort(), {
          once: true,
        });
        return r;
      };
      let reason;
      try {
        await s.begin(p, [{ kind: "identity", role: "fullnode" }]);
      } catch (e) {
        reason = e.reason;
      } finally {
        IDBObjectStore.prototype.put = original;
        stop();
      }
      const row = await s.capture(p);
      return { reason, notifications, pending: row?.pending.length ?? 0 };
    }, prefix + "abort");
    assert.deepEqual(abort, {
      reason: "unavailable",
      notifications: 0,
      pending: 0,
    });
    tests.push(
      "native request success followed by abort publishes no completion notification or pending row",
    );
    await init(undefined);
    await commit(undefined, {
      kind: "identity",
      role: "accountHistory",
      reason: "incompatible",
    });
    await wait((s) => s.identity && s.aborted);
    assert.deepEqual(await run("balances"), { reason: "quarantined" });
    tests.push(
      "bare production default controller/store use native persistent negative with no injected admission",
    );
    await context.close();
    context = await launch();
    page = await context.newPage();
    await page.goto(origin);
    await init(undefined);
    assert.deepEqual(await run("balances"), { reason: "quarantined" });
    assert.equal((await state()).publications, 0);
    tests.push(
      "graceful whole-browser restart keeps default identity fault and does not publish new facts",
    );
    assert.equal(pageErrors.length, 0);
    assert.equal(externalAttempts.length, 0);
    failed = false;
    process.stdout.write(
      JSON.stringify(
        {
          passed: true,
          count: tests.length,
          tests,
          pageErrorCount: 0,
          externalRequestAttempts: 0,
          chainRequests: 0,
          simulations: 0,
          signingCalls: 0,
          executions: 0,
          scope:
            "production read fence/native IDB/BC; controlled public business callbacks only; no React extension/live chain/final authorization race or physical power-loss claim",
        },
        null,
        2,
      ) + "\n",
    );
  } catch (e) {
    process.stderr.write(
      JSON.stringify({
        passed: false,
        error: e.name,
        reason: e.reason ?? e.code ?? null,
        retainedFixture: temporary,
        completed: tests.length,
      }) + "\n",
    );
    process.exitCode = 1;
  } finally {
    await context?.close();
    await new Promise((resolve) => server?.close(resolve) ?? resolve());
    if (!failed) fs.rmSync(temporary, { recursive: true, force: true });
  }
})();

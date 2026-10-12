#!/usr/bin/env node
// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Current coordinator + SDK/native strict IDB. Synthetic Fullnode only, no extension or chain.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { chromium } = require("@playwright/test");
(async () => {
  const temporary = fs.mkdtempSync(
      path.join(os.tmpdir(), "rtd-nc5-observation-"),
    ),
    bundle = path.join(temporary, "bundle.js"),
    cases = [],
    pageErrors = [],
    external = [];
  let context,
    server,
    failed = true,
    currentCase = "bundle",
    fixtureCalls = 0;
  const prefix = "RtdWallet NetworkAdmission:test:nc5-observation-";
  try {
    execFileSync(
      "pnpm",
      [
        "exec",
        "esbuild",
        "tests/unit/rpc/network-capability-observation-browser-harness.ts",
        "--bundle",
        "--platform=browser",
        "--format=iife",
        "--global-name=NativeObservation",
        `--outfile=${bundle}`,
      ],
      { cwd: path.resolve(__dirname, ".."), stdio: "pipe" },
    );
    server = http.createServer((req, res) => {
      res.setHeader("Cache-Control", "no-store");
      res.setHeader(
        "Content-Security-Policy",
        "default-src 'self'; connect-src 'none'; worker-src 'self'; script-src 'self'",
      );
      res.setHeader(
        "Content-Type",
        req.url === "/bundle.js" ? "text/javascript" : "text/html",
      );
      res.end(
        req.url === "/bundle.js"
          ? fs.readFileSync(bundle)
          : '<!doctype html><script src="/bundle.js"></script>',
      );
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    const launch = async () => {
      const c = await chromium.launchPersistentContext(
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
      c.on("page", (p) => p.on("pageerror", (e) => pageErrors.push(e.name)));
      c.on("request", (r) => {
        if (new URL(r.url()).origin !== origin) external.push(true);
      });
      await c.route("**/*", (r) =>
        new URL(r.request().url()).origin === origin ? r.continue() : r.abort(),
      );
      return c;
    };
    context = await launch();
    const open = async () => {
      const p = await context.newPage();
      await p.goto(origin);
      return p;
    };
    const start = async (
      page,
      database,
      mode = "normal",
      abortCompletion = false,
    ) => {
      await page.evaluate(
        ({ database, mode, abortCompletion }) => {
          globalThis.completionCalls = 0;
          globalThis.abortedPutSuccesses = 0;
          if (abortCompletion) {
            const put = IDBObjectStore.prototype.put;
            let puts = 0;
            IDBObjectStore.prototype.put = function (...args) {
              const request = put.apply(this, args);
              if (++puts === 2)
                request.addEventListener(
                  "success",
                  () => {
                    abortedPutSuccesses++;
                    this.transaction.abort();
                  },
                  { once: true },
                );
              return request;
            };
          }
          globalThis.producer = NativeObservation.observation(database, mode);
          const complete = producer.store.complete.bind(producer.store);
          producer.store.complete = (...args) => {
            completionCalls++;
            return complete(...args);
          };
        },
        { database, mode, abortCompletion },
      );
    };
    const result = async (page) =>
      page.evaluate(async () => ({
        ...(await producer.result()),
        completionCalls,
        abortedPutSuccesses,
      }));
    const settled = async (page) => {
      await page.evaluate(async () => producer.run);
      return result(page);
    };
    const denied = async (page, database) =>
      page.evaluate(async (database) => {
        const H = NativeObservation,
          p = H.publicProfile(),
          s = new H.WalletReadSession(p),
          store = database
            ? new H.WalletNetworkAdmissionStore({ databaseName: database })
            : new H.WalletNetworkAdmissionStore(),
          gate = new H.WalletReadAdmission(s, store);
        const stop = gate.start();
        let calls = 0,
          reason;
        try {
          await gate.run("freshObject", async () => {
            calls++;
            return "public-fact";
          });
        } catch (error) {
          reason = error.reason;
        } finally {
          stop();
          s.close();
        }
        const row = await store.capture(p);
        return {
          calls,
          reason,
          faults: row?.faults.length ?? 0,
          pending: row?.pending.length ?? 0,
        };
      }, database);
    const test = async (name, run) => {
      currentCase = name;
      await run();
      cases.push({ name, passed: true });
    };
    await test("native original ticket completes after actual SDK and detached finite projection", async () => {
      const p = await open();
      await start(p, prefix + "normal");
      const r = await settled(p);
      assert.equal(r.phase, "read-contracts-assessed");
      assert.equal(r.faults, 0);
      assert.equal(r.pending, 0);
      assert.equal(r.completionCalls, 1);
      assert.equal(r.readiness, "not-assessed");
      assert.equal(r.execution, "not-probed");
      assert.deepEqual(r.beforeRoles, ["archive", "fullnode", "graphql"]);
      assert.equal(r.unconfigured, true);
      assert.ok(r.requests > 10);
      fixtureCalls += r.requests;
      await p.close();
    });
    await test("default production store commits confirmed SDK wrong chain; other context denies", async () => {
      const p = await open(),
        c = await open();
      await start(p, undefined, "wrong-service");
      const r = await settled(p);
      assert.equal(r.phase, "quarantined");
      assert.equal(r.identityFaults, 1);
      assert.equal(r.pending, 0);
      assert.equal(r.noPositiveFields, true);
      assert.equal(r.completionCalls, 1);
      const n = await denied(c);
      assert.equal(n.calls, 0);
      assert.equal(n.reason, "quarantined");
      fixtureCalls += r.requests;
      await p.close();
      await c.close();
    });
    await test("cross-page pending blocks callbacks; cancelled SDK and late headers never empty-complete", async () => {
      const p = await open(),
        c = await open(),
        database = prefix + "cancelled";
      await start(p, database, "held-service");
      await p.evaluate(async () => producer.entered);
      const n = await denied(c, database);
      assert.equal(n.calls, 0);
      assert.equal(n.reason, "reviewing");
      await p.evaluate(() => producer.cancel());
      let r = await settled(p);
      assert.equal(r.phase, "unavailable");
      assert.equal(r.pending, 1);
      assert.equal(r.faults, 0);
      assert.equal(r.completionCalls, 0);
      await p.evaluate(() => producer.release());
      await p.waitForTimeout(30);
      r = await result(p);
      assert.equal(r.pending, 1);
      assert.equal(r.completionCalls, 0);
      const inherited = await c.evaluate(async (database) => {
        const H = NativeObservation,
          profile = H.publicProfile(),
          store = new H.WalletNetworkAdmissionStore({ databaseName: database }),
          row = await store.capture(profile);
        try {
          await store.complete(profile, structuredClone(row.pending[0]), []);
          return false;
        } catch (e) {
          return e.reason === "stale";
        }
      }, database);
      assert.equal(inherited, true);
      fixtureCalls += r.requests;
      await p.close();
      await c.close();
    });
    for (const mode of ["normal", "wrong-service"])
      await test(`native put success then abort prevents ${mode} completion; no second empty decision`, async () => {
        const p = await open();
        await start(p, prefix + "abort-" + mode, mode, true);
        const r = await settled(p);
        assert.equal(
          r.phase,
          mode === "normal" ? "unavailable" : "quarantined",
        );
        assert.equal(r.pending, 1);
        assert.equal(r.faults, 0);
        assert.equal(r.completionCalls, 1);
        assert.equal(r.abortedPutSuccesses, 1);
        assert.equal(r.noPositiveFields, true);
        fixtureCalls += r.requests;
        await p.close();
      });
    await test("SDK wrong checkpoint commits negative while abort-ignoring sibling still owns native lease", async () => {
      const p = await open(),
        c = await open(),
        database = prefix + "sibling";
      await start(p, database, "wrong-checkpoint-held-object");
      const r = await settled(p);
      assert.equal(r.phase, "quarantined");
      assert.equal(r.identityFaults, 1);
      assert.equal(r.pending, 0);
      assert.equal(r.completionCalls, 1);
      const n = await denied(c, database);
      assert.equal(n.calls, 0);
      assert.equal(n.reason, "quarantined");
      await p.evaluate(() => producer.release());
      await p.waitForTimeout(30);
      assert.equal((await result(p)).completionCalls, 1);
      fixtureCalls += r.requests;
      await p.close();
      await c.close();
    });
    await context.close();
    context = await launch();
    for (const [label, database, reason, pending] of [
      ["default confirmed wrong chain", undefined, "quarantined", 0],
      ["cancelled original observation", prefix + "cancelled", "reviewing", 1],
      [
        "normal completion aborted after put",
        prefix + "abort-normal",
        "reviewing",
        1,
      ],
      [
        "known negative completion aborted after put",
        prefix + "abort-wrong-service",
        "reviewing",
        1,
      ],
    ])
      await test(`graceful whole-browser restart retains ${label}`, async () => {
        const p = await open(),
          n = await denied(p, database);
        assert.equal(n.calls, 0);
        assert.equal(n.reason, reason);
        assert.equal(n.pending, pending);
        await p.close();
      });
    assert.equal(pageErrors.length, 0);
    assert.equal(external.length, 0);
    failed = false;
    console.log(
      JSON.stringify({
        passed: true,
        count: cases.length,
        cases,
        fixtureTransportRequests: fixtureCalls,
        pageErrorCount: pageErrors.length,
        externalRequestAttempts: external.length,
        chainRequests: 0,
        simulations: 0,
        signingCalls: 0,
        executions: 0,
        extensionBuilt: false,
        scope:
          "current production coordinator/SDK/native strict IDB/WebLocks; synthetic Fullnode-only fixture, independent unconfigured roles; graceful restart, no physical failure or extension/live-chain claim",
      }),
    );
  } catch (error) {
    console.log(
      JSON.stringify({
        passed: false,
        failedCase: currentCase,
        completedCases: cases.length,
        errorName: error.name,
        pageErrorCount: pageErrors.length,
        externalRequestAttempts: external.length,
        preservedFixtureDirectory: temporary,
      }),
    );
    process.exitCode = 1;
  } finally {
    await context?.close().catch(() => {});
    if (server) await new Promise((resolve) => server.close(resolve));
    if (!failed) fs.rmSync(temporary, { recursive: true, force: true });
  }
})();

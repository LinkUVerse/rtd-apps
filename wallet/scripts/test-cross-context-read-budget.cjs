#!/usr/bin/env node
// Native Chromium locks + synthetic held HTTP bodies. No chain, account or transaction access.
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");
const { chromium } = require("@playwright/test");

const sourceFile = path.resolve(
  __dirname,
  "../src/shared/rpc/read-concurrency.ts",
);
const source = fs.readFileSync(sourceFile, "utf8");
const sha = (value) => crypto.createHash("sha256").update(value).digest("hex");
const directory = fs.mkdtempSync(
  path.join(os.tmpdir(), "wallet-read-budget-native-"),
);
const extension = path.join(directory, "extension");
fs.mkdirSync(extension);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
  },
  reportDiagnostics: true,
});
assert(
  !(compiled.diagnostics || []).some(
    (d) => d.category === ts.DiagnosticCategory.Error,
  ),
);
fs.writeFileSync(
  path.join(extension, "budget.js"),
  "const exports = {};\n" +
    compiled.outputText +
    "\nglobalThis.readBudget = new exports.WalletReadConcurrency();\n",
);
fs.writeFileSync(
  path.join(extension, "background.js"),
  "importScripts('budget.js');\n",
);
fs.writeFileSync(
  path.join(extension, "page.html"),
  '<!doctype html><title>Read budget native fixture</title><script src="budget.js"></script>',
);
fs.writeFileSync(
  path.join(extension, "manifest.json"),
  JSON.stringify({
    manifest_version: 3,
    name: "Read budget native fixture",
    version: "1.0.0",
    background: { service_worker: "background.js" },
    host_permissions: ["http://127.0.0.1/*"],
  }),
);

const state = {
  active: 0,
  peak: 0,
  started: [],
  ended: [],
  held: new Map(),
  automatic: false,
};
const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, { "access-control-allow-origin": "*" });
    res.end();
    return;
  }
  const id = new URL(req.url, "http://127.0.0.1").pathname.slice(1);
  assert(
    id && !state.started.includes(id),
    "each synthetic read executes at most once",
  );
  state.started.push(id);
  state.peak = Math.max(state.peak, ++state.active);
  let ended = false;
  const finish = (reason) => {
    if (ended) return;
    ended = true;
    state.active--;
    state.ended.push({ id, reason });
    state.held.delete(id);
  };
  res.on("close", () =>
    finish(res.writableFinished ? "complete" : "cancelled"),
  );
  res.writeHead(200, {
    "access-control-allow-origin": "*",
    "content-type": "text/plain",
  });
  res.write("body:");
  const release = () => {
    finish("complete");
    res.end(id);
  };
  state.held.set(id, release);
  if (state.automatic) release();
});
const wait = async (check) => {
  const deadline = Date.now() + 15000;
  while (!(await check())) {
    assert(Date.now() < deadline, "bounded native fixture wait expired");
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
};
const reset = () => {
  assert.equal(state.active, 0);
  assert.equal(state.held.size, 0);
  state.peak = 0;
  state.started = [];
  state.ended = [];
  state.automatic = false;
};
const releaseAll = () => {
  state.automatic = true;
  for (const release of [...state.held.values()]) release();
};
const start = (surface, base, ids) =>
  surface.evaluate(
    ({ base, ids }) => {
      globalThis.fixtureReads = ids.map((id) => {
        const controller = new AbortController();
        const row = { id, controller, state: "pending" };
        row.promise = readBudget
          .run(controller.signal, async () => {
            // Deliberately omit fetch abort: acquired locks must survive an ignored cancellation.
            const response = await fetch(`${base}/${id}`);
            const value = await response.text();
            if (id.startsWith("error-"))
              throw new Error("synthetic-operation-error");
            return value;
          })
          .then(
            (value) => {
              row.state = "fulfilled";
              row.value = value;
            },
            (error) => {
              row.state = "rejected";
              row.error = typeof error === "string" ? error : error.name;
            },
          );
        return row;
      });
    },
    { base, ids },
  );
const done = (surface) =>
  surface.evaluate(async () => {
    await Promise.all(fixtureReads.map((row) => row.promise));
    return fixtureReads.map(({ id, state, error }) => ({ id, state, error }));
  });

(async () => {
  let context;
  const evidence = {
    observedAt: new Date().toISOString(),
    source: sourceFile,
    sourceSha256: sha(source),
    compilerVersion: ts.version,
    compiledSha256: sha(compiled.outputText),
    cases: [],
    syntheticOnly: true,
    chainRequests: 0,
    simulations: 0,
    dispatches: 0,
    passed: false,
  };
  try {
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    context = await chromium.launchPersistentContext(
      path.join(directory, "profile"),
      {
        executablePath:
          process.env.RTD_EXTENSION_CHROMIUM ||
          path.join(
            os.homedir(),
            "Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
          ),
        headless: true,
        args: [
          `--disable-extensions-except=${extension}`,
          `--load-extension=${extension}`,
        ],
      },
    );
    const worker =
      context.serviceWorkers()[0] ||
      (await context.waitForEvent("serviceworker"));
    const id = new URL(worker.url()).hostname;
    const pages = await Promise.all(
      Array.from({ length: 4 }, async () => {
        const page = await context.newPage();
        await page.goto(`chrome-extension://${id}/page.html`);
        return page;
      }),
    );
    const locks = () =>
      pages[3].evaluate(async () => {
        const state = await navigator.locks.query();
        const own = (row) => row.name.startsWith("wallet-read-transport:v1:");
        return {
          held: state.held.filter(own).length,
          pending: state.pending.filter(own).length,
        };
      });
    const clean = async () => {
      await wait(async () => {
        const s = await locks();
        return s.held === 0 && s.pending === 0;
      });
    };

    // 15 independent reads in four pages and a service worker share exactly four physical permits.
    const surfaces = [...pages, worker];
    await Promise.all(
      surfaces.map((surface, index) =>
        start(
          surface,
          base,
          Array.from({ length: 3 }, (_, n) => `mixed-${index}-${n}`),
        ),
      ),
    );
    await wait(() => state.active === 4);
    assert.equal(state.started.length, 4);
    releaseAll();
    const mixed = (await Promise.all(surfaces.map(done))).flat();
    assert(mixed.every((row) => row.state === "fulfilled"));
    assert.equal(state.started.length, 15);
    assert.equal(state.peak, 4);
    await clean();
    evidence.cases.push({
      name: "four-pages-and-worker",
      requests: 15,
      peak: state.peak,
      passed: true,
    });
    reset();

    // Acquisition cancellation clears all four alternative pending requests, with zero fetches.
    await start(pages[0], base, [
      "wait-held-0",
      "wait-held-1",
      "wait-held-2",
      "wait-held-3",
    ]);
    await wait(() => state.active === 4);
    await start(pages[1], base, ["cancel-waiter"]);
    await wait(async () => (await locks()).pending >= 4);
    await pages[1].evaluate(() => fixtureReads[0].controller.abort("deadline"));
    const cancelled = await done(pages[1]);
    assert.deepEqual(cancelled, [
      { id: "cancel-waiter", state: "rejected", error: "deadline" },
    ]);
    assert(!state.started.includes("cancel-waiter"));
    assert.equal((await locks()).pending, 0);
    releaseAll();
    await done(pages[0]);
    await clean();
    evidence.cases.push({
      name: "cancel-pending-alternatives",
      requests: 4,
      cancelledFetches: 0,
      passed: true,
    });
    reset();

    // A held transport that ignores abort retains its permit until body completion.
    await start(pages[0], base, [
      "abort-held-0",
      "abort-held-1",
      "abort-held-2",
      "abort-held-3",
    ]);
    await wait(() => state.active === 4);
    await pages[0].evaluate(() =>
      fixtureReads.forEach((row) => row.controller.abort("ignored")),
    );
    await start(worker, base, ["after-held-abort"]);
    await wait(async () => (await locks()).pending >= 4);
    assert.equal((await locks()).held, 4);
    assert.equal(state.started.length, 4);
    releaseAll();
    await done(pages[0]);
    await done(worker);
    await clean();
    assert.equal(state.peak, 4);
    evidence.cases.push({
      name: "held-abort-waits-for-body",
      requests: 5,
      peak: state.peak,
      passed: true,
    });
    reset();

    // Closing an owning page releases its native locks; this is not server cancellation fencing.
    const owner = await context.newPage();
    await owner.goto(`chrome-extension://${id}/page.html`);
    await start(owner, base, [
      "close-held-0",
      "close-held-1",
      "close-held-2",
      "close-held-3",
    ]);
    await wait(() => state.active === 4);
    await start(worker, base, ["after-page-close"]);
    await wait(async () => (await locks()).pending >= 4);
    state.automatic = true;
    await owner.close();
    assert((await done(worker)).every((row) => row.state === "fulfilled"));
    await wait(() => state.active === 0);
    await clean();
    const oldEnded = state.ended.filter((row) =>
      row.id.startsWith("close-held-"),
    );
    assert.equal(oldEnded.length, 4);
    evidence.cases.push({
      name: "closed-page-releases-locks",
      requests: 5,
      oldTransportEndReasons: oldEnded.map((row) => row.reason),
      passed: true,
    });
    reset();

    // Operation errors are preserved, no automatic retry, all native locks eventually released.
    state.automatic = true;
    await start(worker, base, ["error-0", "error-1", "error-2"]);
    assert(
      (await done(worker)).every(
        (row) => row.state === "rejected" && row.error === "Error",
      ),
    );
    assert.equal(state.started.length, 3);
    await clean();
    evidence.cases.push({
      name: "operation-error-no-retry",
      requests: 3,
      passed: true,
    });
    reset();

    const unavailable = await pages[2].evaluate(async () => {
      let called = false;
      Object.defineProperty(navigator, "locks", {
        configurable: true,
        value: undefined,
      });
      try {
        await readBudget.run(new AbortController().signal, async () => {
          called = true;
        });
        return { called, error: null };
      } catch (error) {
        return { called, error: error.name };
      } finally {
        delete navigator.locks;
      }
    });
    assert.deepEqual(unavailable, {
      called: false,
      error: "WalletReadBudgetUnavailableError",
    });
    assert.equal(state.started.length, 0);
    await clean();
    evidence.cases.push({
      name: "missing-api-fail-closed",
      requests: 0,
      passed: true,
    });
    assert.equal(
      sha(fs.readFileSync(sourceFile)),
      evidence.sourceSha256,
      "source unchanged during native proof",
    );
    evidence.passed = true;
  } catch (error) {
    evidence.failure = { name: error.name, assertion: error.message };
    process.exitCode = 1;
  } finally {
    releaseAll();
    await context?.close();
    await new Promise((resolve) => server.close(resolve));
    console.log(JSON.stringify(evidence, null, 2));
  }
})();

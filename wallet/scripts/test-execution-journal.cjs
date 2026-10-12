#!/usr/bin/env node
// Native storage/protocol harness. Does not claim live-chain or wallet extension UI acceptance.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { chromium } = require("@playwright/test");
(async () => {
  const workdir = path.resolve(__dirname, "..");
  const temporary = fs.mkdtempSync(
    path.join(os.tmpdir(), "rtd-wallet-journal-"),
  );
  const bundle = path.join(temporary, "bundle.js");
  execFileSync(
    "pnpm",
    [
      "exec",
      "esbuild",
      "tests/unit/rpc/execution-browser-harness.ts",
      "--bundle",
      "--platform=browser",
      "--format=iife",
      "--global-name=WalletExecutionHarness",
      `--outfile=${bundle}`,
    ],
    { cwd: workdir, stdio: "pipe" },
  );
  const worker = `importScripts('/bundle.js');self.addEventListener('install',e=>e.waitUntil(self.skipWaiting()));self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));self.addEventListener('message',e=>e.waitUntil((async()=>{const H=WalletExecutionHarness,p=H.validateNetworkProfile(H.profileFixture()),tx=await H.executionFixture(),j=new H.WalletExecutionJournal({databaseName:'worker-journal'}),r=H.createPendingRecord(p,{accountId:'test',accountAddress:H.sender,requestId:'worker-request',originRef:'wallet-ui',digest:tx.digest,bindingKey:H.networkBindingKey(p)});if(e.data==='commit')await j.commitPending(r);const pending=await j.pending(r.scope);e.ports[0].postMessage({pending:!!pending,digest:pending?.digest,dispatches:0});})()));`;
  const server = http.createServer((req, res) => {
    res.setHeader("Cache-Control", "no-store");
    if (req.url === "/bundle.js") {
      res.setHeader("Content-Type", "text/javascript");
      res.end(fs.readFileSync(bundle));
    } else if (req.url === "/worker.js") {
      res.setHeader("Content-Type", "text/javascript");
      res.end(worker);
    } else {
      res.setHeader("Content-Type", "text/html");
      res.end('<!doctype html><script src="/bundle.js"></script>');
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await chromium.launch({
      executablePath:
        process.env.RTD_JOURNAL_CHROMIUM ??
        path.join(
          os.homedir(),
          "Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell",
        ),
      headless: true,
    });
    const context = await browser.newContext(),
      page = await context.newPage();
    await page.goto(origin);
    const results = await page.evaluate(async () => {
      const H = WalletExecutionHarness,
        p = H.validateNetworkProfile(H.profileFixture()),
        tx = await H.executionFixture(),
        scope = H.executionScopeKey(p, H.sender),
        passed = [];
      const check = (condition, message) => {
        if (!condition) throw new Error(message);
      };
      const record = (requestId) =>
        H.createPendingRecord(p, {
          accountId: "account",
          accountAddress: H.sender,
          requestId,
          originRef: "wallet-ui",
          digest: tx.digest,
          bindingKey: H.networkBindingKey(p),
        });
      const j = new H.WalletExecutionJournal({
          databaseName: "strict-journal",
        }),
        r = record("first");
      const original = IDBDatabase.prototype.transaction,
        durability = [];
      let completed = 0;
      IDBDatabase.prototype.transaction = function (...args) {
        const t = original.apply(this, args);
        if (args[1] === "readwrite") {
          durability.push(t.durability);
          t.addEventListener("complete", () => completed++);
        }
        return t;
      };
      try {
        await j.commitPending({
          ...r,
          bytesBase64: tx.bytesBase64,
          signature: tx.signed.signature,
          secret: "must-not-store",
        });
      } finally {
        IDBDatabase.prototype.transaction = original;
      }
      const stored = await new H.WalletExecutionJournal({
        databaseName: "strict-journal",
      }).get(r.id);
      check(
        completed === 1 && durability[0] === "strict",
        "pending resolved before strict completion",
      );
      check(
        !["bytesBase64", "signature", "secret"].some((k) => k in stored),
        "payload persisted",
      );
      passed.push("strict完成屏障与字段白名单");
      const broken = new H.WalletExecutionJournal({
          databaseName: "aborted-journal",
        }),
        brokenRecord = record("abort"),
        originalAdd = IDBObjectStore.prototype.add;
      let aborted = false;
      IDBObjectStore.prototype.add = function (...args) {
        if (this.name === "pending-scopes-v2")
          throw new DOMException("quota", "QuotaExceededError");
        return originalAdd.apply(this, args);
      };
      try {
        await broken.commitPending(brokenRecord);
      } catch {
        aborted = true;
      } finally {
        IDBObjectStore.prototype.add = originalAdd;
      }
      check(
        aborted &&
          (await broken.get(brokenRecord.id)) === null &&
          (await broken.pending(brokenRecord.scope)) === null,
        "abort left half-record",
      );
      passed.push("写失败原子回滚不留下半条记录");
      const race = new H.WalletExecutionJournal({
        databaseName: "race-journal",
      });
      const statuses = await Promise.all([
        race.commitPending(record("race-1")).then(
          () => true,
          () => false,
        ),
        new H.WalletExecutionJournal({ databaseName: "race-journal" })
          .commitPending(record("race-2"))
          .then(
            () => true,
            () => false,
          ),
      ]);
      check(
        statuses.filter(Boolean).length === 1,
        "two atomic pending commits succeeded",
      );
      passed.push("独立连接原子pending竞争");
      const alias = H.validateNetworkProfile({
          ...H.profileFixture(),
          id: "alias",
          revision: 2,
          endpoints: { fullnodeGrpcWeb: "http://127.0.0.1:9999/" },
        }),
        next = H.validateNetworkProfile({
          ...H.profileFixture(),
          generation: "dev-2",
        });
      check(
        H.executionScopeKey(alias, H.sender) === scope &&
          !!(await j.pending(H.executionScopeKey(alias, H.sender))) &&
          (await j.pending(H.executionScopeKey(next, H.sender))) === null,
        "scope identity bypass",
      );
      passed.push("别名端点不能绕过占用及generation隔离");
      let bad = 0;
      for (const receipt of [
        { ...tx.receipt(), effectsBase64: "AA==" },
        { ...tx.receipt(), digest: p.expectedGenesisDigest },
      ]) {
        try {
          await j.commitReceipt(r.id, receipt);
        } catch {
          bad++;
        }
      }
      check(
        bad === 2 && !!(await j.pending(scope)),
        "bad receipt unlocked pending",
      );
      passed.push("坏回执保持pending");
      check(
        (await j.confirmedReceipt(scope, tx.digest)) === null,
        "pending promoted into confirmation",
      );
      const terminal = await j.commitReceipt(r.id, tx.receipt(false));
      check(
        terminal.state === "confirmed-failure" &&
          (await j.pending(scope)) === null,
        "failure receipt failed to terminate",
      );
      passed.push("链失败BCS终态原子释放");
      const otherChain = H.validateNetworkProfile({
        ...H.profileFixture(),
        expectedGenesisDigest: tx.digest,
      });
      const known = await new H.WalletExecutionJournal({
        databaseName: "strict-journal",
      }).confirmedReceipt(scope, tx.digest);
      check(
        known?.digest === tx.digest &&
          known.success === false &&
          known.effectsBase64 === tx.receipt(false).effectsBase64,
        "durable terminal discovery failed",
      );
      check(
        (
          await j.confirmedReceipt(
            H.executionScopeKey(alias, H.sender),
            tx.digest,
          )
        )?.digest === tx.digest &&
          (await j.confirmedReceipt(
            H.executionScopeKey(next, H.sender),
            tx.digest,
          )) === null &&
          (await j.confirmedReceipt(
            H.executionScopeKey(otherChain, H.sender),
            tx.digest,
          )) === null &&
          (await j.confirmedReceipt(
            H.executionScopeKey(p, "0x1"),
            tx.digest,
          )) === null,
        "terminal scope identity bypass",
      );
      passed.push("独立重开终态发现及generation／账户隔离");
      await j.commitPending(record("second-pending"));
      check(
        (await j.confirmedReceipt(scope, tx.digest))?.success === false &&
          !!(await j.pending(scope)),
        "terminal display cleared active pending",
      );
      passed.push("终态只读发现不清除后来pending");
      await j.commitReceipt(record("second-pending").id, tx.receipt());
      let conflict = false;
      try {
        await j.confirmedReceipt(scope, tx.digest);
      } catch (error) {
        conflict = error.reason === "conflict";
      }
      check(conflict, "conflicting terminal facts accepted");
      passed.push("同摘要冲突终态拒绝覆盖");
      await new Promise((resolve, reject) => {
        const q = indexedDB.open("legacy-journal", 1);
        q.onupgradeneeded = () =>
          q.result
            .createObjectStore("legacy", { keyPath: "id" })
            .put({ id: "old", chainId: "four-byte", state: "pending" });
        q.onsuccess = () => {
          q.result.close();
          resolve();
        };
        q.onerror = reject;
      });
      let quarantined = false;
      try {
        await new H.WalletExecutionJournal({
          databaseName: "legacy-journal",
        }).pending(scope);
      } catch (e) {
        quarantined = e.reason === "legacy";
      }
      check(quarantined, "legacy data silently ignored");
      const old = await new Promise((resolve, reject) => {
        const q = indexedDB.open("legacy-journal", 2);
        q.onsuccess = () => {
          const db = q.result,
            t = db.transaction("legacy"),
            get = t.objectStore("legacy").get("old");
          get.onsuccess = () => resolve(get.result);
          t.oncomplete = () => db.close();
        };
        q.onerror = reject;
      });
      check(old.chainId === "four-byte", "legacy removed");
      passed.push("v1数据保留与隔离");
      return passed;
    });
    const pendingStorageFaults = await page.evaluate(async () =>
      WalletExecutionHarness.nativeJournalFaults(),
    );
    assert.equal(pendingStorageFaults.length, 9);
    results.push(...pendingStorageFaults.map((item) => item.case));
    console.log(
      JSON.stringify(
        {
          pendingStorageFaults,
          scope:
            "native Chromium storage with controlled callback fixtures; no dev-chain dispatch",
        },
        null,
        2,
      ),
    );
    const receiptAbortCases = await page.evaluate(async () => {
      const H = WalletExecutionHarness;
      const evidence = [];
      const check = (condition, message) => {
        if (!condition) throw new Error(message);
      };
      for (const success of [true, false]) {
        const profile = H.validateNetworkProfile(H.profileFixture());
        const tx = await H.executionFixture();
        const databaseName = `receipt-abort-${success}`;
        const scope = H.executionScopeKey(profile, H.sender);
        const calls = {
          simulate: 0,
          sign: 0,
          verify: 0,
          dispatch: 0,
          lookup: [],
        };
        const journal = () => new H.WalletExecutionJournal({ databaseName });
        const coordinator = () =>
          new H.WalletExecutionCoordinator(
            new H.WalletReadSession(profile),
            journal(),
            {
              verifySignature: async () => {
                calls.verify++;
              },
              dispatch: async () => {
                calls.dispatch++;
                return tx.receipt(success);
              },
              lookup: async (digest) => {
                calls.lookup.push(digest);
                return tx.receipt(success);
              },
            },
          );
        const input = {
          accountId: "receipt-abort-test",
          accountAddress: H.sender,
          requestId: "original",
          originRef: "wallet-ui",
          bindingKey: H.networkBindingKey(profile),
          bytesBase64: tx.bytesBase64,
          digest: tx.digest,
        };
        const callbacks = {
          authorize: async () => {},
          simulate: async () => {
            calls.simulate++;
          },
          signData: async () => {
            calls.sign++;
            return tx.signed.signature;
          },
        };
        // Abort after the native lock-deletion request succeeds: both the preceding
        // terminal put and lock delete must roll back, despite their request success.
        let aborts = 0,
          writesBeforeAbort = 0;
        const injectAbort = async (operation) => {
          const originalDelete = IDBObjectStore.prototype.delete;
          const originalPut = IDBObjectStore.prototype.put;
          IDBObjectStore.prototype.put = function (...args) {
            const request = originalPut.apply(this, args);
            if (
              this.transaction.db.name === databaseName &&
              this.name === "journal-v2"
            )
              request.addEventListener("success", () => {
                writesBeforeAbort++;
              });
            return request;
          };
          IDBObjectStore.prototype.delete = function (...args) {
            const request = originalDelete.apply(this, args);
            if (
              this.transaction.db.name === databaseName &&
              this.name === "pending-scopes-v2"
            ) {
              const transaction = this.transaction;
              request.addEventListener("success", () => {
                aborts++;
                transaction.abort();
              });
            }
            return request;
          };
          try {
            return await operation();
          } finally {
            IDBObjectStore.prototype.delete = originalDelete;
            IDBObjectStore.prototype.put = originalPut;
          }
        };
        const first = await injectAbort(() =>
          coordinator().execute(input, callbacks),
        );
        check(
          first.state === "pending" && first.reason === "storage-unavailable",
          "dispatch receipt abort misreported",
        );
        const verifyPending = async () => {
          const reopened = journal();
          const pending = await reopened.pending(scope);
          const record = await reopened.get(first.recordId);
          check(
            pending?.digest === tx.digest &&
              record?.state === "dispatch-pending" &&
              !record.receipt,
            "receipt abort left partial terminal or released lock",
          );
          check(
            (await reopened.confirmedReceipt(scope, tx.digest)) === null,
            "aborted receipt became visible",
          );
        };
        await verifyPending();
        const blocked = await coordinator().execute(
          { ...input, requestId: "successor" },
          callbacks,
        );
        check(
          blocked.state === "pending" && blocked.recordId === first.recordId,
          "successor bypassed durable pending",
        );
        const retry = await injectAbort(() =>
          coordinator().recover(H.sender, async () => {}),
        );
        check(
          retry?.state === "pending" && retry.reason === "storage-unavailable",
          "recovery receipt abort misreported",
        );
        await verifyPending();
        const recovered = await coordinator().recover(H.sender, async () => {});
        check(
          recovered?.state === "confirmed" &&
            recovered.receipt.success === success,
          "terminal recovery failed",
        );
        const stored = await journal().get(first.recordId);
        check(
          stored?.state ===
            (success ? "confirmed-success" : "confirmed-failure") &&
            (await journal().pending(scope)) === null &&
            (await journal().confirmedReceipt(scope, tx.digest))?.success ===
              success,
          "terminal did not commit atomically",
        );
        check(
          aborts === 2 && writesBeforeAbort === 2,
          "fault did not occur after successful native writes",
        );
        check(
          calls.simulate === 1 &&
            calls.sign === 1 &&
            calls.verify === 1 &&
            calls.dispatch === 1 &&
            calls.lookup.length === 2 &&
            calls.lookup.every((digest) => digest === tx.digest),
          "recovery resent or queried another digest",
        );
        evidence.push({
          success,
          aborts,
          writesBeforeAbort,
          calls,
          finalState: stored.state,
        });
      }
      return evidence;
    });
    for (const item of receiptAbortCases)
      results.push(
        `原生回执写成功后异步abort：${item.finalState}，提交／恢复均原子回滚且仅提交一次`,
      );
    const second = await context.newPage();
    await second.goto(origin);
    await page.evaluate(async () => {
      const H = WalletExecutionHarness,
        profile = H.validateNetworkProfile(H.profileFixture());
      let entered;
      const ready = new Promise((resolve) => {
        entered = resolve;
      });
      window.preparationGuardOperation = H.withPreparationGuard(
        new H.WalletReadSession(profile),
        H.sender,
        async () => {
          entered();
          await new Promise((resolve) => {
            window.releasePreparationGuard = resolve;
          });
        },
        {
          journal: new H.WalletExecutionJournal({
            databaseName: "preparation-guard-journal",
          }),
        },
      );
      await Promise.race([
        ready,
        window.preparationGuardOperation.then(() => {
          throw new Error("guard did not hold");
        }),
      ]);
    });
    const preparationBlocked = await second.evaluate(async () => {
      const H = WalletExecutionHarness;
      const profile = H.validateNetworkProfile({
        ...H.profileFixture(),
        id: "other-alias",
        revision: 2,
        endpoints: { fullnodeGrpcWeb: "http://127.0.0.1:9999/" },
      });
      let operations = 0,
        prepareBlocked = false,
        executeBlocked = false;
      try {
        await H.withPreparationGuard(
          new H.WalletReadSession(profile),
          H.sender,
          async () => {
            operations++;
          },
          {
            journal: new H.WalletExecutionJournal({
              databaseName: "preparation-guard-journal",
            }),
          },
        );
      } catch (error) {
        prepareBlocked = /正在签名或恢复/.test(error.message);
      }
      try {
        await new H.BrowserExecutionLock().run(
          H.executionScopeKey(profile, H.sender),
          async () => {
            operations++;
          },
        );
      } catch (error) {
        executeBlocked = /正在签名或恢复/.test(error.message);
      }
      return { operations, prepareBlocked, executeBlocked };
    });
    assert.deepEqual(preparationBlocked, {
      operations: 0,
      prepareBlocked: true,
      executeBlocked: true,
    });
    await page.evaluate(async () => {
      window.releasePreparationGuard();
      await window.preparationGuardOperation;
    });
    results.push("真实跨窗口准备与执行共用scope锁，URL／别名不能绕过");
    await second.evaluate(async () => {
      const H = WalletExecutionHarness,
        profile = H.validateNetworkProfile(H.profileFixture()),
        tx = await H.executionFixture();
      await new H.WalletExecutionJournal({
        databaseName: "preparation-guard-journal",
      }).commitPending(
        H.createPendingRecord(profile, {
          accountId: "test",
          accountAddress: H.sender,
          requestId: "another-window",
          originRef: "wallet-ui",
          digest: tx.digest,
          bindingKey: H.networkBindingKey(profile),
        }),
      );
    });
    const latePending = await page.evaluate(async () => {
      const H = WalletExecutionHarness,
        profile = H.validateNetworkProfile(H.profileFixture());
      let operations = 0,
        blocked = false;
      try {
        await H.withPreparationGuard(
          new H.WalletReadSession(profile),
          H.sender,
          async () => {
            operations++;
          },
          {
            journal: new H.WalletExecutionJournal({
              databaseName: "preparation-guard-journal",
            }),
          },
        );
      } catch (error) {
        blocked = /待确认/.test(error.message);
      }
      return { operations, blocked };
    });
    assert.deepEqual(latePending, { operations: 0, blocked: true });
    results.push("另一窗口新写入的原生pending阻挡已打开页面再次构建");
    await page.evaluate(async () => {
      const H = WalletExecutionHarness;
      let enter;
      const ready = new Promise((r) => (enter = r));
      window.held = new H.BrowserExecutionLock().run("same-scope", async () => {
        enter();
        await new Promise((r) => (window.releaseLock = r));
      });
      await ready;
    });
    const reason = await second.evaluate(async () => {
      try {
        await new WalletExecutionHarness.BrowserExecutionLock().run(
          "same-scope",
          async () => true,
        );
        return "entered";
      } catch (e) {
        return e.message;
      }
    });
    assert.match(reason, /正在签名或恢复/);
    await page.evaluate(async () => {
      window.releaseLock();
      await window.held;
    });
    results.push("真实Web Locks跨窗口互斥");
    // Hold an actual coordinator at dispatch, after its strict pending commit.
    // Closing this page releases Web Locks; the durable pending must still fence a successor.
    const originalDigest = await second.evaluate(async () => {
      const H = WalletExecutionHarness;
      const profile = H.validateNetworkProfile(H.profileFixture());
      const tx = await H.executionFixture();
      const journal = new H.WalletExecutionJournal({
        databaseName: "closed-owner-journal",
      });
      let entered;
      const ready = new Promise((resolve) => {
        entered = resolve;
      });
      const coordinator = new H.WalletExecutionCoordinator(
        new H.WalletReadSession(profile),
        journal,
        {
          verifySignature: async () => {},
          lookup: async () => {
            throw new Error("unexpected lookup");
          },
          dispatch: async () => {
            entered();
            return new Promise(() => {});
          },
        },
      );
      window.dispatchOperation = coordinator.execute(
        {
          accountId: "test",
          accountAddress: H.sender,
          requestId: "closed-owner",
          originRef: "wallet-ui",
          bindingKey: H.networkBindingKey(profile),
          bytesBase64: tx.bytesBase64,
          digest: tx.digest,
        },
        {
          authorize: async () => {},
          simulate: async () => {},
          signData: async () => tx.signed.signature,
        },
      );
      await Promise.race([
        ready,
        window.dispatchOperation.then(() => {
          throw new Error("dispatch did not remain pending");
        }),
      ]);
      const pending = await journal.pending(
        H.executionScopeKey(profile, H.sender),
      );
      if (pending?.digest !== tx.digest)
        throw new Error("dispatch preceded durable pending");
      return tx.digest;
    });
    const occupied = await page.evaluate(async () => {
      const H = WalletExecutionHarness;
      const profile = H.validateNetworkProfile(H.profileFixture());
      try {
        await new H.BrowserExecutionLock().run(
          H.executionScopeKey(profile, H.sender),
          async () => {},
        );
        return false;
      } catch (error) {
        return /正在签名或恢复/.test(error.message);
      }
    });
    assert.equal(occupied, true);
    await second.close();
    const successor = await page.evaluate(async () => {
      const H = WalletExecutionHarness;
      // A different profile alias, URL and revision must still share the pending scope.
      const profile = H.validateNetworkProfile({
        ...H.profileFixture(),
        id: "successor-alias",
        revision: 2,
        endpoints: { fullnodeGrpcWeb: "http://127.0.0.1:9999/" },
      });
      const journal = new H.WalletExecutionJournal({
        databaseName: "closed-owner-journal",
      });
      const calls = {
        simulate: 0,
        sign: 0,
        verify: 0,
        dispatch: 0,
        lookup: [],
      };
      const coordinator = new H.WalletExecutionCoordinator(
        new H.WalletReadSession(profile),
        journal,
        {
          verifySignature: async () => {
            calls.verify++;
            throw new Error("unexpected verify");
          },
          dispatch: async () => {
            calls.dispatch++;
            throw new Error("unexpected dispatch");
          },
          lookup: async (digest) => {
            calls.lookup.push(digest);
            return null;
          },
        },
      );
      // Different bytes/digest/request cannot bypass the older pending operation.
      const tx = await H.executionFixture(2n);
      const outcome = await coordinator.execute(
        {
          accountId: "test",
          accountAddress: H.sender,
          requestId: "successor-request",
          originRef: "another-wallet-window",
          bindingKey: H.networkBindingKey(profile),
          bytesBase64: tx.bytesBase64,
          digest: tx.digest,
        },
        {
          authorize: async () => {},
          simulate: async () => {
            calls.simulate++;
          },
          signData: async () => {
            calls.sign++;
            return tx.signed.signature;
          },
        },
      );
      const recovered = await coordinator.recover(H.sender, async () => {});
      const pending = await journal.pending(
        H.executionScopeKey(profile, H.sender),
      );
      return {
        outcome,
        recovered,
        pendingDigest: pending?.digest,
        newDigest: tx.digest,
        calls,
      };
    });
    assert.notEqual(successor.newDigest, originalDigest);
    assert.equal(successor.outcome.state, "pending");
    assert.equal(successor.outcome.digest, originalDigest);
    assert.equal(successor.recovered.state, "pending");
    assert.equal(successor.recovered.digest, originalDigest);
    assert.equal(successor.recovered.reason, "receipt-unavailable");
    assert.equal(successor.pendingDigest, originalDigest);
    assert.deepEqual(successor.calls, {
      simulate: 0,
      sign: 0,
      verify: 0,
      dispatch: 0,
      lookup: [originalDigest],
    });
    results.push("提交窗口关闭释放锁后pending仍阻止别名窗口的新签名和提交");
    results.push("接替窗口仅查原摘要，NotFound不释放持久pending");
    const cdp = await context.newCDPSession(page);
    const versions = [];
    cdp.on("ServiceWorker.workerVersionUpdated", (e) =>
      versions.push(...e.versions),
    );
    await cdp.send("ServiceWorker.enable");
    await page.evaluate(async () => {
      await navigator.serviceWorker.register("/worker.js");
      await navigator.serviceWorker.ready;
    });
    const send = (action) =>
      page.evaluate(async (action) => {
        const r = await navigator.serviceWorker.ready;
        return new Promise((resolve, reject) => {
          const c = new MessageChannel();
          c.port1.onmessage = (e) => resolve(e.data);
          c.port1.onmessageerror = reject;
          r.active.postMessage(action, [c.port2]);
        });
      }, action);
    const before = await send("commit");
    assert.equal(before.pending, true);
    const version = versions.findLast(
      (v) =>
        v.scriptURL === `${origin}/worker.js` && v.runningStatus === "running",
    );
    assert(version, "running worker missing");
    await cdp.send("ServiceWorker.stopWorker", {
      versionId: version.versionId,
    });
    const after = await send("read");
    assert.deepEqual(after, before);
    assert.equal(after.dispatches, 0);
    results.push("真实worker停止重启保留原摘要");
    await cdp.detach();
    console.log(
      JSON.stringify(
        {
          passed: results.length,
          tests: results,
          receiptAbortCases,
          browser: await browser.version(),
          scope:
            "native Chromium IndexedDB/Web Locks/service-worker harness; no live chain or wallet extension UI acceptance",
        },
        null,
        2,
      ),
    );
    await context.close();
  } finally {
    if (browser) await browser.close();
    await new Promise((r) => server.close(r));
    fs.rmSync(temporary, { recursive: true, force: true });
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

#!/usr/bin/env node
// Audit the two existing public-test-account profiles without approval or journal writes.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
const { chromium } = require("@playwright/test");
const { bcs } = require("rtd-typescript/bcs");
const { RtdGrpcClient, GrpcWebFetchTransport } = require("rtd-typescript/grpc");

const H0 = "3tEPxLxUysGx4gfr8UEycvH7xohMWuwKVbTX5np4TCYj";
const generation = "dev-20261003-01";
const address =
  "0xa0ccc8bcc83f6c628340134f8546a21e0618fd1aaa02432bba454c4a2c2233da";
const runtime = path.join(
  os.homedir(),
  ".local/state/rtd-wallet-migration",
  generation,
);
const sha = (value) => crypto.createHash("sha256").update(value).digest("hex");
const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));

async function snapshot(page) {
  return page.evaluate(async () => {
    const name = "RtdWallet TransactionJournal";
    const existing = (await indexedDB.databases()).find(
      (db) => db.name === name,
    );
    if (existing?.version !== 2)
      throw new Error("Existing v2 journal required");
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(name, 2);
      request.onerror = request.onblocked = () =>
        reject(new Error("Journal unavailable"));
      request.onupgradeneeded = () => {
        request.transaction.abort();
        reject(new Error("Audit forbids upgrade"));
      };
      request.onsuccess = () => {
        const db = request.result;
        const names = ["journal-v2", "pending-scopes-v2", "metadata-v2"];
        if (!names.every((name) => db.objectStoreNames.contains(name))) {
          db.close();
          reject(new Error("Journal stores missing"));
          return;
        }
        const tx = db.transaction(names, "readonly"),
          rows = {};
        tx.onabort = tx.onerror = () => {
          db.close();
          reject(new Error("Audit read failed"));
        };
        tx.oncomplete = () => {
          db.close();
          resolve(rows);
        };
        for (const name of names) {
          const request = tx.objectStore(name).getAll();
          request.onsuccess = () => {
            rows[name] = request.result;
          };
        }
      };
    });
  });
}

function validate(raw, expected) {
  assert.equal(
    raw["pending-scopes-v2"].length,
    0,
    "Pending scope forbids new signing",
  );
  assert(
    !raw["metadata-v2"].some(
      (row) => row.key === "legacy-quarantined" && row.value,
    ),
  );
  const records = raw["journal-v2"];
  assert.equal(records.length, expected.size);
  const seen = new Set();
  for (const row of records) {
    assert.equal(row.schemaVersion, 2);
    assert.equal(row.chainId, H0);
    assert.equal(row.generation, generation);
    assert.equal(row.accountAddress, address);
    assert.equal(row.scope, JSON.stringify([2, H0, generation, address]));
    assert.equal(row.id, JSON.stringify([row.scope, row.requestId]));
    assert.equal(expected.get(row.digest), row.state);
    assert(!seen.has(row.digest));
    seen.add(row.digest);
    assert(
      !["bytesBase64", "signature", "secret", "keyPair"].some(
        (key) => key in row,
      ),
    );
    const receipt = row.receipt;
    assert(receipt);
    assert.equal(receipt.digest, row.digest);
    assert.equal(receipt.success, row.state === "confirmed-success");
    const bytes = Buffer.from(receipt.effectsBase64, "base64");
    assert.equal(bytes.toString("base64"), receipt.effectsBase64);
    const effects = bcs.TransactionEffects.parse(bytes);
    assert.deepEqual(
      Buffer.from(bcs.TransactionEffects.serialize(effects).toBytes()),
      bytes,
    );
    const body = effects.$kind === "V2" ? effects.V2 : effects.V1;
    assert.equal(body.transactionDigest, row.digest);
    assert.equal(body.status.$kind === "Success", receipt.success);
    assert.equal(body.executedEpoch, receipt.epoch);
  }
  return records;
}

(async () => {
  const [output] = process.argv.slice(2);
  assert(output && !fs.existsSync(output));
  const extension = path.resolve(__dirname, "../dist");
  const profileFile = path.join(
    runtime,
    "wallet-profile-20261004-03/profile.json",
  );
  const profile = read(profileFile);
  assert.equal(profile.expectedGenesisDigest, H0);
  assert.equal(profile.generation, generation);
  assert.equal(profile.endpoints.fullnodeGrpcWeb, "http://127.0.0.1:39400");
  const compiledProfile = require("./lib/verify-extension-local-profile.cjs")({
    extension,
    profileFile,
  });
  const certificate = path.join(
    runtime,
    "publication-foundation/native-query-ingress/server/tls.crt",
  );
  const pub = execFileSync("openssl", [
    "x509",
    "-in",
    certificate,
    "-pubkey",
    "-noout",
  ]);
  const pin = crypto
    .createHash("sha256")
    .update(
      execFileSync("openssl", ["pkey", "-pubin", "-outform", "DER"], {
        input: pub,
      }),
    )
    .digest("base64");
  let dispatches = 0,
    simulations = 0,
    lookups = 0,
    context,
    stage = "admission",
    profileDirectory;
  const observations = [];
  const fetch = async (input, init) => {
    const url = String(input instanceof Request ? input.url : input);
    assert(url.startsWith("http://127.0.0.1:39400/"));
    if (/\/ExecuteTransaction(?:$|\?)/.test(url)) {
      dispatches++;
      throw new Error("Audit forbids dispatch");
    }
    if (/\/SimulateTransaction(?:$|\?)/.test(url)) {
      simulations++;
      throw new Error("Audit forbids simulation");
    }
    assert(/\/(?:GetServiceInfo|GetTransaction)(?:$|\?)/.test(url));
    if (/\/GetTransaction(?:$|\?)/.test(url)) lookups++;
    return globalThis.fetch(input, {
      ...init,
      redirect: "error",
      credentials: "omit",
    });
  };
  const client = new RtdGrpcClient({
    network: profile.sdkNetwork,
    transport: new GrpcWebFetchTransport({
      baseUrl: profile.endpoints.fullnodeGrpcWeb,
      fetch,
    }),
    mvr: { url: "" },
  });
  const options = () => ({ abort: AbortSignal.timeout(20_000) });
  const first = (await client.ledgerService.getServiceInfo({}, options()))
    .response;
  assert.equal(first.chainId, H0);
  try {
    for (const [directory, markers] of [
      [
        "dapp-execution-browser-01",
        [
          "confirmed",
          "fault-timeout-01",
          "fault-abort-01",
          "fault-abort-current-worker-01",
          "fault-execution-failure-01",
        ],
      ],
      ["staking-execution-browser-01", ["confirmed", "coin-confirmed"]],
    ]) {
      profileDirectory = directory;
      stage = "retained profile admission";
      const root = path.join(runtime, directory);
      assert(fs.existsSync(path.join(root, "chromium-profile")));
      const expected = new Map(
        markers.map((name) => [
          read(path.join(root, name + ".json")).digest,
          name === "fault-execution-failure-01"
            ? "confirmed-failure"
            : "confirmed-success",
        ]),
      );
      assert.equal(expected.size, markers.length);
      context = await chromium.launchPersistentContext(
        path.join(root, "chromium-profile"),
        {
          executablePath: path.join(
            os.homedir(),
            "Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
          ),
          headless: true,
          viewport: { width: 800, height: 600 },
          args: [
            `--disable-extensions-except=${extension}`,
            `--load-extension=${extension}`,
            `--ignore-certificate-errors-spki-list=${pin}`,
          ],
        },
      );
      context.on("request", (request) => {
        if (/\/ExecuteTransaction(?:$|\?)/.test(request.url())) dispatches++;
        if (/\/SimulateTransaction(?:$|\?)/.test(request.url())) simulations++;
      });
      const worker =
        context.serviceWorkers()[0] ||
        (await context.waitForEvent("serviceworker", { timeout: 20_000 }));
      stage = "current worker verification";
      const loaded = await require("./lib/current-extension-worker.cjs").ensure(
        context,
        worker,
      );
      const page = await context.newPage();
      await page.goto(
        `chrome-extension://${new URL(loaded.worker.url()).host}/ui.html`,
        { waitUntil: "domcontentloaded" },
      );
      stage = "terminal journal validation";
      const before = await snapshot(page),
        records = validate(before, expected);
      const beforeHash = sha(JSON.stringify(before));
      const chain = [];
      for (const row of records) {
        stage = "original digest chain lookup";
        const { response } = await client.ledgerService.getTransaction(
          {
            digest: row.digest,
            readMask: { paths: ["digest", "effects", "checkpoint"] },
          },
          options(),
        );
        const transaction = response.transaction;
        stage = "chain digest equality";
        assert.equal(transaction?.digest, row.digest);
        stage = "chain success equality";
        assert.equal(transaction.effects?.status?.success, row.receipt.success);
        stage = "chain epoch equality";
        assert.equal(transaction.effects?.epoch?.toString(), row.receipt.epoch);
        stage = "chain native effects equality";
        assert.equal(
          Buffer.from(transaction.effects?.bcs?.value ?? []).toString("base64"),
          row.receipt.effectsBase64,
        );
        stage = "chain checkpoint availability";
        assert(transaction.checkpoint !== undefined);
        stage = "chain checkpoint equality";
        if (row.receipt.checkpoint !== null)
          assert.equal(
            transaction.checkpoint.toString(),
            row.receipt.checkpoint,
          );
        chain.push({
          digest: row.digest,
          state: row.state,
          checkpoint: transaction.checkpoint.toString(),
          nativeEffectsMatch: true,
        });
      }
      stage = "unchanged original journal";
      const after = await snapshot(page);
      validate(after, expected);
      assert.equal(sha(JSON.stringify(after)), beforeHash);
      observations.push({
        directory,
        records: records.length,
        pendingScopes: 0,
        logicalSha256: beforeHash,
        logicalContentsUnchanged: true,
        workerProvenance: loaded.evidence,
        chain,
      });
      await context.close();
      context = undefined;
    }
    const last = (await client.ledgerService.getServiceInfo({}, options()))
      .response;
    assert.equal(last.chainId, H0);
    assert(last.checkpointHeight >= first.checkpointHeight);
    assert.equal(dispatches, 0);
    assert.equal(simulations, 0);
    assert.equal(lookups, 7);
    const result = {
      passed: true,
      observedAt: new Date().toISOString(),
      account: address,
      genesisDigest: H0,
      generation,
      compiledProfile,
      profiles: observations,
      chainHeadBefore: first.checkpointHeight.toString(),
      chainHeadAfter: last.checkpointHeight.toString(),
      dispatches,
      simulations,
      lookups,
      certificateMode:
        "precise dev leaf SPKI exception; normal CA not accepted",
      scope:
        "current worker and seven preserved terminal journals, original native effects compared through live Fullnode; no approval or journal writes",
    };
    fs.writeFileSync(output, JSON.stringify(result, null, 2) + "\n", {
      flag: "wx",
      mode: 0o600,
    });
    console.log(
      JSON.stringify({
        passed: true,
        profiles: observations.length,
        records: 7,
        dispatches,
        simulations,
        lookups,
      }),
    );
  } catch (error) {
    // Classify only known public browser failures; never dump profile data or generic error text.
    const workerFailure = [
      "ERR_BLOCKED_BY_CLIENT",
      "ERR_ABORTED",
      "worker target missing",
      "worker debugger command timeout",
      "script lookup timeout",
      "reloaded worker still differs",
      "Timeout",
    ].find((value) => String(error.message).includes(value));
    console.error(
      JSON.stringify({
        passed: false,
        stage,
        profileDirectory,
        workerFailure,
        errorType: error.name,
        dispatches,
        simulations,
        lookups,
      }),
    );
    process.exitCode = 1;
  } finally {
    if (context) await context.close();
  }
})().catch((error) => {
  console.error(JSON.stringify({ passed: false, errorType: error.name }));
  process.exitCode = 1;
});

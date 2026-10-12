// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { probeMovePackageCapabilities } from "../src/shared/rpc/move-package-capabilities";
import { validateNetworkProfile } from "../src/shared/rpc/profile";
import { WalletReadSession } from "../src/shared/rpc/session";
async function main() {
  if (process.argv.length !== 4)
    throw new Error("需要reviewed profile和全新证据输出路径");
  const bytes = readFileSync(resolve(process.argv[2])),
    profile = validateNetworkProfile(JSON.parse(bytes.toString()));
  const session = new WalletReadSession(profile);
  const allowed = [
    "LedgerService/GetServiceInfo",
    "LedgerService/GetObject",
    "MovePackageService/GetPackage",
  ].map((method) => ({
    method,
    url: `${profile.endpoints.fullnodeGrpcWeb}/rtd.rpc.v2.${method}`,
  }));
  const requests: { method: string; requestSha256: string; status?: number }[] =
    [];
  let result;
  try {
    const report = await probeMovePackageCapabilities(session, {
      fetch: async (input, init) => {
        const entry = allowed.find((v) => v.url === String(input));
        if (
          !entry ||
          init?.method !== "POST" ||
          !(init.body instanceof Uint8Array)
        )
          throw new Error("包探测拒绝非白名单只读方法");
        const request = {
          method: entry.method,
          requestSha256: createHash("sha256").update(init.body).digest("hex"),
          status: undefined as number | undefined,
        };
        requests.push(request);
        const response = await fetch(input, init);
        request.status = response.status;
        return response;
      },
    });
    result = {
      probeCompleted: true,
      selectedConfiguredContractsCompatible:
        report.state === "selected-contracts-compatible",
      profileSha256: createHash("sha256").update(bytes).digest("hex"),
      report,
      scope:
        "Actual reviewed wallet codec/call ABI and object/descriptor/typeOrigin association, bytecode from canonical object BCS. Generic user types/payloads opaque, protocol envelopes SDK-pinned, upgraded originalId service declaration only; no code semantics/deployment/registry/global UI/new build/Chrome/signing readiness.",
    };
  } catch (error) {
    result = {
      probeCompleted: false,
      selectedConfiguredContractsCompatible: false,
      failure: {
        name: error instanceof Error ? error.name : "Unknown",
        reason:
          error && typeof error === "object" && "reason" in error
            ? error.reason
            : undefined,
      },
      scope:
        "Actual readonly package assessment failed; raw errors/payloads/credentials withheld.",
    };
  } finally {
    session.close();
  }
  writeFileSync(
    resolve(process.argv[3]),
    JSON.stringify(
      {
        observedAt: new Date().toISOString(),
        ...result,
        requests,
        simulationRequests: 0,
        signingRequests: 0,
        executionRequests: 0,
      },
      null,
      2,
    ) + "\n",
    { flag: "wx" },
  );
  console.log(
    JSON.stringify({
      probeCompleted: result.probeCompleted,
      selectedConfiguredContractsCompatible:
        result.selectedConfiguredContractsCompatible,
      requests: requests.length,
      simulationRequests: 0,
      signingRequests: 0,
      executionRequests: 0,
    }),
  );
  if (!result.probeCompleted) process.exitCode = 1;
}
main().catch(() => {
  console.error("包合同探测准备或证据写入失败，未记通过");
  process.exitCode = 1;
});

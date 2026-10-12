// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { probeDeploymentCapabilities } from "../src/shared/rpc/deployment-capabilities";
import { validateNetworkProfile } from "../src/shared/rpc/profile";
import { WalletReadSession } from "../src/shared/rpc/session";
async function main() {
  if (![4, 6].includes(process.argv.length))
    throw new Error("profile、全新输出、可选审核声明与独立可信SHA需要成对提供");
  const bytes = readFileSync(resolve(process.argv[2])),
    profile = validateNetworkProfile(JSON.parse(bytes.toString()));
  const declaration =
    process.argv.length === 6
      ? {
          json: readFileSync(resolve(process.argv[4]), "utf8"),
          trustedSha256: process.argv[5],
        }
      : undefined;
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
    const report = await probeDeploymentCapabilities(session, {
      declaration,
      fetch: async (url, init) => {
        const entry = allowed.find((e) => e.url === String(url));
        if (
          !entry ||
          init?.method !== "POST" ||
          !(init.body instanceof Uint8Array)
        )
          throw new Error("部署探测拒绝非白名单方法");
        const request = {
          method: entry.method,
          requestSha256: createHash("sha256").update(init.body).digest("hex"),
          status: undefined as number | undefined,
        };
        requests.push(request);
        const response = await fetch(url, init);
        request.status = response.status;
        return response;
      },
    });
    result = {
      probeCompleted: true,
      reviewedDeploymentMatched: report.state === "reviewed-deployment-matched",
      profileSha256: createHash("sha256").update(bytes).digest("hex"),
      report,
    };
  } catch (error) {
    result = {
      probeCompleted: false,
      reviewedDeploymentMatched: false,
      failure: {
        name: error instanceof Error ? error.name : "Unknown",
        reason:
          error && typeof error === "object" && "reason" in error
            ? error.reason
            : undefined,
      },
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
        scope:
          "Fresh readonly Move deployment comparison and local profile revision binding only. Missing independent release declaration is unreviewed. Service software version/deployment and execution semantics remain unverified. No authority derived from these observations, global client, new build or Chrome acceptance.",
      },
      null,
      2,
    ) + "\n",
    { flag: "wx" },
  );
  console.log(
    JSON.stringify({
      probeCompleted: result.probeCompleted,
      reviewedDeploymentMatched: result.reviewedDeploymentMatched,
      requests: requests.length,
      simulationRequests: 0,
      signingRequests: 0,
      executionRequests: 0,
    }),
  );
  if (!result.probeCompleted) process.exitCode = 1;
}
main().catch(() => {
  console.error("部署合同准备或独占证据写入失败，未记通过");
  process.exitCode = 1;
});

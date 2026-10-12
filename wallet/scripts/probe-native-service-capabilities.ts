// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  NATIVE_READ_PROBE_METHODS,
  probeNativeServiceCapabilities,
} from "../src/shared/rpc/native-service-capabilities";
import { validateNetworkProfile } from "../src/shared/rpc/profile";
import { WalletReadSession } from "../src/shared/rpc/session";

async function main() {
  if (process.argv.length !== 4)
    throw new Error("需要reviewed profile和全新证据输出路径");
  const bytes = readFileSync(resolve(process.argv[2]));
  const profile = validateNetworkProfile(JSON.parse(bytes.toString()));
  const session = new WalletReadSession(profile);
  const requests: {
    role: string;
    method: string;
    requestSha256: string;
    status?: number;
  }[] = [];
  const allowed = ["fullnode", "archive"].flatMap((role) => {
    const r = role as "fullnode" | "archive";
    const url =
      r === "fullnode"
        ? profile.endpoints.fullnodeGrpcWeb
        : profile.endpoints.archiveGrpcWeb;
    return url
      ? NATIVE_READ_PROBE_METHODS[r].map((method) => ({
          url: `${url}/rtd.rpc.v2.${method}`,
          role: r,
          method,
        }))
      : [];
  });
  let result;
  try {
    const report = await probeNativeServiceCapabilities(session, {
      fetch: async (input, init) => {
        const entry = allowed.find((v) => v.url === String(input));
        if (
          !entry ||
          init?.method !== "POST" ||
          !(init.body instanceof Uint8Array)
        )
          throw new Error("原生探测禁止非白名单方法／入口");
        const request = {
          role: entry.role,
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
      allProbedMethodsVerified: report.state === "native-probes-verified",
      profileSha256: createHash("sha256").update(bytes).digest("hex"),
      report,
      scope:
        "Actual explicit native readonly positive methods bracketed by identity. Deployment, other methods, full ABI/package/registry, signing/global UI/new artifact/Chrome readiness remain unverified.",
    };
  } catch (error) {
    result = {
      probeCompleted: false,
      allProbedMethodsVerified: false,
      failure: {
        name: error instanceof Error ? error.name : "Unknown",
        reason:
          error && typeof error === "object" && "reason" in error
            ? error.reason
            : undefined,
      },
      scope:
        "Actual readonly native assessment failed; no raw errors or credentials dumped.",
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
      allProbedMethodsVerified: result.allProbedMethodsVerified,
      requests: requests.length,
      simulationRequests: 0,
      signingRequests: 0,
      executionRequests: 0,
    }),
  );
  if (!result.probeCompleted) process.exitCode = 1;
}
main().catch(() => {
  console.error("原生探测准备或证据写入失败，未记通过");
  process.exitCode = 1;
});

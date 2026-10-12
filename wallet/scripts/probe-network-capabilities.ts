// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { probeNetworkCapabilities } from "../src/shared/rpc/network-capabilities";
import { NATIVE_READ_PROBE_METHODS } from "../src/shared/rpc/native-service-capabilities";
import { validateNetworkProfile } from "../src/shared/rpc/profile";
import { WalletReadSession } from "../src/shared/rpc/session";
async function main() {
  if (![4, 6].includes(process.argv.length))
    throw new Error(
      "profile、全新输出与可选公开selector来源／字段必须成对提供",
    );
  const bytes = readFileSync(resolve(process.argv[2])),
    profile = validateNetworkProfile(JSON.parse(bytes.toString()));
  const source = process.argv[4]
      ? readFileSync(resolve(process.argv[4]))
      : undefined,
    field = process.argv[5];
  if (source && !["sender", "target", "deployer"].includes(field))
    throw new Error("只允许明示公开selector字段");
  const selector = source ? JSON.parse(source.toString()) : undefined;
  if (
    selector &&
    (selector.h0 ?? selector.expectedGenesisDigest) !==
      profile.expectedGenesisDigest
  )
    throw new Error("公开selector来源H0错误");
  const address = selector ? (selector[field] as unknown) : undefined;
  if (source && typeof address !== "string")
    throw new Error("公开selector不是字符串地址");
  const session = new WalletReadSession(profile);
  const allowed = new Map<string, { role: string; method: string }>([
    ...[
      ...NATIVE_READ_PROBE_METHODS.fullnode,
      "MovePackageService/GetPackage",
    ].map(
      (method) =>
        [
          `${profile.endpoints.fullnodeGrpcWeb}/rtd.rpc.v2.${method}`,
          { role: "fullnode", method },
        ] as const,
    ),
    ...(profile.endpoints.archiveGrpcWeb
      ? NATIVE_READ_PROBE_METHODS.archive.map(
          (method) =>
            [
              `${profile.endpoints.archiveGrpcWeb}/rtd.rpc.v2.${method}`,
              { role: "archive", method },
            ] as const,
        )
      : []),
    ...(["graphql", "accountHistory"] as const).flatMap((role) => {
      const url =
        role === "graphql"
          ? profile.endpoints.graphqlUrl
          : profile.endpoints.accountHistoryUrl;
      return url ? [[url, { role, method: "GraphQL/query" }] as const] : [];
    }),
  ]);
  const requests: {
    role: string;
    method: string;
    requestSha256: string;
    status?: number;
  }[] = [];
  const started = performance.now();
  let result;
  try {
    const report = await probeNetworkCapabilities(session, {
      address: address as string | undefined,
      fetch: async (url, init) => {
        const target = allowed.get(String(url));
        if (!target || init?.method !== "POST")
          throw new Error("聚合CLI拒绝非白名单只读请求");
        const body = init.body;
        const data =
          typeof body === "string"
            ? Buffer.from(body)
            : body instanceof ArrayBuffer
              ? Buffer.from(body)
              : ArrayBuffer.isView(body)
                ? Buffer.from(body.buffer, body.byteOffset, body.byteLength)
                : undefined;
        if (!data) throw new Error("聚合CLI body格式错误");
        const request = {
          ...target,
          requestSha256: createHash("sha256").update(data).digest("hex"),
          status: undefined as number | undefined,
        };
        requests.push(request);
        const response = await fetch(url, init);
        request.status = response.status;
        return response;
      },
    });
    result = { probeCompleted: true, report };
  } catch (error) {
    result = {
      probeCompleted: false,
      failure: {
        name: error instanceof Error ? error.name : "Unknown",
        reason:
          error && typeof error === "object" && "reason" in error
            ? error.reason
            : undefined,
        role:
          error && typeof error === "object" && "role" in error
            ? error.role
            : undefined,
      },
    };
  } finally {
    session.close();
  }
  const elapsedMs = Math.round(performance.now() - started);
  writeFileSync(
    resolve(process.argv[3]),
    JSON.stringify(
      {
        observedAt: new Date().toISOString(),
        ...result,
        elapsedMs,
        aggregateDefaultBudgetMs: 60000,
        profileSha256: createHash("sha256").update(bytes).digest("hex"),
        selectorSourceSha256: source
          ? createHash("sha256").update(source).digest("hex")
          : undefined,
        requests,
        simulationRequests: 0,
        signingRequests: 0,
        executionRequests: 0,
        scope:
          "Actual configured readonly protocols and fresh identity bookends within one default deadline. Optional production whole-owner facts; hash/count/flags only. Independent per-domain S, no service revision/build attestation, release pin, active client, UI readiness, new bundle or Chrome acceptance.",
      },
      (_, value) => (typeof value === "bigint" ? value.toString() : value),
      2,
    ) + "\n",
    { flag: "wx", mode: 0o600 },
  );
  console.log(
    JSON.stringify({
      probeCompleted: result.probeCompleted,
      elapsedMs,
      requests: requests.length,
      simulationRequests: 0,
      signingRequests: 0,
      executionRequests: 0,
    }),
  );
  if (!result.probeCompleted) process.exitCode = 1;
}
main().catch(() => {
  console.error("聚合准备或独占证据写入失败，未记通过");
  process.exitCode = 1;
});

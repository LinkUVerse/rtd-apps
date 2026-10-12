// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { probeGraphQLDomainCapabilities } from "../src/shared/rpc/graphql-domain-capabilities";
import { validateNetworkProfile } from "../src/shared/rpc/profile";
import { WalletReadSession } from "../src/shared/rpc/session";

async function main() {
  if (process.argv.length !== 4)
    throw new Error("需要reviewed profile和全新证据输出路径");
  const bytes = readFileSync(resolve(process.argv[2]));
  const profile = validateNetworkProfile(JSON.parse(bytes.toString()));
  const session = new WalletReadSession(profile);
  const requests: { status: number; operation: string; querySha256: string }[] =
    [];
  let result;
  try {
    const report = await probeGraphQLDomainCapabilities(session, {
      fetch: async (input, init) => {
        if (
          String(input) !== profile.endpoints.graphqlUrl ||
          init?.method !== "POST"
        )
          throw new Error("领域探测禁止其它入口／方法");
        const body = JSON.parse(String(init.body));
        const name = body.query.match(
          /^query (WalletSchemaCapabilities|WalletSnapshotAdmission|WalletSnapshotPin)\b/,
        )?.[1];
        if (!name) throw new Error("领域探测禁止业务查询／模拟／提交");
        const response = await fetch(input, init);
        requests.push({
          status: response.status,
          operation: name,
          querySha256: createHash("sha256").update(body.query).digest("hex"),
        });
        return response;
      },
    });
    result = {
      probeCompleted: true,
      allDomainsVerified: report.state === "query-protocol-verified",
      profileSha256: createHash("sha256").update(bytes).digest("hex"),
      report,
      requests,
      simulationRequests: 0,
      signingRequests: 0,
      executionRequests: 0,
      scope:
        "Actual native schema and independently admitted eight domain snapshot declarations. Degraded/unconfigured/incomplete rows remain unverified; no business facts, package/accountHistory/global UI/current artifact/Chrome/ready claim.",
    };
  } catch (error) {
    result = {
      probeCompleted: false,
      allDomainsVerified: false,
      requests,
      failure: {
        name: error instanceof Error ? error.name : "Unknown",
        reason:
          error && typeof error === "object" && "reason" in error
            ? error.reason
            : undefined,
      },
      simulationRequests: 0,
      signingRequests: 0,
      executionRequests: 0,
      scope:
        "Real readonly domain assessment failed; no raw errors or credentials dumped.",
    };
  } finally {
    session.close();
  }
  writeFileSync(
    resolve(process.argv[3]),
    JSON.stringify(
      { observedAt: new Date().toISOString(), ...result },
      null,
      2,
    ) + "\n",
    { flag: "wx" },
  );
  console.log(
    JSON.stringify({
      probeCompleted: result.probeCompleted,
      allDomainsVerified: result.allDomainsVerified,
      requests: requests.length,
      simulationRequests: 0,
      signingRequests: 0,
      executionRequests: 0,
    }),
  );
  if (!result.probeCompleted) process.exitCode = 1;
}
main().catch(() => {
  console.error("领域探测准备或证据写入失败，未记通过");
  process.exitCode = 1;
});

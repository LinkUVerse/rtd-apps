// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { probeGraphQLSchemaCapabilities } from "../src/shared/rpc/graphql-schema-capabilities";
import { validateNetworkProfile } from "../src/shared/rpc/profile";
import { WalletReadSession } from "../src/shared/rpc/session";

async function main() {
  if (process.argv.length !== 4)
    throw new Error("需要reviewed profile路径和全新证据输出路径");
  const profileBytes = readFileSync(resolve(process.argv[2]));
  const profile = validateNetworkProfile(JSON.parse(profileBytes.toString()));
  const session = new WalletReadSession(profile);
  const requests: { status: number; querySha256: string }[] = [];
  let result;
  try {
    const report = await probeGraphQLSchemaCapabilities(session, {
      fetch: async (input, init) => {
        if (
          String(input) !== profile.endpoints.graphqlUrl ||
          init?.method !== "POST"
        )
          throw new Error("schema探测禁止其它入口／方法");
        const body = JSON.parse(String(init.body));
        if (!body.query.startsWith("query WalletSchemaCapabilities"))
          throw new Error("schema探测禁止业务查询／模拟／提交");
        const response = await fetch(input, init);
        requests.push({
          status: response.status,
          querySha256: createHash("sha256").update(body.query).digest("hex"),
        });
        return response;
      },
    });
    result = {
      passed: report.state === "schema-compatible",
      profileSha256: createHash("sha256").update(profileBytes).digest("hex"),
      report,
      requests,
      simulationRequests: 0,
      signingRequests: 0,
      executionRequests: 0,
      scope:
        "Actual current native GraphQL H0 and complete schema declarations, ten authored contracts; not coverage/package/accountHistory/global UI/Chrome/ready verification.",
    };
  } catch (error) {
    result = {
      passed: false,
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
        "Readonly real schema probe failed; no raw remote error, profile, credentials or schema dumped.",
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
      passed: result.passed,
      requests: requests.length,
      state: "report" in result ? result.report.state : "failed",
      simulationRequests: 0,
      executionRequests: 0,
    }),
  );
  if (!result.passed) process.exitCode = 1;
}
main().catch(() => {
  console.error("schema探测准备或证据写入失败，未记通过");
  process.exitCode = 1;
});

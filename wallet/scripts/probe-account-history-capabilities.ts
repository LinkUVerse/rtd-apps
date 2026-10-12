// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { probeAccountHistoryCapabilities } from "../src/shared/rpc/account-history-capabilities";
import { validateNetworkProfile } from "../src/shared/rpc/profile";
import { WalletReadSession } from "../src/shared/rpc/session";
async function main() {
  if (![4, 6].includes(process.argv.length))
    throw new Error(
      "profile、全新输出，可选公开selector来源与字段必须成对提供",
    );
  const bytes = readFileSync(resolve(process.argv[2])),
    profile = validateNetworkProfile(JSON.parse(bytes.toString()));
  const source = process.argv[4]
    ? readFileSync(resolve(process.argv[4]))
    : undefined;
  const field = process.argv[5];
  if (source && !["sender", "target", "deployer"].includes(field))
    throw new Error("selector字段不属于明示公开地址");
  const selector = source ? JSON.parse(source.toString()) : undefined;
  if (
    selector &&
    (selector.h0 ?? selector.expectedGenesisDigest) !==
      profile.expectedGenesisDigest
  )
    throw new Error("公开selector来源H0不属于审核profile");
  const address = selector ? (selector[field] as unknown) : undefined;
  if (source && typeof address !== "string")
    throw new Error("公开selector必须是地址字符串");
  const session = new WalletReadSession(profile);
  const allowed = [
    profile.endpoints.graphqlUrl,
    profile.endpoints.accountHistoryUrl,
  ].filter((url): url is string => !!url);
  const requests: { role: string; requestSha256: string; status?: number }[] =
    [];
  let result;
  try {
    const report = await probeAccountHistoryCapabilities(session, {
      address: address as string | undefined,
      fetch: async (url, init) => {
        if (
          !allowed.includes(String(url)) ||
          init?.method !== "POST" ||
          typeof init.body !== "string"
        )
          throw new Error("账户探测拒绝非白名单查询");
        const request = {
          role:
            String(url) === profile.endpoints.accountHistoryUrl
              ? "accountHistory"
              : "graphql",
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
      coverageWindowVerified:
        report.state === "coverage-window-verified" ||
        report.state === "scoped-window-verified",
      accountScopeVerified: report.state === "scoped-window-verified",
      profileSha256: createHash("sha256").update(bytes).digest("hex"),
      selectorSourceSha256: source
        ? createHash("sha256").update(source).digest("hex")
        : undefined,
      report,
    };
  } catch (error) {
    result = {
      probeCompleted: false,
      coverageWindowVerified: false,
      accountScopeVerified: false,
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
          "Actual restricted account protocol, pinned native fixed window and optional production whole-owner read. Public selector hash/count/flags only; opaque server snapshot/cursor, no all-account completeness, global client, build or Chrome acceptance.",
      },
      null,
      2,
    ) + "\n",
    { flag: "wx" },
  );
  console.log(
    JSON.stringify({
      probeCompleted: result.probeCompleted,
      coverageWindowVerified: result.coverageWindowVerified,
      accountScopeVerified: result.accountScopeVerified,
      requests: requests.length,
      simulationRequests: 0,
      signingRequests: 0,
      executionRequests: 0,
    }),
  );
  if (!result.probeCompleted) process.exitCode = 1;
}
main().catch(() => {
  console.error("账户合同准备或独占证据写入失败，未记通过");
  process.exitCode = 1;
});

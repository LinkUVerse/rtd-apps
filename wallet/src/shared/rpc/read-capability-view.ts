// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import type {
  WalletReadCapabilities,
  WalletCapabilityAssessment,
  WalletNativeEndpointView,
  WalletAccountCapabilitiesView,
  WalletGraphQLDomainView,
  WalletDeploymentCapabilitiesView,
} from "rtd-apps-core/src/rpc/capability-types";
import type {
  WalletNetworkCapabilities,
  CapabilityAssessment,
} from "./network-capabilities";
import { NetworkIdentityError, type NetworkIdentityReport } from "./identity";
import {
  NATIVE_READ_PROBE_METHODS,
  type WalletNativeServiceCapabilities,
} from "./native-service-capabilities";
import type { WalletAccountHistoryCapabilities } from "./account-history-capabilities";
import type { WalletGraphQLDomainCapability } from "./graphql-domain-capabilities";
import type { WalletMoveGroupCapability } from "./move-package-capabilities";
import { assertGenesisDigest } from "./profile";
import { checkpointNumber } from "./graphql-snapshot";
import { WalletReadSession } from "./session";
import { walletAddress } from "./asset-address";
import type { EndpointRole } from "./profile";
function literal<const T extends string>(
  value: T,
  allowed: readonly string[],
  role: EndpointRole,
): T {
  if (!allowed.includes(value))
    throw new NetworkIdentityError(role, "incompatible");
  return value;
}
function binding(session: WalletReadSession) {
  session.assertActive();
  return {
    bindingKey: session.bindingKey,
    readSessionKey: session.cacheKey,
    scope: "configured-read-contracts",
    readiness: "not-assessed",
    serviceDeployment: "not-verified",
    crossDomainSnapshot: "not-verified",
    execution: "not-probed",
  } as const;
}
function freeze<T>(value: T): T {
  if (value && typeof value === "object") {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
export function validatingReadCapabilities(
  session: WalletReadSession,
): WalletReadCapabilities {
  return Object.freeze({ ...binding(session), phase: "validating" });
}
export function unavailableReadCapabilities(
  session: WalletReadSession,
  reason: "budget" | "transport" | "policy",
): WalletReadCapabilities {
  return Object.freeze({ ...binding(session), phase: "unavailable", reason });
}
/** A view of a confirmed failure; persistent commitment is a separate admission-store contract. */
export function quarantinedReadCapabilities(
  session: WalletReadSession,
  role: "fullnode" | "graphql" | "archive" | "accountHistory",
  reason: "chain-mismatch" | "incompatible" | "schema" | "abi",
): WalletReadCapabilities {
  return Object.freeze({
    ...binding(session),
    phase: "quarantined",
    role,
    reason,
  });
}
function assessment<T, U>(
  value: CapabilityAssessment<T>,
  project: (value: T) => U,
  role: EndpointRole,
): WalletCapabilityAssessment<U> {
  literal(value.state, ["observed", "incomplete", "unavailable"], role);
  return value.state === "observed"
    ? { state: "observed", value: project(value.value) }
    : {
        state: value.state,
        reason: literal(
          value.reason,
          ["response", "partial", "budget", "transport", "policy"],
          role,
        ),
      };
}
function nativeEndpoint(
  value: WalletNativeServiceCapabilities["endpoints"]["fullnode"],
  role: "fullnode" | "archive",
): WalletNativeEndpointView {
  literal(
    value.state,
    ["unconfigured", "unavailable", "probes-verified", "probes-degraded"],
    role,
  );
  if (value.state === "unconfigured") return { state: "unconfigured" };
  if (value.state === "unavailable")
    return {
      state: "unavailable",
      reason: literal(
        value.reason,
        [
          "unsupported",
          "missing-positive",
          "incompatible",
          "budget",
          "unavailable",
          "changed",
        ],
        role,
      ),
    };
  return {
    state: value.state,
    methods: Object.fromEntries(
      NATIVE_READ_PROBE_METHODS[role].flatMap((method) => {
        const row = value.methods[method];
        if (row)
          literal(row.state, ["positive-read-verified", "unverified"], role);
        return row
          ? [
              [
                method,
                {
                  state: row.state,
                  ...(row.state === "unverified"
                    ? {
                        reason: literal(
                          row.reason,
                          [
                            "unsupported",
                            "missing-positive",
                            "incompatible",
                            "budget",
                            "unavailable",
                          ],
                          role,
                        ),
                      }
                    : {}),
                },
              ],
            ]
          : [];
      }),
    ),
  };
}
function account(
  value: WalletAccountHistoryCapabilities,
): WalletAccountCapabilitiesView {
  literal(
    value.state,
    [
      "unconfigured",
      "coverage-window-verified",
      "scoped-window-verified",
      "syncing",
      "incomplete",
      "unavailable",
    ],
    "accountHistory",
  );
  if (
    value.scope !== "declared-fixed-window-union" ||
    value.allAccountHistoryVerified !== false ||
    value.protocol !== "rtd-account-history-two-root" ||
    value.snapshotVerification !== "service-binding-only" ||
    value.cursorVerification !== "service-authenticated-opaque"
  )
    throw new NetworkIdentityError("accountHistory", "incompatible");
  const base = {
    state: value.state,
    scope: "declared-fixed-window-union",
    allAccountHistoryVerified: false,
  } as const;
  if (
    value.state === "coverage-window-verified" ||
    value.state === "scoped-window-verified"
  ) {
    const window = value.window;
    if (
      !Number.isSafeInteger(window.checkpointLo) ||
      window.checkpointLo < 0 ||
      !Number.isSafeInteger(window.checkpointHi) ||
      window.checkpointHi < window.checkpointLo ||
      typeof window.allAccountActivityCertified !== "boolean"
    )
      throw new NetworkIdentityError("accountHistory", "incompatible");
    try {
      assertGenesisDigest(window.checkpointDigest);
    } catch {
      throw new NetworkIdentityError("accountHistory", "incompatible");
    }
  }
  if (value.state === "scoped-window-verified") {
    if (
      !Number.isSafeInteger(value.totalTransactions) ||
      value.totalTransactions < 0
    )
      throw new NetworkIdentityError("accountHistory", "incompatible");
    for (const key of [
      "registrationComplete",
      "completeForRegisteredKiosks",
      "allAccountActivityCertified",
    ] as const)
      if (typeof value.coverage[key] !== "boolean")
        throw new NetworkIdentityError("accountHistory", "incompatible");
    for (const key of [
      "completeForDiscoveredOwnerTokens",
      "completeForDiscoveredCapabilities",
      "allAccountTransfersCertified",
    ] as const)
      if (
        value.coverage[key] !== null &&
        typeof value.coverage[key] !== "boolean"
      )
        throw new NetworkIdentityError("accountHistory", "incompatible");
  }
  if (value.state === "coverage-window-verified")
    return {
      ...base,
      accountScope: "not-probed",
      window: {
        checkpointLo: value.window.checkpointLo,
        checkpointHi: value.window.checkpointHi,
        checkpointDigest: value.window.checkpointDigest,
        allAccountActivityCertified: value.window.allAccountActivityCertified,
      },
    };
  if (value.state === "scoped-window-verified")
    return {
      ...base,
      accountScope: "scoped-window-verified",
      totalTransactions: value.totalTransactions,
      window: {
        checkpointLo: value.window.checkpointLo,
        checkpointHi: value.window.checkpointHi,
        checkpointDigest: value.window.checkpointDigest,
        allAccountActivityCertified: value.window.allAccountActivityCertified,
      },
      coverage: {
        registrationComplete: value.coverage.registrationComplete,
        completeForRegisteredKiosks: value.coverage.completeForRegisteredKiosks,
        completeForDiscoveredOwnerTokens:
          value.coverage.completeForDiscoveredOwnerTokens,
        completeForDiscoveredCapabilities:
          value.coverage.completeForDiscoveredCapabilities,
        allAccountActivityCertified: value.coverage.allAccountActivityCertified,
        allAccountTransfersCertified:
          value.coverage.allAccountTransfersCertified,
      },
    };
  return {
    ...base,
    accountScope: "not-probed",
    reason: literal(
      value.reason,
      [
        "account-endpoint",
        "native-endpoint",
        "coverage",
        "response",
        "changed",
        "partial",
        "budget",
        "transport",
        "busy",
        "dependency",
        "upstream",
      ],
      "accountHistory",
    ),
  };
}
function genesis(
  session: WalletReadSession,
  value: string,
  role: "fullnode" | "graphql" | "archive",
) {
  try {
    assertGenesisDigest(value);
  } catch {
    throw new NetworkIdentityError(role, "incompatible");
  }
  if (value !== session.profile.expectedGenesisDigest)
    throw new NetworkIdentityError(role, "chain-mismatch");
}
function domain(
  session: WalletReadSession,
  row: WalletGraphQLDomainCapability,
): WalletGraphQLDomainView {
  literal(
    row.state,
    [
      "snapshot-verified",
      "unconfigured",
      "unsupported",
      "syncing",
      "incomplete",
      "unavailable",
    ],
    "graphql",
  );
  if (row.state !== "snapshot-verified")
    return {
      state: row.state,
      reason: literal(
        row.reason,
        [
          "endpoint",
          "name-registry",
          "schema",
          "coverage",
          "response",
          "partial",
          "changed",
          "transport",
        ],
        "graphql",
      ),
    };
  let cache: unknown;
  try {
    cache = JSON.parse(row.proof.cacheKey);
    checkpointNumber(row.proof.checkpoint);
    assertGenesisDigest(row.proof.digest);
  } catch {
    throw new NetworkIdentityError("graphql", "incompatible");
  }
  if (
    row.proof.bindingKey !== session.bindingKey ||
    !Array.isArray(cache) ||
    cache[0] !== session.cacheKey
  )
    throw new NetworkIdentityError("graphql", "incompatible");
  return {
    state: row.state,
    snapshot: { checkpoint: row.proof.checkpoint, digest: row.proof.digest },
  };
}
type MoveGroupView = NonNullable<
  WalletDeploymentCapabilitiesView["move"]
>["groups"]["coins"];
function moveGroup(row: WalletMoveGroupCapability): MoveGroupView {
  literal(
    row.state,
    ["unconfigured", "unsupported", "incomplete", "abi-compatible"],
    "fullnode",
  );
  return {
    state: row.state,
    ...("reason" in row
      ? {
          reason: literal(
            row.reason,
            [
              "contract-not-reviewed",
              "kiosk-package",
              "abi",
              "package",
              "dependency",
              "budget",
            ],
            "fullnode",
          ),
        }
      : {}),
  };
}
/** Explicit, detached status projection. The core never imports wallet probes or transports. */
export function projectReadCapabilities(
  session: WalletReadSession,
  report: WalletNetworkCapabilities,
): WalletReadCapabilities {
  const base = binding(session);
  if (
    report.bindingKey !== session.bindingKey ||
    report.readSessionKey !== session.cacheKey ||
    report.state !== "capabilities-assessed" ||
    report.scope !== base.scope ||
    report.readiness !== base.readiness ||
    report.serviceDeployment !== base.serviceDeployment ||
    report.crossDomainSnapshot !== base.crossDomainSnapshot ||
    report.execution !== base.execution ||
    !Number.isSafeInteger(report.observedAt) ||
    report.observedAt < 0
  )
    throw new NetworkIdentityError("fullnode", "incompatible");
  for (const name of [
    "graphql",
    "native",
    "deployment",
    "accountHistory",
  ] as const) {
    const value = report[name];
    if (
      value.state === "observed" &&
      (value.value.bindingKey !== session.bindingKey ||
        value.value.readSessionKey !== session.cacheKey)
    )
      throw new NetworkIdentityError(
        name === "deployment" || name === "native" ? "fullnode" : name,
        "incompatible",
      );
  }
  const identities = (value: NetworkIdentityReport) => {
    const roles = ["fullnode", "graphql", "archive"] as const;
    if (
      value.bindingKey !== session.bindingKey ||
      value.endpoints.length !== 3 ||
      new Set(value.endpoints.map((row) => row.role)).size !== 3 ||
      roles.some((role) => !value.endpoints.some((row) => row.role === role))
    )
      throw new NetworkIdentityError("fullnode", "incompatible");
    for (const row of value.endpoints) {
      const configured =
        row.role === "fullnode" ||
        !!session.profile.endpoints[
          row.role === "graphql" ? "graphqlUrl" : "archiveGrpcWeb"
        ];
      if (
        !["verified", "unconfigured", "unavailable"].includes(row.state) ||
        (row.state === "unconfigured") === configured
      )
        throw new NetworkIdentityError(row.role, "incompatible");
      if (row.state === "verified")
        genesis(session, row.genesisDigest, row.role);
    }
    if (
      value.state !==
      (value.endpoints.some((row) => row.state === "verified")
        ? "identity-verified"
        : "unavailable")
    )
      throw new NetworkIdentityError("fullnode", "incompatible");
    return {
      fullnode: value.endpoints.find((row) => row.role === "fullnode")!.state,
      graphql: value.endpoints.find((row) => row.role === "graphql")!.state,
      archive: value.endpoints.find((row) => row.role === "archive")!.state,
    };
  };
  if (
    report.graphql.state === "observed" &&
    (report.graphql.value.schema.bindingKey !== session.bindingKey ||
      report.graphql.value.schema.readSessionKey !== session.cacheKey)
  )
    throw new NetworkIdentityError("graphql", "incompatible");
  if (
    report.graphql.state === "observed" &&
    report.graphql.value.schema.state !== "unconfigured"
  )
    genesis(session, report.graphql.value.schema.genesisDigest, "graphql");
  if (report.native.state === "observed") {
    for (const role of ["fullnode", "archive"] as const) {
      const endpoint = report.native.value.endpoints[role];
      if (
        endpoint.state === "probes-verified" ||
        endpoint.state === "probes-degraded"
      )
        genesis(session, endpoint.genesisDigest, role);
    }
  }
  if (report.deployment.state === "observed" && report.deployment.value.move) {
    const move = report.deployment.value.move;
    if (
      move.bindingKey !== session.bindingKey ||
      move.readSessionKey !== session.cacheKey
    )
      throw new NetworkIdentityError("fullnode", "incompatible");
    genesis(session, move.genesisDigest, "fullnode");
  }
  if (report.deployment.state === "observed") {
    for (const row of report.deployment.value.packages) {
      try {
        if (walletAddress(row.packageId) !== row.packageId) throw new Error();
      } catch {
        throw new NetworkIdentityError("fullnode", "incompatible");
      }
      literal(
        row.state,
        ["pin-matched", "pin-mismatch", "incomplete"],
        "fullnode",
      );
    }
  }
  const result: WalletReadCapabilities = {
    ...base,
    phase: "read-contracts-assessed",
    observedAt: report.observedAt,
    identity: {
      before: identities(report.identity.before),
      after: identities(report.identity.after),
    },
    graphql: assessment(
      report.graphql,
      (value) => ({
        state: literal(
          value.state,
          [
            "unconfigured",
            "query-protocol-verified",
            "query-protocol-degraded",
          ],
          "graphql",
        ),
        schema: literal(
          value.schema.state,
          ["unconfigured", "schema-compatible", "schema-degraded"],
          "graphql",
        ),
        domains: {
          balances: domain(session, value.domains.balances),
          coinMetadata: domain(session, value.domains.coinMetadata),
          staking: domain(session, value.domains.staking),
          assets: domain(session, value.domains.assets),
          names: domain(session, value.domains.names),
          sentTransactions: domain(session, value.domains.sentTransactions),
          eventsByType: domain(session, value.domains.eventsByType),
          eventsByModule: domain(session, value.domains.eventsByModule),
        },
      }),
      "graphql",
    ),
    native: assessment(
      report.native,
      (value) => ({
        state: literal(
          value.state,
          ["native-probes-verified", "native-probes-degraded"],
          "fullnode",
        ),
        endpoints: {
          fullnode: nativeEndpoint(value.endpoints.fullnode, "fullnode"),
          archive: nativeEndpoint(value.endpoints.archive, "archive"),
        },
      }),
      "fullnode",
    ),
    deployment: assessment(
      report.deployment,
      (value) => ({
        state: literal(
          value.state,
          [
            "unreviewed",
            "declaration-rejected",
            "reviewed-deployment-matched",
            "reviewed-deployment-degraded",
          ],
          "fullnode",
        ),
        declaration: {
          state: literal(
            value.declaration.state,
            ["missing", "rejected", "release-pin-matched"],
            "fullnode",
          ),
          ...(value.declaration.state === "rejected"
            ? {
                reason: literal(
                  value.declaration.reason,
                  ["declaration", "trust", "binding", "budget", "registry"],
                  "fullnode",
                ),
              }
            : {}),
        },
        packages: value.packages.map((row) => ({
          packageId: row.packageId,
          state: row.state,
        })),
        registry: literal(
          value.registry.state,
          ["unconfigured", "unreviewed", "incomplete", "anchor-matched"],
          "fullnode",
        ),
        move: value.move
          ? {
              state: literal(
                value.move.state,
                [
                  "selected-contracts-compatible",
                  "selected-contracts-degraded",
                ],
                "fullnode",
              ),
              groups: {
                standardLibrary: moveGroup(value.move.groups.standardLibrary),
                readerSupport: moveGroup(value.move.groups.readerSupport),
                coins: moveGroup(value.move.groups.coins),
                staking: moveGroup(value.move.groups.staking),
                dynamicFields: moveGroup(value.move.groups.dynamicFields),
                display: moveGroup(value.move.groups.display),
                framework: moveGroup(value.move.groups.framework),
                kiosk: moveGroup(value.move.groups.kiosk),
                personalKiosk: moveGroup(value.move.groups.personalKiosk),
                originByteDiscovery: moveGroup(
                  value.move.groups.originByteDiscovery,
                ),
                originByteExecution: moveGroup(
                  value.move.groups.originByteExecution,
                ),
                names: moveGroup(value.move.groups.names),
              },
            }
          : null,
      }),
      "fullnode",
    ),
    accountHistory: assessment(
      report.accountHistory,
      account,
      "accountHistory",
    ),
  };
  session.assertActive();
  return freeze(result);
}

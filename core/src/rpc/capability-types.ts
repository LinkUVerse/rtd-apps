// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
/** Public read observations only. Never a client, transaction input or signing authority. */
export type WalletCapabilityAssessment<T> = Readonly<
  | { state: "observed"; value: T }
  | {
      state: "incomplete" | "unavailable";
      reason: "response" | "partial" | "budget" | "transport" | "policy";
    }
>;
export type WalletCapabilityRole =
  | "fullnode"
  | "graphql"
  | "archive"
  | "accountHistory";
export type WalletGraphQLCapabilityDomain =
  | "balances"
  | "coinMetadata"
  | "staking"
  | "assets"
  | "names"
  | "sentTransactions"
  | "eventsByType"
  | "eventsByModule";
export interface WalletGraphQLDomainView {
  readonly state:
    | "snapshot-verified"
    | "unconfigured"
    | "unsupported"
    | "syncing"
    | "incomplete"
    | "unavailable";
  readonly reason?:
    | "endpoint"
    | "name-registry"
    | "schema"
    | "coverage"
    | "response"
    | "partial"
    | "changed"
    | "transport";
  readonly snapshot?: Readonly<{ checkpoint: string; digest: string }>;
}
export interface WalletGraphQLCapabilitiesView {
  readonly state:
    | "unconfigured"
    | "query-protocol-verified"
    | "query-protocol-degraded";
  readonly schema: "unconfigured" | "schema-compatible" | "schema-degraded";
  readonly domains: Readonly<
    Record<WalletGraphQLCapabilityDomain, WalletGraphQLDomainView>
  >;
}
export type WalletNativeCapabilityMethod =
  | "LedgerService/GetServiceInfo"
  | "LedgerService/GetCheckpoint"
  | "LedgerService/GetObject"
  | "StateService/GetCoinInfo"
  | "MovePackageService/GetDatatype"
  | "MovePackageService/GetFunction";
export interface WalletNativeEndpointView {
  readonly state:
    | "unconfigured"
    | "unavailable"
    | "probes-verified"
    | "probes-degraded";
  readonly reason?:
    | "unsupported"
    | "missing-positive"
    | "incompatible"
    | "budget"
    | "unavailable"
    | "changed";
  readonly methods?: Readonly<
    Partial<
      Record<
        WalletNativeCapabilityMethod,
        Readonly<{
          state: "positive-read-verified" | "unverified";
          reason?:
            | "unsupported"
            | "missing-positive"
            | "incompatible"
            | "budget"
            | "unavailable";
        }>
      >
    >
  >;
}
export interface WalletNativeCapabilitiesView {
  readonly state: "native-probes-verified" | "native-probes-degraded";
  readonly endpoints: Readonly<
    Record<"fullnode" | "archive", WalletNativeEndpointView>
  >;
}
export type WalletMoveCapabilityGroup =
  | "standardLibrary"
  | "readerSupport"
  | "coins"
  | "staking"
  | "dynamicFields"
  | "display"
  | "framework"
  | "kiosk"
  | "personalKiosk"
  | "originByteDiscovery"
  | "originByteExecution"
  | "names";
export interface WalletDeploymentCapabilitiesView {
  readonly state:
    | "unreviewed"
    | "declaration-rejected"
    | "reviewed-deployment-matched"
    | "reviewed-deployment-degraded";
  readonly declaration: Readonly<{
    state: "missing" | "rejected" | "release-pin-matched";
    reason?: "declaration" | "trust" | "binding" | "budget" | "registry";
  }>;
  readonly packages: readonly Readonly<{
    packageId: string;
    state: "pin-matched" | "pin-mismatch" | "incomplete";
  }>[];
  readonly move: Readonly<{
    state: "selected-contracts-compatible" | "selected-contracts-degraded";
    groups: Readonly<
      Record<
        WalletMoveCapabilityGroup,
        Readonly<{
          state:
            | "unconfigured"
            | "unsupported"
            | "incomplete"
            | "abi-compatible";
          reason?:
            | "contract-not-reviewed"
            | "kiosk-package"
            | "abi"
            | "package"
            | "dependency"
            | "budget";
        }>
      >
    >;
  }> | null;
  readonly registry:
    | "unconfigured"
    | "unreviewed"
    | "incomplete"
    | "anchor-matched";
}
export interface WalletAccountCapabilitiesView {
  readonly state:
    | "unconfigured"
    | "coverage-window-verified"
    | "scoped-window-verified"
    | "syncing"
    | "incomplete"
    | "unavailable";
  readonly reason?:
    | "account-endpoint"
    | "native-endpoint"
    | "coverage"
    | "response"
    | "changed"
    | "partial"
    | "budget"
    | "transport"
    | "busy"
    | "dependency"
    | "upstream";
  readonly scope: "declared-fixed-window-union";
  readonly allAccountHistoryVerified: false;
  readonly accountScope: "not-probed" | "scoped-window-verified";
  readonly totalTransactions?: number;
  readonly window?: Readonly<{
    checkpointLo: number;
    checkpointHi: number;
    checkpointDigest: string;
    allAccountActivityCertified: boolean;
  }>;
  readonly coverage?: Readonly<{
    registrationComplete: boolean;
    completeForRegisteredKiosks: boolean;
    completeForDiscoveredOwnerTokens: boolean | null;
    completeForDiscoveredCapabilities: boolean | null;
    allAccountActivityCertified: boolean;
    allAccountTransfersCertified: boolean | null;
  }>;
}
interface WalletReadCapabilitiesBinding {
  readonly bindingKey: string;
  readonly readSessionKey: string;
  readonly scope: "configured-read-contracts";
  readonly readiness: "not-assessed";
  readonly serviceDeployment: "not-verified";
  readonly crossDomainSnapshot: "not-verified";
  readonly execution: "not-probed";
}
export type WalletReadCapabilities = WalletReadCapabilitiesBinding &
  Readonly<
    | { phase: "validating" }
    | { phase: "unavailable"; reason: "transport" | "budget" | "policy" }
    | {
        phase: "quarantined";
        role: WalletCapabilityRole;
        reason: "chain-mismatch" | "incompatible" | "schema" | "abi";
      }
    | {
        phase: "read-contracts-assessed";
        observedAt: number;
        identity: Readonly<{
          before: Readonly<
            Record<
              Exclude<WalletCapabilityRole, "accountHistory">,
              "verified" | "unconfigured" | "unavailable"
            >
          >;
          after: Readonly<
            Record<
              Exclude<WalletCapabilityRole, "accountHistory">,
              "verified" | "unconfigured" | "unavailable"
            >
          >;
        }>;
        graphql: WalletCapabilityAssessment<WalletGraphQLCapabilitiesView>;
        native: WalletCapabilityAssessment<WalletNativeCapabilitiesView>;
        deployment: WalletCapabilityAssessment<WalletDeploymentCapabilitiesView>;
        accountHistory: WalletCapabilityAssessment<WalletAccountCapabilitiesView>;
      }
  >;

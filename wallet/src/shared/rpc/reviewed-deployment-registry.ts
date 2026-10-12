// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { networkBindingKey, type ValidatedNetworkProfile } from "./profile";
import {
  verifyReviewedDeployment,
  WalletDeploymentContractError,
  type ReviewedWalletDeployment,
} from "./deployment-contract";
export type ReviewedDeploymentSelection = Readonly<
  | { state: "unreviewed"; reason: "registry-missing" | "binding-missing" }
  | {
      state: "rejected";
      reason:
        | "format"
        | "duplicate-binding"
        | WalletDeploymentContractError["reason"];
    }
  | {
      state: "reviewed";
      authority: "caller-pinned-release-config";
      input: Readonly<{ json: string; trustedSha256: string }>;
      declaration: ReviewedWalletDeployment;
    }
>;
class RegistryError extends Error {
  constructor(readonly reason: "format" | "duplicate-binding" | "budget") {
    super("发布配置未通过精确合同");
  }
}
function record(
  value: unknown,
  keys: readonly string[],
): Record<string, unknown> {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).length !== keys.length ||
    keys.some((k) => !Object.hasOwn(value, k))
  )
    throw new RegistryError("format");
  return value as Record<string, unknown>;
}
/** Only a caller's separately controlled release configuration. No network, profile pin synthesis or default binding. */
export async function selectReviewedDeployment(
  profile: ValidatedNetworkProfile,
  registryJson: string | undefined,
): Promise<ReviewedDeploymentSelection> {
  if (registryJson === undefined || registryJson === "")
    return Object.freeze({ state: "unreviewed", reason: "registry-missing" });
  try {
    if (typeof registryJson !== "string") throw new RegistryError("format");
    if (new TextEncoder().encode(registryJson).length > 1024 * 1024)
      throw new RegistryError("budget");
    const parsed: unknown = JSON.parse(registryJson);
    if (JSON.stringify(parsed) !== registryJson)
      throw new RegistryError("format");
    const registry = record(parsed, ["schemaVersion", "entries"]);
    if (registry.schemaVersion !== 1 || !Array.isArray(registry.entries))
      throw new RegistryError("format");
    if (registry.entries.length > 16) throw new RegistryError("budget");
    const seen = new Set<string>();
    let selected: { json: string; trustedSha256: string } | undefined;
    for (const value of registry.entries) {
      const row = record(value, ["profileBindingKey", "json", "trustedSha256"]);
      if (
        typeof row.profileBindingKey !== "string" ||
        !row.profileBindingKey ||
        typeof row.json !== "string" ||
        typeof row.trustedSha256 !== "string" ||
        !/^[a-f0-9]{64}$/.test(row.trustedSha256)
      )
        throw new RegistryError("format");
      if (
        new TextEncoder().encode(row.profileBindingKey).length > 16384 ||
        new TextEncoder().encode(row.json).length > 65536
      )
        throw new RegistryError("budget");
      if (seen.has(row.profileBindingKey))
        throw new RegistryError("duplicate-binding");
      seen.add(row.profileBindingKey);
      if (row.profileBindingKey === networkBindingKey(profile))
        selected = { json: row.json, trustedSha256: row.trustedSha256 };
    }
    if (!selected)
      return Object.freeze({ state: "unreviewed", reason: "binding-missing" });
    const input = Object.freeze(selected),
      declaration = await verifyReviewedDeployment(profile, input);
    return Object.freeze({
      state: "reviewed",
      authority: "caller-pinned-release-config",
      input,
      declaration,
    });
  } catch (error) {
    return Object.freeze({
      state: "rejected",
      reason:
        error instanceof RegistryError ||
        error instanceof WalletDeploymentContractError
          ? error.reason
          : "format",
    });
  }
}

// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { bcs } from "rtd-typescript/bcs";
import {
  deriveDynamicFieldID,
  normalizeStructTag,
  toBase64,
} from "rtd-typescript/utils";
import type { WalletFreshObject } from "rtd-apps-core/src/rpc/WalletRpcContext";
import { walletAddress } from "./asset-address";
import {
  A,
  T,
  datatype,
  primitive,
  struct,
  typeParameter,
} from "./move-contract-template";
import { networkBindingKey, type ValidatedNetworkProfile } from "./profile";
import {
  walletMoveContracts,
  type WalletMovePackageContract,
} from "./wallet-move-contracts";
import type { WalletMovePackageAssociation } from "./move-package-capabilities";

export class WalletDeploymentContractError extends Error {
  constructor(
    readonly reason:
      | "declaration"
      | "trust"
      | "binding"
      | "budget"
      | "registry",
  ) {
    super("部署声明或名称锚未通过合同核验");
    this.name = "WalletDeploymentContractError";
  }
}
export interface ReviewedWalletDeployment {
  readonly schemaVersion: 1;
  readonly reviewId: string;
  readonly profileBindingKey: string;
  readonly packages: readonly Readonly<{
    storageId: string;
    originalId: string;
    version: string;
    objectBcsSha256: string;
    modules: readonly Readonly<{ name: string; bytecodeSha256: string }>[];
  }>[];
  readonly nameRegistry: Readonly<{
    layout: "suins-v1";
    rootId: string;
    initialSharedVersion: string;
    registryFieldId: string;
  }> | null;
}

export async function deploymentSha256(bytes: Uint8Array): Promise<string> {
  const value = new Uint8Array(
    await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes)),
  );
  return [...value].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function reject(
  reason: WalletDeploymentContractError["reason"] = "declaration",
): never {
  throw new WalletDeploymentContractError(reason);
}
function record(
  value: unknown,
  keys: readonly string[],
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) reject();
  const row = value as Record<string, unknown>;
  if (
    Object.keys(row).length !== keys.length ||
    keys.some((k) => !Object.hasOwn(row, k))
  )
    reject();
  return row;
}
function sha(value: unknown): string {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value)) reject();
  return value;
}
function address(value: unknown): string {
  try {
    const result = walletAddress(value);
    if (result !== value) reject();
    return result;
  } catch {
    return reject();
  }
}
function version(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^[1-9][0-9]{0,19}$/.test(value) ||
    BigInt(value) > 0xffffffffffffffffn
  )
    reject();
  return value;
}
export function deploymentPackageIds(
  profile: ValidatedNetworkProfile,
): readonly string[] {
  const selected = Object.values(walletMoveContracts(profile)).flatMap((g) =>
    g.state === "configured" ? g.contracts.map((c) => c.packageId) : [],
  );
  return Object.freeze(
    [
      ...new Set(
        [
          ...selected,
          profile.packages.kiosk,
          profile.packages.personalKiosk,
          profile.packages.name?.packageId,
          profile.packages.originByte?.discoveryPackage,
          profile.packages.originByte?.executionPackage,
        ].filter((id): id is string => id !== undefined),
      ),
    ].sort(),
  );
}

/** The hash must come from an independent trusted release configuration, never from the response carrying json. */
export async function verifyReviewedDeployment(
  profile: ValidatedNetworkProfile,
  input: { json: string; trustedSha256: string },
): Promise<ReviewedWalletDeployment> {
  if (typeof input.json !== "string" || input.json.length > 65_536)
    reject("budget");
  const bytes = new TextEncoder().encode(input.json);
  if (bytes.length > 65_536) reject("budget");
  if (
    typeof input.trustedSha256 !== "string" ||
    !/^[a-f0-9]{64}$/.test(input.trustedSha256) ||
    (await deploymentSha256(bytes)) !== input.trustedSha256
  )
    reject("trust");
  let parsed: unknown;
  try {
    parsed = JSON.parse(input.json);
  } catch {
    return reject();
  }
  // Compact exact re-encoding also rejects duplicate keys, alternate numeric spellings and discarded escapes.
  if (JSON.stringify(parsed) !== input.json) reject();
  const raw = record(parsed, [
    "schemaVersion",
    "reviewId",
    "profileBindingKey",
    "packages",
    "nameRegistry",
  ]);
  if (
    raw.schemaVersion !== 1 ||
    typeof raw.reviewId !== "string" ||
    !/^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/.test(raw.reviewId)
  )
    reject();
  if (raw.profileBindingKey !== networkBindingKey(profile)) reject("binding");
  if (!Array.isArray(raw.packages) || raw.packages.length > 32)
    reject("budget");
  const packages = raw.packages.map((value) => {
    const pkg = record(value, [
      "storageId",
      "originalId",
      "version",
      "objectBcsSha256",
      "modules",
    ]);
    if (
      !Array.isArray(pkg.modules) ||
      !pkg.modules.length ||
      pkg.modules.length > 256
    )
      reject("budget");
    const modules = pkg.modules.map((value) => {
      const m = record(value, ["name", "bytecodeSha256"]);
      if (
        typeof m.name !== "string" ||
        !/^[_A-Za-z][_A-Za-z0-9]{0,127}$/.test(m.name)
      )
        reject();
      return Object.freeze({
        name: m.name,
        bytecodeSha256: sha(m.bytecodeSha256),
      });
    });
    if (new Set(modules.map((m) => m.name)).size !== modules.length) reject();
    return Object.freeze({
      storageId: address(pkg.storageId),
      originalId: address(pkg.originalId),
      version: version(pkg.version),
      objectBcsSha256: sha(pkg.objectBcsSha256),
      modules: Object.freeze(modules),
    });
  });
  const ids = packages.map((p) => p.storageId).sort();
  if (
    new Set(ids).size !== ids.length ||
    JSON.stringify(ids) !== JSON.stringify(deploymentPackageIds(profile))
  )
    reject();
  let nameRegistry: ReviewedWalletDeployment["nameRegistry"] = null;
  if (profile.packages.name) {
    const anchor = record(raw.nameRegistry, [
      "layout",
      "rootId",
      "initialSharedVersion",
      "registryFieldId",
    ]);
    if (anchor.layout !== "suins-v1") reject();
    nameRegistry = Object.freeze({
      layout: "suins-v1",
      rootId: address(anchor.rootId),
      initialSharedVersion: version(anchor.initialSharedVersion),
      registryFieldId: address(anchor.registryFieldId),
    });
    const configured = profile.packages.name;
    const distinct = [
      nameRegistry.rootId,
      nameRegistry.registryFieldId,
      configured.forwardRegistry,
      configured.reverseRegistry,
    ];
    if (
      new Set(distinct).size !== distinct.length ||
      distinct.some((id) => ids.includes(id)) ||
      nameRegistry.registryFieldId !==
        nameRegistryFieldId(configured.packageId, nameRegistry.rootId)
    )
      reject("registry");
  } else if (raw.nameRegistry !== null) reject();
  return Object.freeze({
    schemaVersion: 1,
    reviewId: raw.reviewId,
    profileBindingKey: raw.profileBindingKey as string,
    packages: Object.freeze(packages),
    nameRegistry,
  });
}

export function matchesDeploymentPackage(
  expected: ReviewedWalletDeployment["packages"][number],
  observed: WalletMovePackageAssociation,
): boolean {
  const modules = (rows: readonly { name: string; bytecodeSha256: string }[]) =>
    JSON.stringify(
      [...rows]
        .map((m) => [m.name, m.bytecodeSha256])
        .sort((a, b) => a[0].localeCompare(b[0])),
    );
  return (
    expected.storageId === observed.storageId &&
    expected.originalId === observed.originalId &&
    expected.version === observed.version &&
    expected.objectBcsSha256 === observed.objectBcsSha256 &&
    modules(expected.modules) === modules(observed.modules)
  );
}

/** Fixed upstream Registry layout; empty RegistryKey is compiled to a false dummy bool in current RTD. */
export function nameRegistryMoveContract(
  packageId: string,
): WalletMovePackageContract {
  const id = walletAddress(packageId),
    d = (module: string, name: string) => datatype(`${id}::${module}::${name}`);
  return {
    packageId: id,
    functions: [],
    datatypes: [
      struct(
        id,
        "registry",
        "Registry",
        [A.STORE],
        [
          [
            "registry",
            datatype(
              "0x2::table::Table",
              d("domain", "Domain"),
              d("name_record", "NameRecord"),
            ),
          ],
          [
            "reverse_registry",
            datatype(
              "0x2::table::Table",
              primitive(T.ADDRESS),
              d("domain", "Domain"),
            ),
          ],
        ],
      ),
      struct(
        id,
        "suins",
        "RegistryKey",
        [A.COPY, A.DROP, A.STORE],
        [["dummy_field", primitive(T.BOOL)]],
        [typeParameter([], true)],
      ),
    ],
  };
}
export function nameRegistryFieldId(packageId: string, rootId: string): string {
  return deriveDynamicFieldID(
    rootId,
    `${packageId}::suins::RegistryKey<${packageId}::registry::Registry>`,
    new Uint8Array([0]),
  );
}
const table = bcs.struct("Table", { id: bcs.Address, size: bcs.u64() });
export const NAME_REGISTRY_FIELD_BCS = bcs.struct("RegistryField", {
  id: bcs.Address,
  name: bcs.struct("RegistryKey", { dummy_field: bcs.bool() }),
  value: bcs.struct("Registry", { registry: table, reverse_registry: table }),
});
export function verifyNameRegistryRoot(
  profile: ValidatedNetworkProfile,
  anchor: NonNullable<ReviewedWalletDeployment["nameRegistry"]>,
  object: WalletFreshObject,
): void {
  if (
    object.objectId !== anchor.rootId ||
    object.type !==
      normalizeStructTag(`${profile.packages.name!.packageId}::suins::SuiNS`) ||
    object.owner.$kind !== "Shared" ||
    object.owner.Shared.initialSharedVersion !== anchor.initialSharedVersion
  )
    reject("registry");
}
export function verifyNameRegistryField(
  profile: ValidatedNetworkProfile,
  anchor: NonNullable<ReviewedWalletDeployment["nameRegistry"]>,
  object: WalletFreshObject,
): Readonly<{ forwardSize: string; reverseSize: string }> {
  try {
    const cfg = profile.packages.name!;
    const key = `${cfg.packageId}::suins::RegistryKey<${cfg.packageId}::registry::Registry>`;
    const type = normalizeStructTag(
      `0x2::dynamic_field::Field<${key},${cfg.packageId}::registry::Registry>`,
    );
    if (
      object.objectId !== anchor.registryFieldId ||
      object.type !== type ||
      object.owner.$kind !== "ObjectOwner" ||
      object.owner.ObjectOwner !== anchor.rootId ||
      object.content.length !== 113
    )
      reject("registry");
    const value = NAME_REGISTRY_FIELD_BCS.parse(object.content);
    if (
      toBase64(NAME_REGISTRY_FIELD_BCS.serialize(value).toBytes()) !==
        toBase64(object.content) ||
      value.id !== anchor.registryFieldId ||
      value.name.dummy_field ||
      value.value.registry.id !== cfg.forwardRegistry ||
      value.value.reverse_registry.id !== cfg.reverseRegistry
    )
      reject("registry");
    return Object.freeze({
      forwardSize: value.value.registry.size,
      reverseSize: value.value.reverse_registry.size,
    });
  } catch {
    return reject("registry");
  }
}

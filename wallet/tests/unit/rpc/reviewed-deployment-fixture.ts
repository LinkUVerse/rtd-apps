// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Synthetic pins computed from fixture bytes only. Never independent release authority.
import { normalizeRtdAddress } from "rtd-typescript/utils";
import {
  deploymentSha256,
  nameRegistryFieldId,
} from "../../../src/shared/rpc/deployment-contract";
import { movePackageFixtures } from "../../../src/shared/rpc/move-package-fixture";
import {
  networkBindingKey,
  type ValidatedNetworkProfile,
} from "../../../src/shared/rpc/profile";

export async function reviewedDeploymentFixture(
  profile: ValidatedNetworkProfile,
) {
  const { packages, objects } = movePackageFixtures(profile);
  const declaration = {
    schemaVersion: 1,
    reviewId: "synthetic-registry-fixture",
    profileBindingKey: networkBindingKey(profile),
    packages: await Promise.all(
      [...packages].map(async ([storageId, pkg]) => ({
        storageId,
        originalId: pkg.originalId!,
        version: pkg.version!.toString(),
        objectBcsSha256: await deploymentSha256(
          objects.get(storageId)!.bcs!.value!,
        ),
        modules: await Promise.all(
          pkg.modules.map(async (m) => ({
            name: m.name!,
            bytecodeSha256: await deploymentSha256(new Uint8Array([1, 2, 3])),
          })),
        ),
      })),
    ),
    nameRegistry: profile.packages.name
      ? {
          layout: "suins-v1",
          rootId: normalizeRtdAddress("0x8"),
          initialSharedVersion: "1",
          registryFieldId: nameRegistryFieldId(
            profile.packages.name.packageId,
            normalizeRtdAddress("0x8"),
          ),
        }
      : null,
  };
  async function input() {
    const json = JSON.stringify(declaration);
    return {
      json,
      trustedSha256: await deploymentSha256(new TextEncoder().encode(json)),
    };
  }
  const entry = {
    profileBindingKey: networkBindingKey(profile),
    ...(await input()),
  };
  return {
    declaration,
    input,
    entry,
    registry: JSON.stringify({ schemaVersion: 1, entries: [entry] }),
  };
}

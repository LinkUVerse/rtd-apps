// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { deriveObjectID, normalizeStructTag } from "rtd-typescript/utils";
import type {
  WalletDisplayBasis,
  WalletDisplayHistoryCapability,
  WalletDisplayHistoryCoverage,
} from "rtd-apps-core/src/rpc/display-types";

import { walletAddress } from "./asset-address";
import {
  checkpointNumber,
  type GraphQLSnapshotProof,
  responseRecord,
  SnapshotReadError,
} from "./graphql-snapshot";
import { assertGenesisDigest } from "./profile";

export const DISPLAY_COVERAGE_SELECTION = `genesisDigest sourceId generation
  firstCheckpoint lastCheckpoint lastCheckpointDigest snapshotCheckpoint snapshotCheckpointDigest`;

export const DISPLAY_HISTORY_SELECTION = `walletDisplayService: serviceConfig {
  displayHistory { apiVersion supportedTemplateKinds coverage { ${DISPLAY_COVERAGE_SELECTION} } }
}`;

export const DISPLAY_BASIS_SELECTION = `basis { __typename
  ... on DisplayV1Basis {
    snapshotCheckpoint objectType templateId publishedVersion sourceCheckpoint sourceCheckpointDigest
    transactionDigest checkpointTransactionIndex eventIndex eventBcsSha256
    historyCoverage { ${DISPLAY_COVERAGE_SELECTION} }
  }
  ... on DisplayV2Basis {
    snapshotCheckpoint objectType templateId objectVersion objectDigest sourceCheckpoint
    previousTransactionDigest contentsBcsSha256 historyCoverage { ${DISPLAY_COVERAGE_SELECTION} }
  }
}`;

function digest(value: unknown): string {
  try {
    return assertGenesisDigest(value);
  } catch {
    throw new SnapshotReadError("incompatible");
  }
}

function binding(value: unknown): string {
  if (
    typeof value !== "string" ||
    !value.length ||
    new TextEncoder().encode(value).length > 256 ||
    /[\x00-\x1f\x7f-\x9f]/.test(value)
  )
    throw new SnapshotReadError("incompatible");
  return value;
}

function sha256(value: unknown): string {
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/.test(value))
    throw new SnapshotReadError("incompatible");
  return value;
}

export function displayHistoryCoverage(
  value: unknown,
  expectedGenesis: string,
  checkpoint: number,
  snapshotDigest: string,
  expected?: WalletDisplayHistoryCoverage,
): WalletDisplayHistoryCoverage {
  const raw = responseRecord(value);
  const genesisDigest = digest(raw.genesisDigest);
  const sourceId = binding(raw.sourceId);
  const generation = binding(raw.generation);
  const first = checkpointNumber(raw.firstCheckpoint);
  const last = checkpointNumber(raw.lastCheckpoint);
  const lastDigest = digest(raw.lastCheckpointDigest);
  const snapshot = checkpointNumber(raw.snapshotCheckpoint);
  const pinnedDigest = digest(raw.snapshotCheckpointDigest);
  if (
    genesisDigest !== expectedGenesis ||
    snapshot !== checkpoint ||
    pinnedDigest !== snapshotDigest ||
    (expected &&
      (genesisDigest !== expected.genesisDigest ||
        sourceId !== expected.sourceId ||
        generation !== expected.generation))
  )
    throw new SnapshotReadError("changed");
  if (first !== 0 || last < checkpoint) throw new SnapshotReadError("coverage");
  if (
    (checkpoint === 0 && pinnedDigest !== genesisDigest) ||
    (last === 0 && lastDigest !== genesisDigest) ||
    (last === checkpoint && lastDigest !== pinnedDigest)
  )
    throw new SnapshotReadError("changed");
  // The live upper bound may advance during a multi-page read; the pinned source and S cannot.
  return Object.freeze({
    genesisDigest,
    sourceId,
    generation,
    firstCheckpoint: String(first),
    lastCheckpoint: String(last),
    lastCheckpointDigest: lastDigest,
    snapshotCheckpoint: String(snapshot),
    snapshotCheckpointDigest: pinnedDigest,
  });
}

export function displayHistoryCapability(
  service: unknown,
  expectedGenesis: string,
  checkpoint: number,
  snapshotDigest: string,
  expected?: WalletDisplayHistoryCapability,
): WalletDisplayHistoryCapability {
  const raw = responseRecord(responseRecord(service).displayHistory);
  if (
    raw.apiVersion !== 1 ||
    !Array.isArray(raw.supportedTemplateKinds) ||
    raw.supportedTemplateKinds.length !== 2 ||
    !raw.supportedTemplateKinds.includes("V1") ||
    !raw.supportedTemplateKinds.includes("V2")
  )
    throw new SnapshotReadError("incompatible");
  return Object.freeze({
    apiVersion: 1,
    supportedTemplateKinds: Object.freeze(["V1", "V2"] as const),
    coverage: displayHistoryCoverage(
      raw.coverage,
      expectedGenesis,
      checkpoint,
      snapshotDigest,
      expected?.coverage,
    ),
  });
}

export function displayBasis(
  value: unknown,
  objectType: string,
  proof: GraphQLSnapshotProof,
): WalletDisplayBasis {
  const raw = responseRecord(value);
  const capability = proof.displayHistory;
  if (!capability) throw new SnapshotReadError("coverage");
  const snapshot = checkpointNumber(raw.snapshotCheckpoint);
  const source = checkpointNumber(raw.sourceCheckpoint);
  let type: string;
  try {
    if (typeof raw.objectType !== "string" || raw.objectType.includes("@"))
      throw new Error("type");
    type = normalizeStructTag(raw.objectType);
  } catch {
    throw new SnapshotReadError("incompatible");
  }
  if (
    String(snapshot) !== proof.checkpoint ||
    source > snapshot ||
    type !== objectType ||
    raw.objectType !== type
  )
    throw new SnapshotReadError("changed");
  const templateId = walletAddress(raw.templateId);
  if (raw.templateId !== templateId)
    throw new SnapshotReadError("incompatible");
  const historyCoverage = displayHistoryCoverage(
    raw.historyCoverage,
    capability.coverage.genesisDigest,
    snapshot,
    proof.digest,
    capability.coverage,
  );
  const common = {
    snapshotCheckpoint: String(snapshot),
    objectType: type,
    templateId,
    sourceCheckpoint: String(source),
    historyCoverage,
  };
  if (raw.__typename === "DisplayV1Basis") {
    const version = checkpointNumber(raw.publishedVersion);
    if (version > 65535) throw new SnapshotReadError("incompatible");
    const sourceDigest = digest(raw.sourceCheckpointDigest);
    if (
      (source === snapshot && sourceDigest !== proof.digest) ||
      (source === 0 && sourceDigest !== historyCoverage.genesisDigest)
    )
      throw new SnapshotReadError("changed");
    return Object.freeze({
      ...common,
      kind: "V1",
      publishedVersion: version,
      sourceCheckpointDigest: sourceDigest,
      transactionDigest: digest(raw.transactionDigest),
      checkpointTransactionIndex: String(
        checkpointNumber(raw.checkpointTransactionIndex),
      ),
      eventIndex: String(checkpointNumber(raw.eventIndex)),
      eventBcsSha256: sha256(raw.eventBcsSha256),
    });
  }
  if (raw.__typename === "DisplayV2Basis") {
    if (
      templateId !==
      deriveObjectID(
        "0xd",
        `0x2::display_registry::DisplayKey<${type}>`,
        new Uint8Array([0]),
      )
    )
      throw new SnapshotReadError("changed");
    const version = checkpointNumber(raw.objectVersion);
    if (!version) throw new SnapshotReadError("incompatible");
    return Object.freeze({
      ...common,
      kind: "V2",
      objectVersion: String(version),
      objectDigest: digest(raw.objectDigest),
      previousTransactionDigest: digest(raw.previousTransactionDigest),
      contentsBcsSha256: sha256(raw.contentsBcsSha256),
    });
  }
  throw new SnapshotReadError("incompatible");
}

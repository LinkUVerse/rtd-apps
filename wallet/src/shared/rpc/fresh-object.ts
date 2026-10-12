// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { blake2b } from "@noble/hashes/blake2.js";
import { bcs, TypeTagSerializer } from "rtd-typescript/bcs";
import { GrpcTypes } from "rtd-typescript/grpc";
import { normalizeStructTag, toBase58, toBase64 } from "rtd-typescript/utils";
import type { WalletFreshObject } from "rtd-apps-core/src/rpc/WalletRpcContext";
import { walletAddress } from "./asset-address";
import { assertGenesisDigest } from "./profile";

export class FreshObjectReadError extends Error {
  constructor() {
    super("Fullnode 当前对象未通过完整性检查，无法确认收件人状态");
    this.name = "FreshObjectReadError";
  }
}
export const FRESH_OBJECT_MASK = Object.freeze([
  "object_id",
  "version",
  "digest",
  "owner",
  "object_type",
  "bcs",
  "contents",
  "previous_transaction",
  "has_public_transfer",
]);
export function freshObjectDigest(bytes: Uint8Array) {
  const prefix = new TextEncoder().encode("Object::");
  const input = new Uint8Array(prefix.length + bytes.length);
  input.set(prefix);
  input.set(bytes, prefix.length);
  return toBase58(blake2b(input, { dkLen: 32 }));
}

function rawOwner(raw: GrpcTypes.Owner | undefined) {
  if (!raw) throw new FreshObjectReadError();
  switch (raw.kind) {
    case GrpcTypes.Owner_OwnerKind.ADDRESS:
      return { AddressOwner: walletAddress(raw.address) };
    case GrpcTypes.Owner_OwnerKind.OBJECT:
      return { ObjectOwner: walletAddress(raw.address) };
    case GrpcTypes.Owner_OwnerKind.IMMUTABLE:
      return { Immutable: null };
    case GrpcTypes.Owner_OwnerKind.SHARED:
      if (raw.version === undefined) throw new FreshObjectReadError();
      return { Shared: { initialSharedVersion: raw.version.toString() } };
    case GrpcTypes.Owner_OwnerKind.CONSENSUS_ADDRESS:
      if (raw.version === undefined) throw new FreshObjectReadError();
      return {
        ConsensusAddressOwner: {
          owner: walletAddress(raw.address),
          startVersion: raw.version.toString(),
        },
      };
    default:
      throw new FreshObjectReadError();
  }
}

export function decodeFreshObject(
  raw: GrpcTypes.Object,
  requested: string,
): WalletFreshObject {
  try {
    const bytes = raw.bcs?.value;
    if (
      !(bytes instanceof Uint8Array) ||
      !bytes.length ||
      bytes.length > 1_048_576
    )
      throw new Error("BCS");
    const parsed = bcs.Object.parse(bytes);
    if (toBase64(bcs.Object.serialize(parsed).toBytes()) !== toBase64(bytes))
      throw new Error("canonical");
    const digest = assertGenesisDigest(raw.digest);
    if (
      freshObjectDigest(bytes) !== digest ||
      walletAddress(raw.objectId) !== requested ||
      raw.previousTransaction !== parsed.previousTransaction ||
      toBase64(bcs.Owner.serialize(rawOwner(raw.owner)).toBytes()) !==
        toBase64(bcs.Owner.serialize(parsed.owner).toBytes())
    )
      throw new Error("fields");
    let type: string;
    let version: string;
    let content: Uint8Array<ArrayBuffer>;
    let hasPublicTransfer: boolean | null;
    if (parsed.data.$kind === "Move") {
      const move = parsed.data.Move;
      switch (move.type.$kind) {
        case "Other":
          type = normalizeStructTag(
            TypeTagSerializer.tagToString({ struct: move.type.Other }),
          );
          break;
        case "GasCoin":
          type = normalizeStructTag("0x2::coin::Coin<0x2::rtd::RTD>");
          break;
        case "Coin":
          type = normalizeStructTag(`0x2::coin::Coin<${move.type.Coin}>`);
          break;
        case "StakedRtd":
          type = normalizeStructTag("0x3::staking_pool::StakedRtd");
          break;
        // The local Rust optimized accumulator variants differ from this SDK codec: fail closed.
        default:
          throw new Error("unsupported optimized type");
      }
      version = move.version;
      content = Uint8Array.from(move.contents);
      hasPublicTransfer = raw.hasPublicTransfer ?? null;
      if (
        content.length < 32 ||
        bcs.Address.parse(content.subarray(0, 32)) !== requested ||
        !raw.contents?.value ||
        toBase64(raw.contents.value) !== toBase64(content) ||
        (raw.hasPublicTransfer !== undefined &&
          raw.hasPublicTransfer !== move.hasPublicTransfer)
      )
        throw new Error("Move fields");
    } else {
      const pkg = parsed.data.Package;
      if (
        pkg.id !== requested ||
        parsed.owner.$kind !== "Immutable" ||
        raw.hasPublicTransfer !== undefined
      )
        throw new Error("package fields");
      type = "package";
      version = pkg.version;
      content = new Uint8Array();
      hasPublicTransfer = null;
    }
    if (
      raw.version?.toString() !== version ||
      (raw.objectType === "package"
        ? raw.objectType
        : raw.objectType && normalizeStructTag(raw.objectType)) !== type
    )
      throw new Error("reference");
    const owner =
      parsed.owner.$kind === "Immutable"
        ? { $kind: "Immutable" as const, Immutable: true as const }
        : parsed.owner;
    return Object.freeze({
      objectId: requested,
      version,
      digest,
      owner: Object.freeze(owner),
      type,
      content,
      objectBcs: Uint8Array.from(bytes),
      previousTransaction: parsed.previousTransaction,
      json: undefined,
      display: undefined,
      hasPublicTransfer,
    });
  } catch {
    throw new FreshObjectReadError();
  }
}

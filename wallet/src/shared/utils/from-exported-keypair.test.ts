// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { expect, it } from "vitest";
import { Ed25519Keypair } from "rtd-typescript/keypairs/ed25519";
import { Secp256k1Keypair } from "rtd-typescript/keypairs/secp256k1";
import { Secp256r1Keypair } from "rtd-typescript/keypairs/secp256r1";
import { toBase64 } from "rtd-typescript/utils";
import { fromExportedKeypair } from "./from-exported-keypair";
it.each([Ed25519Keypair, Secp256k1Keypair, Secp256r1Keypair])(
  "roundtrips current SDK private-key scheme without changing account address",
  (Keypair) => {
    const original = Keypair.fromSecretKey(new Uint8Array(32).fill(7));
    const restored = fromExportedKeypair(original.getSecretKey());
    expect(restored.getKeyScheme()).toBe(original.getKeyScheme());
    expect(restored.getPublicKey().toRtdAddress()).toBe(
      original.getPublicKey().toRtdAddress(),
    );
  },
);
it("retains explicit old schema object support and rejects it by default", () => {
  const bytes = new Uint8Array(32).fill(7);
  const legacy = { schema: "ED25519" as const, privateKey: toBase64(bytes) };
  expect(() => fromExportedKeypair(legacy)).toThrow();
  expect(fromExportedKeypair(legacy, true).getPublicKey().toRtdAddress()).toBe(
    Ed25519Keypair.fromSecretKey(bytes).getPublicKey().toRtdAddress(),
  );
});

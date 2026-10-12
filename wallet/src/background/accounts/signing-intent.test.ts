// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { beforeEach, expect, it, vi } from "vitest";
import { bcs } from "rtd-typescript/bcs";
import {
  messageWithIntent,
  parseSerializedSignature,
} from "rtd-typescript/cryptography";
import { Ed25519Keypair } from "rtd-typescript/keypairs/ed25519";
import { Secp256k1Keypair } from "rtd-typescript/keypairs/secp256k1";
import { Secp256r1Keypair } from "rtd-typescript/keypairs/secp256r1";
import {
  Transaction,
  TransactionDataBuilder,
} from "rtd-typescript/transactions";
import {
  verifyTransactionSignature,
  verifyPersonalMessageSignature,
} from "rtd-typescript/verify";
import { toBase64 } from "rtd-typescript/utils";
import { ImportedAccount } from "./ImportedAccount";
import { MnemonicAccount } from "./MnemonicAccount";
import { approvedTransaction } from "../../shared/rpc/execution-reader";
import { executionFixture } from "../../../tests/unit/rpc/execution-fixtures";
const m = vi.hoisted(() => ({ ephemeral: vi.fn(), db: vi.fn() }));
vi.mock("../db", () => ({ getDB: m.db }));
vi.mock("../auto-lock-accounts", () => ({ setupAutoLockAlarm: vi.fn() }));
vi.mock("../session-ephemeral-values", () => ({
  getEphemeralValue: m.ephemeral,
  setEphemeralValue: vi.fn(),
  clearEphemeralValue: vi.fn(),
}));
vi.mock("../account-sources/MnemonicAccountSource", () => ({
  MnemonicAccountSource: class {},
}));
beforeEach(() => vi.resetAllMocks());
const curves = [Ed25519Keypair, Secp256k1Keypair, Secp256r1Keypair] as const;
for (const AccountClass of [ImportedAccount, MnemonicAccount]) {
  for (const Curve of curves) {
    it(`${AccountClass.name}/${Curve.name} signs identical approved bytes with TransactionData Intent`, async () => {
      const key = new Curve(),
        sender = key.toRtdAddress();
      m.ephemeral.mockResolvedValue({ keyPair: key.getSecretKey() });
      const account = new AccountClass({ id: "isolated-test-account" });
      const initial = await executionFixture();
      const tx = Transaction.from(initial.bytes);
      tx.setSender(sender);
      tx.setGasOwner(sender);
      const bytes = await tx.build(),
        approved = approvedTransaction(toBase64(bytes), sender);
      const signature = await account.signData(
        messageWithIntent("TransactionData", approved.bytes),
      );
      expect(
        (
          await verifyTransactionSignature(bytes, signature, {
            address: sender,
          })
        ).toRtdAddress(),
      ).toBe(sender);
      expect(signature).toBe((await key.signTransaction(bytes)).signature);
      expect(parseSerializedSignature(signature).signatureScheme).toBe(
        key.getKeyScheme(),
      );
      expect(approved.digest).toBe(
        TransactionDataBuilder.getDigestFromBytes(bytes),
      );
      const changed = Transaction.from(bytes);
      changed.setGasBudget(101n);
      await expect(
        verifyTransactionSignature(await changed.build(), signature, {
          address: sender,
        }),
      ).rejects.toThrow();
      await expect(
        verifyPersonalMessageSignature(bytes, signature, { address: sender }),
      ).rejects.toThrow();
      expect(m.ephemeral).toHaveBeenCalledWith(account.id);
      expect(m.db).not.toHaveBeenCalled();
    });
    it(`${AccountClass.name}/${Curve.name} signs PersonalMessage BCS vector and rejects a transaction-domain interpretation`, async () => {
      const key = new Curve(),
        message = new TextEncoder().encode("中文\u0000message");
      m.ephemeral.mockResolvedValue({ keyPair: key.getSecretKey() });
      const account = new AccountClass({ id: "isolated-message-account" });
      const signature = await account.signData(
        messageWithIntent(
          "PersonalMessage",
          bcs.vector(bcs.u8()).serialize(message).toBytes(),
        ),
      );
      expect(signature).toBe(
        (await key.signPersonalMessage(message)).signature,
      );
      expect(
        (
          await verifyPersonalMessageSignature(message, signature, {
            address: key.toRtdAddress(),
          })
        ).toRtdAddress(),
      ).toBe(key.toRtdAddress());
      await expect(
        verifyTransactionSignature(message, signature, {
          address: key.toRtdAddress(),
        }),
      ).rejects.toThrow();
    });
  }
  it(`${AccountClass.name} cannot sign without an unlocked ephemeral key`, async () => {
    m.ephemeral.mockResolvedValue(null);
    await expect(
      new AccountClass({ id: "locked" }).signData(new Uint8Array([0, 0, 0])),
    ).rejects.toThrow("locked");
    expect(m.db).not.toHaveBeenCalled();
  });
}
for (const AccountClass of [ImportedAccount, MnemonicAccount]) {
  it(`${AccountClass.name} UI serialization exposes public fields without signing key or encrypted vault`, async () => {
    const key = new Ed25519Keypair(),
      secret = key.getSecretKey();
    m.ephemeral.mockResolvedValue({ keyPair: secret });
    m.db.mockResolvedValue({
      accounts: {
        get: async () => ({
          id: "ui-account",
          type:
            AccountClass === ImportedAccount ? "imported" : "mnemonic-derived",
          address: key.toRtdAddress(),
          publicKey: key.getPublicKey().toBase64(),
          encrypted: "private-vault-sentinel",
          sourceID: "source",
          derivationPath: "m/44'/784'/0'/0'/0'",
          selected: true,
          nickname: null,
          createdAt: 1,
          lastUnlockedOn: 1,
        }),
      },
    });
    const output = await new AccountClass({
      id: "ui-account",
    }).toUISerialized();
    expect(output.address).toBe(key.toRtdAddress());
    expect(output.publicKey).toBe(key.getPublicKey().toBase64());
    expect(JSON.stringify(output)).not.toContain(secret);
    expect(JSON.stringify(output)).not.toContain("private-vault-sentinel");
    expect(output).not.toHaveProperty("keyPair");
    expect(output).not.toHaveProperty("encrypted");
  });
}

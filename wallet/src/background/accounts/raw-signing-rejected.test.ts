// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { expect, it, vi } from "vitest";
import { accountsHandleUIMessage } from "./index";
import type { Message } from "../../shared/messaging/messages";
import type { UiConnection } from "../connections/UiConnection";
const f = vi.hoisted(() => ({ db: vi.fn(), send: vi.fn() }));
vi.mock("../db", () => ({ getDB: f.db, backupDB: vi.fn() }));
vi.mock("../account-sources", () => ({ getAccountSourceByID: vi.fn() }));
vi.mock("../account-sources/MnemonicAccountSource", () => ({
  MnemonicAccountSource: class {},
}));
vi.mock("../legacy-accounts/LegacyVault", () => ({ LegacyVault: class {} }));
vi.mock("./ImportedAccount", () => ({ ImportedAccount: class {} }));
vi.mock("./MnemonicAccount", () => ({ MnemonicAccount: class {} }));
vi.mock("./QredoAccount", () => ({ QredoAccount: class {} }));
vi.mock("./zklogin/ZkLoginAccount", () => ({ ZkLoginAccount: class {} }));
it.each(["AAAA", "not-base64", null])(
  "old raw signing request is rejected before account access or signature response (%s)",
  async (data) => {
    const message = {
      id: "old-ui-request",
      payload: {
        type: "method-payload",
        method: "signData",
        args: { id: "account", data },
      },
    } as unknown as Message;
    await expect(
      accountsHandleUIMessage(message, {
        send: f.send,
      } as unknown as UiConnection),
    ).rejects.toThrow("旧版原始签名消息已禁用");
    expect(f.db).not.toHaveBeenCalled();
    expect(f.send).not.toHaveBeenCalled();
  },
);

// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { parseGrpcTransactionResponse } from "rtd-typescript/grpc";
import { bcs } from "rtd-typescript/bcs";
import { normalizeRtdAddress as address, toBase58 } from "rtd-typescript/utils";
import { executionFixture } from "../../../../../../tests/unit/rpc/execution-fixtures";
import { SimulationPreview } from "./SimulationPreview";
const f = vi.hoisted(() => ({
  balances: undefined as any,
  objects: undefined as any,
}));
vi.mock("_src/ui/app/hooks/useRecognizedPackages", () => ({
  useRecognizedPackages: () => ["0x2"],
}));
vi.mock("_src/ui/app/i18n", () => ({
  useI18n: () => ({ t: (s: string) => s }),
}));
vi.mock("_components/loading/LoadingIndicator", () => ({
  default: () => null,
}));
vi.mock("_components/alert", async () => {
  const { createElement } = await import("react");
  return {
    default: ({ children }: any) =>
      createElement("div", { role: "alert" }, children),
  };
});
vi.mock("_src/ui/app/shared/transaction-summary/cards/BalanceChanges", () => ({
  BalanceChanges: ({ changes }: any) => {
    f.balances = changes;
    return null;
  },
}));
vi.mock("_src/ui/app/components/receipt-card/ObjectEffects", () => ({
  ObjectEffects: ({ changes }: any) => {
    f.objects = changes;
    return null;
  },
}));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let host: HTMLDivElement, root: ReturnType<typeof createRoot>, prepared: any;
beforeEach(async () => {
  const fixture = await executionFixture();
  const txn = parseGrpcTransactionResponse(fixture.result(), {
    include: {
      effects: true,
      transaction: true,
      bcs: true,
      events: true,
      balanceChanges: true,
      objectTypes: true,
    },
  }).Transaction!;
  txn.balanceChanges = [
    {
      address: address("0xb"),
      coinType: "0x2::rtd::RTD",
      amount: "9007199254740993",
    },
  ];
  prepared = {
    digest: "preview-digest",
    simulation: { $kind: "Transaction", Transaction: txn },
  };
  f.balances = f.objects = undefined;
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});
async function render(error = false, pending = false) {
  await act(async () =>
    root.render(
      h(SimulationPreview, { prepared, isError: error, isPending: pending }),
    ),
  );
}
it("shows exact simulated accounting and explicitly labels it unsubmitted", async () => {
  await render();
  expect(f.balances[address("0xb")][0].amount).toBe("9007199254740993");
  expect(host.textContent).toContain("approval.simulationOnly");
  expect(host.textContent).toContain("preview-digest");
  expect(host.querySelector("a")).toBeNull();
});
it("extracts object owner from original effects BCS rather than display data", async () => {
  const effects = bcs.TransactionEffects.parse(
    prepared.simulation.Transaction.effects.bcs,
  );
  effects.V2!.changedObjects = [
    [
      address("0x9"),
      {
        inputState: { NotExist: true, $kind: "NotExist" },
        outputState: {
          ObjectWrite: [
            toBase58(new Uint8Array(32).fill(9)),
            { AddressOwner: address("0xa"), $kind: "AddressOwner" },
          ],
          $kind: "ObjectWrite",
        },
        idOperation: { Created: true, $kind: "Created" },
      },
    ],
  ];
  prepared.simulation.Transaction.effects.changedObjects = [];
  prepared.simulation.Transaction.effects.bcs =
    bcs.TransactionEffects.serialize(effects).toBytes();
  await render();
  expect(f.objects).toEqual([
    expect.objectContaining({
      objectId: address("0x9"),
      outputOwner: address("0xa"),
      operation: "Created",
    }),
  ]);
});
it("error discards previous simulation display", async () => {
  await render();
  await render(true);
  expect(host.querySelector("[role=alert]")).not.toBeNull();
  expect(host.textContent).not.toContain("preview-digest");
});
it("failed simulation union cannot masquerade as a successful preview", async () => {
  prepared.simulation = {
    $kind: "FailedTransaction",
    FailedTransaction: { status: { success: false } },
  };
  await render();
  expect(host.querySelector("[role=alert]")).not.toBeNull();
  expect(f.balances).toBeUndefined();
});
it("missing or loading preparation does not publish empty-success facts", async () => {
  prepared = undefined;
  await render(false, true);
  expect(f.balances).toBeUndefined();
  await render();
  expect(host.querySelector("[role=alert]")).not.toBeNull();
});

// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Actual production guard, synthetic SDK protocol/BCS, native store; never a chain proof.
import { Transaction } from "rtd-typescript/transactions";
import { GrpcTypes } from "rtd-typescript/grpc";
import { toBase58, toBase64 } from "rtd-typescript/utils";
import {
  publicProfile,
  WalletReadSession,
  WalletNetworkAdmissionStore,
} from "./network-capability-observation-browser-harness";
import { assertTransactionMoveAdmission } from "../../../src/shared/rpc/transaction-move-admission";
import { transactionMoveDependencies } from "../../../src/shared/rpc/transaction-move-dependencies";
import {
  grpcPacket,
  movePackageFixtures,
  packageObject,
} from "../../../src/shared/rpc/move-package-fixture";
export { publicProfile, WalletReadSession, WalletNetworkAdmissionStore };
async function fixedBytes(move = true) {
  const t = new Transaction();
  t.setSender("0xa");
  t.setGasOwner("0xa");
  t.setGasPrice(1);
  t.setGasBudget(100);
  t.setGasPayment([
    {
      objectId: "0xc",
      version: "1",
      digest: toBase58(new Uint8Array(32).fill(2)),
    },
  ]);
  if (move) t.moveCall({ target: "0x3::rtd_system::request_add_stake" });
  else {
    const [c] = t.splitCoins(t.gas, [1]);
    t.transferObjects([c], "0xb");
  }
  return toBase64(await t.build());
}
export function observation(database: string | undefined, mode = "normal") {
  const profile = publicProfile(),
    session = new WalletReadSession(profile),
    store = database
      ? new WalletNetworkAdmissionStore({ databaseName: database })
      : new WalletNetworkAdmissionStore(),
    controller = new AbortController(),
    entered = Promise.withResolvers<void>(),
    held = Promise.withResolvers<void>(),
    values = movePackageFixtures(profile);
  let requests = 0,
    state = "pending",
    reason: string | null = null,
    executionSemantics: string | null = null;
  if (mode === "coins-abi" || mode === "display-abi") {
    const module = mode === "coins-abi" ? "coin" : "display_registry",
      name = mode === "coins-abi" ? "Coin" : "DisplayKey";
    const pkg = [...values.packages.values()].find((p) =>
      p.modules.some((m) => m.name === module),
    )!;
    pkg.modules
      .find((m) => m.name === module)!
      .datatypes.find((d) => d.name === name)!.abilities = [];
    values.objects.set(pkg.storageId!, packageObject(pkg));
  }
  const fetch: typeof globalThis.fetch = async (url, init) => {
    requests++;
    const method = String(url).split("/rtd.rpc.v2.")[1],
      body = (init!.body as Uint8Array).slice(5);
    if (method === "LedgerService/GetServiceInfo") {
      if (mode === "held-service") {
        entered.resolve();
        await held.promise;
      }
      return grpcPacket(
        GrpcTypes.GetServiceInfoResponse.toBinary({
          chainId:
            mode === "wrong-service"
              ? toBase58(new Uint8Array(32).fill(8))
              : profile.expectedGenesisDigest,
          checkpointHeight: 100n,
          lowestAvailableCheckpoint: 0n,
          lowestAvailableCheckpointObjects: 0n,
        }),
      );
    }
    if (method === "LedgerService/GetObject")
      return grpcPacket(
        GrpcTypes.GetObjectResponse.toBinary({
          object: values.objects.get(
            GrpcTypes.GetObjectRequest.fromBinary(body).objectId!,
          ),
        }),
      );
    if (method === "MovePackageService/GetPackage")
      return grpcPacket(
        GrpcTypes.GetPackageResponse.toBinary({
          package: values.packages.get(
            GrpcTypes.GetPackageRequest.fromBinary(body).packageId!,
          ),
        }),
      );
    throw new Error("Unexpected synthetic protocol method");
  };
  const run = fixedBytes()
    .then((bytes) =>
      assertTransactionMoveAdmission(session, bytes, "0xa", {
        admission: store,
        fetch,
        signal: controller.signal,
      }),
    )
    .then(
      (r) => {
        state = r.state;
        executionSemantics = r.executionSemantics;
      },
      (e) => {
        state = "rejected";
        reason =
          typeof e.reason === "string"
            ? e.reason
            : e.name === "AbortError"
              ? "cancelled"
              : "unavailable";
      },
    );
  const result = async () => {
    const row = await store.capture(profile);
    return {
      state,
      reason,
      executionSemantics,
      requests,
      faults: row?.faults.length ?? 0,
      pending: row?.pending.length ?? 0,
      identityFaults:
        row?.faults.filter((f) => f.kind === "identity").length ?? 0,
      abiFaults: row?.faults.filter((f) => f.kind === "move-group").length ?? 0,
    };
  };
  return {
    profile,
    session,
    store,
    run,
    entered: entered.promise,
    cancel: () => controller.abort(),
    release: () => held.resolve(),
    result,
  };
}
/** Native dependency accessor only. It performs no SDK IO or transaction authority. */
export async function denied(database: string | undefined, move = true) {
  const profile = publicProfile(),
    store = database
      ? new WalletNetworkAdmissionStore({ databaseName: database })
      : new WalletNetworkAdmissionStore();
  const targets = transactionMoveDependencies(
    profile,
    await fixedBytes(move),
    "0xa",
  );
  let calls = 0,
    reason: string | undefined;
  try {
    await store.assertClear(profile, targets.areas);
    calls++;
  } catch (e) {
    reason = (e as { reason?: string }).reason;
  }
  const row = await store.capture(profile);
  return {
    calls,
    reason,
    faults: row?.faults.length ?? 0,
    pending: row?.pending.length ?? 0,
  };
}

// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Current ABI function/SDK with synthetic readonly packets and native stores.
import { Transaction } from "rtd-typescript/transactions";
import { GrpcTypes } from "rtd-typescript/grpc";
import { toBase58, toBase64 } from "rtd-typescript/utils";
import { profileFixture as baseProfile } from "../../../src/shared/rpc/profile-fixture";
import { validateNetworkProfile } from "../../../src/shared/rpc/profile";
import {
  grpcPacket,
  movePackageFixtures,
} from "../../../src/shared/rpc/move-package-fixture";
import { assertTransactionMoveAdmission } from "../../../src/shared/rpc/transaction-move-admission";
import type { WalletReadSession } from "../../../src/shared/rpc/session";
export { WalletNetworkAdmissionStore } from "../../../src/shared/rpc/network-admission-store";
export { WalletNetworkObservations } from "../../../src/shared/rpc/network-observations";
export { WalletReadSession } from "../../../src/shared/rpc/session";
export { validateNetworkProfile } from "../../../src/shared/rpc/profile";
export { rawDatabase } from "./network-admission-browser-harness";

export function profileFixture() {
  const p = baseProfile();
  delete p.endpoints.graphqlUrl;
  delete p.endpoints.archiveGrpcWeb;
  delete p.endpoints.accountHistoryUrl;
  delete p.packages.name;
  delete p.packages.personalKiosk;
  return p;
}
async function bytes() {
  const tx = new Transaction();
  tx.setSender("0xa");
  tx.setGasOwner("0xa");
  tx.setGasPrice(1);
  tx.setGasBudget(100);
  tx.setGasPayment([
    {
      objectId: "0xc",
      version: "1",
      digest: toBase58(new Uint8Array(32).fill(2)),
    },
  ]);
  tx.moveCall({ target: "0x3::rtd_system::request_add_stake" });
  return toBase64(await tx.build());
}
export async function assertTransactionMoveObservation(
  session: WalletReadSession,
  options: Parameters<typeof assertTransactionMoveAdmission>[3],
) {
  return assertTransactionMoveAdmission(session, await bytes(), "0xa", options);
}
export function moveWireFixture(
  alter: (role: string) => { digest?: string } = () => ({}),
) {
  const profile = validateNetworkProfile(profileFixture()),
    values = movePackageFixtures(profile),
    requests: string[] = [];
  const fetch: typeof globalThis.fetch = async (url, init) => {
    const method = String(url).split("/rtd.rpc.v2.")[1],
      body = (init!.body as Uint8Array).slice(5);
    requests.push(method);
    switch (method) {
      case "LedgerService/GetServiceInfo":
        return grpcPacket(
          GrpcTypes.GetServiceInfoResponse.toBinary({
            chainId: alter("fullnode").digest ?? profile.expectedGenesisDigest,
            checkpointHeight: 100n,
            lowestAvailableCheckpoint: 0n,
            lowestAvailableCheckpointObjects: 0n,
          }),
        );
      case "LedgerService/GetObject":
        return grpcPacket(
          GrpcTypes.GetObjectResponse.toBinary({
            object: values.objects.get(
              GrpcTypes.GetObjectRequest.fromBinary(body).objectId!,
            ),
          }),
        );
      case "MovePackageService/GetPackage":
        return grpcPacket(
          GrpcTypes.GetPackageResponse.toBinary({
            package: values.packages.get(
              GrpcTypes.GetPackageRequest.fromBinary(body).packageId!,
            ),
          }),
        );
      default:
        throw new Error("Unexpected non-ABI fixture method");
    }
  };
  return { fetch, requests };
}

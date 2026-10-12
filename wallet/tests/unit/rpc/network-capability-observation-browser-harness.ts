// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Actual production coordinator/SDK + native IDB. Synthetic read protocol, no chain authority.
import { GrpcTypes } from "rtd-typescript/grpc";
import { normalizeRtdAddress, toBase58 } from "rtd-typescript/utils";
import { profileFixture } from "../../../src/shared/rpc/profile-fixture";
import { validateNetworkProfile } from "../../../src/shared/rpc/profile";
import { WalletReadSession } from "../../../src/shared/rpc/session";
import { WalletReadAdmission } from "../../../src/shared/rpc/read-admission";
import { WalletNetworkAdmissionStore } from "../../../src/shared/rpc/network-admission-store";
import { observeReadCapabilities } from "../../../src/shared/rpc/read-capability-observation";
import {
  movePackageFixtures,
  grpcPacket,
} from "../../../src/shared/rpc/move-package-fixture";
import type { WalletReadCapabilities } from "rtd-apps-core/src/rpc/capability-types";

export function publicProfile() {
  const p = profileFixture();
  delete p.endpoints.graphqlUrl;
  delete p.endpoints.archiveGrpcWeb;
  delete p.endpoints.accountHistoryUrl;
  delete p.packages.kiosk;
  delete p.packages.personalKiosk;
  delete p.packages.name;
  return validateNetworkProfile(p);
}
export { WalletReadSession, WalletReadAdmission, WalletNetworkAdmissionStore };

export function observation(
  database: string | undefined,
  mode:
    | "normal"
    | "wrong-service"
    | "held-service"
    | "wrong-checkpoint-held-object" = "normal",
) {
  const profile = publicProfile(),
    session = new WalletReadSession(profile),
    store = database
      ? new WalletNetworkAdmissionStore({ databaseName: database })
      : new WalletNetworkAdmissionStore(),
    signal = new AbortController(),
    fixture = movePackageFixtures(profile),
    entered = Promise.withResolvers<void>(),
    held = Promise.withResolvers<void>();
  let requests = 0,
    completed = false,
    view: WalletReadCapabilities | undefined;
  const wrong = toBase58(new Uint8Array(32).fill(8));
  const fetch: typeof globalThis.fetch = async (input, init) => {
    requests++;
    const method = String(input).split("/rtd.rpc.v2.")[1],
      body = (init!.body as Uint8Array).slice(5);
    switch (method) {
      case "LedgerService/GetServiceInfo":
        if (mode === "held-service") {
          entered.resolve();
          await held.promise;
        }
        return grpcPacket(
          GrpcTypes.GetServiceInfoResponse.toBinary({
            chainId:
              mode === "wrong-service" ? wrong : profile.expectedGenesisDigest,
            checkpointHeight: 100n,
            lowestAvailableCheckpoint: 0n,
            lowestAvailableCheckpointObjects: 0n,
          }),
        );
      case "LedgerService/GetCheckpoint": {
        if (mode === "wrong-checkpoint-held-object") await entered.promise;
        const selector =
          GrpcTypes.GetCheckpointRequest.fromBinary(body).checkpointId;
        const n =
          selector.oneofKind === "sequenceNumber"
            ? selector.sequenceNumber
            : 100n;
        return grpcPacket(
          GrpcTypes.GetCheckpointResponse.toBinary({
            checkpoint: {
              sequenceNumber: n,
              digest:
                mode === "wrong-checkpoint-held-object"
                  ? wrong
                  : n === 0n
                    ? profile.expectedGenesisDigest
                    : toBase58(new Uint8Array(32).fill(2)),
              transactions: [],
            },
          }),
        );
      }
      case "LedgerService/GetObject":
        if (mode === "wrong-checkpoint-held-object") {
          entered.resolve();
          await held.promise;
        }
        return grpcPacket(
          GrpcTypes.GetObjectResponse.toBinary({
            object: fixture.objects.get(
              normalizeRtdAddress(
                GrpcTypes.GetObjectRequest.fromBinary(body).objectId!,
              ),
            ),
          }),
        );
      case "MovePackageService/GetPackage":
        return grpcPacket(
          GrpcTypes.GetPackageResponse.toBinary({
            package: fixture.packages.get(
              normalizeRtdAddress(
                GrpcTypes.GetPackageRequest.fromBinary(body).packageId!,
              ),
            ),
          }),
        );
      case "MovePackageService/GetDatatype": {
        const r = GrpcTypes.GetDatatypeRequest.fromBinary(body);
        return grpcPacket(
          GrpcTypes.GetDatatypeResponse.toBinary({
            datatype: fixture.packages
              .get(normalizeRtdAddress(r.packageId!))
              ?.modules.find((m) => m.name === r.moduleName)
              ?.datatypes.find((d) => d.name === r.name),
          }),
        );
      }
      case "MovePackageService/GetFunction": {
        const r = GrpcTypes.GetFunctionRequest.fromBinary(body);
        const fn =
          r.moduleName === "object" && r.name === "id"
            ? {
                name: "id",
                isEntry: false,
                visibility: GrpcTypes.FunctionDescriptor_Visibility.PUBLIC,
                typeParameters: [],
                parameters: [
                  {
                    body: {
                      type: GrpcTypes.OpenSignatureBody_Type.TYPE_PARAMETER,
                      typeParameter: 0,
                      typeParameterInstantiation: [],
                    },
                  },
                ],
                returns: [
                  {
                    body: {
                      type: GrpcTypes.OpenSignatureBody_Type.DATATYPE,
                      typeName: "0x2::object::ID",
                      typeParameterInstantiation: [],
                    },
                  },
                ],
              }
            : fixture.packages
                .get(normalizeRtdAddress(r.packageId!))
                ?.modules.find((m) => m.name === r.moduleName)
                ?.functions.find((f) => f.name === r.name);
        return grpcPacket(
          GrpcTypes.GetFunctionResponse.toBinary({ function: fn }),
        );
      }
      case "StateService/GetCoinInfo":
        return grpcPacket(
          GrpcTypes.GetCoinInfoResponse.toBinary({
            coinType: "0x2::rtd::RTD",
            metadata: { id: "0xa", decimals: 9, name: "RTD", symbol: "RTD" },
          }),
        );
      default:
        throw new Error("Synthetic native fixture received a non-read method");
    }
  };
  const run = observeReadCapabilities(
    session,
    { fetch, signal: signal.signal },
    store,
  ).then((result) => {
    view = result;
    completed = true;
  });
  return {
    session,
    profile,
    store,
    run,
    entered: entered.promise,
    cancel: () => signal.abort(),
    release: () => held.resolve(),
    result: async () => {
      const row = await store.capture(profile);
      return {
        completed,
        phase: view?.phase,
        reason: view && "reason" in view ? view.reason : undefined,
        requests,
        faults: row?.faults.length ?? 0,
        pending: row?.pending.length ?? 0,
        identityFaults:
          row?.faults.filter((f) => f.kind === "identity").length ?? 0,
        readiness: view?.readiness,
        execution: view?.execution,
        noPositiveFields:
          !view ||
          view.phase === "read-contracts-assessed" ||
          !["graphql", "native", "deployment", "accountHistory"].some((k) =>
            Object.hasOwn(view!, k),
          ),
        beforeRoles:
          view?.phase === "read-contracts-assessed"
            ? Object.keys(view.identity.before).sort()
            : [],
        unconfigured:
          view?.phase === "read-contracts-assessed" &&
          view.identity.before.graphql === "unconfigured" &&
          view.identity.before.archive === "unconfigured",
      };
    },
  };
}

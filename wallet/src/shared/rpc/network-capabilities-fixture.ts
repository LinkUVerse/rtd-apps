// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Protocol fixtures only. ABI/bytecode fixtures do not prove on-chain deployment.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildSchema, introspectionFromSchema } from "graphql";
import { GrpcTypes } from "rtd-typescript/grpc";
import { normalizeRtdAddress } from "rtd-typescript/utils";
import { historyFixture } from "../../../tests/unit/rpc/history-fixtures";
import { snapshotDigest } from "../../../tests/unit/rpc/fixtures";
import { grpcPacket, movePackageFixtures } from "./move-package-fixture";
import { WalletReadSession } from "./session";
import { validateNetworkProfile } from "./profile";
import { WALLET_SCHEMA_INTROSPECTION_QUERY } from "./graphql-schema-capabilities";
import type { WalletNetworkProfile } from "./profile";

const schema = introspectionFromSchema(
  buildSchema(
    readFileSync(
      resolve(
        process.cwd(),
        "../../rtd/crates/rtd-indexer-alt-graphql/schema.graphql",
      ),
      "utf8",
    ),
  ),
  { descriptions: false },
);
export async function networkCapabilitiesFixture(
  options: {
    profile?: (profile: WalletNetworkProfile) => void;
    rows?: unknown[];
  } = {},
) {
  const history = await historyFixture({ rows: options.rows });
  const raw: WalletNetworkProfile = {
    ...history.native.profile,
    endpoints: { ...history.native.profile.endpoints },
    packages: {
      ...history.native.profile.packages,
      originByte: { discoveryPackage: "0x7", executionPackage: "0x7" },
      name: undefined,
    },
  };
  options.profile?.(raw);
  const profile = validateNetworkProfile(raw),
    session = new WalletReadSession(profile);
  const { packages, objects } = movePackageFixtures(profile);
  const requests: { url: string; query?: string; method?: string }[] = [];
  const fetch: typeof globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (
      url === profile.endpoints.graphqlUrl ||
      url === profile.endpoints.accountHistoryUrl
    ) {
      const payload = JSON.parse(String(init?.body));
      requests.push({ url, query: payload.query });
      if (payload.query.includes("WalletGenesisIdentity"))
        return Response.json({
          data: { checkpoint: { digest: profile.expectedGenesisDigest } },
        });
      if (payload.query === WALLET_SCHEMA_INTROSPECTION_QUERY)
        return Response.json({
          data: {
            ...structuredClone(schema),
            walletGenesis: { digest: profile.expectedGenesisDigest },
          },
        });
      return history.fetch(input, init);
    }
    const method = url.split("/rtd.rpc.v2.")[1];
    requests.push({ url, method });
    const bytes = (init!.body as Uint8Array).slice(5);
    switch (method) {
      case "LedgerService/GetServiceInfo":
        return grpcPacket(
          GrpcTypes.GetServiceInfoResponse.toBinary({
            chainId: profile.expectedGenesisDigest,
            checkpointHeight: 100n,
            lowestAvailableCheckpoint: 0n,
            lowestAvailableCheckpointObjects: 0n,
          }),
        );
      case "LedgerService/GetCheckpoint": {
        const cp =
          GrpcTypes.GetCheckpointRequest.fromBinary(bytes).checkpointId;
        const sequenceNumber =
          cp.oneofKind === "sequenceNumber" ? cp.sequenceNumber : undefined;
        return grpcPacket(
          GrpcTypes.GetCheckpointResponse.toBinary({
            checkpoint: {
              sequenceNumber,
              digest:
                sequenceNumber === 0n
                  ? profile.expectedGenesisDigest
                  : snapshotDigest,
              transactions: [],
            },
          }),
        );
      }
      case "LedgerService/GetObject":
        return grpcPacket(
          GrpcTypes.GetObjectResponse.toBinary({
            object: objects.get(
              normalizeRtdAddress(
                GrpcTypes.GetObjectRequest.fromBinary(bytes).objectId!,
              ),
            ),
          }),
        );
      case "MovePackageService/GetPackage":
        return grpcPacket(
          GrpcTypes.GetPackageResponse.toBinary({
            package: packages.get(
              normalizeRtdAddress(
                GrpcTypes.GetPackageRequest.fromBinary(bytes).packageId!,
              ),
            ),
          }),
        );
      case "MovePackageService/GetDatatype": {
        const request = GrpcTypes.GetDatatypeRequest.fromBinary(bytes);
        return grpcPacket(
          GrpcTypes.GetDatatypeResponse.toBinary({
            datatype: packages
              .get(normalizeRtdAddress(request.packageId!))
              ?.modules.find((m) => m.name === request.moduleName)
              ?.datatypes.find((d) => d.name === request.name),
          }),
        );
      }
      case "MovePackageService/GetFunction": {
        const request = GrpcTypes.GetFunctionRequest.fromBinary(bytes);
        if (request.moduleName === "object" && request.name === "id")
          return grpcPacket(
            GrpcTypes.GetFunctionResponse.toBinary({
              function: {
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
              },
            }),
          );
        return grpcPacket(
          GrpcTypes.GetFunctionResponse.toBinary({
            function: packages
              .get(normalizeRtdAddress(request.packageId!))
              ?.modules.find((m) => m.name === request.moduleName)
              ?.functions.find((f) => f.name === request.name),
          }),
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
        throw new Error("Unexpected non-read method in protocol fixture");
    }
  };
  return { profile, session, fetch, requests, history, packages, objects };
}

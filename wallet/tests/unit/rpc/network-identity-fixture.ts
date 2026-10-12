// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { GrpcTypes } from "rtd-typescript/grpc";
import { profileFixture } from "../../../src/shared/rpc/profile-fixture";
export type NativeIdentityRole = "fullnode" | "graphql" | "archive";
export interface IdentityFault {
  digest?: string;
  height?: bigint;
  status?: number;
  partial?: boolean;
  missingHeight?: boolean;
  unavailable?: boolean;
}
function frame(payload: Uint8Array, trailer = false) {
  const value = new Uint8Array(payload.length + 5);
  value[0] = trailer ? 128 : 0;
  new DataView(value.buffer).setUint32(1, payload.length, false);
  value.set(payload, 5);
  return value;
}
export function networkIdentityFixture(
  alter: (
    role: NativeIdentityRole,
    index: number,
  ) => IdentityFault = () => ({}),
) {
  const requests: { role: NativeIdentityRole; url: string }[] = [];
  const fetch: typeof globalThis.fetch = async (input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    const role: NativeIdentityRole = url.endsWith("/graphql")
      ? "graphql"
      : url.includes("/archive/")
        ? "archive"
        : "fullnode";
    const fault = alter(role, requests.filter((r) => r.role === role).length);
    requests.push({ role, url });
    if (fault.unavailable) throw new TypeError("controlled offline endpoint");
    const digest = fault.digest ?? profileFixture().expectedGenesisDigest;
    if (role === "graphql") {
      const body = JSON.parse(String(init?.body));
      if (!body.query.includes("checkpoint(sequenceNumber: 0)"))
        throw new Error("Unexpected non-identity GraphQL query");
      return Response.json({
        data: { checkpoint: { digest } },
        ...(fault.partial
          ? { errors: [{ message: "controlled partial identity" }] }
          : {}),
      });
    }
    if (!url.endsWith("/rtd.rpc.v2.LedgerService/GetServiceInfo"))
      throw new Error("Unexpected non-identity gRPC method");
    const message = frame(
      GrpcTypes.GetServiceInfoResponse.toBinary({
        chainId: digest,
        checkpointHeight: fault.missingHeight
          ? undefined
          : (fault.height ?? 100n),
        lowestAvailableCheckpoint: 0n,
        lowestAvailableCheckpointObjects: 0n,
      }),
    );
    const trailer = frame(
      new TextEncoder().encode(`grpc-status: ${fault.status ?? 0}\r\n`),
      true,
    );
    const body = new Uint8Array(message.length + trailer.length);
    body.set(message);
    body.set(trailer, message.length);
    return new Response(body, {
      headers: { "content-type": "application/grpc-web+proto" },
    });
  };
  return { fetch, requests };
}

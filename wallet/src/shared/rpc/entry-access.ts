// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { boundedGrpcFetch } from "./grpc-response-budget";
import { RtdGrpcClient } from "rtd-typescript/grpc";
import { assertGenesisDigest } from "./profile";
import { WalletReadSession } from "./session";
import { NetworkIdentityError } from "./identity";

export type WalletEntryAccess =
  | { readonly state: "restricted" }
  | { readonly state: "accessible"; readonly checkpoint: string };
const RESTRICTION_BODY = "error code: 1020";
/** Match the existing entry policy exactly. Other 403 responses are not a location verdict. */
async function isRestriction(response: Response): Promise<boolean> {
  if (response.status !== 403 || !response.body) return false;
  const reader = response.body.getReader();
  const chunks: number[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (chunks.length + value.length > RESTRICTION_BODY.length) return false;
      chunks.push(...value);
    }
    return (
      new TextDecoder().decode(new Uint8Array(chunks)) === RESTRICTION_BODY
    );
  } finally {
    await reader.cancel();
    reader.releaseLock();
  }
}
/** Fullnode reachability does not claim GraphQL admission, archive coverage or signing readiness. */
export async function probeEntryAccess(
  session: WalletReadSession,
  callerSignal?: AbortSignal,
  fetchFn: typeof fetch = globalThis.fetch,
): Promise<WalletEntryAccess> {
  return session.read(async (sessionSignal) => {
    const signal = AbortSignal.any([
      sessionSignal,
      AbortSignal.timeout(10_000),
      ...(callerSignal ? [callerSignal] : []),
    ]);
    signal.throwIfAborted();
    let restricted = false;
    const client = new RtdGrpcClient({
      network: session.profile.sdkNetwork,
      baseUrl: session.profile.endpoints.fullnodeGrpcWeb,
      format: "binary",
      mvr: { url: "" },
      fetch: async (input, init) => {
        const response = await boundedGrpcFetch(fetchFn)(input, {
          ...init,
          signal,
          redirect: "error",
          credentials: "omit",
        });
        if (response.status === 403) {
          restricted = await isRestriction(response);
          throw new Error("钱包 Fullnode 入口拒绝访问");
        }
        return response;
      },
    });
    try {
      const { response } = await session.request(signal, () =>
        client.ledgerService.getServiceInfo(
          {},
          { abort: signal, timeout: 10_000 },
        ),
      );
      signal.throwIfAborted();
      if (
        assertGenesisDigest(response.chainId) !==
        session.profile.expectedGenesisDigest
      )
        throw new NetworkIdentityError("fullnode", "chain-mismatch");
      const height = response.checkpointHeight;
      if (
        typeof height !== "bigint" ||
        height < 0n ||
        height > 0xffffffffffffffffn
      )
        throw new NetworkIdentityError("fullnode", "incompatible");
      return { state: "accessible", checkpoint: height.toString() };
    } catch (error) {
      signal.throwIfAborted();
      if (restricted) return { state: "restricted" };
      throw error;
    }
  });
}

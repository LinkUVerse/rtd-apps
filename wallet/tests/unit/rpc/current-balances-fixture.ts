// Protocol-only fixture for integrating native current funds with indexed asset readers.
import { GrpcTypes } from "rtd-typescript/grpc";
import { grpcResponse } from "./execution-fixtures";

export function withCurrentBalances(
  fallback: typeof fetch,
  genesis: () => string,
  read: (
    request: GrpcTypes.ListBalancesRequest,
    signal?: AbortSignal | null,
  ) => Promise<GrpcTypes.ListBalancesResponse> | GrpcTypes.ListBalancesResponse,
): typeof fetch {
  return async (input, init) => {
    if (String(input).endsWith("/rtd.rpc.v2.LedgerService/GetServiceInfo"))
      return grpcResponse(
        GrpcTypes.GetServiceInfoResponse.toBinary({
          chainId: genesis(),
          checkpointHeight: 20n,
        }),
      );
    if (String(input).endsWith("/rtd.rpc.v2.StateService/ListBalances")) {
      const request = GrpcTypes.ListBalancesRequest.fromBinary(
        (init!.body as Uint8Array).subarray(5),
      );
      return grpcResponse(
        GrpcTypes.ListBalancesResponse.toBinary(
          await read(request, init?.signal),
        ),
      );
    }
    return fallback(input, init);
  };
}

// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { createReadDeadline } from "./read-deadline";

import {
  assertValidSchema,
  buildClientSchema,
  getIntrospectionQuery,
  Kind,
  lexicographicSortSchema,
  parse,
  print,
  printSchema,
  type IntrospectionQuery,
  type OperationDefinitionNode,
} from "graphql";
import { RtdGraphQLClient } from "rtd-typescript/graphql";
import baseline from "./graphql-schema-contracts.json";
import {
  WALLET_GRAPHQL_SCHEMA_CONTRACTS,
  type WalletGraphQLSchemaContract,
} from "./graphql-schema-contracts";
import {
  matchesSchemaContract,
  type SchemaContractShape,
} from "./graphql-schema-shape";
import { NetworkIdentityError } from "./identity";
import { assertGenesisDigest } from "./profile";
import { WalletReadSession } from "./session";

const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
export class WalletSchemaCapabilityError extends Error {
  constructor(
    readonly reason: "unavailable" | "partial" | "incompatible" | "budget",
  ) {
    super(
      {
        unavailable: "网络schema暂不可验证，请检查查询入口",
        partial: "网络schema响应未完整成功，未接纳能力声明",
        incompatible: "网络schema响应不兼容，未接纳能力声明",
        budget: "网络schema响应超出读取预算，未接纳能力声明",
      }[reason],
    );
    this.name = "WalletSchemaCapabilityError";
  }
}

const introspection = parse(
  getIntrospectionQuery({
    descriptions: false,
    typeDepth: 9,
    oneOf: true,
    // This optional newer introspection extension is absent from the current native API.
    inputValueDeprecation: false,
  }),
);
const genesis = parse(
  "query { walletGenesis: checkpoint(sequenceNumber: 0) { digest } }",
).definitions[0] as OperationDefinitionNode;
/** Complete H0 and schema arrive through the same guarded request; no SDK cached chain label. */
export const WALLET_SCHEMA_INTROSPECTION_QUERY = print({
  ...introspection,
  definitions: introspection.definitions.map((definition) =>
    definition.kind !== Kind.OPERATION_DEFINITION
      ? definition
      : {
          ...definition,
          name: { kind: Kind.NAME, value: "WalletSchemaCapabilities" },
          selectionSet: {
            ...definition.selectionSet,
            selections: [
              ...genesis.selectionSet.selections,
              ...definition.selectionSet.selections,
            ],
          },
        },
  ),
});

export type WalletSchemaCapabilities =
  | Readonly<{
      state: "unconfigured";
      bindingKey: string;
      readSessionKey: string;
    }>
  | Readonly<{
      state: "schema-compatible" | "schema-degraded";
      bindingKey: string;
      readSessionKey: string;
      observedAt: number;
      genesisDigest: string;
      schemaSha256: string;
      contractVersion: 1;
      metadata: Readonly<{
        oneOf: "verified";
        inputValueDeprecation: "not-requested";
      }>;
      contracts: Readonly<
        Record<WalletGraphQLSchemaContract, "compatible" | "unsupported">
      >;
    }>;

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new WalletSchemaCapabilityError("incompatible");
  return value as Record<string, unknown>;
}

function schemaBudget(data: unknown): asserts data is IntrospectionQuery {
  const schema = record(record(data).__schema);
  if (
    !Array.isArray(schema.types) ||
    !schema.types.length ||
    schema.types.length > 512
  )
    throw new WalletSchemaCapabilityError("budget");
  let fields = 0,
    argumentsCount = 0;
  for (const value of schema.types) {
    const type = record(value);
    if (type.kind === "INPUT_OBJECT" && typeof type.isOneOf !== "boolean")
      throw new WalletSchemaCapabilityError("incompatible");
    for (const key of [
      "fields",
      "inputFields",
      "enumValues",
      "possibleTypes",
      "interfaces",
    ]) {
      const values = type[key];
      if (values === undefined || values === null) continue;
      if (!Array.isArray(values))
        throw new WalletSchemaCapabilityError("incompatible");
      fields += values.length;
      if (fields > 8192) throw new WalletSchemaCapabilityError("budget");
      if (key === "fields")
        for (const field of values) {
          const args = record(field).args;
          if (!Array.isArray(args))
            throw new WalletSchemaCapabilityError("incompatible");
          argumentsCount += args.length;
          if (argumentsCount > 8192)
            throw new WalletSchemaCapabilityError("budget");
        }
    }
  }
}

async function boundedResponse(response: Response): Promise<Response> {
  if (!response.ok) {
    void response.body?.cancel().catch(() => {});
    throw new WalletSchemaCapabilityError("unavailable");
  }
  if (!response.body) throw new WalletSchemaCapabilityError("incompatible");
  const reader = response.body.getReader(),
    chunks: Uint8Array[] = [];
  let size = 0,
    complete = false;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) {
        complete = true;
        break;
      }
      size += result.value.byteLength;
      if (size > MAX_RESPONSE_BYTES)
        throw new WalletSchemaCapabilityError("budget");
      chunks.push(result.value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return new Response(bytes, {
      status: response.status,
      headers: response.headers,
    });
  } finally {
    if (!complete) void reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

/** Schema declarations only: does not authorize signing, publish clients, or claim coverage/packages/accountHistory readiness. */
export async function probeGraphQLSchemaCapabilities(
  session: WalletReadSession,
  options: {
    fetch?: typeof fetch;
    timeoutMs?: number;
    signal?: AbortSignal;
  } = {},
): Promise<WalletSchemaCapabilities> {
  let disposeDeadline: (() => void) | undefined;
  return session
    .read(async (sessionSignal) => {
      const timeoutMs = options.timeoutMs ?? 10_000;
      if (
        !Number.isSafeInteger(timeoutMs) ||
        timeoutMs < 1 ||
        timeoutMs > 60_000
      )
        throw new RangeError("schema探测超时必须在1–60000ms");
      const deadline = createReadDeadline(timeoutMs);
      disposeDeadline = deadline.dispose;
      const signal = AbortSignal.any([
        sessionSignal,
        deadline.signal,
        ...(options.signal ? [options.signal] : []),
      ]);
      signal.throwIfAborted();
      const url = session.profile.endpoints.graphqlUrl;
      if (!url)
        return Object.freeze({
          state: "unconfigured",
          bindingKey: session.bindingKey,
          readSessionKey: session.cacheKey,
        });
      const fetchFn = options.fetch ?? globalThis.fetch;
      const client = new RtdGraphQLClient({
        network: session.profile.sdkNetwork,
        url,
        mvr: { url: "" },
        fetch: async (input, init) => {
          const response = await fetchFn(input, {
            ...init,
            signal,
            redirect: "error",
            credentials: "omit",
          });
          signal.throwIfAborted();
          session.assertActive();
          return boundedResponse(response);
        },
      });
      let result;
      try {
        result = await session.request(signal, () =>
          client.query<
            IntrospectionQuery & { walletGenesis?: { digest?: unknown } }
          >({
            query: WALLET_SCHEMA_INTROSPECTION_QUERY,
            variables: {},
            signal,
          }),
        );
      } catch (error) {
        signal.throwIfAborted();
        session.assertActive();
        if (error instanceof WalletSchemaCapabilityError) throw error;
        throw new WalletSchemaCapabilityError("unavailable");
      }
      signal.throwIfAborted();
      session.assertActive();
      if (
        result.errors !== undefined &&
        (!Array.isArray(result.errors) || result.errors.length)
      )
        throw new WalletSchemaCapabilityError("partial");
      let digest: string;
      try {
        digest = assertGenesisDigest(result.data?.walletGenesis?.digest);
      } catch {
        throw new NetworkIdentityError("graphql", "incompatible");
      }
      if (digest !== session.profile.expectedGenesisDigest)
        throw new NetworkIdentityError("graphql", "chain-mismatch");
      schemaBudget(result.data);
      let schema;
      try {
        schema = buildClientSchema(result.data);
        assertValidSchema(schema);
        if (schema.getQueryType()?.name !== "Query")
          throw new Error("query type");
      } catch {
        throw new WalletSchemaCapabilityError("incompatible");
      }
      const contracts = Object.fromEntries(
        Object.entries(WALLET_GRAPHQL_SCHEMA_CONTRACTS).map(([name, query]) => [
          name,
          matchesSchemaContract(
            schema,
            query,
            baseline.contracts[
              name as WalletGraphQLSchemaContract
            ] as SchemaContractShape,
          )
            ? "compatible"
            : "unsupported",
        ]),
      ) as Record<WalletGraphQLSchemaContract, "compatible" | "unsupported">;
      const hash = new Uint8Array(
        await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(
            printSchema(lexicographicSortSchema(schema)),
          ),
        ),
      );
      signal.throwIfAborted();
      session.assertActive();
      return Object.freeze({
        state: Object.values(contracts).every((value) => value === "compatible")
          ? "schema-compatible"
          : "schema-degraded",
        bindingKey: session.bindingKey,
        readSessionKey: session.cacheKey,
        observedAt: Date.now(),
        genesisDigest: digest,
        schemaSha256: [...hash]
          .map((b) => b.toString(16).padStart(2, "0"))
          .join(""),
        contractVersion: 1,
        metadata: Object.freeze({
          oneOf: "verified",
          inputValueDeprecation: "not-requested",
        }),
        contracts: Object.freeze(contracts),
      });
    })
    .finally(() => disposeDeadline?.());
}

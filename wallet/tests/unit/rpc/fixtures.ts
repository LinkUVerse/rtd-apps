// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { OperationDefinitionNode, FieldNode } from "graphql";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

import {
  normalizeRtdAddress,
  normalizeStructTag,
  toBase58,
} from "rtd-typescript/utils";

import { validateNetworkProfile } from "../../../src/shared/rpc/profile";
import { profileFixture } from "../../../src/shared/rpc/profile-fixture";
import { WalletReadSession } from "../../../src/shared/rpc/session";

// Resolve the parser from the installed SDK so frozen-install checks exercise its lockfile.
// RTD extensions are validated against the server's exported SDL, while the upstream
// projection is independently validated against the SDK and the saved official Sui SDL.
const sdkRoot = resolve(process.cwd(), "../../rtd-ts-sdk/packages/typescript");
const walletRequire = createRequire(resolve(process.cwd(), "package.json"));
export const graphql = createRequire(
  walletRequire.resolve("rtd-typescript/grpc"),
)("graphql") as typeof import("graphql");
const sdkSchema = graphql.buildSchema(
  readFileSync(
    resolve(sdkRoot, "src/graphql/generated/schema.graphql"),
    "utf8",
  ),
);
const schema = graphql.buildSchema(
  readFileSync(
    resolve(
      process.cwd(),
      "../../rtd/crates/rtd-indexer-alt-graphql/schema.graphql",
    ),
    "utf8",
  ),
);
const suiSchema = graphql.buildSchema(
  readFileSync(
    resolve(
      process.cwd(),
      "migrationToGRpcOrGraphQLDoc/evidence/official/sui-snapshot-schema.graphql.txt",
    ),
    "utf8",
  ),
);

export const snapshotDigest = toBase58(new Uint8Array(32).fill(2));
export const objectDigest = toBase58(new Uint8Array(32).fill(3));
export const txDigest = toBase58(new Uint8Array(32).fill(4));

export function displayCoverage(
  checkpoint = 10,
  genesisDigest = profileFixture().expectedGenesisDigest,
) {
  return {
    genesisDigest,
    sourceId: "certified-fixture-source",
    generation: "display-history-fixture-generation",
    firstCheckpoint: 0,
    lastCheckpoint: 20,
    lastCheckpointDigest: objectDigest,
    snapshotCheckpoint: checkpoint,
    snapshotCheckpointDigest: snapshotDigest,
  };
}

export function v1Basis(checkpoint = 10, type = "0x2::example::NFT") {
  return {
    __typename: "DisplayV1Basis",
    snapshotCheckpoint: checkpoint,
    objectType: normalizeStructTag(type),
    templateId: normalizeRtdAddress("0xc"),
    publishedVersion: 65535,
    sourceCheckpoint: 5,
    sourceCheckpointDigest: objectDigest,
    transactionDigest: txDigest,
    checkpointTransactionIndex: 2,
    eventIndex: 3,
    eventBcsSha256: "a".repeat(64),
    historyCoverage: displayCoverage(checkpoint),
  };
}

export interface GraphQLRequest {
  query: string;
  variables: Record<string, unknown>;
}

export function snapshotFixture(
  options: {
    range?: (
      index: number,
      request: GraphQLRequest,
    ) => { first: number; last: number };
    read?: (request: GraphQLRequest) => Record<string, unknown>;
    alter?: (
      response: Record<string, unknown>,
      request: GraphQLRequest,
    ) => unknown;
  } = {},
) {
  const profile = validateNetworkProfile(profileFixture());
  const session = new WalletReadSession(profile);
  const requests: GraphQLRequest[] = [];
  const fetch: typeof globalThis.fetch = async (_input, init) => {
    const request = JSON.parse(String(init?.body)) as GraphQLRequest;
    const document = graphql.parse(request.query);
    const projection = {
      Field: (node: { name: { value: string }; alias?: { value: string } }) => {
        // Keep pin/revalidation query selection sets non-empty after removing the RTD extension.
        if (node.alias?.value === "walletDisplayService")
          return { kind: "Field", name: { kind: "Name", value: "__typename" } };
        return node.name.value === "basis" ? null : undefined;
      },
    };
    const upstream = graphql.visit(document, projection);
    const upstreamSui = graphql.visit(
      graphql.parse(request.query.replace(/\bRtdAddress\b/g, "SuiAddress")),
      projection,
    );
    const errors = [
      ...graphql.validate(schema, document),
      ...graphql.validate(sdkSchema, upstream),
      ...graphql.validate(suiSchema, upstreamSui),
    ];
    if (errors.length)
      throw new Error(
        `查询不符合 RTD SDL 或 SDK/Sui 公共投影: ${errors.map((error) => error.message).join("; ")}`,
      );
    // Validate the actual combined document above, then exercise the same
    // per-domain fixture hooks with each operation's original variables. This
    // keeps fault injection scoped exactly like GraphQL response error paths.
    const operation = document.definitions.find(
      (node): node is OperationDefinitionNode =>
        node.kind === graphql.Kind.OPERATION_DEFINITION,
    );
    if (operation?.name?.value === "WalletSnapshotBatch") {
      const groups = new Map<string, { name: string; fields: FieldNode[] }>();
      for (const selection of operation.selectionSet.selections) {
        if (selection.kind !== graphql.Kind.FIELD)
          throw new Error("batch fixture root");
        const match = /^(q\d+_)(WalletSnapshot\w+)_(.+)$/.exec(
          selection.alias!.value,
        );
        if (!match) throw new Error("batch fixture alias");
        const [, prefix, name, original] = match;
        let group = groups.get(prefix);
        if (!group) groups.set(prefix, (group = { name, fields: [] }));
        group.fields.push({
          ...selection,
          alias: { kind: graphql.Kind.NAME, value: original },
        });
      }
      const data: Record<string, unknown> = {},
        errors: Record<string, unknown>[] = [];
      for (const [prefix, group] of groups) {
        const original = graphql.visit(
          {
            kind: graphql.Kind.DOCUMENT,
            definitions: [
              {
                ...operation,
                name: { kind: graphql.Kind.NAME, value: group.name },
                variableDefinitions: operation.variableDefinitions?.filter(
                  (v) => v.variable.name.value.startsWith(prefix),
                ),
                selectionSet: {
                  kind: graphql.Kind.SELECTION_SET,
                  selections: group.fields,
                },
              },
              ...document.definitions.filter(
                (d) =>
                  d.kind === graphql.Kind.FRAGMENT_DEFINITION &&
                  d.name.value.startsWith(prefix),
              ),
            ],
          },
          {
            Variable(node) {
              return {
                ...node,
                name: {
                  ...node.name,
                  value: node.name.value.slice(prefix.length),
                },
              };
            },
            FragmentDefinition(node) {
              return {
                ...node,
                name: {
                  ...node.name,
                  value: node.name.value.slice(prefix.length),
                },
              };
            },
            FragmentSpread(node) {
              return {
                ...node,
                name: {
                  ...node.name,
                  value: node.name.value.slice(prefix.length),
                },
              };
            },
          },
        );
        const variables = Object.fromEntries(
          Object.entries(request.variables)
            .filter(([k]) => k.startsWith(prefix))
            .map(([k, v]) => [k.slice(prefix.length), v]),
        );
        const reply = await (
          await fetch(_input, {
            ...init,
            body: JSON.stringify({ query: graphql.print(original), variables }),
          })
        ).json();
        for (const [field, value] of Object.entries(reply.data ?? {}))
          data[prefix + group.name + "_" + field] = value;
        for (const error of reply.errors ?? [])
          errors.push({
            ...error,
            path: [
              prefix +
                group.name +
                "_" +
                (error.path?.[0] ?? group.fields[0].alias!.value),
              ...(error.path?.slice(1) ?? []),
            ],
          });
      }
      return Response.json({ data, ...(errors.length ? { errors } : {}) });
    }
    requests.push(request);
    const data: Record<string, unknown> = {
      walletGenesis: { digest: profile.expectedGenesisDigest },
      serviceConfig: Object.fromEntries(
        [...request.query.matchAll(/range(\d+): availableRange/g)].map(
          ([, index]) => {
            const range = options.range?.(Number(index), request) ?? {
              first: 0,
              last: 10,
            };
            return [
              `range${index}`,
              {
                first: { sequenceNumber: range.first },
                last: { sequenceNumber: range.last },
              },
            ];
          },
        ),
      ),
    };
    const hasDisplay = request.query.includes("walletDisplayService");
    const service = (checkpoint: number) => ({
      displayHistory: {
        apiVersion: 1,
        supportedTemplateKinds: ["V1", "V2"],
        coverage: displayCoverage(checkpoint, profile.expectedGenesisDigest),
      },
    });
    if (request.query.includes("walletHead: checkpoint")) {
      data.walletHead = { sequenceNumber: 11, digest: snapshotDigest };
      if (hasDisplay) data.walletDisplayService = service(11);
    }
    if (request.query.includes("walletSnapshot: checkpoint")) {
      const checkpoint = Number(
        request.query.match(
          /walletSnapshot: checkpoint\(sequenceNumber: (\d+)\)/,
        )?.[1],
      );
      data.walletSnapshot = {
        sequenceNumber: checkpoint,
        digest: snapshotDigest,
        ...(request.query.includes("WalletSnapshotRead") || hasDisplay
          ? {
              query: {
                ...(request.query.includes("WalletSnapshotRead")
                  ? (options.read?.(request) ?? {})
                  : {}),
                ...(hasDisplay
                  ? { walletDisplayService: service(checkpoint) }
                  : {}),
              },
            }
          : {}),
      };
    }
    const response = { data };
    return Response.json(options.alter?.(response, request) ?? response);
  };
  return { profile, session, requests, fetch };
}

export function balanceNode(coinType = "0x2::rtd::RTD") {
  return {
    coinType: { repr: coinType },
    totalBalance: "900719925474099312345",
    coinBalance: "900719925474099312000",
    addressBalance: "345",
  };
}

export function connection(
  nodes: unknown[],
  cursor: string | null = null,
  hasNextPage = false,
) {
  return { nodes, pageInfo: { endCursor: cursor, hasNextPage } };
}

export function objectNode(
  address = "0xa",
  owner = "0xb",
  type = "0x2::example::NFT",
) {
  return {
    address,
    hasPublicTransfer: true,
    version: 8,
    digest: objectDigest,
    owner: { __typename: "AddressOwner", address: { address: owner } },
    contents: {
      bcs: "AQID",
      json: { balance: "123" },
      type: { repr: type },
      display: {
        output: { name: "资产", attributes: { rarity: 1 } },
        errors: null,
        basis: v1Basis(10, type),
      },
    },
    previousTransaction: { digest: txDigest },
  };
}

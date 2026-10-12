// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import {
  Kind,
  OperationTypeNode,
  parse,
  print,
  visit,
  type DefinitionNode,
  type FieldNode,
  type OperationDefinitionNode,
  type VariableDefinitionNode,
} from "graphql";
import type { RtdGraphQLClient } from "rtd-typescript/graphql";
import type { WalletReadSession } from "./session";
import { ReadRequestQueue } from "./read-request-queue";

type Input = { query: string; variables: Record<string, unknown> };
type Reply = {
  data?: Record<string, unknown> | null;
  errors?: readonly {
    message: string;
    path?: readonly (string | number)[];
    [key: string]: unknown;
  }[];
};
export type SnapshotQuerySend = (
  input: Input,
  signal: AbortSignal,
) => Promise<unknown>;

/** Every logical operation keeps its own aliases, variables and error paths.
 * Only authored read operations reach this helper, never mutations or signing.
 */
export function combineSnapshotQueries(inputs: readonly Input[]) {
  const fields: FieldNode[] = [],
    definitions: DefinitionNode[] = [];
  const variables: Record<string, unknown> = {},
    variableDefinitions: VariableDefinitionNode[] = [];
  const mappings: Map<string, string>[] = [];
  for (const [index, input] of inputs.entries()) {
    const prefix = `q${index}_`;
    const document = visit(parse(input.query), {
      Variable(node) {
        return {
          ...node,
          name: { ...node.name, value: prefix + node.name.value },
        };
      },
      FragmentDefinition(node) {
        return {
          ...node,
          name: { ...node.name, value: prefix + node.name.value },
        };
      },
      FragmentSpread(node) {
        return {
          ...node,
          name: { ...node.name, value: prefix + node.name.value },
        };
      },
    });
    const operations = document.definitions.filter(
      (node): node is OperationDefinitionNode =>
        node.kind === Kind.OPERATION_DEFINITION,
    );
    if (
      operations.length !== 1 ||
      operations[0].operation !== OperationTypeNode.QUERY ||
      operations[0].directives?.length
    )
      throw new Error("只允许合并普通只读查询");
    const operation = operations[0],
      mapping = new Map<string, string>();
    for (const field of operation.selectionSet.selections) {
      if (field.kind !== Kind.FIELD)
        throw new Error("合并查询根必须为明确字段");
      const original = field.alias?.value ?? field.name.value;
      const alias =
        prefix + (operation.name?.value ?? "Anonymous") + "_" + original;
      mapping.set(alias, original);
      fields.push({ ...field, alias: { kind: Kind.NAME, value: alias } });
    }
    mappings.push(mapping);
    definitions.push(
      ...document.definitions.filter(
        (node) => node.kind === Kind.FRAGMENT_DEFINITION,
      ),
    );
    variableDefinitions.push(...(operation.variableDefinitions ?? []));
    for (const [key, value] of Object.entries(input.variables))
      variables[prefix + key] = value;
  }
  const operation: OperationDefinitionNode = {
    kind: Kind.OPERATION_DEFINITION,
    operation: OperationTypeNode.QUERY,
    name: { kind: Kind.NAME, value: "WalletSnapshotBatch" },
    variableDefinitions,
    selectionSet: { kind: Kind.SELECTION_SET, selections: fields },
  };
  return {
    query: print({
      kind: Kind.DOCUMENT,
      definitions: [operation, ...definitions],
    }),
    variables,
    mappings,
  };
}

/** RTD GraphQL's default query-payload budget is 5,000 bytes. This bounds each
 * combined envelope, not the number of reads/pages. Large individual authored
 * requests retain their existing path and the service's own validation.
 */
export function partitionSnapshotQueries(inputs: readonly Input[]) {
  const groups: Input[][] = [];
  let group: Input[] = [];
  const bytes = new TextEncoder();
  for (const input of inputs) {
    const candidate = [...group, input];
    if (group.length) {
      const { query, variables } = combineSnapshotQueries(candidate);
      if (bytes.encode(JSON.stringify({ query, variables })).length > 5_000) {
        groups.push(group);
        group = [];
      }
    }
    group.push(input);
  }
  if (group.length) groups.push(group);
  return groups;
}

const queues = new WeakMap<
  WalletReadSession,
  WeakMap<typeof fetch, Map<string, ReadRequestQueue<Input, unknown>>>
>();

export function createSnapshotQuerySend(
  session: WalletReadSession,
  client: RtdGraphQLClient,
  transport: typeof fetch,
  timeoutMs: number,
  lightweight: boolean,
  snapshotScope?: string,
): SnapshotQuerySend {
  let transports = queues.get(session);
  if (!transports) queues.set(session, (transports = new WeakMap()));
  let lanes = transports.get(transport);
  if (!lanes) transports.set(transport, (lanes = new Map()));
  const send = (input: Input, signal: AbortSignal) =>
    session.request(signal, () => client.query<unknown>({ ...input, signal }));
  return (input, signal) => {
    // Large asset/Display domains must not hold the balance page hostage.
    // Heavy domains may combine only inside one admitted snapshot instance.
    // Admission remains independently checked; another reader/domain cannot
    // join this lane, even if it happens to target the same checkpoint.
    const scoped =
      snapshotScope &&
      /^\s*query WalletSnapshot(?:Read|Revalidate)\b/.test(input.query);
    const key = JSON.stringify([
      timeoutMs,
      lightweight ? "portfolio" : scoped ? ["snapshot", snapshotScope] : input,
    ]);
    let queue = lanes!.get(key);
    if (!queue) {
      queue = new ReadRequestQueue(
        async (pending, sharedSignal) => {
          // Keys are literal authored queries and variables, never a lossy hash.
          const unique: Input[] = [],
            indices: number[] = [],
            seen = new Map<string, number>();
          for (const request of pending) {
            const id = JSON.stringify(request);
            let index = seen.get(id);
            if (index === undefined) {
              index = unique.length;
              seen.set(id, index);
              unique.push(request);
            }
            indices.push(index);
          }
          const settle = async (unique: readonly Input[]) => {
            let replies: PromiseSettledResult<unknown>[];
            if (unique.length === 1)
              replies = await Promise.allSettled([
                send(unique[0], sharedSignal),
              ]);
            else {
              const combined = combineSnapshotQueries(unique);
              const response = (await send(
                { query: combined.query, variables: combined.variables },
                sharedSignal,
              )) as Reply;
              const aliases = new Set(
                combined.mappings.flatMap((mapping) => [...mapping.keys()]),
              );
              const errorsValid =
                response.errors === undefined || Array.isArray(response.errors);
              if (
                !response.data ||
                !errorsValid ||
                response.errors?.some(
                  (error) => !error.path || !aliases.has(String(error.path[0])),
                )
              ) {
                // Validation errors and root null propagation cannot be assigned to
                // one domain. Re-run separately once, preserving failure isolation.
                replies = await Promise.allSettled(
                  unique.map((request) => send(request, sharedSignal)),
                );
              } else {
                replies = combined.mappings.map((mapping) => {
                  const data: Record<string, unknown> = {};
                  for (const [alias, original] of mapping)
                    if (Object.hasOwn(response.data!, alias))
                      data[original] = response.data![alias];
                  const errors = response.errors
                    ?.filter((error) => mapping.has(String(error.path?.[0])))
                    .map((error) => ({
                      ...error,
                      path: [
                        mapping.get(String(error.path![0]))!,
                        ...error.path!.slice(1),
                      ],
                    }));
                  return {
                    status: "fulfilled",
                    value: { data, ...(errors?.length ? { errors } : {}) },
                  };
                });
              }
            }
            return replies;
          };
          const replies = (
            await Promise.all(
              partitionSnapshotQueries(unique).map(async (group) => {
                try {
                  return await settle(group);
                } catch (reason) {
                  return group.map(() => ({
                    status: "rejected" as const,
                    reason,
                  }));
                }
              }),
            )
          ).flat();
          return indices.map((index) => replies[index]);
        },
        () => {
          if (lanes!.get(key) === queue) lanes!.delete(key);
        },
      );
      lanes!.set(key, queue);
    }
    return queue.request(input, signal);
  };
}

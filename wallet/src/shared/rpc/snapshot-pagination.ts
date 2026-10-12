// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import {
  type GraphQLSnapshot,
  responseRecord,
  SnapshotReadError,
} from "./graphql-snapshot";

export class SnapshotPaginationError extends Error {
  constructor(readonly reason: "duplicate" | "cursor-stalled" | "budget") {
    super(
      {
        duplicate: "资产分页包含重复项，未接纳结果",
        "cursor-stalled": "资产分页没有前进，未接纳结果",
        budget: "资产分页超过查询预算，未接纳不完整结果",
      }[reason],
    );
    this.name = "SnapshotPaginationError";
  }
}

export interface SnapshotPage<T> {
  readonly items: readonly T[];
  readonly hasNextPage: boolean;
  readonly cursor: string | null;
}

export function decodeConnection<T>(
  input: unknown,
  decode: (node: unknown) => T,
): SnapshotPage<T> {
  const connection = responseRecord(input);
  const pageInfo = responseRecord(connection.pageInfo);
  if (
    !Array.isArray(connection.nodes) ||
    typeof pageInfo.hasNextPage !== "boolean" ||
    (pageInfo.endCursor !== null && typeof pageInfo.endCursor !== "string")
  )
    throw new SnapshotReadError("incompatible");
  return {
    items: connection.nodes.map(decode),
    hasNextPage: pageInfo.hasNextPage,
    cursor: pageInfo.endCursor as string | null,
  };
}

/** Keep tentative pages local. No cursor or partial list escapes after any failed page. */
export async function collectSnapshotPages<T>(
  snapshot: Pick<GraphQLSnapshot, "session" | "revalidate">,
  readPage: (cursor: string | null) => Promise<SnapshotPage<T>>,
  key: (item: T) => string,
  options: { signal?: AbortSignal; maxPages?: number; maxItems?: number } = {},
): Promise<readonly T[]> {
  const maxPages = options.maxPages ?? 256;
  const maxItems = options.maxItems ?? 10_000;
  if (
    !Number.isSafeInteger(maxPages) ||
    maxPages < 1 ||
    maxPages > 1024 ||
    !Number.isSafeInteger(maxItems) ||
    maxItems < 1 ||
    maxItems > 100_000
  )
    throw new RangeError("分页预算无效");
  const items: T[] = [];
  const seen = new Set<string>();
  const cursors = new Set<string>();
  let cursor: string | null = null;
  for (let pageIndex = 0; pageIndex < maxPages; pageIndex++) {
    options.signal?.throwIfAborted();
    snapshot.session.assertActive();
    const page = await readPage(cursor);
    options.signal?.throwIfAborted();
    snapshot.session.assertActive();
    for (const item of page.items) {
      const id = key(item);
      if (!id || seen.has(id)) throw new SnapshotPaginationError("duplicate");
      seen.add(id);
      items.push(item);
      if (items.length > maxItems) throw new SnapshotPaginationError("budget");
    }
    if (!page.hasNextPage) {
      await snapshot.revalidate(options.signal);
      return Object.freeze(items);
    }
    if (!page.cursor || cursors.has(page.cursor))
      throw new SnapshotPaginationError("cursor-stalled");
    cursors.add(page.cursor);
    cursor = page.cursor;
  }
  throw new SnapshotPaginationError("budget");
}

// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildSchema, parse, validate } from "graphql";
import { WALLET_GRAPHQL_SCHEMA_CONTRACTS } from "../src/shared/rpc/graphql-schema-contracts";
import { schemaContractShape } from "../src/shared/rpc/graphql-schema-shape";

// Run from the wallet directory, like the other migration verification scripts.
const root = resolve(process.cwd(), "../..");
const source = "rtd/crates/rtd-indexer-alt-graphql/schema.graphql";
const sdl = readFileSync(resolve(root, source), "utf8");
const schema = buildSchema(sdl);
const contracts = Object.fromEntries(
  Object.entries(WALLET_GRAPHQL_SCHEMA_CONTRACTS).map(([name, query]) => {
    const errors = validate(schema, parse(query));
    if (errors.length)
      throw new Error(
        JSON.stringify({
          contract: name,
          localSchemaErrors: errors.map((e) => e.message),
        }),
      );
    return [name, schemaContractShape(schema, query)];
  }),
);
const result = {
  contractVersion: 1,
  source,
  sourceSha256: createHash("sha256").update(sdl).digest("hex"),
  contracts,
};
const target = resolve(
  process.cwd(),
  "src/shared/rpc/graphql-schema-contracts.json",
);
if (process.argv.slice(2).join(" ") === "--write") {
  writeFileSync(target, JSON.stringify(result, null, 2) + "\n");
} else if (
  process.argv.length !== 2 ||
  JSON.stringify(JSON.parse(readFileSync(target, "utf8"))) !==
    JSON.stringify(result)
) {
  throw new Error(
    "钱包schema合同基准已变化，需要审核后显式--write；不从运行时远端生成期望",
  );
}
console.log(
  JSON.stringify({
    passed: true,
    contracts: Object.keys(contracts).length,
    sourceSha256: result.sourceSha256,
    scope:
      "Reviewed local SDL and authored contracts only; no network/client/simulation/execution.",
  }),
);

import { expect, it } from "vitest";
import { nftAttributeRows } from "./nft-attributes";
it.each([false, true])(
  "native and legacy metadata attributes preserve JSON values: legacy=%s",
  (legacy) => {
    const attributes = {
      keys: ["zero", "false", "large", "nested"],
      values: [0, false, "9007199254740993", { kind: ["a", 1] }],
    };
    const metadata = legacy
      ? { fields: { attributes: { fields: attributes } } }
      : { attributes };
    expect(nftAttributeRows({ id: "0xa", metadata })).toEqual([
      { name: "zero", value: "0" },
      { name: "false", value: "false" },
      { name: "large", value: "9007199254740993" },
      { name: "nested", value: '{"kind":["a",1]}' },
    ]);
  },
);
it("top-level values remain text, including null, booleans and zero", () => {
  expect(
    nftAttributeRows({
      id: "0xa",
      count: 0,
      enabled: false,
      extra: null,
      list: [1, "x"],
    }),
  ).toEqual([
    { name: "count", value: "0" },
    { name: "enabled", value: "false" },
    { name: "extra", value: "null" },
    { name: "list", value: '[1,"x"]' },
  ]);
});
it.each([
  { keys: "bad", values: [] },
  { keys: ["a", "b"], values: [1] },
  { keys: [{ bad: true }], values: [1] },
])(
  "malformed attribute vectors use original JSON without crashing or pairing wrong values",
  (attributes) => {
    expect(nftAttributeRows({ metadata: { attributes } })).toEqual([
      { name: "metadata", value: JSON.stringify({ attributes }) },
    ]);
  },
);
it("duplicate labels are retained and non-object roots are rejected", () => {
  expect(
    nftAttributeRows({
      metadata: { attributes: { keys: ["x", "x"], values: [1, 2] } },
    }),
  ).toEqual([
    { name: "x", value: "1" },
    { name: "x", value: "2" },
  ]);
  for (const input of [null, undefined, [], false, "text"])
    expect(nftAttributeRows(input)).toEqual([]);
});

it("non-JSON numeric values do not become a manufactured null attribute", () => {
  expect(
    nftAttributeRows({ invalid: NaN, infinite: Infinity, missing: undefined }),
  ).toEqual([]);
});

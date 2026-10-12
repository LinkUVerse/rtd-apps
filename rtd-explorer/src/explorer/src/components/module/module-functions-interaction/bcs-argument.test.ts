import { describe, expect, it } from "vitest";
import { bcs } from "rtd-typescript/bcs";
import { createBcsType } from "./bcs-argument";

describe("normalized Move dynamic argument encoding with current SDK", () => {
  it("encodes recursive vector/option using the SDK, including an exact u64 above JS precision", () => {
    const values = [["9007199254740993", null], []];
    const expected = bcs
      .vector(bcs.vector(bcs.option(bcs.U64)))
      .serialize(values)
      .toBytes();
    const actual = createBcsType(["vector", "vector", "option", "U64"])
      .serialize(values)
      .toBytes();
    expect(actual).toEqual(expected);
    expect(
      createBcsType(["vector", "vector", "option", "U64"]).parse(actual),
    ).toEqual(values);
  });
  it("keeps empty options and empty vectors distinct", () => {
    expect(createBcsType(["option", "U8"]).serialize(null).toBytes()).toEqual(
      new Uint8Array([0]),
    );
    expect(createBcsType(["vector", "U8"]).serialize([]).toBytes()).toEqual(
      new Uint8Array([0]),
    );
    expect(createBcsType(["option", "U8"]).serialize(7).toBytes()).toEqual(
      new Uint8Array([1, 7]),
    );
  });
  it("refuses missing or malformed type structure and delegates integer range checks to SDK", () => {
    for (const types of [
      [],
      [undefined],
      ["vector"],
      ["option"],
      ["U8", "U16"],
    ] as const)
      expect(() => createBcsType(types)).toThrow();
    expect(() =>
      createBcsType(["vector", "U8"]).serialize("not-an-array"),
    ).toThrow();
    expect(() => createBcsType(["U8"]).serialize(256)).toThrow();
  });
});

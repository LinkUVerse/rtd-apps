// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  assertEventEnvelope,
  eventEnvelopeDigest,
  serializeEventEnvelope,
} from "./event-envelope";
const event = {
  packageId: "0x3",
  module: "validator",
  sender: "0xb",
  eventType: "0x3::validator::StakingRequestEvent",
  contents: { value: new Uint8Array([1, 2]) },
};
const vectors = readFileSync(
  "migrationToGRpcOrGraphQLDoc/evidence/20261003-event-envelope-rust-vectors.jsonl",
  "utf8",
)
  .trim()
  .split("\n")
  .map(
    (line) =>
      JSON.parse(line) as { count: number; hex: string; digest: string },
  );
describe("事件向量与Rust原生BCS／typed hash对标", () => {
  it.each(vectors)(
    "原生Rust $count 项向量的序列化及摘要逐字节一致",
    ({ count, hex, digest }) => {
      const events = Array.from({ length: count }, () => event);
      const bytes = serializeEventEnvelope(events);
      expect(
        Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
          "",
        ),
      ).toBe(hex);
      expect(eventEnvelopeDigest(bytes)).toBe(digest);
      expect(() =>
        assertEventEnvelope({ events, bcs: { value: bytes }, digest }, digest),
      ).not.toThrow();
    },
  );
  it("截断事件、改BCS、漏BCS、错摘要均拒绝，不能由请求mask推断完整", () => {
    const events = [event, event];
    const bytes = serializeEventEnvelope(events);
    const digest = eventEnvelopeDigest(bytes);
    for (const raw of [
      { events: [event], bcs: { value: bytes }, digest },
      { events, bcs: { value: bytes.subarray(0, bytes.length - 1) }, digest },
      { events, digest },
      { events, bcs: { value: bytes }, digest: vectors[0].digest },
    ])
      expect(() => assertEventEnvelope(raw, digest)).toThrow();
  });
  it("真正无事件与字段缺失区分；有eventsDigest不能默认为空", () => {
    expect(() => assertEventEnvelope(undefined, undefined)).not.toThrow();
    expect(() => assertEventEnvelope(undefined, vectors[1].digest)).toThrow();
    expect(() => assertEventEnvelope({ events: [event] }, undefined)).toThrow();
  });
});

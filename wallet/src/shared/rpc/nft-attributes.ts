// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

type RecordValue = Record<string, unknown>;
function record(value: unknown): RecordValue | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as RecordValue)
    : null;
}
function text(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "boolean") return String(value);
  if (typeof value === "number")
    return Number.isFinite(value) ? String(value) : null;
  if (value === null) return "null";
  try {
    return JSON.stringify(value) ?? null;
  } catch {
    return null;
  }
}
/** Native Move JSON first; also accept persisted legacy attribute wrappers as display data. */
export function nftAttributeRows(
  value: unknown,
): { name: string; value: string }[] {
  const fields = record(value);
  if (!fields) return [];
  const metadata = record(fields.metadata);
  const body = record(metadata?.fields) ?? metadata;
  const attributes = record(body?.attributes);
  const entries = record(attributes?.fields) ?? attributes;
  const keys = entries?.keys,
    values = entries?.values;
  const pairs: [string, unknown][] =
    Array.isArray(keys) &&
    Array.isArray(values) &&
    keys.length === values.length &&
    keys.every((key) => typeof key === "string")
      ? keys.map((key, index) => [key, values[index]])
      : Object.entries(fields).filter(([key]) => key !== "id");
  return pairs.flatMap(([name, value]) => {
    const formatted = text(value);
    return formatted === null ? [] : [{ name, value: formatted }];
  });
}

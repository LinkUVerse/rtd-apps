// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Lossy invalidation only; no record, binding, account or authority is transmitted.
const MESSAGE = "network-admission-invalidated:v1";
type Entry = { listeners: Set<() => void>; channel?: BroadcastChannel };
const entries = new Map<string, Entry>();
function deliver(entry: Entry) {
  for (const listener of [...entry.listeners]) {
    try {
      listener();
    } catch {
      /* A subscriber cannot change a committed transaction. */
    }
  }
}
function channelName(database: string) {
  return `${database}:invalidate:v1`;
}
export function subscribeNetworkAdmission(
  database: string,
  listener: () => void,
) {
  let entry = entries.get(database);
  if (!entry) {
    entry = { listeners: new Set() };
    entries.set(database, entry);
    try {
      entry.channel = new BroadcastChannel(channelName(database));
      const current = entry;
      entry.channel.onmessage = (event) => {
        if (event.data === MESSAGE) deliver(current);
      };
    } catch {
      /* Optional notification transport; native reads remain mandatory. */
    }
  }
  entry.listeners.add(listener);
  const current = entry;
  return () => {
    current.listeners.delete(listener);
    if (!current.listeners.size && entries.get(database) === current) {
      current.channel?.close();
      entries.delete(database);
    }
  };
}
export function notifyNetworkAdmission(database: string) {
  const entry = entries.get(database);
  if (entry) deliver(entry);
  let temporary: BroadcastChannel | undefined;
  try {
    const channel =
      entry?.channel ??
      (temporary = new BroadcastChannel(channelName(database)));
    channel.postMessage(MESSAGE);
  } catch {
    /* Completion is already durable; never turn this into authorization or undo it. */
  } finally {
    temporary?.close();
  }
}

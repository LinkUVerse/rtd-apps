// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Message } from "_messages";
import { filter, fromEvent, map, share } from "rxjs";
import type { Observable } from "rxjs";
import { isSensitiveDappResult } from "../rpc/dapp-egress-protocol";

export type ClientType = "rtd_in-page" | "rtd_content-script";

type WindowMessage = {
  target: ClientType;
  payload: Message;
};

function isWindowMessage(
  value: unknown,
  target: ClientType,
): value is WindowMessage {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const envelope = value as Record<string, unknown>;
  if (
    envelope.target !== target ||
    !envelope.payload ||
    typeof envelope.payload !== "object" ||
    Array.isArray(envelope.payload)
  )
    return false;
  const message = envelope.payload as Record<string, unknown>;
  if (
    typeof message.id !== "string" ||
    !message.id ||
    !message.payload ||
    typeof message.payload !== "object" ||
    Array.isArray(message.payload)
  )
    return false;
  const payload = message.payload as Record<string, unknown>;
  return (
    typeof payload.type === "string" ||
    (payload.error === true &&
      typeof payload.code === "number" &&
      typeof payload.message === "string")
  );
}

export class WindowMessageStream {
  public readonly messages: Observable<Message>;
  private _name: ClientType;
  private _target: ClientType;

  constructor(name: ClientType, target: ClientType, gateOrigin?: string) {
    if (name === target) {
      throw new Error(
        "[WindowMessageStream] name and target must be different",
      );
    }
    if (
      gateOrigin !== undefined &&
      (name !== "rtd_in-page" ||
        !/^chrome-extension:\/\/[a-p]{32}$/.test(gateOrigin))
    )
      throw new Error("Invalid private gate origin");
    this._name = name;
    this._target = target;
    this.messages = fromEvent<MessageEvent<WindowMessage>>(
      window,
      "message",
    ).pipe(
      filter((message) => {
        if (!isWindowMessage(message.data, this._name)) return false;
        if (message.source === window)
          return !(gateOrigin && isSensitiveDappResult(message.data.payload));
        if (
          !gateOrigin ||
          !message.isTrusted ||
          message.origin !== gateOrigin ||
          !isSensitiveDappResult(message.data.payload)
        )
          return false;
        return Array.from(document.querySelectorAll("iframe")).some(
          (frame) =>
            frame.src === gateOrigin + "/egress-gate.html" &&
            frame.contentWindow === message.source,
        );
      }),
      map((message) => message.data.payload),
      share(),
    );
  }

  public send(payload: Message) {
    const msg: WindowMessage = {
      target: this._target,
      payload,
    };
    window.postMessage(msg);
  }
}

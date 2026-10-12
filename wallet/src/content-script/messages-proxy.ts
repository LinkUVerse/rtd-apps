// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { PortStream } from "_messaging/PortStream";
import { WindowMessageStream } from "_messaging/WindowMessageStream";
import type { Message } from "_src/shared/messaging/messages";
import { isSensitiveDappResult } from "../shared/rpc/dapp-egress-protocol";
import { createDappEgressClient } from "./dapp-egress-client";

export function setupMessagesProxy() {
  const stream = new WindowMessageStream("rtd_content-script", "rtd_in-page");
  const egress = createDappEgressClient();
  let port: PortStream | undefined;
  const connect = () => {
    if (port?.connected) return port;
    const next = PortStream.connectToBackgroundService(
      "rtd_content<->background",
    );
    port = next;
    next.onMessage.subscribe((msg) => {
      // Sensitive successes use the canonical private gate exclusively.
      if (isSensitiveDappResult(msg)) return;
      egress.finishRequest(msg.id);
      stream.send(msg);
    });
    next.onDisconnect.subscribe(() => {
      egress.close();
    });
    return next;
  };
  stream.messages.subscribe((msg) => {
    void (async () => {
      const type = "type" in msg.payload ? msg.payload.type : undefined;
      const sensitive =
        type === "execute-transaction-request" ||
        type === "sign-transaction-request" ||
        (type === "sign-message-request" && "args" in msg.payload);
      if (sensitive) {
        await egress.ready;
        egress.beginRequest(msg.id);
      }
      connect().sendMessage(msg);
    })().catch(() => {
      egress.finishRequest(msg.id);
      const response: Message = {
        id: msg.id,
        payload: {
          error: true,
          code: -1,
          message: "Wallet request channel is unavailable",
        },
      };
      stream.send(response);
    });
  });
}

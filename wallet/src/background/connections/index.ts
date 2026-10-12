// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { createMessage } from "_messages";
import type { SetNetworkPayload } from "_payloads/network";
import type { Permission } from "_payloads/permissions";
import type {
  WalletStatusChange,
  WalletStatusChangePayload,
} from "_payloads/wallet-status-change";
import type { NetworkEnvType } from "_src/shared/api-env";
import { type UIAccessibleEntityType } from "_src/shared/messaging/messages/payloads/MethodPayload";
import { type QredoConnectPayload } from "_src/shared/messaging/messages/payloads/QredoConnect";
import Browser from "webextension-polyfill";

import { authorizeNativeUiPort } from "../ui-native-context";
import { getDappEgressBroker } from "../dapp-egress-runtime";
import {
  DAPP_EGRESS_SOURCE_CHANNEL,
  DAPP_EGRESS_GATE_CHANNEL,
} from "../../shared/rpc/dapp-egress-protocol";
import type { Connection } from "./Connection";
import { ContentScriptConnection } from "./ContentScriptConnection";
import { UiConnection } from "./UiConnection";

export class Connections {
  #connections: Connection[] = [];

  constructor() {
    Browser.runtime.onConnect.addListener((port) => {
      if (
        port.name === DAPP_EGRESS_SOURCE_CHANNEL ||
        port.name === DAPP_EGRESS_GATE_CHANNEL
      ) {
        getDappEgressBroker().accept(port);
        return;
      }
      if (port.name === UiConnection.CHANNEL) {
        void authorizeNativeUiPort(port)
          .then((messages) => {
            const connection = new UiConnection(port);
            this.register(connection);
            for (const message of messages)
              connection.receiveAuthorizedBufferedMessage(message);
          })
          .catch(() => port.disconnect());
        return;
      }
      try {
        let connection: Connection;
        switch (port.name) {
          case ContentScriptConnection.CHANNEL:
            connection = new ContentScriptConnection(port);
            break;
          default:
            throw new Error(`[Connections] Unknown connection ${port.name}`);
        }
        this.register(connection);
      } catch (e) {
        port.disconnect();
      }
    });
  }

  private register(connection: Connection) {
    this.#connections.push(connection);
    connection.onDisconnect.subscribe(() => {
      const i = this.#connections.indexOf(connection);
      if (i >= 0) this.#connections.splice(i, 1);
    });
  }

  public notifyContentScript(
    notification:
      | { event: "permissionReply"; permission: Permission }
      | {
          event: "walletStatusChange";
          change: Omit<WalletStatusChange, "accounts">;
        }
      | {
          event: "walletStatusChange";
          origin: string;
          change: WalletStatusChange;
        }
      | {
          event: "qredoConnectResult";
          origin: string;
          allowed: boolean;
        },
    messageID?: string,
  ) {
    for (const aConnection of this.#connections) {
      if (aConnection instanceof ContentScriptConnection) {
        switch (notification.event) {
          case "permissionReply":
            aConnection.permissionReply(notification.permission);
            break;
          case "walletStatusChange":
            if (
              !("origin" in notification) ||
              aConnection.origin === notification.origin
            ) {
              aConnection.send(
                createMessage<WalletStatusChangePayload>({
                  type: "wallet-status-changed",
                  ...notification.change,
                }),
              );
            }
            break;
          case "qredoConnectResult":
            if (notification.origin === aConnection.origin) {
              aConnection.send(
                createMessage<QredoConnectPayload<"connectResponse">>(
                  {
                    type: "qredo-connect",
                    method: "connectResponse",
                    args: { allowed: notification.allowed },
                  },
                  messageID,
                ),
              );
            }
            break;
        }
      }
    }
  }

  public notifyUI(
    notification:
      | { event: "networkChanged"; network: NetworkEnvType }
      | { event: "storedEntitiesUpdated"; type: UIAccessibleEntityType },
  ) {
    for (const aConnection of this.#connections) {
      if (aConnection instanceof UiConnection) {
        switch (notification.event) {
          case "networkChanged":
            aConnection.send(
              createMessage<SetNetworkPayload>({
                type: "set-network",
                network: notification.network,
              }),
            );
            break;
          case "storedEntitiesUpdated":
            aConnection.notifyEntitiesUpdated(notification.type);
            break;
        }
      }
    }
  }
}

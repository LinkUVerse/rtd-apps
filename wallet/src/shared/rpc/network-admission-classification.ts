// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { NetworkIdentityError } from "./identity";
import type { WalletReadSession } from "./session";
import type { WalletNetworkCapabilities } from "./network-capabilities";
import { projectReadCapabilities } from "./read-capability-view";
import {
  validateNetworkAdmissionFault,
  type NetworkAdmissionFault,
} from "./network-admission-state";

/** Exact local error type only. No message/name/data parsing and no transient failure promotion. */
export function classifyNetworkAdmissionError(
  error: unknown,
): readonly NetworkAdmissionFault[] {
  return Object.freeze(
    error instanceof NetworkIdentityError
      ? [
          validateNetworkAdmissionFault({
            kind: "identity",
            role: error.role,
            reason: error.reason,
          }),
        ]
      : [],
  );
}
/** Full production report must belong to this live session; only explicit schema/ABI incompatibility is retained. */
export function classifyNetworkAdmissionCapabilities(
  session: WalletReadSession,
  report: WalletNetworkCapabilities,
): readonly NetworkAdmissionFault[] {
  const view = projectReadCapabilities(session, report),
    result: NetworkAdmissionFault[] = [];
  if (view.phase !== "read-contracts-assessed")
    throw new Error("能力投影未得到当前合同报告");
  if (view.graphql.state === "observed")
    for (const [domain, row] of Object.entries(view.graphql.value.domains))
      if (row.state === "unsupported" && row.reason === "schema")
        result.push(
          validateNetworkAdmissionFault({
            kind: "graphql-domain",
            domain,
            reason: "schema",
          }),
        );
  if (view.deployment.state === "observed" && view.deployment.value.move)
    for (const [group, row] of Object.entries(
      view.deployment.value.move.groups,
    ))
      if (row.state === "unsupported" && row.reason === "abi")
        result.push(
          validateNetworkAdmissionFault({
            kind: "move-group",
            group,
            reason: "abi",
          }),
        );
  return Object.freeze(result);
}

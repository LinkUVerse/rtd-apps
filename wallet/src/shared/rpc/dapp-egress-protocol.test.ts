import { expect, it, vi } from "vitest";
import {
  validateDappEgressMessage,
  isSensitiveDappResult,
  DAPP_EGRESS_MAX_BYTES,
} from "./dapp-egress-protocol";
const message = () => ({
  id: "public-request",
  payload: {
    type: "sign-transaction-response",
    result: { transactionBlockBytes: "AA==", signature: "AA==" },
  },
});
it("accepts bounded signature/transaction envelopes, but is not cryptographic verification", () => {
  expect(validateDappEgressMessage(message(), "public-request")).toEqual(
    message(),
  );
  expect(isSensitiveDappResult(message())).toBe(true);
});
it("supports an empty personal message while requiring nonempty signature", () => {
  const m = {
    id: "public-request",
    payload: {
      type: "sign-message-request",
      return: { messageBytes: "", signature: "AA==" },
    },
  };
  expect(validateDappEgressMessage(m, m.id)).toBe(m);
});
it.each(["changed-request", "", "x".repeat(201)])(
  "refuses wrong or unbounded response request id",
  (id) => {
    expect(() => validateDappEgressMessage(message(), id)).toThrow();
  },
);
it.each(["A===", "AB==", "AA", "not a signature", ""])(
  "requires canonical nonempty signature base64",
  (signature) => {
    const m = message();
    m.payload.result.signature = signature;
    expect(() => validateDappEgressMessage(m, m.id)).toThrow();
  },
);
it("rejects getter envelopes without evaluating their contents", () => {
  const getter = vi.fn(() => message().payload);
  const m = {
    id: "public-request",
    get payload() {
      return getter();
    },
  };
  expect(() => validateDappEgressMessage(m, m.id)).toThrow();
  expect(getter).not.toHaveBeenCalled();
});
it("requires exact payload/result fields", () => {
  expect(() =>
    validateDappEgressMessage({ ...message(), extra: true }, "public-request"),
  ).toThrow();
  expect(() =>
    validateDappEgressMessage(
      {
        id: "public-request",
        payload: {
          ...message().payload,
          result: { ...message().payload.result, extra: true },
        },
      },
      "public-request",
    ),
  ).toThrow();
});
it("enforces complete envelope byte budget", () => {
  const m = message();
  m.payload.result.transactionBlockBytes = "AAAA".repeat(
    DAPP_EGRESS_MAX_BYTES / 4,
  );
  expect(() => validateDappEgressMessage(m, m.id)).toThrow();
});
it("returns the complete existing 1MiB personal-message input with signature", () => {
  const bytes = btoa("x".repeat(1_048_576));
  const m = {
    id: "public-request",
    payload: {
      type: "sign-message-request",
      return: { messageBytes: bytes, signature: "AA==" },
    },
  };
  expect(validateDappEgressMessage(m, m.id)).toBe(m);
  expect(atob(m.payload.return.messageBytes).length).toBe(1_048_576);
});
it("does not accept ordinary or error messages for the private result outlet", () => {
  expect(() =>
    validateDappEgressMessage(
      { id: "public-request", payload: { type: "done" } },
      "public-request",
    ),
  ).toThrow();
  expect(
    isSensitiveDappResult({
      id: "public-request",
      payload: { error: true, code: -1, message: "closed" },
    }),
  ).toBe(false);
});

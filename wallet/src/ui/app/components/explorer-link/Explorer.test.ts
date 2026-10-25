// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from "vitest";

import { API_ENV } from "_src/shared/api-env";
import { getAddressUrl, getObjectUrl, getTransactionUrl, getValidatorUrl } from "./Explorer";

const RPC = "http://192.168.10.126:43350";
const read = (url: string) => new URL(url);

describe("dev explorer links", () => {
	it("points every wallet entry at the local explorer dev port", () => {
		const tx = read(getTransactionUrl("D4sQpGUm9fPe67Cw7Zkd5oxtqxLBMTApxsKmQtPUrrrz", API_ENV.local, RPC));
		expect(tx.host).toBe("192.168.10.126:5180");
		expect(tx.pathname).toBe("/txblock/D4sQpGUm9fPe67Cw7Zkd5oxtqxLBMTApxsKmQtPUrrrz");
		expect(tx.searchParams.get("network")).toBe("local");

		const address = read(getAddressUrl("0xabc", API_ENV.local, RPC));
		expect(address.host).toBe("192.168.10.126:5180");
		expect(address.pathname).toBe("/address/0xabc");

		const object = read(getObjectUrl("0xdef", API_ENV.local, RPC, "coin"));
		expect(object.host).toBe("192.168.10.126:5180");
		expect(object.pathname).toBe("/object/0xdef");
		expect(object.searchParams.get("module")).toBe("coin");

		const validator = read(getValidatorUrl("0x123", API_ENV.local, RPC));
		expect(validator.host).toBe("192.168.10.126:5180");
		expect(validator.pathname).toBe("/validator/0x123");
	});

	it("keeps the public explorer for non-dev networks", () => {
		const url = read(getTransactionUrl("digest", API_ENV.mainnet, RPC));
		expect(url.host).toBe("rtdexplorer.com");
		expect(url.searchParams.get("network")).toBe("mainnet");
	});

	it("uses the custom RPC endpoint as the dev network selector", () => {
		const url = read(getTransactionUrl("digest", API_ENV.customRPC, RPC));
		expect(url.host).toBe("192.168.10.126:5180");
		expect(url.searchParams.get("network")).toBe(RPC);
	});
});

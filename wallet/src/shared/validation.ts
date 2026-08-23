// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import BigNumber from 'bignumber.js';
import * as Yup from 'yup';

type TokenValidationMessages = {
	required: string;
	invalid: string;
	minimum: string;
	maximum: string;
	maximumDecimals: string;
};

export function createTokenValidation(
	coinBalance: bigint,
	decimals: number,
	messages: TokenValidationMessages,
) {
	return Yup.mixed<BigNumber>()
		.transform((_, original) => {
			return new BigNumber(original);
		})
		.test('required', messages.required, (value) => {
			return !!value;
		})
		.test('valid', messages.invalid, (value) => {
			if (!value || value.isNaN() || !value.isFinite()) {
				return false;
			}
			return true;
		})
		.test('min', messages.minimum, (amount) => (amount ? amount.gt(0) : false))
		.test('max', messages.maximum, (amount) =>
			amount ? amount.shiftedBy(decimals).lte(coinBalance.toString()) : false,
		)
		.test('max-decimals', messages.maximumDecimals, (amount) => {
			return amount ? amount.shiftedBy(decimals).isInteger() : false;
		});
}

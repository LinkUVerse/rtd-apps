// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { formatBalance } from 'rtd-apps-core';
import type { MessageKey, MessageValues } from '_app/i18n';
import BigNumber from 'bignumber.js';
import { mixed, object } from 'yup';

export function createValidationSchema(
	coinBalance: bigint,
	coinSymbol: string,
	decimals: number,
	isUnstake: boolean,
	minimumStake: bigint,
	t: (key: MessageKey, values?: MessageValues) => string,
) {
	return object({
		// NOTE: This is an intentional subset of the token validation:
		amount: isUnstake
			? mixed()
			: mixed<BigNumber>()
					.transform((_, original) => {
						return new BigNumber(original);
					})
					.test('required', t('validation.required'), (value) => {
						return !!value;
					})
					.test('valid', t('validation.invalidNumber'), (value) => {
						if (!value || value.isNaN() || !value.isFinite()) {
							return false;
						}
						return true;
					})
					.test(
						'min',
						t('validation.minimumAmount', {
							amount: formatBalance(minimumStake, decimals),
							symbol: coinSymbol,
						}),
						(amount) =>
							amount
								? amount.shiftedBy(decimals).gte(minimumStake.toString())
								: false,
					)
					.test('max', (amount, ctx) => {
						const gasBudget = ctx.parent.gasBudget || 0n;
						const availableBalance = coinBalance - gasBudget;
						if (availableBalance < 0) {
							return ctx.createError({
								message: t('validation.insufficientFunds'),
							});
						}
						const enoughBalance = amount
							? amount.shiftedBy(decimals).lte(availableBalance.toString())
							: false;
						if (enoughBalance) {
							return true;
						}
						return ctx.createError({
							message: t('validation.maximumAmount', {
								amount: formatBalance(availableBalance, decimals),
								symbol: coinSymbol,
							}),
						});
					})
					.test(
						'max-decimals',
						t('validation.maximumDecimals', { count: decimals }),
						(amount) => {
							return amount ? amount.shiftedBy(decimals).isInteger() : false;
						},
					)
					.label(t('transfer.selectAmount')),
	});
}

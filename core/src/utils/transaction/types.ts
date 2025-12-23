// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { BalanceChangeSummary } from './getBalanceChangeSummary';
import { GasSummaryType } from './getGasSummary';
import { ObjectChangeSummary } from './getObjectChangeSummary';

export type TransactionSummary = {
	digest?: string;
	sender?: string;
	timestamp?: string | null;
	balanceChanges: BalanceChangeSummary;
	gas?: GasSummaryType;
	objectSummary: ObjectChangeSummary | null;
} | null;

export type RtdObjectChangeTypes =
	| 'published'
	| 'transferred'
	| 'mutated'
	| 'deleted'
	| 'wrapped'
	| 'created';

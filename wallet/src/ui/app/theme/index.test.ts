// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { resolveTheme, supportedThemes } from '.';

describe('wallet themes', () => {
	it('exposes all wallet themes', () => {
		expect(supportedThemes).toEqual([
			'passion',
			'calm',
			'professional',
			'red-thread',
		]);
	});

	it('falls back to the LinkU default passion theme', () => {
		expect(resolveTheme('calm')).toBe('calm');
		expect(resolveTheme('professional')).toBe('professional');
		expect(resolveTheme('red-thread')).toBe('red-thread');
		expect(resolveTheme('unknown')).toBe('passion');
		expect(resolveTheme(null)).toBe('passion');
	});
});

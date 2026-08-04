// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { resolveTheme, supportedThemes } from '.';

describe('wallet themes', () => {
	it('exposes the LinkU passion and calm themes', () => {
		expect(supportedThemes).toEqual(['passion', 'calm']);
	});

	it('falls back to the LinkU default passion theme', () => {
		expect(resolveTheme('calm')).toBe('calm');
		expect(resolveTheme('unknown')).toBe('passion');
		expect(resolveTheme(null)).toBe('passion');
	});
});

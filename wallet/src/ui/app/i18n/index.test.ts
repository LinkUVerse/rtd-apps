// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { resolveLocale, translate } from '.';

describe('wallet i18n', () => {
	it('resolves supported and regional locales', () => {
		expect(resolveLocale('en')).toBe('en');
		expect(resolveLocale('zh-CN')).toBe('zh-CN');
		expect(resolveLocale('zh-TW')).toBe('zh-CN');
		expect(resolveLocale('fr-FR')).toBe('en');
	});

	it('translates both supported languages', () => {
		expect(translate('en', 'settings.title')).toBe('Wallet Settings');
		expect(translate('zh-CN', 'settings.title')).toBe('钱包设置');
	});

	it('interpolates values without evaluating them', () => {
		expect(translate('en', 'settings.version', { version: '1.2.3' })).toBe(
			'RTD Wallet version v1.2.3',
		);
	});
});

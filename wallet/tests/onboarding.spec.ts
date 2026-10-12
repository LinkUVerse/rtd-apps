// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { expect, test } from './fixtures';
import { createWallet, importWallet } from './utils/auth';
import { generateKeypair } from './utils/localnet';

test('create new wallet', async ({ page, extensionUrl }) => {
	await createWallet(page, extensionUrl);
	await page.getByRole('navigation').getByRole('link', { name: 'Home' }).click();
	await expect(page.getByText(/^0x[0-9a-f]+/i).first()).toBeVisible();
	await expect(page.getByText('当前网络尚未配置钱包数据服务')).toBeVisible();
	await expect(page.getByTestId('coin-balance')).toHaveCount(0);
});

test('import wallet', async ({ page, extensionUrl }) => {
	const { mnemonic, keypair } = await generateKeypair();
	await importWallet(page, extensionUrl, mnemonic);
	await page.getByRole('navigation').getByRole('link', { name: 'Home' }).click();
	await expect(
		page.getByText(keypair.getPublicKey().toRtdAddress().slice(0, 6)).first(),
	).toBeVisible();
});

test('zkLogin creation is explicitly unavailable', async ({ page, extensionUrl }) => {
	await page.goto(extensionUrl);
	await expect(page.getByRole('note').filter({ hasText: /zkLogin/i })).toBeVisible();
	await expect(page.getByLabel('Sign in with Google')).toHaveCount(0);
});

// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import NetworkEnv from './NetworkEnv';
import { walletStandardChain } from '../shared/api-env';

/** Optional Wallet Standard chain is authorization context, not an added signature domain. */
export async function assertPersonalMessageChain(chain: unknown): Promise<void> {
  if (chain === undefined) return;
  if (typeof chain !== 'string' || !/^rtd:[A-Za-z0-9_-]+$/.test(chain) || chain.length > 128)
    throw new Error('消息请求链格式无效');
  if (chain !== walletStandardChain(await NetworkEnv.getActiveNetwork()))
    throw new Error('消息请求链与当前钱包网络不匹配');
}

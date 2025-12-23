// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { registerWallet } from 'rtd-wallet-standard';

import { RtdWallet } from './WalletStandardInterface';

registerWallet(new RtdWallet());

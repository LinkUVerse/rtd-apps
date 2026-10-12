// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { registerWallet } from "rtd-wallet-standard";

import { RtdWallet } from "./WalletStandardInterface";

const script = document.currentScript;
if (!(script instanceof HTMLScriptElement)) throw new Error("钱包入口来源无效");
const source = new URL(script.src);
if (
  source.protocol !== "chrome-extension:" ||
  !/^[a-p]{32}$/.test(source.hostname) ||
  source.pathname !== "/dapp-interface.js"
)
  throw new Error("钱包入口来源无效");
const wallet = new RtdWallet(source.origin);
registerWallet(wallet);
void wallet.initialize();

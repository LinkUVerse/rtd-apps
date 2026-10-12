// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// This independent entry imports no account/storage/UI module before the top-window check.
if (window.top === window.self) {
  void import("./index");
}

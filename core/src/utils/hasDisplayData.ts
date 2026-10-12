// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { RtdObjectResponse } from 'rtd-typescript/jsonRpc';

export const hasDisplayData = (obj: RtdObjectResponse) => !!obj.data?.display?.data;

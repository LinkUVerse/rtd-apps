// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { RtdObjectResponse } from 'rtd-typescript/client';

export const hasDisplayData = (obj: RtdObjectResponse) => !!obj.data?.display?.data;

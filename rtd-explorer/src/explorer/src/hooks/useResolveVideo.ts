// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { explorerVideoUrl } from "rtd-apps-core/src/utils/explorer-kiosk";
import type { RtdObjectResponse } from "rtd-typescript/jsonRpc";

import { useRecognizedPackages } from "./useRecognizedPackages";

export function useResolveVideo(object: RtdObjectResponse) {
	const recognizedPackages = useRecognizedPackages();
	return explorerVideoUrl(object, recognizedPackages);
}

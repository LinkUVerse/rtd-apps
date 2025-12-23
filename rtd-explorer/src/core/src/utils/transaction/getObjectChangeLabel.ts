// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { RtdObjectChangeTypes } from "./types";

export const ObjectChangeLabels = {
	created: "Created",
	mutated: "Updated",
	transferred: "Transfer",
	published: "Publish",
	deleted: "Deleted",
	wrapped: "Wrap",
};

export function getObjectChangeLabel(type: RtdObjectChangeTypes) {
	return ObjectChangeLabels[type];
}

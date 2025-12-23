// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import {
	DisplayFieldsResponse,
	RtdObjectChange,
	RtdObjectChangeCreated,
	RtdObjectChangeDeleted,
	RtdObjectChangeMutated,
	RtdObjectChangePublished,
	RtdObjectChangeTransferred,
	RtdObjectChangeWrapped,
} from "rtd-typescript/client";

import { groupByOwner } from "./groupByOwner";
import { RtdObjectChangeTypes } from "./types";

export type WithDisplayFields<T> = T & { display?: DisplayFieldsResponse };
export type RtdObjectChangeWithDisplay = WithDisplayFields<RtdObjectChange>;

export type ObjectChanges = {
	changesWithDisplay: RtdObjectChangeWithDisplay[];
	changes: RtdObjectChange[];
	ownerType: string;
};
export type ObjectChangesByOwner = Record<string, ObjectChanges>;

export type ObjectChangeSummary = Record<RtdObjectChangeTypes, ObjectChangesByOwner>;

export const getObjectChangeSummary = (objectChanges: RtdObjectChangeWithDisplay[]) => {
	if (!objectChanges) return null;

	const mutated = objectChanges.filter(
		(change) => change.type === "mutated",
	) as RtdObjectChangeMutated[];

	const created = objectChanges.filter(
		(change) => change.type === "created",
	) as RtdObjectChangeCreated[];

	const transferred = objectChanges.filter(
		(change) => change.type === "transferred",
	) as RtdObjectChangeTransferred[];

	const published = objectChanges.filter(
		(change) => change.type === "published",
	) as RtdObjectChangePublished[];

	const wrapped = objectChanges.filter(
		(change) => change.type === "wrapped",
	) as RtdObjectChangeWrapped[];

	const deleted = objectChanges.filter(
		(change) => change.type === "deleted",
	) as RtdObjectChangeDeleted[];

	return {
		transferred: groupByOwner(transferred),
		created: groupByOwner(created),
		mutated: groupByOwner(mutated),
		published: groupByOwner(published),
		wrapped: groupByOwner(wrapped),
		deleted: groupByOwner(deleted),
	};
};

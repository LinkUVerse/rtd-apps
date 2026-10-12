// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Includes ? when query string is set
 */
export function toSearchQueryString(searchParams: URLSearchParams) {
	const searchQuery = searchParams.toString();
	if (searchQuery) {
		return `?${searchQuery}`;
	}
	return '';
}


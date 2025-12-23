// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { QueryClient } from '@tanstack/react-query';
import { type PersistedClient, type Persister } from '@tanstack/react-query-persist-client';
import { del, get, set } from 'idb-keyval';

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			// Only retry once by default:
			retry: 1,
			// Default stale time to 30 seconds, which seems like a sensible tradeoff between network requests and stale data.
			staleTime: 30 * 1000,
			// Default cache time to 24 hours, so that data will remain in the cache and improve wallet loading UX.
			gcTime: 24 * 60 * 60 * 1000,
			// Disable automatic interval fetching
			refetchInterval: 0,
			refetchIntervalInBackground: false,
			refetchOnWindowFocus: false,

			refetchOnMount: true,
		},
	},
});

// Helper function to check if a value is serializable
function isSerializable(value: any): boolean {
	if (value === null || value === undefined) return true;
	if (typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') return true;
	if (value instanceof Date) return true;
	if (value instanceof Promise) return false;
	if (typeof value === 'function') return false;
	if (typeof value === 'object') {
		if (Array.isArray(value)) {
			return value.every(isSerializable);
		}
		// Check for plain objects
		if (value.constructor === Object) {
			return Object.values(value).every(isSerializable);
		}
		// For other object types, be conservative
		return false;
	}
	return false;
}

// Helper function to sanitize data for serialization
function sanitizeForSerialization(data: any): any {
	if (!isSerializable(data)) {
		return undefined;
	}
	if (typeof data === 'object' && data !== null) {
		if (Array.isArray(data)) {
			return data.map(sanitizeForSerialization).filter(item => item !== undefined);
		}
		if (data.constructor === Object) {
			const sanitized: any = {};
			for (const [key, value] of Object.entries(data)) {
				const sanitizedValue = sanitizeForSerialization(value);
				if (sanitizedValue !== undefined) {
					sanitized[key] = sanitizedValue;
				}
			}
			return sanitized;
		}
	}
	return data;
}

function createIDBPersister(idbValidKey: IDBValidKey) {
	return {
		persistClient: async (client: PersistedClient) => {
			try {
				// Filter out non-serializable data
				const serializableClient = {
					...client,
					clientState: {
						...client.clientState,
						queries: client.clientState.queries.map((query) => ({
							...query,
							state: {
								...query.state,
								data: sanitizeForSerialization(query.state.data),
							},
						})),
					},
				};
				await set(idbValidKey, serializableClient);
			} catch (error) {
				console.warn('Failed to persist query client:', error);
			}
		},
		restoreClient: async () => {
			try {
				return await get<PersistedClient>(idbValidKey);
			} catch (error) {
				console.warn('Failed to restore query client:', error);
				return undefined;
			}
		},
		removeClient: async () => {
			try {
				await del(idbValidKey);
			} catch (error) {
				console.warn('Failed to remove query client:', error);
			}
		},
	} as Persister;
}

export const persister = createIDBPersister('queryClient.v1');

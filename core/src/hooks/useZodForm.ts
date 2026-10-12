// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { UseFormProps } from 'react-hook-form';
import type { TypeOf, ZodSchema } from 'zod';

interface UseZodFormProps<T extends ZodSchema<any>> extends UseFormProps<TypeOf<T>> {
	schema: T;
}

export const useZodForm = <T extends ZodSchema<any>>({
	schema,
	...formConfig
}: UseZodFormProps<T>) =>
	useForm({
		...formConfig,
		resolver: zodResolver(schema),
	});

// Schemas and resolver must use the same installed Zod major and type definitions.
export { z } from 'zod';

// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
	// Linked SDK packages must share the renderer's React instance.
	resolve: { dedupe: ['react', 'react-dom'] },
	plugins: [react(), tsconfigPaths({ projects: [resolve(__dirname, '../../tsconfig.json')] })],
	build: { sourcemap: true },
});

// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import preset from "rtd-apps-core/tailwind.config";
import { type Config } from "tailwindcss";

export default {
	content: ["./src/**/*.{js,jsx,ts,tsx}", "./node_modules/@linku/ui/src/**/*.{js,jsx,ts,tsx}"],
	presets: [preset],
} as Partial<Config>;

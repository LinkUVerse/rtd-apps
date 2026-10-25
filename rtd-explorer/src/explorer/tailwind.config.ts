// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import preset from "rtd-apps-core/tailwind.config";
import { type Config } from "tailwindcss";

/**
 * Explorer design layer: a light glass surface over a blue data mesh, with
 * deep-ink typography and an amber accent reserved for live/attention states.
 * The shared wallet preset is kept intact; only the Explorer build overrides it.
 */
export default {
	content: ["./src/**/*.{js,jsx,ts,tsx}", "./node_modules/@linku/ui/src/**/*.{js,jsx,ts,tsx}"],
	presets: [preset],
	theme: {
		extend: {
			colors: {
				gray: {
					100: "#0B1B3A",
					95: "#13264A",
					90: "#0B1B3A",
					85: "#1E293B",
					80: "#334155",
					75: "#475569",
					70: "#64748B",
					65: "#94A3B8",
					60: "#CBD5E1",
					55: "#E2E8F0",
					50: "#EEF3FA",
					45: "#DCE7F5",
					40: "#F3F7FD",
					35: "#FFFFFF",
				},
				steel: {
					DEFAULT: "#94A3B8",
					dark: "#475569",
					darker: "#0B1B3A",
				},
				rtd: {
					DEFAULT: "#2563EB",
					bright: "#1E40AF",
					light: "#DBEAFE",
					lightest: "#EFF6FF",
					dark: "#1E3A8A",
					primaryBlue2023: "#3B82F6",
				},
				hero: {
					DEFAULT: "#2563EB",
					dark: "#1E40AF",
					darkest: "#0B1B3A",
				},
				success: {
					DEFAULT: "#10B981",
					dark: "#047857",
					light: "#D1FAE5",
				},
				warning: {
					DEFAULT: "#F59E0B",
					dark: "#B45309",
					light: "#FEF3C7",
				},
				issue: {
					DEFAULT: "#F97316",
					dark: "#DC2626",
					light: "#FEE2E2",
				},
				offwhite: "#F7F9FD",
				offblack: "#0B1B3A",
				ink: "#0B1B3A",
				accent: "#D97706",
				line: "#DCE7F5",
				surface: "#FFFFFF",
			},
			boxShadow: {
				card: "0 1px 2px rgba(15,23,42,0.04), 0 18px 48px -28px rgba(30,64,175,0.35)",
				glass: "0 24px 80px -32px rgba(30,64,175,0.45)",
				lift: "0 12px 32px -16px rgba(30,64,175,0.35)",
				nav: "0 1px 0 rgba(255,255,255,0.7), 0 16px 40px -28px rgba(30,64,175,0.45)",
			},
			borderRadius: {
				"3xl": "1.5rem",
				"4xl": "2rem",
			},
			spacing: {
				header: "76px",
			},
			backgroundImage: {
				"explorer-mesh":
					"radial-gradient(1200px 620px at 12% -10%, #DBEAFE 0%, rgba(219,234,254,0) 62%), radial-gradient(900px 520px at 100% 0%, #E0F2FE 0%, rgba(224,242,254,0) 58%), linear-gradient(180deg, #F8FAFF 0%, #F4F7FE 46%, #F7F9FD 100%)",
				"hero-ink":
					"linear-gradient(135deg, #08152F 0%, #102A5C 52%, #1E3A8A 100%)",
				"grid-fade":
					"linear-gradient(rgba(30,64,175,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(30,64,175,0.055) 1px, transparent 1px)",
			},
		},
	},
} as Partial<Config>;

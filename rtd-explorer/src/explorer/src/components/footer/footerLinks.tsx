// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { type ReactNode } from "react";

type FooterItem = {
	category: string;
	items: { title: string; children: ReactNode; href: string }[];
};
export type FooterItems = FooterItem[];

export const footerLinks = [
	{ title: "Overview", href: "/" },
	{ title: "Activity", href: "/recent" },
	{ title: "Checkpoints", href: "/recent?tab=checkpoints" },
	{ title: "Epochs", href: "/recent?tab=epochs" },
	{ title: "Validators", href: "/validators" },
];

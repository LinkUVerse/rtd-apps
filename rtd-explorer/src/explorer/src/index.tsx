// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import "@fontsource-variable/inter";
import "@fontsource-variable/red-hat-mono";
import { QueryClientProvider } from "@tanstack/react-query";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";

import { router } from "./pages";
import { queryClient } from "./utils/queryClient";
import { I18nProvider } from "./i18n";

import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
	<I18nProvider>
		<QueryClientProvider client={queryClient}>
			<RouterProvider router={router} />
		</QueryClientProvider>
	</I18nProvider>
);

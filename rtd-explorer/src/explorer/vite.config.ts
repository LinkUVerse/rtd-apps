// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/// <reference types="vitest" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import svgr from "vite-plugin-svgr";
import { configDefaults } from "vitest/config";

process.env.VITE_VERCEL_ENV = process.env.VERCEL_ENV || "development";

/** Dedicated dev/preview port; Wallet dev links point at this port. */
const EXPLORER_DEV_PORT = Number(process.env.EXPLORER_DEV_PORT || 5180);

/**
 * Browser traffic stays same-origin. Vite proxies the fullnode gRPC-Web and
 * archive GraphQL endpoints so dev does not depend on permissive CORS or on
 * importing the local CA into the browser.
 */
const devProxy = {
    "/fullnode": {
        target: "http://127.0.0.1:43350",
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/fullnode/, ""),
    },
    "/archive": {
        target: "http://127.0.0.1:43412",
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/archive/, ""),
    },
    "/account": {
        target: "http://127.0.0.1:43413",
        changeOrigin: true,
    },
};

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react(), svgr()],
    test: {
        // Omit end-to-end tests:
        exclude: [...configDefaults.exclude, "tests/**"],
        css: true,
        globals: true,
        environment: "happy-dom",
    },
    build: {
        sourcemap: true,
        chunkSizeWarningLimit: 2000,
    },
    resolve: {
        dedupe: ["react", "react-dom"],
        alias: {
            "~": new URL("./src", import.meta.url).pathname,
            "rtd-apps-core": new URL("../../../core", import.meta.url).pathname,
        },
    },
    preview: {
        port: EXPLORER_DEV_PORT,
        host: true,
        strictPort: true,
        proxy: devProxy,
    },
    server: {
        port: EXPLORER_DEV_PORT,
        host: true,
        strictPort: true,
        proxy: devProxy,
    },
});

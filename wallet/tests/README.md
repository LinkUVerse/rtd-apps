# Wallet browser acceptance

Playwright only collects `*.spec.ts`; adapter tests use Vitest (`pnpm demoApp:test`). Browser tests run serially because existing scenarios reuse accounts and mutate the same development chain.

Playwright starts only the demo web server. It never starts the chain, chooses a cargo build, runs an arbitrary startup override, or regenerates genesis. Provision the dev chain and contracts using `link-u-smart-contract/all-in-one-deploy/localDeploy`, with the current `rtd/target/debug` binaries. Existing data must be reused without reset. The migration work log records the independent runtime and its build provenance.

Before chain scenarios:

1. Start and verify the required same-chain services and browser gRPC-Web gateway with the deployment scripts. A native gRPC port or a healthy process alone is insufficient.
2. Configure the extension's explicit network profile through its settings, including full genesis identity and required packages. The current old onboarding helpers do not perform this step automatically; until migrated, those chain scenarios are not acceptance evidence.
3. Set `VITE_RTD_NETWORK` and `VITE_RTD_GRPC_URL` for the modern demo, and `E2E_FAUCET_URL` for faucet funding. No fixed 9123 faucet fallback remains. The extension profile's faucet must point at the same deployment.
4. Run the selected browser scenarios with `pnpm playwright test`. Set `RTD_EXTENSION_CHROMIUM` to a Chrome-for-Testing executable if needed; `E2E_HEADLESS=true` is available for isolated automation.

The default demo server is `http://localhost:5181` and an existing process is not silently reused. Set `E2E_DEMO_URL` only when intentionally using an already configured demo server; Playwright then does not manage it. `pnpm playwright test --list` checks discovery only and does not prove live environment readiness, account setup or transaction success.

# Modern RTD dApp Kit demo

This development-only demo uses `rtd-dapp-kit-core` and `rtd-dapp-kit-react`. The extension itself continues to use its own WalletRpcProvider.

Start from the wallet directory with explicit values:

```sh
VITE_RTD_NETWORK=unknown VITE_RTD_GRPC_URL=https://your-verified-grpc-web-endpoint pnpm demoApp:dev
```

Use the network name corresponding to the extension's advertised `rtd:<network>` chain. A reviewed custom profile advertises its configured `walletStandardChain` (or `rtd:unknown` when omitted); Local advertises `rtd:localnet`; this string alone does not prove chain identity. The wallet must still validate its full H0 and service bindings. Use a browser-ready gRPC-Web endpoint; the dev chain's native gRPC port is insufficient. HTTP is permitted only for loopback development endpoints. Missing configuration displays an error; no public node or burner wallet is selected automatically.

The normal buttons call Kit's modern actions. Execution transfers one smallest unit back to the selected account and consumes gas after approval. Sign-only does not submit. Results or errors remain visible. Connect, switch account and disconnect use Kit state. The wrong-account switch deliberately calls modern Wallet Standard features with an unauthorized account, so rejection can be tested at the extension boundary rather than only in Kit's local account registry.

`pnpm demoApp:build` builds this demo separately from the extension. Building and mocked adapter tests do not establish successful extension approval, live execution or recovery. Existing Playwright scenarios also require the migrated explicit environment and service setup before they can be claimed as passing.

The demo Vite config deduplicates React and React DOM because this workspace links the modern Kit from the SDK checkout. Two React copies can build successfully but fail at runtime with `useContext` errors.

For the isolated real-extension connection and message-signing check, build this demo with `VITE_RTD_NETWORK=localnet`, keep the extension's reviewed Local profile in `dist`, and run `scripts/test-extension-account-lifecycle.cjs` with `RTD_TEST_DAPP_DIR` pointing to the demo output and `RTD_TEST_LOCAL_PROFILE=1`. The optional `RTD_TEST_DEV_CERT` pins only the dev leaf certificate for this test. This mode imports a public deterministic test key, verifies PersonalMessage signatures, and must not be combined with `RTD_TEST_DEV_KEYSTORE`. It does not execute a transaction or establish normal certificate trust, custom host permission, sign-only transaction, or full trial acceptance.

Set `RTD_TEST_DAPP_SIGN_TRANSACTION=1` to additionally test transaction sign-only using that public test account after explicitly funding it on the isolated local chain. The test compares the approval preview digest against returned transaction bytes, verifies the signature, and asserts zero ExecuteTransaction requests. It does not automatically request faucet funds or submit the signed transaction. Evidence for the single local funding request and successful run is in `migrationToGRpcOrGraphQLDoc/workLog/20261004-dapp-sign-only.md`.

The one-time execution mode (`RTD_TEST_DAPP_EXECUTE=1`) retains the fixed private `dapp-execution-browser-01` profile and journal, writes the intended digest/request before approval, and refuses initialization when that directory exists. It checks one execution, signature/effects, and the terminal journal after a full browser restart. This mode has already completed; do not delete its directory or rerun initialization to obtain another execution. Fault recovery must inspect and reuse retained state. See `workLog/20261004-TRY-03-completion.md` under the migration docs.

The follow-up `scripts/test-dapp-timeout-recovery.cjs` reuses the retained profile, checks the previous terminal journal, and permits one guarded fault attempt. It withholds a real ExecuteTransaction response until the worker's actual timeout, blocks immediate recovery reads, closes the approval and browser, then recovers the same digest after restart. That attempt has completed. Use only `--recover-only` for later read-only checks; never remove its marker or profile to repeat submission. The controlled fault and remaining coverage boundaries are documented in `workLog/20261004-TRY-04-completion.md`.

Use `RTD_TEST_DAPP_CANCEL=1` with the isolated Local-profile extension test to exercise direct Wallet Standard transaction cancellation. Both modern transaction methods are cancelled before invocation, while serialization waits, and after an approval window is persisted. The test never clicks transaction approval and asserts zero dispatches. This does not test cancellation after dispatch; preserve execution profiles and journals for that separate recovery test.

The retained profile now also contains the one-time `fault-abort-01` attempt. Its post-dispatch caller-cancellation observation failed; read-only recovery of the original digest succeeded. Do not rerun initialization, delete its marker, or resubmit it. Use `scripts/test-dapp-timeout-recovery.cjs --caller-abort --recover-only` only for readonly inspection. See migration workLog/20261004-dapp-abort-coordinator.md for the failed assertion and evidence limits.

For retained profiles, browser startup now verifies the actual service-worker source via CDP against dist/background.js. A cached earlier worker caused the first caller-abort fault-test failure; disk hashes alone were insufficient. Reload preserves storage and must be followed by source verification. `RTD_TEST_DAPP_CANCEL_SIMULATION=1` tests caller cancellation while a real simulation response is withheld, without transaction approval or execution. See workLog/20261004-worker-cache-cancellation.md.

The current-worker caller-abort attempt also completed once, after admission of the three existing terminal records. The retained profile now has four records; preserve `fault-abort-current-worker-01.json`. It must not be initialized again. `--verified-caller-abort --recover-only` reads the original digest without resubmission. See workLog/20261004-dapp-abort-verified.md for verified worker hashes, caller abort and locked recovery evidence.

`RTD_TEST_DAPP_ORIGIN_TABS=1` enables real-extension same-origin tab and different-origin isolation checks. It sends forged-origin page messages, tests sibling-port cancellation isolation, and navigates the owning tab away. It never approves transactions and requires zero dispatches; simulations may run while approval pages prepare.

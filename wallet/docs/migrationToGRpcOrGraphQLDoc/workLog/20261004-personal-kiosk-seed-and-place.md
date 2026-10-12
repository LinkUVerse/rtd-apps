# PersonalKiosk 真实创建、铸造与放入 NFT

## 真实执行

合约部署仓库新增 `localDeploy/seed_wallet_personal_kiosk.mjs`。沿用当前 debug 源码／二进制摘要复核、完整 H0、独立测试账户终态 receipt 检查，正式固定 bytes 模拟后落盘 pending，每阶段仅提交一次。默认创建 PersonalKiosk 并从已部署 migration_nft 合约 mint_direct；显式提供已恢复对象证据时执行 borrow_val → kiosk::place → return_val。

- 创建＋铸造 digest：`CbnRc7vTYLq9bCr9HjjmAKzUXmvp7RpBr8KhyiycDnif`，成功，runtime `personal-kiosk-seed-01`。
- 放入 digest：`Egcz5kcMz6yE9BV1M9Ujw9EcvBrECbdM6d7EsAK9z8Ph`，成功，runtime `personal-kiosk-place-01`。
- H0：`3tEPxLxUysGx4gfr8UEycvH7xohMWuwKVbTX5np4TCYj`。
- owner：`0x11e90d26087af15981c5e7d0739ce58886755f1ac83ebaeb1f7c643b87e5f614`。
- Kiosk：`0x9c08460e7fbd8d1b723e61b149dbb40c3031125b6aed873fe0e2a27b2001ae97`。
- PersonalKioskCap：`0x330eac2199354ea2d1bcf3005acb4847d4cd25a1c3de87282547a3f436116153`。
- NFT：`0x98ed523f2038dcec7cbcb5cf991efc157af1421800183833567c6a3ff83794d3`。

## 钱包真实读取证据

新增 `scripts/probe-live-personal-kiosk.ts` 使用实际 WalletFullnodeReader、nativeKioskCap、exactBcs 和 WalletExecutionReader；仅允许 GetServiceInfo/GetObject/GetTransaction，不读取签名密钥、不执行交易。

`20261004-personal-kiosk-objects.json` 验证创建后的能力对象 AddressOwner、Personal cap 内嵌原生 cap 指向、Shared Kiosk BCS、item_count=0、直接 NFT 归属及原 digest 恢复。

`20261004-personal-kiosk-placed-objects.json` 验证放入后的能力仍有效、item_count=1，按动态对象 Wrapper<Item> + NFT ID 派生父 Field，NFT ObjectOwner 等于该 Field，Field ObjectOwner 等于 Kiosk；放入交易原 digest 恢复成功。两份只读证据 dispatch=0；部署两阶段各为 1。

## 未完成

本轮不证明 GraphQL 在固定快照已发现这些新对象，不是钱包实际转出／Chrome 确认或 IndexedDB pending 验收。未改 profile，RPC-22 / TRY 保持未完成。后续要使 GraphQL 入库快照覆盖这两笔交易，再用正式钱包 prepareNftTransfer 发现、重验、预览及执行链路转出，不能用 Fullnode 数据伪装 GraphQL 快照。总体仍 33/98。

定向回归：kiosk-reader 16 项、nft-transfer-preparation 42 项，共 2 文件 58 测试通过，见 `20261004-personal-kiosk-targeted-tests.log`。这是单测证据，不能代替上述未完成的 GraphQL／转出实链验收。

# PersonalKiosk 实际发布与只读恢复

- 新增合约仓库 `localDeploy/publish_wallet_personal_kiosk.mjs`：当前 debug CLI 与源码摘要绑定、Fullnode H0 核验、独立 fixture 账户既有 pending 对应 bytes digest/成功 receipt 核验、重新编译六模块、结构化准备后固定 bytes 正式模拟、fsync 持久化 pending、一次 ExecuteTransaction。输出目录已有则拒绝覆盖。未复用旧 deployer 的未决交易账户。
- 当前 dev H0：`3tEPxLxUysGx4gfr8UEycvH7xohMWuwKVbTX5np4TCYj`。
- 发布账户：`0x11e90d26087af15981c5e7d0739ce58886755f1ac83ebaeb1f7c643b87e5f614`。
- 成功发布 digest：`AxoiBpwfQJrcnqE9H3fmXe8H9pNQUamV4hoPpZiMtTCY`，dispatch 1。
- 已发布 package：`0x3a4b9637c3f73ccf74d166162ce122d05917286046336cecac8564aeab8d5800`。
- 私有准备／签名／receipt 保存在 runtime 的 `personal-kiosk-publication-01`，不得重跑发布尝试。公开摘要见 `20261004-personal-kiosk-publication.log`，无私钥／签名。
- 钱包新增只读 `scripts/probe-recover-personal-kiosk.ts`，使用实际 WalletExecutionReader 原 digest 查询，验证成功。使用同 H0 Fullnode GetPackage 获取六模块，核验 PersonalKioskCap 的 UID + Option<KioskOwnerCap> 字段及 borrow_val/return_val 参数／结果类型。`20261004-personal-kiosk-abi.json` 和 `.log` 为最终证据，恢复过程 dispatch 0。首次仅模块列表版本的证据保留为 `20261004-personal-kiosk-recovery.json`。

## 验收边界

本轮是真实发布和钱包只读恢复，不是 Chrome 签名、不是真实 PersonalKiosk 创建／NFT 放入／转移，不证明 GraphQL 已索引新包和对象。未改 dev profile。RPC-22 保持未完成，后续先创建同账户受控 PersonalKiosk 并验证 BCS／内容和转移，再接入经过核验的新 profile。进度仍 33/98；未运行钱包全量测试或重新构建生产 bundle，本轮变更为部署／探测脚本。

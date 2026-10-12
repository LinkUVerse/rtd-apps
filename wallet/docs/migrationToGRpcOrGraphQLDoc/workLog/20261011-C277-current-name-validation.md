# C277：名称实时核对修复与真实验收

## 原因与实现

G4 已认证发布及名称夹具正常，但名称读取原先要求索引快照追到请求开始时的 Fullnode 高度，持续产块时即使名称记录不变也拒绝解析。这是钱包新鲜度判断逻辑的问题，不能靠清空索引掩盖。本次未重置链或索引，未修改 RTD/archive 服务代码。

名称索引仍使用完整覆盖的同一个快照，最终向当前 Fullnode 读取实际使用的正向、反向和祖先 dynamic field，以及 Clock 0x6。核对派生对象 ID、类型、父对象、完整字段 BCS 和当前时钟；索引缺失也必须与原生 NOT_FOUND 相符。任一目标、续期、祖先、反向记录变化拒绝旧结果。保留会话取消、H0、20 秒预算、最终高度不倒退和签名前再次核对。原生读取按最多四个并发进行，复用相同字段；不把索引落后长度本身作为失败条件。

这不构成跨服务原子快照或验证者共识证明，也不保证解析后名称永远不变。当前两仓库 SDK 契约 6.3 已同步更新，历史记录保留。

依据：[SuiNS 开发者文档](https://www.docs.sui.io/sui-stack/suins/developer)、[固定版本官方 gRPC name_service.rs](https://raw.githubusercontent.com/MystenLabs/sui/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-rpc-api/src/grpc/v2/name_service.rs)、[固定版本名称记录实现](https://raw.githubusercontent.com/MystenLabs/sui/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-name-service/src/lib.rs)。

## 已完成验证

- 87 项名称及收款相关测试通过，包含目标变化、删除、新增、续期、祖先 NFT、不匹配反向、当前时钟过期和倒退。前两轮失败及修复均保留在 name-tests-01/02.log，最终 name-tests-03.log 通过。
- 当前源码全套 **201 文件、2904 测试**通过，两项类型检查及生产构建退出 0。[检查记录](./20261011-C277-checks-01.json)。
- [产物闭包审核](./20261011-default-generation-positive-C277-closure-01.json)通过，5295 模块、2039 源码、7 JS 文件；相对 C276 仅产物模块 name-reader.ts 改变，manifest、发布 registry、默认 profile 与权限完全相同。
- [真实服务八场景](./20261011-C277-name-resolver-01.json)：主名称/叶子正向与默认反向通过；过期、缺失、无目标、错误祖先 NFT、过期反向均返回 null。快照 4024 的前三个正向结果在原生链头更高时仍经当前字段和时钟核验通过。该脚本每场景额外读取一次链头，流量不能当作纯产品请求数。未执行模拟、签名或交易。
- [C277 原路径安装](./20261011-C277-ordinary-upgrade-installed-01.json)完成，C276 完整备份、原四账户与扩展 ID 保留，原生 UI 已重新启用、重载并按持续授权解锁，首页 100.03 RTD 可读。没有直接读写浏览器账户数据库，没有记录密码。

## 普通 Chrome 正向及缺失/过期完成

2026-10-12 00:02–00:06，实际 C51/C277 在 G4 以 3270 账户输入 `wallet-migration.rtd` 和 0.001 RTD，估算及“检查”通过，得到待批准摘要 `FHSH34RVhv4FJyHsZVdSo58Lq1yimSfMSsLg7VusMgs2`。原生 AX 显示“检查并发送”，尚未点击发送。之后返回表单，分别输入 `absent-migration.rtd`、`expired-migration.rtd`，均明确显示“名称没有可用的收款地址，请检查后重试”，检查按钮禁用。

[Chrome HAR 审核](./20261012-C277-name-reads-audit-01.json)核对正向目标、真正缺失 null 和过期 timestamp=1；[原始 HAR](./20261012-C277-names-before-ui-fix-01.har)包含累计 451 个请求及 11 条取消/无成功内容例外，不能当作一次名称输入或一次刷新请求数。0 次 Execute、0 次 VerifySignature，两次模拟仅供预览；并未执行交易。

结合前述当前原生字段/Clock 实测，**QA-A15.3 正向解析、QA-A15.5 缺失和过期分支分别完成**。QA-A15.4/8 暂不完成：预览发现旧 `TxnAddress` 将反向名称替代真实地址，连浏览器链接都指向名称。源码已修复为名称与完整地址分别显示，链接始终指向实际地址；C278 验证中。真实改名/续期、registry 拒绝、最终名称目标与模拟/签名字节联验继续推进。

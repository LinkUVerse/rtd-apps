# C288 文档语义复核与对齐

本批纠正了 18 份钱包／归档方案文件的时间边界或正文，原文完整保存于 [原文副本目录](./20261012-C288-document-originals)。[修改清单](./20261012-C288-document-edits-01.json) 记录前后 SHA-256，18/18 当前文件及副本哈希检查通过。

已复核并修正：

- 初始 SDK 1.45.2／2.31.3 安装快照、旧 archive*.ts／recovery 文件缺失与当前 C278 不能混写为“当前”。保留旧源码观察及日期，用 C281／C280 指向当前来源和实际验收。
- “只能运行一套节点”改为单活动钱包实现；必要的 G3／G4 换链、pending 及回放对照允许隔离运行，不按同名进程粗暴清理。
- 归档保持原生 HTTP/2，上层浏览器桥接已经落地；旧 392xx 地址明确为历史，不替代当前 G4 配置。
- 账户活动的 `accountHistoryUrl` 与原生 GraphQL SDL 分开；旧 ToAddress、sender、affectedAddress 不互相冒充。
- 通用／Mobile 渐进迁移中的旧客户端例子明确排除本钱包；本钱包无 JSON-RPC fallback。
- GraphQL H0 验收改为 `checkpoint(sequenceNumber: 0).digest`，避免把旧短 chainIdentifier 当完整 H0。
- 钱包未知提交只按原 digest 读取恢复，不要求持久保存可重放 signed payload。
- W00–W07 完成门槛编号原先跳过 W01、出现 W08，现已纠正；这些工作组不再维护另一套易漂移的勾选状态，98 项计数仍由 Task.md 管理。W05 依赖笔误与质押签名章节引用一并修正。

2026-10-12 再次在线核对官方资料：[SDK 迁移](https://sdk.mystenlabs.com/sui/migrations/sui-2.0/json-rpc-migration)、[Core](https://sdk.mystenlabs.com/sui/clients/core)、[gRPC transport](https://sdk.mystenlabs.com/sui/clients/grpc)、[交易执行](https://sdk.mystenlabs.com/sui/clients/executing)、[Kiosk](https://sdk.mystenlabs.com/sui/migrations/sui-2.0/kiosk)、[Wallet Builders](https://sdk.mystenlabs.com/sui/migrations/sui-2.0/wallet-builders)、[归档](https://docs.sui.io/develop/accessing-data/archival-store/using-archival-store)、[GraphQL 架构](https://docs.sui.io/develop/accessing-data/graphql/graphql-rpc)。这些资料支持客户端分工、浏览器协议、结果联合类型和归档点查边界；RTD 实际包／H0／账户扩展仍以本地实现和实测为准。

本轮发现的语义问题已修复，但完整 REL-05.4 还需完成所有主章现行合同与其代码／证据的逐项终核，不以顶部说明或文件哈希代替。REL-05.5 的逐 RPC／页面证据追溯仍单独进行；没有修改验收完成数。

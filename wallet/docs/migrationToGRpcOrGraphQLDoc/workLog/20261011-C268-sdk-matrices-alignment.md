# C268：两套 SDK 主体矩阵与当前余额实现对齐

两套 SDK 技术文档的主体功能表仍将首页余额归入 GraphQL 固定快照，与已实施的 C250 及文档末尾现行规则冲突。本轮已同步修正：首页和币种选择使用 Fullnode `ListBalances` 全分页当前资金；GraphQL 固定 S 的资产组合、元数据及历史读取继续独立。实时余额不得标为同快照余额，失败不归零，交易准备仍重新校验。

依据当前 `useGetAllBalances`、`WalletRpcProvider`、`fullnode-reader` 源码，以及重新查阅的 [Sui 查询说明](https://sdk.mystenlabs.com/sui/clients/querying)和 [JSON-RPC 迁移说明](https://sdk.mystenlabs.com/sui/migrations/sui-2.0/json-rpc-migration)，保留 C250 固定官方源码 commit `9948bc0d23ca89c0fe00ad7448071713ff14860d`。官方资料说明方法和金额类型；RTD 的具体路由、身份校验和缓存期限以本地实现及实际验收为准。

同时将“全部待实施”的旧初版状态明确为历史评价，修正归档版在合并重编号后失效的章节引用。双方主表的余额行及路由语义一致；其他正文保留，不将整份初版代码示例宣称为现行实现。

[修改前完整副本清单](./20261011-C268-before-sdk-matrices-01/manifest.json)保留原文和 SHA。[独立核对](./20261011-C268-sdk-matrices-audit-01.json)通过：两份文档各仅两处主体合同修改、章节链接存在、当前源码路径及六份官方/本地源码快照 SHA 成立。没有修改业务代码或运行服务，故未新增业务测试或浏览器验收。

P268-1 完成；此局部文档修订不代替逐文档、逐 RPC、逐页面及实际完整回归。REL-05 与其余四个父项保持未完成，原进度仍为 93/98。

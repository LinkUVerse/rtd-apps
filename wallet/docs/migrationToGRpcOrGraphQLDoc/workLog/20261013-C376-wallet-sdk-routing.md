# C376：钱包链请求的 SDK 收口核验

结论：当前 C373 生产钱包全部 RTD 主链、归档 Ledger、原生 GraphQL 与账户历史 GraphQL 请求均通过 `rtd-typescript` 公共 API 发起；未发现绕过 SDK 自行发送链请求的路径。本轮无须为此修改 SDK。该结论是当前源码逐调用链审核与实际生产闭包结合的结果，不把简单关键词扫描当成形式化数据流证明。

## 请求映射

| 业务/检查 | 钱包模块 | SDK 公共入口 |
| --- | --- | --- |
| 当前对象、余额、币种余额、持有对象 | fullnode-reader | RtdGrpcClient.ledgerService / stateService |
| 交易解析/准备/模拟 | transaction-reader | Transaction.build 与 RtdGrpcClient.transactionExecutionService.simulateTransaction |
| 已签名提交、签名有效性 | execution-reader | RtdGrpcClient.transactionExecutionService.executeTransaction / signatureVerificationService.verifySignature |
| 交易详情和原摘要确认 | ledger-reader | RtdGrpcClient.ledgerService.getTransaction |
| 交易时历史对象、归档 checkpoint | archive-object-reader / archive-checkpoint-reader | RtdGrpcClient.ledgerService.batchGetObjects / getCheckpoint |
| 余额列表、元数据、NFT/Kiosk、质押、名称等固定快照查询 | graphql-snapshot / snapshot-query-queue 与各领域 reader | RtdGraphQLClient.query |
| 完整固定窗口账户历史/覆盖信息 | account-history-protocol | RtdGraphQLClient.query |
| H0、服务/schema/Move 包/部署能力、入口可达性 | identity / native-service-capabilities / graphql-schema-capabilities / move-package-capabilities / deployment-capabilities / entry-access / service-info-queue | RtdGrpcClient 对应 service 方法或 RtdGraphQLClient.query |

钱包仍保留 GraphQL 文本、业务数据映射、分页、缓存、准入、审批和恢复逻辑；“SDK 收口”指发起协议请求及编码/传输均使用 SDK 方法，不表示 UI 专用业务逻辑全部搬进 SDK。

`fetch` 包装是 SDK 的配置注入点：客户端先编码请求，再经注入函数做取消、来源/方法约束、响应预算和重试。`transaction-reader` 的 `RpcTransport` 装饰器使用 SDK 导出的 `GrpcWebFetchTransport`，且只由 SDK 客户端调用；`budgeted-unary` 也未独立构造链请求。没有手写 JSON-RPC 信封或使用另一套 gRPC 实现。

## 排除误报与证据

生产构建包含 5 个入口、7 个 JS 块、5,295 个编译模块、2,039 个去重源。重新审核当前源码/构建哈希一致及全部闭包，通过既有旧协议导入/调用/报文检测。新增 `scripts/inventory-sdk-routing.cjs` 从实际 sourcemap 枚举 567 个应用源模块，52 个网络候选模块逐项分类；源码范围另检未编入产物的 reader。初次清单器将 .ts 按 TSX 解析报错，纠正文件类型后重新生成清单，未绕过解析错误。

网络候选中的 React Query refetch、Chrome tabs.query、浏览器权限与本地锁 request 不属于链传输。价格/应用元数据与黑名单、zkLogin、Qredo、Moonpay、图片获取属于相应外部服务，不是 RTD/archive 接口；本地网络的外部能力开关与明确不可用状态保持。core 中供 Explorer 使用的旧 hook 未进入钱包生产闭包，不将其误判为钱包实际请求。

静态/人工审核对应私有 `C376-sdk-routing-02.json`。实际运行证据沿用 C368–C375 普通 Chrome 业务操作，以及清理后 11/11 真实 reader 查询；不因静态审核再声称增加了一次浏览器验收。所有源码/文字日志提交，原始报告、截图、响应与构建产物留在私有目录。

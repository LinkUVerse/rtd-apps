# RPC-16 原生交易与事件筛选列表

日期：2026-10-04。

## 实现

新增 WalletIndexedLists，并通过 WalletRpcProvider 注入 readSentTransactions／readIndexedEvents；共享 core 提供 useSentTransactions／useIndexedEvents，使用完整绑定、读取会话、筛选、窗口和方向缓存键，禁止持久化，刷新失败撤下旧数据。缺少 GraphQL 配置时能力不可用，不回退旧 RPC。

发送记录明确使用 sentAddress；事件支持原 MoveEventType 的完整／泛型结构类型匹配，或独立包／模块过滤；类型与模块不能混合。调用必须提供闭区间 lower／upper 和排序方向。准入、每页与末次复核都绑定同 H0、固定上界 checkpoint 及完整覆盖窗口。下界转换为严格 afterCheckpoint，下界0时省略；上界转换为严格 beforeCheckpoint。UInt53 上限无法安全加一时拒绝。

正序 first／after／endCursor，倒序 last／before／startCursor 并反转服务返回的每页升序节点。空页有推进游标则继续；重复摘要／事件键、停滞cursor、窗口外数据、checkpoint逆序、同交易事件逆序、跨组重复交易、超预算、取消及任何GraphQL errors都整批失败。默认256页／10000项，整个操作30秒截止，不返回部分集合。

交易结果是带sender和checkpoint的index-reference，详情与确认继续交给已有Ledger读取器，不能写确认journal。事件要求完整eventBcs，验证规范编码及其中package／module／sender／type／contents与字段一致；结果仍是索引引用，不宣称完成整笔交易eventsDigest或独立包含性证明。账户收支仍使用现有accountHistory证书合同，不由发送者列表推断收款全集。

## 权威对照

对照[Sui固定SDL](https://raw.githubusercontent.com/MystenLabs/sui/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-indexer-alt-graphql/schema.graphql)的TransactionFilter、EventFilter、PageInfo，以及本地RTD对应SDL／服务端active_filters和SDK graphql/core.ts排序实现。测试对每条实际生成查询同时执行固定Sui SDL与当前SDK SDL验证。该版本没有scanLimit参数；GraphQL errors（包括历史SCAN_LIMIT错误）不能被当成成功终页。

## 验证

- 4文件31项定向测试通过：22项读取器、1项实际Provider+ReactQuery hooks、5项Provider、3项历史hooks。覆盖双向／空扫描页、筛选、BCS、错误、取消、窗口覆盖、缓存撤下。输出20261004-indexed-lists-tests.log。
- 修改后全量钱包回归96文件1046项通过：20261004-indexed-lists-full-regression.log。
- 完整钱包类型检查退出0：20261004-indexed-lists-typecheck.log。
- dev Webpack成功，四入口source-map静态审计通过：20261004-indexed-lists-webpack.log、20261004-indexed-lists-built-audit.json。
- 真实TLS GraphQL入口：同H0、窗口0–2000的1笔发送记录，升序与倒序摘要列表一致；0x3模块事件为0项。只读、dispatches=0，见20261004-indexed-lists-live.json。
- 首次实测在最终快照复核遇503，未输出部分结果；随后独立只读重试通过，初次与重试日志均保留。未重启开发链、未部署新合约。

RPC-16的编码／接口合同核验完成。非空事件、真实多页与Chrome页面故障回归仍由QA-A12等任务跟踪；当前实链证据不包含非空事件BCS或完整账户收支。RPC-18历史页面和TRY核心验收独立完成。

# RPC-17 账户历史与 RPC-19／20 归档读取推进

日期：2026-10-03。RPC-17 的独立 reader、领域接口及定向核验完成并勾选；RPC-18／19／20 与 TX-06／07／08 继续推进，不将原摘要归档读取替代全部历史选择器、旧 wait 消费者或自动恢复。

## 编码与裁决

新 WalletLedgerReader 为纯只读私有客户端，精确端点仅允许 Ledger.GetServiceInfo／GetTransaction。每个角色前后检查完整 H0／合法水位／原摘要／checkpoint 覆盖；只有真实 Fullnode NOT_FOUND 且已观察保留下界>0 才尝试配置归档。不存在响应字段、协议／权限错误、错链不能 fallback；归档边界缺失／落后拒绝，两端 NotFound 仍未知。整组 Fullnode→archive→BCS 共用20秒预算与取消 fence，不构造 min-checkpoint／可信身份头。ExecutionReader dispatch 仍仅 Fullnode，lookup／details 和 UI Provider 转交只读 reader。实际 coordinator 恢复测试确认终态写入、dispatch／verifySignature 调用均为零。

提取 receipt-validation 保留原有签名／BCS／状态校验；提取 assertNativeExecutedTransaction 使原生系统交易能只验证事实，不调用 SDK 只支持 PTB 的转换器。执行／模拟依然调用原 validateFinalSimulation 的交易重构核验，没有降低最终 bytes 授权检查。

新 WalletAccountHistoryReader 从显式 accountHistoryUrl 读 coverage 与当前窗口，native GraphQL 固定窗口验证 H0、六项范围及公开 checkpoint digest。全部页严格核验 chain／address／window／limit／snapshot／total／flags／无重复／排序／cursor／终止，末验成功才返回；下界漂移拒绝，上界向前可保持旧窗口。默认20项、最多100页、20秒整组预算。未配置和 partial／超限均为错误，不返回空历史或截断集合。

history-facts 按当前服务 transactionJson／effectsJson 的原生 proto JSON 格式解析，独立 BCS 重算交易及 typed effects digest；状态、epoch、gas、sender、checkpoint、i128余额、整组事件 BCS／eventsDigest 与每个事件内容／类型／模块／顺序核验。55事件及超过安全整数内容已覆盖；保留原生 JSON、eventFacts、可空 kioskTransfers，不用事件 JSON 作为事实。系统交易保留 null sender／native kind，交易／gas／种类及 effects BCS 验证后提供原生详情，不造 PTB。历史无签名，不能作为 journal 确认／解锁依据。

core 增加 WalletAccountHistory／WalletHistoryTransaction／coverage 与实际 hook；useQueryTransactionsByAddress 去掉 From／To JSON-RPC、默认一页合并和 timestamp 数字排序。TransactionCard 改现代模型，真实 sender 与当前账户事件 BCS 分类，不按 affectedAddress 或等额余额推断收款。CompletedTransactions 显示窗口／覆盖限制，空集合限定为该窗口受支持活动；未配置和错误显示能力不可用。缓存含完整绑定／session／address，禁持久化，切网拒绝迟到。

读取当前 RTD native GraphQL transaction／effects JSON renderer（排除 BCS）、MoveModule fullyQualifiedName、归档 GetServiceInfo／GetTransaction 和 account-activity schema／history_coverage／activity_pages／facts／events。官方归档网页确认显式客户端 fallback 和独立证明边界；官方 GraphQL 文档及固定 Sui c860146823abcedef45a1b5a9c766920be98a29c TransactionFilter／SDL 校验原生筛选。官方 filter raw HTTP成功和SHA已冻结；web reference URL失败不当作来源。wallet04/archive03第8节与wallet05/archive04第10节逐字对齐，旧“尚未编码”摘要已同步修正；原目录与冻结原文不变。

## 执行与验证

- pnpm exec vitest run src/shared/rpc src/background/execution.test.ts src/background/accounts/zklogin/current-epoch.test.ts src/ui/app/hooks/useGetAllCoins.test.ts src/ui/app/i18n/index.test.ts：447/447、34文件，exit0，新增76项（21归档、55历史／窗口／hook）。无React act警告。早期fixture删除冻结配置和漏导入两次失败已修正，失败日志保留，不计通过。
- pnpm exec tsc --project configs/ts/tsconfig.rpc.json --noEmit：exit0，领域及直接依赖。完整 pnpm exec tsc --project tsconfig.json --noEmit：exit2、158条诊断（前161），本批领域／历史hook／活动页／收据无诊断；仍未完整构建通过。
- 24文件 prettier --check：exit0；13章／14冻结源／21RPC／22QA 文档核验通过。两套新增合同一致，哈希见 evidence/20261003-ledger-history-verification.json。
- AST：625文件、45生产方法名候选、3wire字面量；包含其它产品和原生 getTransaction，不作为钱包生产bundle清零证明。

日志：20261003-ledger-history-tests.log、history-reader-tests.log、history-typecheck.log、after-history-typecheck.log、ledger-history-format.log、ledger-history-inventory.log。初始与失败输出分别保留。详细源SHA、SDL及范围见 evidence/20261003-ledger-history-verification.json。

## 验收边界与下一项

本批没有dev启动、合约部署、归档桥接或真实Chrome／链验收。服务水位／BCS／摘要一致性不能声称checkpoint quorum／authenticated-events证明。RPC-17仅编码及定向验证完成；TRY-05／QA-A13真实窗口、注册范围与Kiosk分类仍待执行。

待推进全部原生transaction/event lists、归档checkpoint／对象历史选择器、已确认journal独立发现／自动唤醒、写后读覆盖、质押下游、NFT／Kiosk／dApp／Qredo全入口、依赖构建及指定debug实链Chrome。总体13/98=13.3%，完整目标保持进行中，当前不可试用。

# RPC-18 历史与收据页面合同核验

日期：2026-10-04。

## 当前接入

- useQueryTransactionsByAddress → useWalletAccountHistory → Provider → WalletAccountHistoryReader。活动页展示认证窗口与覆盖限制；错误覆盖旧缓存展示，成功空集合只表述当前窗口为空，不宣称账户无历史。
- TransactionCard消费WalletHistoryTransaction：普通活动显示交易和真实sender；不把sender不同、affectedAddress或金额对应直接解释为收到转账。质押／赎回分类由原生事件BCS判断，状态来自已准入事实。
- ReceiptPage独立读取Ledger富详情与后台journal回执，selectReceiptFacts核对digest／状态／epoch／checkpoint／effects BCS。服务暂不可用时经核验的本地链终态保留；未知不是失败；事实冲突撤下富详情并提示核验。
- ReceiptCard消费现代transaction模型，余额变化／gas／对象effects／质押事件由共享领域函数派生；历史对象保持effects版本和摘要选择器，不能用当前对象替代。资产索引同步与链终态分开显示。

## 本批修复

远程详情与本地journal读取原先只按dataUpdateCount限制轮询。首次成功返回null后持续失败时，错误不增加该计数，会无限重复自动读取。两处现在按dataUpdateCount+errorUpdateCount合计最多10次自动读取；仍允许显式手动刷新，不修改journal、不签名、不重发。

## 验证

- 8文件38项测试通过，包括新的两个真实ReactQuery计时用例：先null再持续错误，经过15个轮询周期只发出10次读取，手动刷新可额外执行一次，随后不恢复自动循环。
- 收据页面React渲染测试4项：成功／失败终态在详情故障时保持；两侧null显示待确认；不一致富详情撤下并保留核验提示；刷新只调用两处只读refetch。布局与数据hooks用边界替身，终态选择器和有效BCS夹具真实运行，不声称Chrome集成。
- 活动页面React渲染测试3项：用实际AccountHistoryReader准入的fixture驱动真实TransactionCard，验证窗口、覆盖限制、sender和摘要链接；旧缓存+查询错误不展示列表；成功空集合继续显示覆盖限制。
- Provider历史／收据hooks、stored receipt验证、交易展示领域函数一并回归。输出20261004-history-receipt-pages-tests.log。完整钱包类型检查退出0：20261004-history-receipt-pages-typecheck.log。
- 已有真实TLS账户历史证据见20261004-account-tls-ingress.md；真实近期与归档同摘要回执见20261004-RPC-19-20-completion.md。本批没有新增签名或链提交。

- 修改后dev Webpack退出0，四入口source-map静态审计通过：20261004-history-receipt-pages-webpack.log、20261004-history-receipt-pages-built-audit.json。

## 边界

RPC-18是接口与页面编码合同；Chrome、真实多窗口／worker恢复、索引故障分别由TRY／TX／QA任务验收。本轮CUA再次确认Mac锁定，需手动解锁才可继续真实Chrome操作；其它编码／测试继续推进。全量1046项回归来自上一批，本批仅报告上述38项受影响测试。

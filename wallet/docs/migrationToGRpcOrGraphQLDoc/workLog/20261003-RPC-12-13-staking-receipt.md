# RPC-12／13：质押收据新查询与共享导入边界

日期：2026-10-03；编码推进，不构成真实运行验收。

## 实施

- StakeTxnCard 去掉旧 APY 和 epoch hooks，使用同快照 staking view。当前验证者 APY 标为当前估算，不作为历史事件 APY；inactive／unknown／读取失败保留 --。
- 金额与事件 epoch 来自已验证原生事件，当前状态不可用不隐藏这些事实；只有已知当前 epoch 且非 safe mode 才显示奖励已开始。查询失败不能因为缺少倒计时就推断奖励已经开始。
- epoch 加法使用 bigint，超过 u64 的未来 epoch 显示未知；显示倒计时使用已有安全范围及 safe mode 检查。
- 钱包源码对 useGetDelegatedStake／useGetValidatorsApy／useGetTimeBeforeEpochNumber 的引用均为 0。共享 core 仍有浏览器项目消费者，因此保留这些旧 hooks，未越界改浏览器项目。
- 钱包对 rtd-apps-core 根 barrel 的导入全部改为具体源入口，包括工具、存储、表单 hooks 和仍待迁移的交易摘要／旧 Kiosk 依赖。此举收窄依赖，不等于已迁移这些旧功能或证明构建产物零 JSON-RPC。

## 验证

- 新增 6 项真实 React 收据组件测试：当前 APY／金额精度／未来计时、缺数据不假奖励开始、失败丢弃旧补充数据、safe mode 与inactive、大额epoch精度、u64上溢。查询与展示依赖是测试替身。
- 定向回归 51 文件、656/656 通过；RPC 类型检查 exit 0。
- 完整钱包类型检查 exit 2，仍111条诊断；收据直接文件无诊断。没有完整构建通过证据。
- AST 652 文件、30 个生产方法候选、3 个生产线协议字面量。源码引用检查、哈希和测试结果见 [verification](../evidence/20261003-staking-receipt-verification.json)。
- 未启动 dev、部署合约或执行真实链／Chrome 扩展测试。不得把受控组件测试当成这些验收。

## 下一步

继续 dApp／Qredo／OriginByte、共享交易摘要及其它接口迁移；审计质押完整条目与真实核心试用要求，随后使用指定源码 debug 和合约部署脚本验证实际链路。当前目标维持进行中。

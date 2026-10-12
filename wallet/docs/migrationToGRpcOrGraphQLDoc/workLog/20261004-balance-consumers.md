# RPC-06／RPC-04 余额消费者与发送全部校验

日期：2026-10-04。

## 核查与修复

资产列表、币详情和 ActiveCoinsCard 使用共同 GraphQL 快照的完整余额集合；仅在成功完整集合中找不到币种时，币详情才构造该币种零余额。页面均检查查询错误。发送表单与质押输入使用独立 Fullnode 新鲜总余额，并在准备器重新读取；两者不混用资产快照作为可支付性证明。

useGetAllBalances 此前直接返回 React Query 对象，后台刷新失败时 data 可仍保留旧结果。现在错误时不再向消费者暴露旧 data；集成测试先成功读取高精度余额，再注入 GraphQL partial error 并刷新原键，验证进入错误状态且 data 不存在，而不是零余额。

prepareCoinTransfer 此前只有 addressBalance>0 分支核对金额与新鲜总额。仅 Coin 资金的发送全部路径可直接构造 TransferObjects(GasCoin)，导致表单旧全额与当前 Coin 总额不同仍进入准备。现将正 u64 原子金额、余额上限和发送全部精确相等检查提至两种资金分支之前；不满足时不调用 prepareTransaction。签名前仍只复模拟已批准 bytes，不重新选币或重建交易。

## 验证

- 7 个测试文件、64 项通过：资产 hook、Fullnode hook、新鲜余额协议、金额精度、Coin／地址资金准备和质押准备。新增覆盖刷新失败清理旧数据；全额少一／多一原子单位、普通超额和零额在构建前拒绝；大于 Number 安全范围的精确全额可准备。
- 完整钱包 tsc --noEmit -p tsconfig.json 退出 0。
- 修改后 dev Webpack 退出 0，四入口 source-map 静态审计通过；不是动态抓包或 Chrome 运行验收。
- 输出：20261004-balance-consumers-tests.log、20261004-balance-consumers-typecheck.log、20261004-balance-consumers-webpack.log、20261004-balance-consumers-built-audit.json。

本批没有签名或提交真实链交易，也未进行 Chrome 页面操作；RPC-04／RPC-06 的剩余整体核验不据此勾选。先前 Qredo 批次的 1013 项全量结果发生在本批余额修改之前。

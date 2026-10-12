# Coin 迁移核查与地址余额缺口

RPC-04不结项。已核对真实发送入口、Fullnode coins完整分页、Coin引用和gas构建、共同快照余额／元数据：6文件105项、资产3文件31项测试通过；移除发送完成回调中无人消费的get-coins和coin-balance旧缓存键。完整钱包类型检查通过。日志：20261004-RPC-04-tests.log、20261004-RPC-04-asset-tests.log、20261004-RPC-04-typecheck.log。

进一步核查05章资金模式要求，发现发送表单只累计Coin对象，地址余额尚未纳入。该缺口阻止完整结项，不能以普通Coin自转成功代替。

新增 WalletFullnodeReader.balance：原生StateService.GetBalance，规范地址／类型，操作前后H0与高度核验，共用总deadline／取消，返回冻结的现代Balance。要求响应消息、类型、总额完整；按当前RTD及Sui render_balance合同处理可省略的零分量，再严格核对总额，不采用SDK facade的无条件缺字段归零。两边方案已追加相同合同说明。

新测试初次服务路径断言误写，修正后与既有reader共43项通过：[日志](./20261004-fresh-balance-tests-final.log)。完整钱包类型检查退出0：[日志](./20261004-fresh-balance-typecheck.log)。真实开发链实际reader读取总额149998999542341696、coinBalance同额、addressBalance=0通过：[证据](../evidence/20261004-fresh-funding-balance.json)。此观察没有创建或提交交易，没有地址余额非零的真实执行证明。

下一步必须将资金读取接入WalletRpc／发送表单和准备器，按现代SDK资金模式处理addressBalance及重放保护，补充同链真实fixture。当前新增reader尚未接UI，不将其当作完整资金模式支持。

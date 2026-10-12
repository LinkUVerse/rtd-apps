# RPC-13／TX：质押与赎回页面接入准备、批准和执行恢复

日期：2026-10-03。部分实施，真实链／扩展验收仍未执行。

## 变更

- StakingCard 改为新 staking view／全部余额／metadata 查询；StakeForm 与 UnstakeForm 删除旧 gas 构建查询、旧 epoch hooks。Gas 在正式预览中呈现实际预算；时间用同S系统数据作显示估算，未知和 safe mode 不伪造计时。
- 预览调用 prepareStaking，展示动作、发送账户、验证者或仓位、精确原子金额／本金、gas 预算和 digest。确认调用 revalidateStaking，只提交原批准 bytes／digest／requestId 到 background.executePreparedTransaction。
- 初始先恢复 journal；未检查、journal 错误、pending 均阻断新预览。dispatch 开始立即清批准并进入恢复状态；响应中断后只能查原交易。后台继续承担身份／签名／持久化屏障／一次提交，页面不调用旧 signer 或 Qredo SDK。
- account／binding／readSession／路由变化重建批准生命周期并取消迟到回调；同步操作锁阻止连续确认和模拟期间返回编辑；confirmed 成功或失败均跳只读收据并失效资产查询。
- 移除旧 Pending 禁止赎回条件。未知池仓位可进入新构建器，由 Fullnode 模拟当前系统合约；修正无验证者地址时的路由，不再误入验证者选择。已知 URL 验证者与账户仓位冲突仍拒绝。
- 赎回总额标为估计；未知奖励保持 --，pending 的尚未获得奖励为 0。当前本金来自新鲜对象，最终金额依执行收据。
- 全源检索确认无调用后移除旧 transaction 构建器和四个 DelegatedStake 辅助文件。

## 验证

- 50 文件、650/650 定向测试通过，新增 9 项真实 React 页面流程测试，覆盖先预览后确认、原 bytes dispatch、pending 只恢复、重复确认、账户／会话迟到结果、初始 journal 错误、响应中断恢复、stake 原子金额转换、pending 仓位准备。页面依赖使用受控替身，不能作为真实后台或链上执行证据。
- RPC 类型检查 exit 0；完整钱包 exit 2，111 条诊断（前123）；本批直接文件没有诊断。新余额字段已修正为新模型 balance。
- 回归发现原 SelectValidatorCard 测试误以随机首行为 unknown，已按目标标识选择，修正测试后完整重跑通过。
- AST：651 文件、30 个生产方法候选、3 个生产线协议字面量；不代表依赖／产物清零。[文件哈希及验证记录](../evidence/20261003-staking-execution-verification.json)。
- 本批未启动 dev／部署合约，未运行真实链或 Chrome 扩展。Qredo 现代执行仍未迁移，后台现有拒绝不当作支持。

## 下一步

迁移质押收据中剩余 APY／epoch hooks，清除可达 shared core 旧依赖；继续全部接口和各签名入口，再依指定 debug 源码与合约仓库脚本验证真实核心交易和恢复。RPC-13 与 TX 不据当前局部测试勾选完成。

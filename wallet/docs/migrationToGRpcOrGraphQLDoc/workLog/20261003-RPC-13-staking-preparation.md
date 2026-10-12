# RPC-13：质押／赎回准备器与表单验证者信息

日期：2026-10-03。任务部分推进，不勾选整项。

## 变更

- ValidatorFormDetail 改用同快照 staking view，移除旧系统／仓位／APY 查询。新增质押只汇总对应 active pool；赎回按当前账户仓位 poolId 关联，URL 验证者冲突、仓位缺失、读取失败均报错，不渲染零值。inactive 份额与未知 APY 保持未知。
- 新 prepareStaking 使用当前 Fullnode 0x5 wrapper 的 Shared initialSharedVersion；质押原子金额验证正 u64，使用 gas split coin 调系统入口。
- 赎回验证当前 StakedRtd UID／类型／规范 BCS／当前账户所有权，owned 引用保留大额 version；ConsensusAddressOwner 使用 startVersion。返回本金／pool／activation 供预览，奖励不伪造成实际赎回金额。
- 不强加 Active 状态限制：当前 RTD 合约支持 pending 本金撤回及 inactive 池路由，最终能否执行由正式模拟判断。两套方案 4.5 已同步，固定 Sui 及本地三文件源码哈希有保存。
- revalidateStaking 只模拟批准 bytes，禁止重建引用或 gas；会话／digest 改变拒绝；准备整体 20 秒且支持取消。

## 检查

- 49 文件、641/641 定向测试通过：新增 13 项构建／所有权／共享引用／u64／BCS／会话／取消／同 bytes 确认测试，4 项真实 React 表单组件测试（数据与展示依赖替身）。[完整日志](./20261003-staking-preparation-suite-final.log)。
- RPC 类型检查 exit 0。完整钱包类型检查 exit 2：123 条诊断，此次四文件没有直接诊断。初次测试夹具缺 json/display 已修复后重新检查。
- [证据与哈希](../evidence/20261003-staking-preparation-verification.json)、[官方与本地源码清单](../evidence/official/sui-staking-execution-manifest.json)。AST 候选数不能证明依赖或构建产物 JSON-RPC 清零。
- 未启动 dev、未部署合约、未做真实链或 Chrome 扩展验证。构建器测试调用真实 Transaction API，Fullnode 返回为受控替身，不能当作在线模拟通过。

## 剩余工作

新准备器尚未接入 StakingCard 提交页面。继续替换 StakeForm／UnstakeForm 的旧 gas／epoch hooks，接固定批准 bytes 的预览、background journal 签名执行及恢复，清除旧 signer／Qredo路径与只允许 Active 的页面条件。随后按指定源码 debug 产物和合约仓库脚本开展真实核心链验证。

# RPC-13：质押仓位、验证者选择与详情页面迁移

日期：2026-10-03。任务仍为部分完成；质押／赎回构建、预览、签名、恢复及真实链测试不在本批完成范围。

## 本批变更

- 仓位汇总、验证者列表／选择、仓位详情、代币页质押入口使用同快照 WalletStakingView，移除这些页面旧 delegated stake／system／APY hooks。
- 本金和奖励汇总保留 bigint；任何已激活仓位奖励未知则总奖励未知，未解析池不伪造验证者人数。已准入的空仓位才显示真实 0。
- active、inactive、unresolved 分别展示；退出池卡片保持本金加已知奖励语义，奖励未知时总额显示 --。
- APY 和质押份额未知在升降序均排末尾；默认随机发现顺序采用 Fisher–Yates，并在选择或排序期间保持稳定。切换读取会话／快照清除旧选择，失败快照不保留可操作旧列表。未知 APY 不上报伪造的 0。
- 详情以当前账户仓位的 objectId 和 poolId 确认验证者；未知字段显示 --，不以 URL 参数推定归属。新增质押入口需实际 active pool 与已知余额／精度。
- 激活时间只作显示估算，safe mode、已过 epoch、无效时长或超安全整数范围不显示倒计时；不用于交易授权。

## 验证

- 定向回归 47 文件、624/624 通过。新增 7 项金额／未知值／时间边界测试，4 项真实 React 选择组件测试（查询和展示依赖受控替身）。日志：[suite](./20261003-staking-pages-suite-final.log)。
- `pnpm exec tsc -p configs/ts/tsconfig.rpc.json --pretty false`：exit 0。
- `pnpm exec tsc -p tsconfig.json --pretty false`：exit 2，127 条诊断（本批前 142）；此次迁移页面和 staking-view 无直接诊断。完整钱包尚未构建通过。
- AST 扫描与文件哈希见 [verification](../evidence/20261003-staking-pages-verification.json)；扫描候选数不是间接依赖／产物零 JSON-RPC 证明。
- 未运行真实链、Chrome 扩展、dev 启动或合约部署，不能据单测声称这些验收通过。

## 下一步

继续 ValidatorFormDetail、StakeForm、UnstakeForm、StakingCard 与质押收据残留 hooks；随后质押／赎回固定批准 bytes、Fullnode 构建模拟、background journal 执行与原摘要恢复。RPC-10–13 不因局部页面完成而勾选。

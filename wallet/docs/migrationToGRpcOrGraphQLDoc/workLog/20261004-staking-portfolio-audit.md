# RPC-11 仓位分页与官方算法复核

## 权威依据

2026-10-04重新读取[Sui官方governance_api.rs](https://raw.githubusercontent.com/MystenLabs/sui/main/crates/sui-json-rpc/src/governance_api.rs)：get_delegated_stakes使用激活epoch汇率与当前汇率估算奖励；calculate_apys对补齐后的序列过滤补贴开始前的数据，对相邻汇率计算年化，过滤非(0,0.1)样本后取30项。本地rtd/crates/rtd-json-rpc/src/governance_api.rs对应逻辑也已核查。main链接可变化，本次不是新增固定commit基线。

当前钱包奖励用BigInt有理数避免本金转f64精度损失，APY明确为估计值。缺当前汇率返回unknown，而不是伪造零奖励；这是领域模型的显式状态策略，不声称与旧RPC所有错误回退逐字节相同。原方案已有对应说明。

## 新增验证

staking-reader新增3个全仓位分页组合场景：首个仓位页→空但推进页→剩余仓位页；正常情况下active／inactive／pending三仓位齐全，本金精确求和9007199254741096。末页重复对象或损坏BCS时整个组合拒绝，不能把先前页作为完整汇总返回。

4文件61项通过，20261004-staking-portfolio-audit-tests-final.log。首轮新增测试括号语法错误已修复，原失败日志保留；不记为通过。仅新增测试，业务代码与产物未改，不重复声称全量构建。

## 当前真实链只读复核

复用现有profile03、指定dev环境和WalletAssetReader读取，不启动／重启环境、不签名或提交。20261004-staking-portfolio-live-rates.json及.log退出0：认证checkpoint77495，epoch2，真实池汇率含epoch0／1／2；钱包APY约3.5770019835013045e-8、sampleCount=1。只读请求限定GraphQL／GetServiceInfo，dispatches0。

这不是非空真实持仓／活跃奖励兑付证明，RPC-11仍开放。现有单次总汇率10000条、20秒是钱包读取策略，文档已明确不是链协议上限；大规模历史的可用性仍需专项验收，不能把小开发链通过推广到全部生产规模。

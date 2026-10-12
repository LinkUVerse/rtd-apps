# RPC-13 活跃赎回与确认生命周期进展

父任务仍为72/98。本批不是98项完成或试用包验收；C21 dist／ZIP保留，新的隔离候选正在构建。

## 当前领域与真实预览

[固定S656532、epoch3读取](./20261006-RPC-13-current-domain-01.json)得到原受控owner的一笔active仓位，本金1000000000、版本22，完整4条汇率；[独立固定S／精确归档BCS／整数收益审计](./20261006-RPC-13-current-domain-audit-01.json)通过8次只读请求，估算奖励0。[实际C23汇总／活跃详情／错误仓位拒绝／赎回预览及返回](./20261006-RPC-13-current-ui-04.json)通过12项检查、2次正式模拟、0签名／0执行；[原始帧和最终交易BCS审计](./20261006-RPC-13-current-ui-audit-02.json)通过。前两次汇总检查的未等待元数据和测试脚本语法失败原日志保留，未记通过。

## 一次实际活跃赎回

[原执行报告](./20261006-RPC-13-current-execution-01.json)保留整次UI失败：批准一次、签名一次、Execute一次，等待收据自动跳转60秒超时。执行前核对原H0、当前RTD源码HEAD／diff和8份debug原产物、原已成功质押、原仓位新鲜owner／version／digest；0600 attempt和恢复材料fsync后才点击批准。未重新构造或重复提交。

[独立原生审计](./20261006-RPC-13-current-native-01.json)证实摘要 **ERpYV3jhDNdN2mPpcYVykgdqmHQB6djC7M9JCfFPBh5m**，checkpoint **978399**、epoch4成功。原批准BCS、签名账户、完整原Execute请求／响应及grpc-status0一致。赎回事件BCS本金 **1000000000**、实际奖励 **46666663**，合计 **1046666663**；净gas **-132096**，因此实际余额变化 **1046798759**。净gas为负来自存储返还；不把余额变化误写为本金加收益。原仓位对象已删除，原生effects也记录DoesNotExist。epoch3索引估算0与epoch4真实兑付46666663是不同时间点，不互相覆盖。

[原同profile锁定账户恢复](./20261006-RPC-13-current-recovery-01.json)通过：重开前已confirmed-success，重开后同一digest／native effects、pending0、账户仍锁定，恢复签名／模拟／执行均0。它证明原严格终态和恢复，不修饰最初自动跳转失败。

## 产品修复与回归

StakingSession原effect以rpc.state为生命周期。相同binding／readSession的资产重新初始化会中止在途执行结果，同时新的自动恢复可能返回null并重新打开表单。新增质押／赎回两个回归用例在旧实现下失败：[旧结果](./20261006-staking-lifetime-before-01.log)。修复把AbortController交给外层已按账户、路由、binding、readSession限定的组件生命周期；相同会话状态变化不取消已分发结果，自动恢复不与在途操作竞争。真正切账户／binding／readSession仍卸载并中止旧结果。

[完整181文件2551项](./20261006-staking-lifetime-full-01.log)通过，包括两个恢复状态切换、三个真实会话变更拒绝和pending不能重开表单的新用例；[生产类型检查](./20261006-staking-lifetime-types-02.log)无诊断。本批之前的[12份145项治理定向](./20261006-RPC-13-targeted-01.log)保留其C23边界。新产物的实际自动跳转还要单独实测；RPC-13、QA-A16与试用状态尚未据此勾选。

协议依据再次核对固定[Sui系统入口源码](https://github.com/MystenLabs/sui/blob/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-framework/packages/sui-system/sources/sui_system.move)：request_withdraw_stake消耗StakedSui，将返回Coin转给ctx.sender；RTD采用本链rtd_system／StakedRtd对应入口。兑付事实使用原生事件和effects，不依赖旧JSON-RPC或索引估算。

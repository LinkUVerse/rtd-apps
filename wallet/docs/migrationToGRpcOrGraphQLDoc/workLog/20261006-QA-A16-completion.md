# QA-A16 质押与治理矩阵完成

本项按原合同验收Pending／Active／赎回、多pool／inactive、缺率、safe-mode補洞、APY多epoch、奖励舍入及大额值。真实链、原生BCS夹具、算法对照和组件检查分开列证据；不声明真实开发链已创建退役验证者或进入safe-mode，也不将10000条夹具运行时间称生产吞吐。

| 合同 | 证据与实际范围 |
| --- | --- |
| Pending与撤回 | [原真实待激活赎回](./20261004-live-stake-withdraw.json)epoch2／activation3成功且对象删除；[C24新真实仓位](./20261006-RPC-13-current-add-native-02.json)epoch4／activation5、1 RTD，新对象精确BCS验证。前者是真实准备器实链执行，后者是当前真实Chrome批准。 |
| Active与非零收益赎回 | [固定S活跃仓位](./20261006-RPC-13-current-domain-audit-01.json)完整率表／归档BCS；[原一次真实赎回](./20261006-RPC-13-current-native-01.json)epoch4兑付本金1 RTD和奖励0.046666663 RTD；[当前C24原owner收据](./20261006-RPC-13-current-receipt-03.json)显示奖励和资产待同步。原最初自动跳转失败保留。 |
| 多pool、inactive、unresolved、完整页 | [10000总率、active9998＋inactive2、200页及三仓位夹具](./20261006-RPC-11-scale-fixture-02.json)；当前所有输入SHA仍一致。aggregate10001、重复末页、单表10001都拒绝整批。当前staking-reader测试覆盖V1／V2、pool派生、缺池unknown、全部率页及末验拒绝。 |
| rate缺失与safe-mode | 当前staking-rates／staking-reader／staking-view／StakedCard／DelegationDetailCard测试：缺率保持unknown、零分母不伪造0、激活率补洞／默认边界显式、safe-mode即使收益已知仍显示，并抑制激活倒计时。 |
| 多epoch APY | 固定Rust算法对照，最多30个有效样本、365年化、补贴边界、严格0<apy<0.1过滤；巨大epoch间隔不按间距分配数组，缺历史和无有效样本不泄漏NaN。 |
| 舍入、大额、页面授权 | BigInt本金9007199254740993／u64上限的半向上舍入、overflow／非规范输入整批拒绝；精确汇总、未知收益不发布部分合计。金额／验证者／仓位错误、最终bytes固定、账户和会话变更、pending阻断、同会话初始化不能取消在途结果都有生产组件回归。 |

[当前治理定向12份151项](./20261006-RPC-13-targeted-02.log)、[完整181份2551项](./20261006-staking-lifetime-full-01.log)及生产类型通过；算法规模夹具所有源输入在当前C24仍逐文件一致，包含当前staking-snapshot-reader／staking-reader／staking-rates与三份SDL，旧C19业务证据未称当前整包实测。新隔离production04及实际UI／worker字节经RPC-13审计。原受控交易均只执行一次，恢复0重发。

[父任务勾选前复合审核](./20261006-RPC-13-completion-audit-02.json)固定当前1110源码、1151完整路径输入与上述各级证据。QA-A16／RPC-13完成后74/98；普通HTTPS信任、账户历史完整窗口、NFT全部路线、网络故障／索引追平及发布仍开放，trial_ready=false。

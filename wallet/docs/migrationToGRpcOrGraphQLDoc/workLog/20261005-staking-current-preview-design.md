# RPC-04／11／TX-01：当前质押预览实施前设计

2026-10-05。metadata独立查询及当前金额表单已验证，下一步对当前同一1009份源码Local产物做真实预览，不新增链上交易。

| 子任务 | 合同 | 状态 |
| --- | --- | --- |
| V1 | 原账户／profile、当前UI与worker逐字校验；原两终态journal保持 | 待读取 |
| V2 | 从实际链上metadata9位解析1.000000001 RTD，点击预览；所有Simulate请求为审核Fullnode、checks启用 | 待验证 |
| V3 | 最终模拟请求BCS的sender、SplitCoins u64=1000000001、validator、request_add_stake和预览digest一致；最终批准可用但不点击；锁定／日志不变 | 待验证 |
| V4 | 失败／产物／文档／Task／totalProgress证据同步；父任务开放 | 待完成 |

只解除测试的Simulate拦截，Execute拦截及计数保留。不能以SDKgas估计或按钮存在代替正式checks／BCS／digest证明；不能以预览成功宣称新增成功交易、非空奖励、赎回或完整试用。不改产品源码、不重跑seed、不修改原回放，失败保持。依据现有TX-01最终字节、授权和RPC-04／11完整合同，所有实际签名／执行门槛独立待验。

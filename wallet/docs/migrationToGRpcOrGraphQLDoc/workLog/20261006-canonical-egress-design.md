# E3正式canonical数据库与出口协议：编码前拆解

承接[62项原生协议](./20261006-dapp-egress-protocol.md)与[42项来源/UI候选](./20261006-dapp-egress-surface-completion.md)。本批先完成正式共享数据库和精确profile/negative门槛，再E4/E5/E6组合；禁止先放宽产品CSP或把未接真实出口的class记为试用。

| 子项 | 当前状态 | 交付与证据 |
| --- | --- | --- |
| E3A | 待编码 | 独立正式RtdWallet NetworkAdmission从v1原地升级v2；原admission-v1不扫描/复制/重写，增加context/ticket；新旧shape精确；blocked后的迟到upgrade也abort |
| E3B | 待编码 | WalletDappEgressStore使用正式validateNetworkProfile/networkBindingKey/validateNetworkAdmissionRecord；任意已确认Fault或未完pending阻止最终出口，空状态不是服务authority；lease/receipt对象拥有权、严格消费/有界ticket/真实同步post |
| E3C | 待实测 | 编译正式模块后在新隔离Chrome原生DB测试：原v1 Fault/pending逐字段保持，旧v1拒绝v2、两个正式store共享事务、错profile/generation/账户/来源/损坏/过期/重放均拒绝，负面记录先于最终出口提交后0dummy |
| E3D | 待完成 | 类型/相关测试/完整钱包检查；保存C16源码与dist基线。只在新稳定源码产生后重建产物；不使用历史C16证明新产品 |

数据库bootstrap集中到正式shared/rpc模块，两类store都只能使用正式命名空间或有界test命名空间。原WalletNetworkAdmissionStore读写合同及对象拥有权保持，仅统一open v2；写入network-negative与egress最终read包含同admission store，因此仍由原生IDB事务排序。新store使用三个store严格readwrite原生complete作为consume成功；随后在拥有receipt的同一gate实例最新readonly callback内执行同步post。失败不恢复一次性对象或自动重放，callback只允许普通同步函数、void返回；动作发生之后的abort也不能重用receipt。

正式binding从ValidatedNetworkProfile派生，不能由dApp提交profileBinding；对原account、origin/tab/frame/document/request和私有gateOwner完整逐字段匹配。记录校验使用既有canonical函数而不是候选简化结构；记录缺失也不构成positive授权，本批出口需要既有有效row。全Fault/pending保守拒绝（不宣布领域服务ready），positive账户/权限/服务/ABI仍由审批session单独证明。上下文最大64 pending/64 ticket/128KiB payload/30秒lease和ticket，超过任何预算明确拒绝，签名字节不落执行journal。

E4真实状态写入点须单独逐项清单：NetworkEnv两个storage提交、Permissions保存/撤权、账户锁定/解锁/选中/删除/密钥替换、UI clear/delete/导入、worker epoch、source/request取消与生命周期。不是仅在后置onChanged监听时写revision。外部操作开始前strict pending/revision barrier完成，只有拥有本token的完成可清本pending；崩溃未知不靠TTL清除。锁定/撤权失败须明确报错、持续禁止结果，不能假称完成，也不能以观察消息落后来宣布原子取消。

原同链7journal/密钥/服务/publisher保持；数据库实际产品数据尚不升级。本批原生验收只在新test profile与命名空间上运行正式模块，既有数据保持由C16冻结来源/只读审核证明。全部父NET-04/TX-01/TX-10开放，58/98、trial_ready=false。

# NET-04 NC5／CAP6：完整能力聚合及全局撤值实施前设计

承接[NC4完整日志](./20261005-account-history-capabilities.md)与[末验02](./20261005-account-history-capabilities-document-verification-final-02.json)。先按本设计与Task拆解再编码；此页不是完成证明。49/98、trial_ready=false，1046源码冻结和当前磁盘历史C9不变。SDK只读；需要dev仍核验最新RTD debug并用指定合约仓脚本，原回放／交易根保持。

## 当前真实接入差距

已审核schema／八GraphQL领域、native只读方法、全Move ABI与独立部署pin、账户完整reader报告各自存在，尚没有network-capabilities或client聚合模块。初次探路误读这两个不存在文件，按目录清单纠正，未当代码故障。WalletRpcProvider仍由独立asset snapshot决定资产reader，其state=configured明确不表示完整就绪；Fullnode等能力是transport/session存在，每次业务reader继续执行自身H0与事实校验。只读NetworkObservationRecord当前只持久化高度倒退；不能假设它已有跨操作错链／不兼容负面隔离。CAP6必须保持查询与执行各自证据门槛，不用完整Display失败阻止独立余额或同链普通执行。

## 先实施NC5聚合合同

| 子项 | 编码前状态 | 必需交付 |
| --- | --- | --- |
| G1 | 待实施 | 聚合复用现有domain（内含schema）、native、deployment（内含Move）与account报告，不重复另造宽松判定；每项带本次binding／session及有限范围 |
| G2 | 待实施 | 全体单总期限／统一caller与session取消，精确已配置四入口POST及明示只读native方法白名单、2MiB流式body、共享物理leaf等待真实cleanup；不得占outer permit、模拟／签名／Execute或获取MVR |
| G3 | 待实施 | 开始／结束新鲜身份及所有已配置角色具体降级；已知错链优先于其它临时失败，取消／过时不发布，当前错误不能沿用上次成功或变空数据 |
| G4 | 待实施 | whole-owner与coverage-only分别传递，明确所有管线proof各自S，不能冒作跨域同一事务快照；真实来源／完整组合／取消、body、错链、缺声明／未配置及全量类型反例 |
| G5 | 待实施 | 同profile当前只读聚合实际报告、默认总期限及完整各角色结果，真实负项保留；显式公开selector只输出hash／计数，0模拟／签名／提交 |

聚合构造只读临时客户端用于探测，报告不含活动client或签名权；报告“已完成聚合”不命名网络ready。上层总signal包围各内层期限，子项不得重置整个操作期限；复制声明的json／可信pin等标量避免调用方在异步途中改目标。先在有限总期限内探测独立组，共享既有四leaf队列；选定默认期限和并行顺序须以实际成本／单元证据确定并记入实现，不能为了通过提高生产业务reader预算。

统一fetch需要在真实response headers后先fence，失败等待body.cancel；完整body限2MiB并await异步cleanup再让原leaf settle。当前某些旧探测在非成功response上只发起void cancel；聚合不能因此提前释放物理IO名额，统一包围body后再交给原SDK/probe解析，原native HTTP/backoff／全trailer保持，不修改SDK。精确native路径从现有源码所用方法形成白名单，显式禁止Simulate／Execute／订阅及任意新origin；GraphQL仅查询，account只原两根协议。未知服务运行build／revision必须明确not-verified，不将本地profile revision或同响应hash当服务器签认。

开始与末尾原生身份必须新鲜，account通过自己的两根coverage／page H0。聚合顺序中的任何已知canonical H0 mismatch都不得被其它接口503、缺声明或超时标成degraded；无证据的服务CHAIN_MISMATCH常量不得升级成身份事实。所有报告binding／readSessionKey须严格等于当前session；不要把任意外部旧报告作为输入。成功数据是本次各自有限合同的组合，schema不证明可执行、ABI不证明语义、coverage-window不证明owner、有限union不证明全账户。

## 后续CAP6全局发布与撤值

| 子项 | 编码前状态 | 必需交付 |
| --- | --- | --- |
| F1 | 待实施 | 可信发布配置及已配置入口能力接入Provider／后台；区分validating、ready／具体degraded与错误隔离，保留独立领域可读性 |
| F2 | 待实施 | 跨操作负面身份／incompatible持久隔离与显式受控revision／generation重新绑定，保留现有高度倒退与原摘要只读恢复；不能靠再次普通探测自动洗掉错误 |
| F3 | 待实施 | 每次失败／会话切换立即撤去旧报告／reader和关联余额、资产、metadata、Kiosk、历史／Name值；新binding回到旧profile也必须新session，不复制旧proof |
| F4 | 待实施 | React／query cache及真实background／UI集成反例，整轮类型／构建／新Chrome及原journal只读保护；当前未配置可选业务／未审核部署等不得称通过 |

普通同链Fullnode执行可在其它入口暂时不可用时明确降级；任何已知错链整体停止新操作。账户历史及read capabilities不承担原执行journal恢复授权。跨线程／跨context持久机制先核验实际浏览器storage与现有后台网络接口，不凭UI memory state代替后台守卫；host权限／正常CA与独立部署签认余项仍按原Task处理。

当前NC4的5条事实与默认20秒末验是上一个限定范围的通过，NC5／CAP6没有代码或真实聚合完成证明；新增子表不另增父98项或提高总体进度。

## G1–3编码前细化

先保留[当前状态](./20261005-current-state-before-network-capabilities-aggregate.md)与[身份实现／测试原字节](../evidence/20261005-network-capabilities-aggregate-before/manifest.json)。聚合默认60000ms（显式1–60000ms），四独立族并行、原四物理leaf队列，前后identity单组各最多10000ms，各族仍最多30000ms；外层统一绝对取消signal包围全部，任何内层不得重置总期限。此默认只适用于完整启动能力评估，不改变原20秒业务reader或任何执行预算。

identity现在Promise.allSettled后才检查错链，若另一fetch忽略abort，已知错误可能被总超时掩盖。添加可选caller signal、总取消race与内部fatal signal：只有已确认canonical错链立即触发本轮取消，其它不相容仍等待所有有限结果检查。所有实际SDK叶请求不因外层取消提前释放request名额，保留消费其迟到拒绝。单身份函数不发布client，结束绑定／caller／session失效仍拒绝。增加已知错链＋held leaf和异步cleanup、deadline／caller／session的独立反例。

聚合仅新鲜执行现有domain（包括schema）、native、deployment（包括Move）和account，所有返回必须本binding／session，前后原生identity新鲜；不合并各domain独立S成一个跨域事务快照。输出capabilities-assessed只表示完整评估完成；readiness=not-assessed、serviceDeployment=not-verified、crossDomainSnapshot=not-verified、execution=not-probed，具体能力和负项逐组保留，CAP6才做活动client与全局UI状态接入。

## 组内错链反例驱动的实施细化

完整聚合测试05增加真实native H0 checkpoint错链＋GetObject held，以及GraphQL余额domain错链＋资产domain held，检查已知错误不能被同族等待或总期限掩盖。修复之前先保留两个族的[原字节](../evidence/20261005-network-capabilities-aggregate-before-group-failures/manifest.json)。在各族内部既有NetworkIdentityError catch处增加内部fatal controller，仅已核验chain-mismatch立即中止同族等待，再由聚合中止其它族；实际leaf仍等原SDK与统一bounded body清理，不能为了结束外层而释放名额。此变更不改变预算、白名单、事实检查或incompatible判定，不创建客户端或UI发布权。

## G4a：并发批准窗口夹具的顺序假设修复前设计

全量01有2074/2076通过，既有Transactions两个失败原样保存。首个并发窗口测试假设第一个execute调用对应第一次show；但createTransactionRequest在show之前await独立bindDappRequest异步摘要，打开次序不构成合同，第二个调用可以先打开。第一个关闭Subject应只终止其真实关联请求，不能预先规定它是调用序号first。改为等待两份拒绝断言的race，检查仍有一份存储／active signal，并关闭第二个Subject后等待两份均拒绝；仍同时发起两次请求、不减少并发或生产授权／存储覆盖，也不提高测试或生产期限。现有[19项单文件](./20261005-network-capabilities-aggregate-background-baseline-01.log)实际0，但不能据此删除全量失败或声称默认调度已稳定。[原测试字节](../evidence/20261005-network-capabilities-aggregate-before-popup-order/manifest.json)已保存；待在无源码读写竞争时修复并重跑完整轮次。

# NET-04 NC5：四入口有限能力聚合与错链立即中止

承接[NC4完整工作](./20261005-account-history-capabilities.md)；[设计](./20261005-network-capabilities-aggregate-design.md)、[接入审计](./20261005-network-capabilities-aggregate-pre-audit.md)与[原状态](./20261005-current-state-before-network-capabilities-aggregate.md)先落盘，再按G1–5推进。父49/98、trial_ready=false；CAP6／NC6与原业务余项继续。

## 聚合行为与权威边界

新增network-capabilities只调用已有GraphQL domain（含完整schema）、native、deployment（含全Move ABI）及account四族生产探测；没有接受旧报告的参数。本轮bindingKey／readSessionKey逐项核验，前后另做新鲜三原生角色身份，账户仍由自己的两根协议核验H0。冻结报告capabilities-assessed表示本次有限评估已完成，readiness=not-assessed、serviceDeployment=not-verified、crossDomainSnapshot=not-verified、execution=not-probed；不给执行／签名client，不把各自S合为跨域事务快照。

总默认60000ms，显式1–60000ms；前后身份每组最多10000ms，四族并行每族最多30000ms，一个外层signal包含全部身份／排队／读取／末验，子组不得重置整个操作。复制公开地址／minimumCheckpoint及声明json／trustedSha256标量后才开始IO；非法selector在首次请求前拒绝。原20秒业务reader、四物理leaf／64等待以及交易执行预算均保持。

统一capability-fetch只允许已配置四入口精确POST、Fullnode六既有方法＋GetPackage，Archive仅GetServiceInfo／GetCheckpoint；关闭MVR、redirect error、credentials omit。原生request与native GraphQL均64KiB、账户16KiB，AST仅一个query且字段本名拒绝模拟／提交（alias／fragment不能绕过）；account仍只有原两条固定query。完整stream限2MiB，HTTP状态／backoff header／原生frame及trailer全部保留；迟到headers先fence并await body.cancel，读取失败亦await异步cleanup后才settle原SDK leaf，外层取消可及时结束而物理名额继续持有。

[官方Sui固定来源与6本地摘要](../evidence/official/20261005-network-capabilities-aggregate/manifest.json)核验官方data-serving与what-is-grpc源码：Fullnode gRPC历史受保留范围限制，必须显式配置Archive，无隐式回退；GraphQL历史可路由到运维配置的Archive。[固定Sui源码](https://raw.githubusercontent.com/MystenLabs/sui/3ae8aecf7c175a83aa97da01d491e053a6090a8c/docs/content/develop/accessing-data/grpc/what-is-grpc.mdx)及[官方接入页](https://docs.sui.io/develop/accessing-data/)支持角色分工。GraphQL与gRPC均可提供提交／模拟，因此本聚合精确限制只读是钱包策略；官方接口可用性不会自动证明RTD部署revision／build、独立发布pin或钱包全局ready。[GraphQL规范](https://spec.graphql.org/October2021/#sec-Response)允许部分响应；errors非空整组拒绝、H0 fencing与限额同为本产品策略。

## 失败反例驱动的修复

identity增加caller signal、取消race和canonical错链内部fatal；忽略abort的其它原生role不得让已确认错链变为超时。测试05进一步以实际SDK native H0 checkpoint错链＋GetObject held，以及GraphQL余额domain错链＋资产domain held复现两族最终仅TimeoutError。保留[初始身份原字节](../evidence/20261005-network-capabilities-aggregate-before/manifest.json)及[两族原字节](../evidence/20261005-network-capabilities-aggregate-before-group-failures/manifest.json)后，在既有NetworkIdentityError catch处加入fatal controller。已知错链立即中止同组再中止其它组；无法证实H0的公共CHAIN_MISMATCH错误不升级为链事实。其它不兼容或暂时失败逐项保留；末尾新鲜身份仍优先核验。会话改变／caller取消／deadline均不发布迟到或沿用旧值。

首轮测试01是16失败／10通过，原因是新fixture误用originByte.discoveryPackageId；按实际profile字段修正。02／03各剩一个组合夹具失败，已定位为fixture未提供native GetFunction object::id正例；加入已有协议描述符，不放宽生产判定。04为47项通过；05是2失败／17通过，真实暴露组内错链优先缺陷，修复后06的102及07的242、最终08的244定向通过。所有失败原日志保留。[测试01](./20261005-network-capabilities-aggregate-tests-01.log)、[02](./20261005-network-capabilities-aggregate-tests-02.log)、[03](./20261005-network-capabilities-aggregate-tests-03.log)、[05](./20261005-network-capabilities-aggregate-tests-05.log)、[08](./20261005-network-capabilities-aggregate-targeted-08.log)。

新增原生frame／BCS＋真实RTD schema四族组合，显式owner整条reader、未配置与缺声明、末尾错链、account错链、非成功trailer、旧session／旧报告拒绝、非法预算／UInt53／地址、caller与deadline、总期限包含起始身份、异步期间pin复制。真实SDK四leaf名额在held body／取消后迟到headers／超2MiB异步cleanup的三类反例中继续占用，下一聚合不能提前发IO；禁止mutation／订阅／多operation／alias及fragment模拟／提交，精确URL／方法／UTF8预算保持。夹具字节只证明协议算法，不能称真实包bytecode或部署权威。

全量01是155文件2074/2076，既有Transactions并发批准窗口超时及后续accountsChanged多余close均保留。createTransactionRequest在show前await独立摘要，不能保证调用顺序与窗口出现顺序一致；[原夹具](../evidence/20261005-network-capabilities-aggregate-before-popup-order/manifest.json)保存后按G4a设计修复，仅改为两拒绝断言race，检查只一请求结束、剩余存储和signal有效，第二窗口关闭后两份均拒绝。仍同时发起两请求、不减少并发、不提高期限，不改生产交易代码。修复前单文件19项及修复后19项均实际0，不能据此删除第一次全量故障。full-wallet-02是较小worker的旧夹具诊断轮，Transactions读取后才做G4a修复；不能标当前完整源码通过，最终当前整轮03另验。

路径探路误读不存在read-request-budget.ts、一次尚未写出的scripts类型log、两次patch上下文失配、一次统计harness括号SyntaxError，以及旧Sui页面不可访问均已按清单／当前来源纠正，不作为检查通过；工具历史及此页保留。SDK和RTD均只读。

## 同profile真实有限合同

[coverage01](./20261005-network-capabilities-aggregate-public-coverage-01.json)默认60000ms，实际22799ms／52请求：49 HTTP200、3 HTTP503按既有原生退避；完整评估完成，native八方法正例通过，GraphQL余额／coin metadata／staking／sentTransactions／events type与module分别snapshot-verified，assets incomplete、names unconfigured、Move部署unreviewed，account coverage-window-verified但没有账户页。该轮在增加AST字段禁令前执行；最终源码的owner02单独验证。

[owner01](./20261005-network-capabilities-aggregate-public-owner-01.json)26937ms／49请求，48 HTTP200／1 HTTP503，account unavailable；报告probeCompleted只说明本次有限评估完成，不表示该族成功。[owner02](./20261005-network-capabilities-aggregate-public-owner-02.json)在完全相同默认预算与公开selector下复测，22720ms／53请求，50 HTTP200／3 HTTP503，account scoped-window-verified、完整5条及全部末验通过；窗口176712–288451、digest Dcwn8ykysCH3EXWj85XZ7cQC1CfDjs2Qq2FPiyze6e7s。registrationComplete=false，registered Kiosks／discovered owner tokens／capabilities三限定旗标true，allAccountActivityCertified与allAccountTransfersCertified均false，allAccountHistoryVerified=false。schema各负项／未审核部署与未配置名称保持。只有hash／计数／旗标，没有selector值、账户列表或交易payload；0模拟／签名／Execute。

[最新debug与原回放只读检查01](./20261005-network-capabilities-aggregate-history-01.json)实际0，连续0–206816／206817 markers，原22水位不变、8 debug及最新RTD源码来源通过；PID66145仍运行through386503、boundedExitCode=null。不restart／resume、重放旧执行或新增seed／genesis；dev脚本及合约仓来源按用户指定保持。

## 来源与最终收口

[本批11源码及57当前唯一来源](./20261005-network-capabilities-aggregate-source-inventory-01.json)：前49中46逐字保持，identity／GraphQL domain／native三项有明确保存原字节的替换；identity测试、聚合／统一fetch／完整夹具／CLI及背景测试另列当前版本。1051产品文件SHA 6851d506a20d639572c3c0fbdc2168387da2212368864f399679912d1bb2a569。先前14与本批5份原字节全部保持。没有新build／Chrome，磁盘双bundle仍历史C9，不能当当前源码验收。

钱包／RPC／明确八CLI脚本类型与本批十文件格式已实际0；背景夹具保持原布局，只改上述并发等待。[最终当前完整轮次03](./20261005-network-capabilities-aggregate-full-wallet-03.log)实际退出0、155文件2076项全部通过（测试maxWorkers=2、无过滤；比NC4新增44）。[旧夹具诊断轮02](./20261005-network-capabilities-aggregate-full-wallet-02.log)maxWorkers=1亦全部2076通过，但不当最终当前源码轮次。双方／来源／本地链接验证完成后追加机器证据。CAP6 Provider／后台负面持久隔离和旧值撤除、NC6当前产物与Chrome，真实独立发布声明／可选部署／服务签认及六剩余接口与所有核心试用门槛继续。父49/98、trial_ready=false。

## 双方文档与来源收口

[当前完整检查与实际退出码](./20261005-network-capabilities-aggregate-checks-final-01.json)记录155文件2076当前全量、244定向／19后台、三份最终类型实际0及十文件格式；原日志SHA和[可复验脚本](./20261005-network-capabilities-aggregate-document-verifier-01.py.txt)原字节亦列明。[双方核验01](./20261005-network-capabilities-aggregate-document-verification-final-01.json)实际0：40文档／975有效本地链接、75双方共享H2（74逐字一致，1仅旧07→规范08矩阵链接差异），57当前源码／19原字节、14官方／59本地摘要全部保持，三仓git diff --check 0；当前真实聚合53请求／5事实／默认60000ms与原NC4生产默认20000ms无覆盖证明分别核验。新增文档只完成本批有限G1–5／G4a，不勾选父NET-04或试用门槛。

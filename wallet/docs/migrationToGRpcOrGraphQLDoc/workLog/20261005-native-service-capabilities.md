# NET-04 CAP5 NC3A：原生只读方法正例

按[编码前NC3A–C设计](./20261005-native-service-capabilities-design.md)及Task顺序实施；[此前状态](./20261005-current-state-before-native-service-capabilities.md)保留，NC1／NC2批次已封存。NC3A有限合同完成，NC3B／C、NC4–6、CAP6及父NET-04仍开放。

## 权威结论与编码

[三份Sui固定源码原文／SHA](../evidence/official/20261005-native-service-capabilities/manifest.json)与当前RTD／SDK生成源码核对：GetServiceInfo含完整H0与水位，但没有完整可用方法清单或部署签认；server不能当协议能力版本。GetPackage区分storageId／originalId／version，GetFunction返回独立descriptor，参数完整ABI需额外审核。本批未修改只读SDK、RTD或指定部署脚本。

新native-service-capabilities模块及实际probe harness仅允许Fullnode的Ledger.GetServiceInfo／GetCheckpoint／GetObject、State.GetCoinInfo、MovePackage.GetDatatype／GetFunction；Archive仅Ledger.GetServiceInfo／GetCheckpoint。每轮新临时SDK，MVR空、明确POST／URL白名单，omit credentials、禁止redirect；没有client／signer／ready输出。GetObject(0x2)复用现有完整BCS／digest／Immutable package核验，nativeCoin使用实际metadata正例；UID和object::id仅校验基础descriptor身份／类型／非空响应，完整布局与函数ABI仍not-verified。

每角色先／后完整H0和必需u64水位包围，选择实际最低可读checkpoint，最低0必须精确H0；错selector、已知H0变化、原生高度倒退或最低改变拒绝结果。各方法独立失败，不把NOT_FOUND、UNIMPLEMENTED、缺正例、非法响应变为空成功。一个默认30秒总期限、2MiB leaf响应预算和当前共享读取名额；完整body／trailer结算，取消调用不提前释放忽略abort的leaf，迟到及hash期间会话关闭不发表；已收到错链优先于另一角色的总期限耗尽。仅冻结方法名／正例selector／公开response SHA，部署签认not-verified、非读方法not-probed、packageRegistryCompatibility not-verified。

## 失败保留与验证

[首轮定向](./20261005-native-service-capabilities-targeted-01.log)4文件86项，84通过／2失败；[RPC类型01](./20261005-native-service-capabilities-types-rpc-01.log)实际2。夹具把Checkpoint.signature误写signatures、OpenSignatureBody.typeParameterInstantiation误写typeArguments，role推导为string；按准确生成类型改正，未cast放宽生产模型。正例fixture因此序列化失败，并非真实服务故障。生产预算错误最初继承普通Error，被实际SDK转换为RpcError后丢失budget分类；改为继承SDK保留的RpcError子类，预算反例与stream cancel通过。

[定向02](./20261005-native-service-capabilities-targeted-02.log)4文件86项全部通过，[RPC类型02](./20261005-native-service-capabilities-types-rpc-02.log)实际0。再补有效payload后失败trailer、未知signature type、错链＋挂起角色期限、SHA期间session关闭，最终[全量](./20261005-native-service-capabilities-full-wallet-01.log)146文件1748项通过，新增36项。[完整钱包／四个能力脚本类型](./20261005-native-service-capabilities-types-final-01.json)两个实际子进程分别0。格式[01](./20261005-native-service-capabilities-format-01.log)／[02](./20261005-native-service-capabilities-format-02.log)／[03](./20261005-native-service-capabilities-format-03.log)及[末验](./20261005-native-service-capabilities-format-check-01.log)均0。

[真实同链只读评估](./20261005-native-service-capabilities-public-01.json)实际终态0、10请求、Fullnode六方法与Archive二方法正例全部通过；Fullnode末验height609213／最低135445并读取135445，Archiveheight379225／最低0并读取实际H0。双方完整H0精确绑定；0模拟／0签名／0Execute。native高度不证明GraphQL领域覆盖、Display回放、业务集合或批准。node module.register警告不影响终态，未当发布构建／Chrome证据。

## 保护、来源与尚未完成

[指定部署脚本只读保护](./20261005-native-service-capabilities-history-01.json)连续0–166142／166143 markers，原22条水位不变、最新源码与8 debug验证、PID66145运行、上界386503、boundedExitCode=null。未重启／resume，旧D5严格拒绝仍需独立调查；未操作原交易保留根或重发。

[来源检查](./20261005-native-service-capabilities-source-inventory-01.json)7当前模块／测试／probe及直接只读依赖摘要，原NC1／NC2的17文件仍一致，产品1028文件与三官方摘要核对；磁盘UI／background严格等于原C9，没有新构建／新Chrome。[三仓diff](./20261005-native-service-capabilities-diff-01.json)实际0、既有dirty保留。后续NC3B完整layout／ABI／bytecode、NC3C name registry／revision／声明、NC4账户、NC5全局及NC6当前产物仍必需；先前资产partial／名称未配置不因这些native正例解除。父49/98、trial_ready=false。

## 本批末验

[合并与原文保存检查](./20261005-native-service-capabilities-merged-docs-01.log)实际终态0。[最新三仓diff](./20261005-native-service-capabilities-diff-final-02.json)均0；[文档与来源末验01](./20261005-native-service-capabilities-document-verification-01.json)29文档／769本地链接／70共享段落，69逐字一致、1仅合法07→08矩阵链接编号，24唯一源码／脚本／依赖摘要仍一致。加入封存链接及派生总进度后，另存最终02链接结果；所有失败保留，父49/98、trial_ready=false。下一子项仍按NC3B／C顺序推进，不将本批基础descriptor正例写作完整合约兼容。

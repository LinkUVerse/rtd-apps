## 当前事实与下一步

任务计数以Task.md为准：48/98（49.0%），trial_ready=false。此页仅汇总最新已验证事实；此前354行完整保存于[本次整合前状态](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/migrationToGRpcOrGraphQLDoc/workLog/20261004-current-state-before-query-recovery.md)，更早阶段仍保留各自日志。历史PID、构建摘要、余额和水位不能当作当前事实。


**开发链已通过原摘要受控重放恢复。PID3922沿用原H0／genesis／当前debug源码；424107取得与原计算记录一致的认证证书，contents／前驱与三个epoch委员会签名核验通过。临时恢复配置已撤回，所有原YAML逐字节恢复；15.082秒原生checkpoint424269→424338，三笔原回执／余额一致，Fullnode及faucet端口归属通过，runtime.ready=true。没有删除计算摘要、重置数据库、重发交易或重启消费者。** 35项运维守卫通过，见[原摘要受控恢复](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/migrationToGRpcOrGraphQLDoc/workLog/20261004-original-summary-recovery.md)。先前失败证据和调参入口禁用保留，钱包trial_ready=false。

**当前读取问题已缩小到display。** 新扩展Chrome复核在资产查询阶段超时；恢复后OriginByte在S163168完整ownedObjects首请求仍20秒超时、0模拟0广播。S163619字段隔离中对象身份／BCS／owner／JSON及转移能力2–3秒通过，display单独10秒超时；SQL读计划走索引约1.9／9.7ms、原生GraphQLdisplay亦超时，继续定位resolver及连接／调度。官方源码还确认Display v1模板未按S查询，RPC-03／NET-04仍需补齐模板快照合同，不能将现有v1渲染标为固定S。见[复用与诊断](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/migrationToGRpcOrGraphQLDoc/workLog/20261004-kiosk-discovery-reuse.md)。


### 资产窗口与最新页面结果

原dev链及退出的服务已沿用同一genesis／数据库，通过指定合约仓库脚本恢复。最新生产WalletAssetReader在S151755读取原账户13对象；此前S143051／S143205核验记录保留；账户历史reader接纳142656–143193的有限窗口、0笔交易，registrationComplete及全集活动／收支认证仍为false。此前读取失败、consistent重启下界和KV桶重放导致的不可读窗口全部保留，见[受控恢复](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/migrationToGRpcOrGraphQLDoc/workLog/20261004-runtime-cold-recovery.md)。

后台20秒轮换资产快照会取消尚未完成的慢集合读取；已通过真实Provider／SDK三页测试复现并修复。当前同binding／session的资产查询完成后才恢复自动轮换，切generation仍立即取消旧读取。真实Chrome重新通过10个非视觉对象与链接、Kiosk卡片及空详情、账户密码／锁定／整浏览器重启，0模拟0广播。见[轮换修复](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/migrationToGRpcOrGraphQLDoc/workLog/20261004-snapshot-rotation.md)。

最新Chrome元数据读取在S145612明确返回WMIG metadata=null，发送页显示精度缺失说明且不存在金额／批准入口；不把未知decimals当0，不把旧S的缺失当成当前链上余额归零。S仍早于WMIG种子400826和钱包发送409864，metadata、PersonalKiosk及写后读尚未追平。见[元数据状态](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/migrationToGRpcOrGraphQLDoc/workLog/20261004-token-metadata-state.md)。

此前只读OriginByte复核在S154734因20秒集合预算超时，17次GraphQL请求后失败，未进入新鲜对象比对，0模拟／0广播；[失败证据与范围](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/migrationToGRpcOrGraphQLDoc/workLog/20261004-checkpoint-interval.md)已保留，当前非空集合延迟仍需处理。

这些Chrome场景采用真实headless扩展、compiled Local配置及精确开发证书SPKI例外；正常CA、自定义host权限、直接NFT display／隐藏、非空Kiosk及转出没有在本批验收。

### 最新代码和产物

共享预览已由旧serialize()改为现代getData()同步快照，FundsWithdrawal和超大有效期不再被旧v1编码阻断；双方SDK／执行文档同步。见[现代快照修复](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/migrationToGRpcOrGraphQLDoc/workLog/20261004-modern-preview-snapshot.md)。

最新Kiosk发现复用只接纳同reader.proof引用并保留对象／wrapper／BCS与完整集合核验；3文件63项定向、钱包131文件1416项、完整tsc、开发Webpack和四入口静态审计通过。UI SHA256为2eaddb81219d959737764c8fe58cbc010ae3077651af60dc4df213bdd532c76f，background为ef15ecc73480d6967afb44b5263d28f696c1b537d19bd0a2df09fdf92e28de44。当前产物Chrome资产读取未通过，历史元数据状态／Chrome通过仅对应此前产物；没有本批生产构建或全动态流量验收。

两套方案已整合为13章，14份原文保留，archive原目录保持；后续合同修正同时同步双方。21线协议／18未使用接口的静态闭包已审计，现代SDK／Kit与隔离安装已有证据，钱包及共享core构建阻断已修复。Explorer仍有79条既有类型诊断和旧Kit接入待处理；不能把钱包产物审计当成其它应用通过。见[共享core注入](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/migrationToGRpcOrGraphQLDoc/workLog/20261004-core-injection.md)及Task的NET-09／10／RPC-26。

接口已完成20/26，剩余RPC-03、04、11、13、22、23仍按各自完整合同推进。GraphQL资产／余额／metadata、Fullnode新鲜对象／Coin／地址资金、名称、系统与APY、账户有限窗口及受限归档均已有编码和对应接口证据；逐项是否完成只以Task和日志为准。

### 实际交易与恢复边界

实际混合原生发送1.5 RTD已成功HR27Xmrhd2KPsN4YDCbJzsBYkmcpnnf3NN1m2kW5rEUd、cp398996。实际modern dApp混合WMIG发送1500000已成功6mTumr6izYKqyxrRyTzEwuzgqjj5SbTEL84kLfkmqhnK、cp409864，3模拟／1广播；目标余500000 WMIG Coin和496500976地址RTD，接收方得1500000。批准bytes、签名、effects、双方余额和两条journal整浏览器锁定重启只读复核通过，恢复0模拟0广播。见[混合原生执行](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/migrationToGRpcOrGraphQLDoc/workLog/20261004-mixed-native-execution.md)、[混合代币执行](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/migrationToGRpcOrGraphQLDoc/workLog/20261004-mixed-token-execution.md)。

原执行harness在链成功后发生报告字段错误，失败记录保持；没有重发，原dApp返回全文未落盘的限制仍保留。mixed-execution-browser-01及mixed-token-attempt-01.json均必须保留，后续只读恢复。旧2RTD／2000000 WMIG准备前提已失效，禁止重跑种子或使用旧金额夹具。

dApp成功、timeout但链成功、批准后取消与链失败已分别有单次提交／原摘要恢复证据；质押实际批准与独立Coin发送已有终态journal。现代标准的输入／消息／只签名／执行合同及后台签名、持久屏障、单次dispatch、终态核验和统一恢复已完成对应任务。完整切换授权、互斥和故障矩阵仍归未完成TX／QA；既有五条dApp和两条质押journal同样不得删除或重发。

### 指定开发环境

runtime为dev-20261003-01，H0为3tEPxLxUysGx4gfr8UEycvH7xohMWuwKVbTX5np4TCYj。只使用指定rtd当前源码的debug产物，部署／合约／启动与恢复脚本均在link-u-smart-contract；没有重建genesis、清数据库或绕过发布guard。

profile03 revision2：Fullnode39400，GraphQL https://127.0.0.1:39600/graphql，Archive https://127.0.0.1:39603/archive，账户 https://127.0.0.1:39606/account/graphql。已配置OriginByte，无PersonalKiosk默认推导。适配器6名额、三个消费者各2、guard8；已验证容量配置保持。

恢复后实际消费核验：indexer22管线最低235204、consistent4管线171706、KV14管线163635，debug及adapter绑定一致。3922已原生推进并通过同H0／原三笔回执和余额、完整Fullnode／faucet归属及ready finalizer；消费者未重启，仍未追平种子／WMIG／PersonalKiosk目标checkpoint。此前424106停滞和保护记录保留，不能将链恢复替代索引追平或资产全链路验收。

### 后续优先次序

原共识重放已恢复并证明实际链头推进；优先解决display读取与v1模板快照合同，继续完成剩余六个RPC的页面／资金模式／仓位／NFT与Kiosk合同，推进NET-04能力状态、NET-07正常自定义网络、NET-10消费者影响及NET-11故障预算。继续TX-01／04／07／08／10／12的最终授权、跨窗口恢复和故障验证；索引追平需以实际共同S及目标checkpoint证明。

补齐ENV-05／06协议和ENV-07正常Chrome证书／权限，完成TRY-02／05的剩余真实核心链路后提供可安装包与说明（TRY-06／07），再推进22项真实QA和最终REL。当前未提供可试用结论，目标持续进行；未执行的项不记通过。

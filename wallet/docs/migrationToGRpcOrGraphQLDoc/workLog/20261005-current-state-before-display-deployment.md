## 当前事实与下一步

任务计数以Task.md为准：48/98（49.0%），trial_ready=false。此页仅汇总最新已验证事实；此前354行完整保存于[本次整合前状态](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/migrationToGRpcOrGraphQLDoc/workLog/20261004-current-state-before-query-recovery.md)，更早阶段仍保留各自日志。历史PID、构建摘要、余额和水位不能当作当前事实。

**D5／D6正在准备最新debug及认证回放。** 原进程身份已只读核对；三个新历史表实际未部署，旧主机构建守卫按预期拒绝已变更源码。八个原debug文件已保存，独立Cargo cache准备成功，原路径未替换、未发信号；最新源码八目标build与索引器库测试执行中，未记通过。见[准备日志](./20261005-display-debug-build-preparation.md)。

**D4历史Display能力与钱包basis准入已完成本批编码和回归。** Reader38项、GraphQL249项均在同一当前RTD源码通过，两个sourceUnchanged=true；钱包133文件1463项（新增45项）、完整tsc、显式Local开发构建／双入口AST及四入口39方法静态闭包通过。sourceId／历史generation与固定S摘要在pin／read／末验中核对，非空模板basis强制校验；D4新增4项实际PG函数。新历史服务未部署，未执行认证回放或新版Chrome验收；48/98、trial_ready=false保持。详见[本批日志](./20261005-display-history-admission.md)和[最终整合证据](../evidence/20261005-display-history-admission-completion.json)。旧状态完整保存于[更新前状态](./20261005-current-state-before-display-admission.md)。

**最新扩展产物仅完成静态构建，Chrome旧结果对应之前的c446dd／05b4e2产物。** D4当前UI c017238ba4057f1efcd5d7b77352bbab7adeb43e111a38bf9468a77f37d016b7，background 95f84aaece018f0f4ac8aebe0b411d7a7db42cb0a958934fdf80b6964b7b9ea6；旧dist已完整保存。新产物要求历史能力及basis合同，实际资产页面待D6部署后验证，不能沿用旧Chrome有限通过结果。原八个debug运行产物未随D2–D4源码替换；源码已改变，旧debug构建证明不能当作当前源已构建／部署证明。



**此前核心 CLI 已受控切换为当时指定源码的 debug 产物，PID21240、当次runtime.ready=true。** 原生438627→438698、15.042秒，三笔原成功回执／余额与切换前一致、0模拟0广播。原四份YAML／genesis／数据库／journal保持，消费者未随核心重启；33项切换／恢复守卫通过。当次核心切换已验证；D2–D4后当前源码的新八个debug构建／部署仍需D6，钱包trial_ready仍为false。见[受控切换与实际证明](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/migrationToGRpcOrGraphQLDoc/workLog/20261005-core-debug-current.md)。

**此前共同资产窗口恢复，生产资产字段读取通过；本机监听队列缺陷已修复，完整OriginByte单次只读回归通过，入口仍有残余超时。** SQL生产七键7.114ms／32页和3项真实PG回归已完成。单次等待已结束，生产reader实际接纳S176808，13对象五组字段通过；早先公开display与第二账户OriginByte下游503已定位到授权建连。默认队列5仅24/32次/live成功；现队列32、PID11462，同测32/32及扩展256/256成功，三种合法授权204、unknown403，5项守卫通过。公开／原生固定S display复测通过；OriginByte两账户完整生产读取S182969／123请求及两条未签名路由通过、0模拟0广播。Chrome此前资产阶段超时实际0条GraphQL请求，已定位原UI／后台缺审核Local配置，与Docker授权建连超时分开记录。已按profile03重建及双入口AST验证；另复现并修复切网清缓存后存储迁移就绪检查不恢复导致页面空白。14定向、132文件1418项、tsc和开发构建通过；当前Chrome在S189657的余额、10非视觉对象／链接、Kiosk空详情及密码／锁定／整浏览器重启通过，0模拟0广播。Docker入口仍有授权建连超时。队列修复仅证明本机突发缺陷消除，持续稳定性待对照定位，不记父RPC通过。D1权威Display历史语义已对齐，D2历史索引已编码并通过本批测试；历史读取D3已编码并通过36项Reader／247项GraphQL库回归；D4本批准入编码与回归已完成，认证回放／D5–D6待推进，见[本批日志](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/migrationToGRpcOrGraphQLDoc/workLog/20261005-current-assets-window.md)。

### 资产窗口与最新页面结果

原dev链及退出的服务已沿用同一genesis／数据库，通过指定合约仓库脚本恢复。此前生产WalletAssetReader在S151755读取原账户13对象；此前S143051／S143205核验记录保留；账户历史reader接纳142656–143193的有限窗口、0笔交易，registrationComplete及全集活动／收支认证仍为false。此前读取失败、consistent重启下界和KV桶重放导致的不可读窗口全部保留，见[受控恢复](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/migrationToGRpcOrGraphQLDoc/workLog/20261004-runtime-cold-recovery.md)。

后台20秒轮换资产快照会取消尚未完成的慢集合读取；已通过真实Provider／SDK三页测试复现并修复。当前同binding／session的资产查询完成后才恢复自动轮换，切generation仍立即取消旧读取。真实Chrome重新通过10个非视觉对象与链接、Kiosk卡片及空详情、账户密码／锁定／整浏览器重启，0模拟0广播。见[轮换修复](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/migrationToGRpcOrGraphQLDoc/workLog/20261004-snapshot-rotation.md)。

此前定向Chrome元数据读取在S145612明确返回WMIG metadata=null，发送页显示精度缺失说明且不存在金额／批准入口；不把未知decimals当0，不把旧S的缺失当成当前链上余额归零。S仍早于WMIG种子400826和钱包发送409864，metadata、PersonalKiosk及写后读尚未追平。见[元数据状态](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/migrationToGRpcOrGraphQLDoc/workLog/20261004-token-metadata-state.md)。

此前只读OriginByte复核在S154734因20秒集合预算超时，17次GraphQL请求后失败，未进入新鲜对象比对，0模拟／0广播；[失败证据与范围](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/migrationToGRpcOrGraphQLDoc/workLog/20261004-checkpoint-interval.md)已保留，该失败保留；本批OriginByte两账户123请求已通过，非空Kiosk的Chrome页面仍未验收。

这些Chrome场景采用真实headless扩展、compiled Local配置及精确开发证书SPKI例外；正常CA、自定义host权限、直接NFT display／隐藏、非空Kiosk及转出没有在本批验收。

### 最新代码和产物

共享预览已由旧serialize()改为现代getData()同步快照，FundsWithdrawal和超大有效期不再被旧v1编码阻断；双方SDK／执行文档同步。见[现代快照修复](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/migrationToGRpcOrGraphQLDoc/workLog/20261004-modern-preview-snapshot.md)。

最新Kiosk发现复用只接纳同reader.proof引用并保留对象／wrapper／BCS与完整集合核验；3文件63项定向、钱包131文件1416项、完整tsc、开发Webpack和四入口静态审计通过。这批源码静态构建的2eaddb／ef15ecc产物没有审核Local配置，已保留。此前存储迁移就绪修复及显式profile03构建UI SHA c446dd353574351169480316ddeaf521340f644e0bbe347da3e257564cc59acd，background SHA05b4e235093f20812ad0385db7db9af9dfd19f890608ef5987b0038fecab1f24；该批源码稳定构建、双入口AST／4测试、1418全量及39方法闭包通过。该批Chrome有限资产／锁定重启已通过，历史元数据状态／Chrome通过仅对应此前产物；没有本批生产构建或全动态流量验收。

两套方案已整合为13章，14份原文保留，archive原目录保持；后续合同修正同时同步双方。21线协议／18未使用接口的静态闭包已审计，现代SDK／Kit与隔离安装已有证据，钱包及共享core构建阻断已修复。Explorer仍有79条既有类型诊断和旧Kit接入待处理；不能把钱包产物审计当成其它应用通过。见[共享core注入](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/migrationToGRpcOrGraphQLDoc/workLog/20261004-core-injection.md)及Task的NET-09／10／RPC-26。

接口已完成20/26，剩余RPC-03、04、11、13、22、23仍按各自完整合同推进。GraphQL资产／余额／metadata、Fullnode新鲜对象／Coin／地址资金、名称、系统与APY、账户有限窗口及受限归档均已有编码和对应接口证据；逐项是否完成只以Task和日志为准。

### 实际交易与恢复边界

实际混合原生发送1.5 RTD已成功HR27Xmrhd2KPsN4YDCbJzsBYkmcpnnf3NN1m2kW5rEUd、cp398996。实际modern dApp混合WMIG发送1500000已成功6mTumr6izYKqyxrRyTzEwuzgqjj5SbTEL84kLfkmqhnK、cp409864，3模拟／1广播；目标余500000 WMIG Coin和496500976地址RTD，接收方得1500000。批准bytes、签名、effects、双方余额和两条journal整浏览器锁定重启只读复核通过，恢复0模拟0广播。见[混合原生执行](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/migrationToGRpcOrGraphQLDoc/workLog/20261004-mixed-native-execution.md)、[混合代币执行](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/migrationToGRpcOrGraphQLDoc/workLog/20261004-mixed-token-execution.md)。

原执行harness在链成功后发生报告字段错误，失败记录保持；没有重发，原dApp返回全文未落盘的限制仍保留。mixed-execution-browser-01及mixed-token-attempt-01.json均必须保留，后续只读恢复。旧2RTD／2000000 WMIG准备前提已失效，禁止重跑种子或使用旧金额夹具。

dApp成功、timeout但链成功、批准后取消与链失败已分别有单次提交／原摘要恢复证据；质押实际批准与独立Coin发送已有终态journal。现代标准的输入／消息／只签名／执行合同及后台签名、持久屏障、单次dispatch、终态核验和统一恢复已完成对应任务。完整切换授权、互斥和故障矩阵仍归未完成TX／QA；既有五条dApp和两条质押journal同样不得删除或重发。

### 指定开发环境

runtime为dev-20261003-01，H0为3tEPxLxUysGx4gfr8UEycvH7xohMWuwKVbTX5np4TCYj。只使用指定rtd当前源码的debug产物，部署／合约／启动与恢复脚本均在link-u-smart-contract；没有重建genesis、清数据库或绕过发布guard。

profile03 revision2：Fullnode39400，GraphQL https://127.0.0.1:39600/graphql，Archive https://127.0.0.1:39603/archive，账户 https://127.0.0.1:39606/account/graphql。已配置OriginByte，无PersonalKiosk默认推导。适配器6名额、三个消费者各2、guard8；已验证容量配置保持。

本批六服务保持source4756、indexer4762、consistent4792、GraphQL4804、KVwriter16636、Ledger16643；早先query／KV debug及adapter绑定一致。核心CLI已受控切换至21240，11条当前组件身份匹配；旧query-route记录已退出，未计入通过。最新只读工具严格核验14条KV及4条consistent持久化metric集合，00:44:29缺口3885为历史观察；随后00:56:49取得范围交集、生产reader在S176808实际接纳；原有效retention配置哈希保持，未为等待重启消费者。实际完整资产验收和目标checkpoint追平仍未完成，见[本批记录](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/migrationToGRpcOrGraphQLDoc/workLog/20261005-core-debug-current.md)。

### 后续优先次序

原共识重放已恢复并证明实际链头推进；生产SQL修复已验证，核心CLI最新debug受控切换和14条KV持久化核验已完成，当前产物Chrome有限资产回归已通过，接下来实施v1历史发布模板D2–D6和剩余接口，继续定位Docker入口残余超时及完整网络／签名恢复门槛，继续完成剩余六个RPC的页面／资金模式／仓位／NFT与Kiosk合同，推进NET-04能力状态、NET-07正常自定义网络、NET-10消费者影响及NET-11故障预算。继续TX-01／04／07／08／10／12的最终授权、跨窗口恢复和故障验证；索引追平需以实际共同S及目标checkpoint证明。

补齐ENV-05／06协议和ENV-07正常Chrome证书／权限，完成TRY-02／05的剩余真实核心链路后提供可安装包与说明（TRY-06／07），再推进22项真实QA和最终REL。当前未提供可试用结论，目标持续进行；未执行的项不记通过。

单次只读窗口观察和等待驱动已结束；共同S已由生产reader实际接纳，完整NFT与Chrome尚未验收，不记试用通过。逐次事实保存在[观察记录](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/migrationToGRpcOrGraphQLDoc/workLog/20261005-query-window-wait-observations.jsonl)。

最新页面恢复和缓存就绪门禁证据见[本批代码与Chrome日志](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/migrationToGRpcOrGraphQLDoc/workLog/20261005-storage-migration-cache.md)；正常CA／自定义权限／直接NFT与非空Kiosk页面／实际NFT转出不在本批通过范围。

### 2026-10-05：Display历史索引编码与数据库回归

D2已新增历史事件／checkpoint marker／独立连续coverage及事务、冲突、不变式和epoch门禁；66项索引器库测试通过（新增19项含12项实际PostgreSQL）、6项回放准备守卫、GraphQL兼容编译及格式／diff检查通过。新历史服务未部署，认证回放和D3–D6仍待推进；现有dev沿用前批产物，部署source上下文已拒绝旧构建证明，新增源码的当前完整debug重编译／受控绑定与替换尚未执行。48/98、trial_ready=false保持，见[本批源码与验证日志](./20261005-display-history-indexer.md)。

### 2026-10-05：Display历史读取与GraphQL库回归完成

D3已经接入(type,S)历史loader、连续coverage／watermark／genesis一致性校验和GraphQL同S的v1／v2模板basis。36项Reader、247项GraphQL默认features库回归通过，其中新增7／10项含6／2项实际PG函数。两个证明sourceUnchanged=true且与本批当前源码相同；SDL和新增字段范围snapshot已核对，实际7键／1025事件的参数批量SQL执行0.466ms。已修正实际字段请求抓到的Digest输入scalar出参panic，失败记录保留。新代码未部署；D4能力／钱包准入及D5–D6完整认证、部署和页面验收待推进。父任务48/98、trial_ready=false保持，见[本批日志](./20261005-display-history-reader.md)。

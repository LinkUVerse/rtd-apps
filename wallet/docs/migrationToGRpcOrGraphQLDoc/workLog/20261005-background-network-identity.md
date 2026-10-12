# 后台交易三入口身份授权守卫

2026-10-05。按[N1–N5实施前设计](./20261005-background-network-identity-design.md)推进，父NET-04／TX-01开放，49/98、trial_ready=false。N1–N5本批有限合同完成；不能据此勾选完整NET-04／TX-01或试用。

## N1：依据和前置失败

以钱包06／archive05的2.3合同为准：明确错链整体停止，已验证Fullnode同链而其它入口暂不可用可以降级。之前withExecutionAccount仅核验配置／账户，Fullnode自己的H0检查无法识别其它配置入口错链。[前置回归](./20261005-background-network-identity-before-01.log)实际调用background执行函数与原生SDK身份帧，38项中7失败，复现错链仍签名／模拟后其它入口改变／身份未探测及水位倒退的缺口；没有真实广播。

[Sui固定GetServiceInfo源码](https://raw.githubusercontent.com/MystenLabs/sui/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-rpc-api/src/grpc/v2/ledger_service/get_service_info.rs)返回完整Digest字符串及checkpoint_height；[官方SDK](https://sdk.mystenlabs.com/sui/clients/grpc)说明浏览器Fetch gRPC-Web、abort和原生service接口，[迁移指南](https://docs.sui.io/develop/accessing-data/json-rpc-migration)用于区分Fullnode实时执行与查询服务职责。生成客户端属性、一次HTTP200或H0相同均不能证明部署支持全部能力。三入口整体交易授权与同操作水位隔离是RTD部署／钱包合同，不冒充Sui标准capability接口。原文及SHA保存于[来源manifest](../evidence/official/20261005-transaction-network-identity/manifest.json)。两次尝试错误固定源码URL得到404，未作为权威来源；最终正确固定commit如上。

## N2：实现边界

新增assertTransactionNetworkIdentity，后台交易每个authorize使用实际SDK新client、新查询重验已配置Fullnode／GraphQL／Archive；临时查询只返回身份报告，不释放执行客户端、不模拟探测能力。沿用10秒整体期限、四个共享物理读取名额与AbortSignal。已知错链／不兼容优先于其它失败，Fullnode未验证不能被GraphQL成功替代；其余配置入口暂不可用时为identity-degraded，仍需要原有Fullnode正式模拟、固定bytes与签名／单次dispatch规则。未配置角色不猜地址。

操作拥有的会话记录已观察Fullnode／Archive最高水位，倒退为TransactionNetworkResetError，本次操作持续隔离；已知错链／不兼容亦不因下次好响应清除。临时不可用允许下次重新探测。authorize先复核账户／配置，网络等待后再次复核，锁定／切网／换账户不能接纳迟到成功。不更新H0、generation、profile、journal，不部署或重建链。此WeakMap仅本操作／session，不宣称跨操作／跨worker持久reset注册或全局UI撤值；完整SDL、package、覆盖和网络聚合状态仍属于NET-04未完成合同。

该边界覆盖后台内部币／NFT／质押等executeWalletPrepared，以及dApp prepare／sign-only／execute。内部UI独立预览自身仍由Fullnode reader核验。内部confirmedReceipt／recover signing=false不调用三入口签名准入；dApp recover显式内部readOnly选项只跳过交易网络守卫，保留原账户解锁／selected／请求原文／origin权限及Ledger自身H0核验；准备／签名／执行不使用该模式。PersonalMessage原离线签名合同保持。

## N3：验证与失败修正

新增11身份守卫用例、11实际background执行／等待用例、1 reset错误分类及1 dApp只读权限用例，共24项。实际SDK帧覆盖三个角色错链／优先级／sticky、不兼容、临时不可用及恢复、Fullnode拒绝替代、两角色水位倒退／新session边界与真正进入transport后的迟到取消；background证明错链前无模拟／签名／journal／dispatch、模拟后改变再拒绝、本地恢复不探测和等待期间三类失效。现有dApp执行／sign-only／取消合同保留。

[首次定向](./20261005-background-network-identity-targeted-01.log)2失败／136通过；旧navigator.locks替身用单个held布尔值错误串行化所有锁名，新的读并发锁被恢复执行锁挤掉。失败未释放pending恢复又污染下一用例。改为按锁名隔离，finally完成恢复，保留同scope互斥断言。取消用例改成实际Fetch已进入后close。补充dApp readonly仍复核账户／权限、执行默认保持网络守卫。

[最终定向](./20261005-background-network-identity-targeted-02.log)8文件139项全部通过，[完整钱包](./20261005-background-network-identity-full-wallet-01.log)142文件1618项全部通过；[钱包完整tsc](./20261005-background-network-identity-wallet-types-03.log)、[RPC tsc](./20261005-background-network-identity-wallet-types-02.log)与[core tsc](./20261005-background-network-identity-core-types-01.log)均终态0。首次tsc引用不存在configs/ts/tsconfig.json，只是命令路径错误，[失败原文](./20261005-background-network-identity-wallet-types-01.log)保存，没有当通过。

## N4：公开入口、产物与原记录

[稳定Local构建](./20261005-background-network-identity-local-build-01.json)终态0、1016源码SHA6f9dd2、UI502b1f／background640615，前后源码同SHA，明确Local／revision2 profile与UI1／后台4个AST literal相等，旧Q产物保留。[四入口闭包](./20261005-background-network-identity-wire-closure-01.json)21使用／18未用的39旧方法与JSON-RPC envelope／旧导入扫描通过；静态结果不替代真实网络。

[公开TLS最终探测04](./20261005-background-network-identity-public-tls-04.json)实际两次三入口共6条健康身份读均完整H0匹配，随后明确叶响应／不可用注入，共7组、30次leaf调用；三个错链角色、本会话隔离后零新读取、其它入口临时不可用恢复、Fullnode不能替代以及归档水位倒退拒绝均通过。使用生产守卫默认10秒，0模拟／签名／广播；其它入口故障是受控注入，实际服务没有改成错链。

公开probe01／02错误将Fetch Response.status作为方法，异常被守卫按不可用拒绝；修正脚本属性后，独立原raw探测30秒诊断[通过6查询](./20261005-background-network-identity-raw-diagnostic-01.json)。03完成前6组后在归档水位注入的断言失败，原始[JSON](./20261005-background-network-identity-public-tls-03.json)及log保留，但当时没有采集assertion.actual，不能推断具体原因；04新增该诊断后整个矩阵通过，不能用04消除03未解释的失败。

原journal审核01在dApp旧worker reload时ERR_BLOCKED_BY_CLIENT，02先核对5条后staking旧worker同故障；两次都未当7条通过。后续[完整03](./20261005-background-network-identity-original-journal-03.json)与[完整04](./20261005-background-network-identity-original-journal-04.json)两profile7条全部只读核验：0模拟0Execute、7原摘要实时GetTransaction/effects一致、pending0、三个store读前读后SHA相同，实际worker逐字等于当前640615。03／04与此前Q对应profile逻辑SHA逐项相同。

当前Chrome故障尝试[01](./20261005-background-network-identity-current-sign-only-01.log)误查无role=alert的现有Alert组件；02／03改为文本后又错误要求唯一匹配，而费用错误确实在两处显示，03截图及故障状态证明没有React崩溃、Fullnode错链后0新模拟／0Execute。04修正重复匹配并核对归档独立证书后仍因加载态隐藏批准文字的可访问性定位失败；改用DOM内精确批准标签对应的真实按钮，仍严格检查唯一与disabled。四次整轮均未记通过，原始log／截图保持。此前Chrome未加入归档独立SPKI，归档暂不可用只能称身份降级，不能称三入口均通过；[真实CA校验的两份叶证书](./20261005-background-network-identity-browser-certificates-01.json)分别匹配39600／39603当前磁盘证书，仅对这两份SPKI例外，未开启全局TLS忽略。05已按下述完整证据通过，原始失败不覆盖。

[当前Chrome最终05](./20261005-background-network-identity-current-sign-only-05.log)整轮终态0、passed=true。普通sign-only返回BCS与批准digest 7ixwTkuorDcCNk8drscJYo76secsutzLjsuFdV1HMmts一致，SDK TransactionData Intent验签通过，返回BCS SHA 4f85b418a3b97d2df2389c2f7e0fea606bb7ae6e19c811231a5d9005bcc69784；解析／准备／批准3次checks=ENABLED模拟，其中准备和批准正式模拟BCS SHA均等于签名返回值，doGasSelection=false，gas／Validity保持。随后Fullnode和GraphQL在准备前被明确注入错链，错误显示、实际批准按钮唯一且disabled、无预览digest，各0新模拟／0返回签名／0Execute；Archive先在全健康身份下完成预览，再在签名批准时注入错链，批准失败且该阶段0新模拟／0返回签名／0Execute。注入前均先获得实际HTTP200并验证原H0，不改实际服务或磁盘源码，finally恢复worker fetch；三组一次性profile journal保持空。总5次模拟均checks启用，0Execute；80条实际后台身份响应（Fullnode32／GraphQL24／Archive24）均HTTP200、完整H0匹配，故障本体在worker返回层明确另标。实际worker在启动与整浏览器重启两次均逐字等于当前640615；同账户密码错误／锁定／重启后解锁合同通过。该证据证明当前后台代码与真实批准路径，不声称对UI脚本另做CDP逐字核验。

原4次Chrome失败均保持；05的公开test账户未发币或执行，未动原两profile。完整当前内部币／NFT／stake／赎回批准及提交后生命周期仍是父TX-01／10余项。

[原有界回放只读状态](./20261005-background-network-identity-history-01.json)原验证器两次严格通过，连续0–99940／99941 markers，原22条水位保持，原PID运行、boundedExitCode=null，上界386503；同一个supervisor59830也仍活跃。未改RTD受保护源码／adapter／planner，未重启或提前恢复live。此前marker／watermark拒绝调查与终态门槛继续保留。

## N5与余项

双方网络／执行合同、Task／current-state／totalProgress按本轮最终Chrome证据同步；父NET-04／TX-01／TRY不因守卫单批通过完成。完整全入口批准、NFT／活跃仓位／正常CA／完整网络capability与生命周期reset仍需继续推进。


最终[原7journal审核](./20261005-background-network-identity-original-journal-final-01.json)在当前Chrome结束后终态0，两个profile逐项与Q逻辑SHA相同、原摘要effects匹配，0模拟0Execute。代码／脚本[最终来源清单](./20261005-background-network-identity-source-inventory-final-01.json)15项以及1016源码／构建／UI与后台磁盘SHA再次核对；初始清单保留。范围与未完成门槛见[机器证据](./20261005-background-network-identity-evidence.json)。

最终[文档来源／对齐审核](./20261005-background-network-identity-document-verification-01.json)核验28份文档／730个本地链接、7对合同段落及15项源码／脚本SHA，1016份源码与Local构建前后SHA、UI／后台磁盘SHA相同；[合并源完整性终检](./20261005-background-network-identity-merged-docs-final-01.log)13章、14原始保留源、22 QA与21源RPC覆盖保持。双方仓库和合约仓库diff --check已通过。N1–N5本批有限合同完成，父任务49/98、trial_ready=false未改变；下一优先按清单继续剩余接口／核心真实链路，原回放未终态仍不提前resume。

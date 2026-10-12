# 当前状态（2026-10-07，C44页面准入候选／C43运行环境）

总体 **84/98（85.7%）**，14父项开放，`trial_ready=false`。本轮真实子合同完成不另增父计数。完整历史状态原字节保留于 [收口前归档](./20261007-current-state-before-C43-M4-close.md)，更早版本按其链接追溯；以下是当前结论。

开发／测试所需环境恢复并复核：两个保留RTD链使用本地最新源码的八个debug，G3第三明确333000后继、原25查询／2core／2publisher与命令配置保持。当前安装[GraphQL HTTP1.1 dev后继H1–H6](./20261007-C43-http11-successor-design.md)：新增一个private listener41980与private mTLS41981、C43 edge只改GraphQL target及该location的client证书；archive／account及原27其他容器保持。当前 **29钱包相关运行／14health**，原29进程及一个新listener；[实际当前窗口](./20261007-C43-http11-current-read-window-01.json)最低HBase364744／SQL365130／Rocks365133，41管线／Display与十域／原consistent当前范围覆盖原质押后的资产快照。这是观察点，不是当前native head或名称S+20验收。

临时容器累计 **42个确认退役**：前序41加本轮已独立证明退役的旧C43 edge。全局110＝98运行／12退出，[独立清理](./20261007-retired-C43-http10-edge-cleanup-independent-01.json)证明除旧C43删除外所有配置／启动身份／完整挂载、卷／镜像保持，原五archive常驻及当前29／14健康。仅信号本次新guard的暂停／恢复与受控C43新旧edge切换回滚，原29进程及27其他服务signals=0；0force／卷／镜像／数据删除。旧C43原配置、logs、inspect、source与recipe保留；12未确认退役的退出容器继续保留。旧Bootstrap的Mounts顺序独立工具失败／v2完整字典规范排序通过仍为保留历史。

333000有限操作自然结束4791.78s、原三命令恢复且四finite／replay已退出；200000、283000同样已终态，均不重跑。所有原FFMB／DEFM／BMWQ pending及GYF执行profile保持。

既有安装C43构建绑定的历史产品源码1119文件 SHA **f489a51f709fbfc1e66f1a55e26f97f6f84c805f4cd64cadb8d857aa5bcddb31**。修复质押金额在同会话读pending／error卸载Formik时丢失：修复前两真实回归失败、修复后47边界测试及生产类型通过；只把用户金额草稿同步到已有keyed生命周期，换账户／读会话／binding／路由仍清空。 [A1–A4修复验收](./20261007-staking-draft-retention-design.md) 完成；C43生产构建0错误／2既有warning，5285模块／2036源码／7chunks闭包通过，原C42完整源与产物独立差异审核确认唯一运行叶StakingCard.tsx，Background／SDK／其他运行源不变。

C43真实来源 **bdndjiekaedpfbbndoefomeaeccaohgg** 为第十二来源，三现代查询入口78实际规则／12同H0／三私有TLS独立核验，原27容器及Account TLS保留。旧C42 loopback已确认退役并删除；旧C42业务成功证据只属改源前范围，不与C43产物混用。普通Chrome开发CA／正常安装完整资金业务仍未验收，不称可试用门槛已过。

当前 [TX-04 M4完整质押／赎回](./20261007-C43-staking-matrix-close-design.md) V1–V5已实际完成：正确当前indexed validator和原332734仓位、两真实完整Review在sign-only占锁下明确拒绝，金额1／2和原仓位赎回三预览、8完整ENABLED模拟（5规范最终effects／3kind gas选择），原私有签名结果98633ms后因租约到期失败关闭、0返回signature／0Execute、native锁及签名器恢复；完整三空store、Back／重锁／Chrome退出保持。1027原帧／108独立补充、18共享输入语义变异拒绝完成，原15缺失读取body／实际503/504和独立01工具失败保留。

当前 [原质押回执R1–R4](./20261007-C43-staking-indexed-receipt-design.md) 九真实Chrome检查与独立01通过：S347463、两份原十依赖／Display响应与真实Observer `indexing=true`、原332734规范effects／typed摘要、真实回执触发资产刷新；原空journal／账户密文、正常重锁／自然退出，零模拟／签名／执行。原一份503完整body保留；只限原成功质押回执，不代表所有TX-08入口或原提交后的自动导航验收。

当前 [新C43严格pending P1–P4](./20261007-C43-staking-pending-design.md) 19项一次创建／直接NFT冷恢复与15项质押赎回冷续验、各独立01通过：**BMWQQ6WChyYemAcKWRdMMLiTy8anJiZBYbWtQwcs1o8r** 唯一Execute尝试被截断且0转发、产品自然持久pending；原context／worker关闭、锁定冷开／正常解锁，真实native锁free下两个当前入口仅恢复原摘要，S349358规范仓位／系统／typed摘要、三store／密文／observer退出／重锁保持，零新模拟／验签／执行。六及八原NOT_FOUND读取body缺失保留。创建器、该profile与摘要永不重跑／清空／重发，已计划M4只读续验结束。

当前 [气费变化旧批准G1–G4](./20261007-C43-staking-stale-gas-design.md) 七真实Chrome检查与独立01通过：两真实立即按钮进入原生产revalidateStaking，完整加载957.js／source map／本地源码验证，仅克隆本次参数bytes的gas budget+1000、旧digest与原可见批准保持；6份真实模拟／4规范最终effects／2kind选择后明确要求重新预览。S351765及原仓位／gas对象9补充帧、三store／密文／正常Back／重锁／Chrome退出，0验签／Execute；一份关闭GetServiceInfo body缺失及一份503保留。明确是故障注入，不声称产品gas编辑或市场价格变化。333000区间S6限定子合同已收口。

持续503/504根因与可用性仍开放。前序[真实TCP计数](./20261007-C43-admission-counted-transport-design.md)／[单监听器池因素](./20261007-C43-admission-pool-isolation-design.md)672真实查询（668×200／4×503）与六否定门槛已核验；短连接四鉴权connect timeout未进入guard、实际复用120／24次，耗时接近，不宣称根因修复。旧隔离candidate与PG planner并未直接安装。

本轮独立正常dev后继已实际接入C43 GraphQL：[准备](./20261007-C43-http11-transport-prepared-independent-01.json)核验五协议／boot unit、16完整十域warm、三否定门槛、新guard精确SIGSTOP后20.02s真实read-timeout503和SIGCONT／fresh恢复；[切换](./20261007-C43-http11-transport-switched-independent-01.json)核验实际新→旧rollback→新三个阶段36完整十域H0查询、78当前三入口method／Origin／预检及private mTLS CA/SAN。新source／启动／容器权威由指定部署目录wallet_http11_transport_ownership.py维护，旧注册／28容器／PID为历史，不与当前29混用。没有修改原8checks／32admitted／backlog32／5s等待／12scheck或2sconnect，也不缓存授权／放大watermark。

[新入口实际九Chrome读取](./20261007-C43-http11-indexed-receipt-chrome-01.json)与[独立native typed核验](./20261007-C43-http11-indexed-receipt-independent-01.json)通过：原新M4空journal profile正常冷锁／解锁，原GYF332734回执与真实Observer indexing=true，S365010／3nJaXGxGfppFKQcFKV5YpYrXGaMFEtoZsFS2QU2bxkqb十依赖／Display及实际refresh，57原GraphQL帧零error；密文／三journal保持、正常重锁／Chrome自然退出，零模拟／签名／Execute。只限此当前读取范围，不代表全部TX08或普通ChromeTLS／权限／资金业务。

第14章已更新当前C43加载路径、绑定和boot恢复顺序；[already-running恢复入口](./20261007-C43-http11-restore-already-running-01.json)真实零信号／metadata不变。后续host boot尚未发生，其新PID必须新明确authority与实际窗口验收，不预认恢复通过。旧200000／283000／333000任务不重跑；普通ChromeCA、名称native-current／minimumCheckpoint／S+20和持续可用门槛保持。更新前指南和状态分别精确归档于[旧指南](./20261007-install-guide-before-C43-http11.md)、[旧状态](./20261007-current-state-before-C43-http11-install.md)。

剩余14父项：RPC-22／23的完整NFT／Kiosk非空、locked、listed与当前转移准备竞争；TX-01全部批准字节／气费／赞助／过期矩阵，TX-04 M3与M5全入口收口，TX-08全部回执与写后indexed刷新；ENV-07普通ChromeTLS，TRY-05三入口历史／分页／package／名称；QA-A07完整能力／所有权，QA-A15名称当前native高度，QA-A17 Chrome错链／generation／迟到／冷恢复，QA-A19正常安装更新／CA／CORS，QA-A20全故障／重启／持续可用；REL-02当前三入口全功能无JSON-RPC／Sui外访和REL-05逐文档／RPC／页面／A01–A22最终审计。按Task与对应设计继续，不因子项完成预勾父任务。

原C39 FFMB严格pending、原C42 DEFM pending、所有原执行profile、原GYF质押332734及新BMWQ pending保持；原实际链交易不重发。未运行／失败／未达到完整父合同的工作不记为通过。


本轮[非空Kiosk K1–K4](./20261007-C43-nonempty-kiosk-successor-design.md)实际完成：全新三账户、source唯一Faucet、当前debug编译、真实TransferPolicy、一次发布424164与一次播种424677；两次正式模拟／签名／Execute，原账户gas不使用。独立审核八NFT／五Item DF／framework与Personal能力／OB tokens与内部cap／Version3和注册refs。另四实际ENABLED take模拟普通及普通挂牌成功、锁定MoveAbort8／独占MoveAbort4，零签名／提交，普通Listing只在模拟Effects中删除。原发布后的四merged-gas读取失败通过原digest只读恢复、零重发；两take工具初始零模拟失败原样保留。原1015私有文件、29／14与所有原进程、1119产品源码和八debug保持。

当前实际短时追赶测量36.16s：native head421795／4.48cp/s，writer369302→369442／3.87cp/s，consistent369632→369771／3.84cp/s；不是持续吞吐保证。readonly publication观察376723／pending401214；账户 continuation 当前已用既有 optimized debug helper，旧构建provenance installed=false不代表当前未使用。K5／K6尚待正式publication、41管线／Display／十域／account实际覆盖424677后进行当前Chrome完整转移和写后刷新。原三有限任务不重跑，不采用旧窗口或native fallback，不降低名称native-current／minimumCheckpoint／S+20。总体仍84/98、14父项开放、trial_ready=false。

当前HTTP1.1四帧真实同socket核验见[closure01](./20261007-C43-http11-current-socket-closure-01.json)，204／204／403／204与fresh headers保持；原零请求SyntaxError00保留。此次状态更新前完整字节归档于[非空准备前状态](./20261007-current-state-before-C43-nonempty.md)。

最新[K5覆盖观察02](./20261007-C43-nonempty-kiosk-readiness-02.json)实际正式376723／pending401214、HBase375753／SQL375760／Rocks375764／Display375760、account375757；七门槛均未覆盖424677。随后生产读器minimumCheckpoint424677在真实十域与Display准入上界376103时coverage拒绝，[原帧独立01](./20261007-C43-nonempty-kiosk-production-readiness-independent-01.json)通过。零新profile／模拟／签名／提交；正向库存与当前Chrome未执行。后继v2正向库存工具已准备，原静态类型失败和初始检查失败均保留；不据准备更新父计数。

本轮最终[环境复核](./20261007-C43-nonempty-kiosk-final-environment-01.json)与[两链真实gRPC探测](./20261007-C43-nonempty-kiosk-final-chain-readiness-01.json)通过：当前29运行／14健康、全局110＝98运行／12退出、原1015私有文件和最新八debug／全部原进程保持；未新增清理动作，累计42确认退役。新库存工具v2及全部生产导入类型检查[02](./20261007-C43-nonempty-kiosk-indexed-tool-typecheck-02.json)零诊断，正向分支仍未执行。14章／14原文／22QA／21RPC映射完整核验与三仓git diff --check通过；84/98保持。


当前产品源码已更新为1120文件 SHA **1db4c584733b1a85733535c9336b1c7876a5c980171ff47ecb3b394da7ab638d**；此前1119／f489的产品证据只属于原C43构建。当前29容器／HTTP1.1 listener仍由原C43 authority保持，修复未改变其配置、启动、debug或原1015私有文件；原K1–K4是原native夹具实证，不等同新版C44 Chrome验收。状态更新前全文见[修复前状态](./20261007-current-state-before-C44-kiosk-eligibility.md)。

[页面准入E1–E4](./20261007-kiosk-transfer-eligibility-design.md)已完成：旧转移页5／详情页3个业务断言失败，六相关文件100测试与生产类型零诊断；current eligibility拒绝锁定、独占挂牌及OB未登记／独占，普通挂牌放行，已dispatch原结果及draft生命周期保持。C44独立02生产构建0错误／2既有warning，5285模块／2036源码／7chunks完整闭包通过；独立重建C43所有1119源并核实只有三个运行叶变化。初始收集工具错误及candidate01主动终止130保留，不作为通过。

新C44专用空Chrome来源 **nbmpcfknfgjmecallhngcincnhklllpj** 实际UI／worker字节匹配、五manifest origins包含／未知端口不包含；现有严格edge返回403，**newOriginInstalled=false**，当前安装C43保持。未打开原执行／pending profiles，零新模拟／签名／Execute，E5完整Chrome／链上转移仍开放。

最新[七门槛观察03](./20261007-C43-nonempty-kiosk-readiness-03.json)实际正式376723／pending401214；14HBase／23SQL／4Rocks／Display及十域、account均到376723，仍未覆盖424677。随后[发布阶段03](./20261007-G3-nonempty-kiosk-publication-stage-03.json)确认同一原publisher7463／子进程42987存活，24491待提交row已准备至401214，但prepared不授权读取，正式水位仍376723。原finite／夹具创建器不重跑，正常后继仍继续。E5、K5／K6及14父项开放，84/98、trial_ready=false保持。


后续当前复核：[环境02](./20261007-C44-candidate-final-environment-02.json)29钱包运行／14health、原1015私有文件、全部原进程／八debug及C44候选1120产品源保持；全局当时113＝101运行／12退出，包含另一任务正在使用的3个Java Testcontainers，未触碰。前序110／98是其观察点；不把全局动态数当钱包health门槛。[两链gRPC01](./20261007-C44-candidate-final-chain-readiness-01.json)实际G0 1460783／G3 433430，同H0保持。

[C44入口准备01](./20261007-positive-C44-http11-edge-prepared-01.json)实际只增第13个exact来源／候选project／config路径，临时syntax容器--rm，未切换原服务。独立[03](./20261007-positive-C44-http11-edge-prepared-independent-03.json)完整110常驻容器／29钱包配置和启动身份保持；两外部测试会话换代明确排除且报告，不声称全局全部不变。原独立01固定110及02全局变动失败保留，不计通过；原准备scope中的固定All110描述与动态字段112不一致，实际原baseline112可审计，当前独立限定范围110，不改原证明。确认退役长期临时容器累计42，另本次syntax临时容器自动删除；12未确认退出容器保留。

最新[发布阶段04](./20261007-G3-nonempty-kiosk-publication-stage-04.json)正式**401214**、pending=null，24491原准备尾部已经正式提交；prepared不再作为授权替代。[覆盖04](./20261007-C43-nonempty-kiosk-readiness-04.json)HBase377343／SQL377346／Rocks377346／Display377348、十域377346／account377321仍追赶中。新C44生产读器实际共同333000–377510下minimum424677拒绝及[独立响应01](./20261007-C44-nonempty-kiosk-production-readiness-independent-01.json)通过，零新profile／模拟／签名／执行；[工具类型01](./20261007-C44-nonempty-kiosk-indexed-tool-typecheck-01.json)零诊断，正面分支未执行。待显式C44 runtime后继及全部424677覆盖后继续E5，84/98与trial_ready=false保持。

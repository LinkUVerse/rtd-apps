## 当前事实与下一步

本节是当前状态快照，任务计数以本页顶部从 Task.md 生成的结果为准。旧阶段的端口、PID、水位、未完成状态仅作为历史证据，不再混入当前结论；原叙述完整保存在[历史状态](./workLog/20261004-current-state-history-before-consolidation.md)。

### 最新观测：原链恢复与非原生钱包执行

原dev环境退出后，已通过指定合约仓库的原启动器和受控恢复脚本沿用同一genesis／数据库恢复；当前debug源码及二进制复核，Fullnode同H0、checkpoint推进与原交易保持。查询22／4／14管线继续推进，11个原生组件完整进程身份匹配，三种发布guard准入通过；GraphQL请求点仍低于consistent重启下界，最近真实资产和账户历史reader均拒绝接纳，尚未恢复共同可用窗口；见[受控恢复日志](./workLog/20261004-runtime-cold-recovery.md)。进程存活不等于可试用。

共享预览缓存旧serialize()拒绝FundsWithdrawal已修复为现代getData()同步快照，双方方案同步；130文件1406项、tsc／Webpack／四入口审计通过。最新UI d6d455e86bc0056c81f0fc842e1893c9e22227f4608f32cda47afee620e4d270，background ad6bd1c74ee9c6694efba03785a28b773c048cdf8b564b229e6bd2ee99fd2c06。见[预览修复](./workLog/20261004-modern-preview-snapshot.md)。

实际Chrome钱包通过modern dApp发送混合Coin／地址WMIG共1500000，一次广播成功6mTumr6izYKqyxrRyTzEwuzgqjj5SbTEL84kLfkmqhnK、cp409864。3模拟／1广播；接收1500000、余500000 Coin，RTD净gas2489144、余496500976地址资金。批准bytes／签名／effects／余额及两条journal锁定重启只读复核通过，恢复0模拟0广播。初次harness成功后报告字段错误及随后漏请求bcs的失败保留，未重发，原dApp全文未保存。非原生发送表单、metadata、发送全部UI及其余核心项仍待；48/98、trial_ready=false。见[实链证据](./workLog/20261004-mixed-token-execution.md)。mixed-token-attempt-01.json已成功恢复，仅运行只读模式；不得再次--execute或重跑种子／旧2RTD准备。

### 方案与代码

发送表单和实际准备器已接入 Fullnode 总余额，覆盖地址资金／混合资金构造。根据 Sui 与本地 RTD 源码，原生地址资金交由正式模拟选择 Coin 与 coin reservation，随后固定 bytes 复模拟。54个RPC测试文件、779项测试及完整钱包类型检查通过，最终开发构建和四入口产物静态审计通过；纯地址余额账户指定金额和发送全部真实准备通过，发送全部一次提交成功、原摘要恢复成功、发送账户余额归零。见[地址资金迁移](./workLog/20261004-address-funding.md)。混合原生1.5 RTD及非原生1.5 WMIG实际Chrome批准、发送和重启恢复已通过，见最新记录；非原生发送金额表单与完整页面合同仍待，RPC-04继续保留。

质押资金输入与准备器现已接入Fullnode新鲜总余额，构建前拒绝余额不足或读取失败，确认后刷新余额／Coin缓存。36项相关测试和完整钱包类型检查通过；未进行本批实链质押，见[质押资金日志](./workLog/20261004-staking-fresh-funds.md)。

RPC-02已完成接口合同核验：资产批量保序／逐项Error、历史显式版本批量与消费者均已接通；本轮修复刷新失败暴露旧data问题，54项相关测试和完整类型检查通过。真实归档入口23项跨两批含重复与不存在槽位验证通过，见[批量对象核验](./workLog/20261004-RPC-02-completion.md)。该结论不包含Chrome页面验收。

RPC-01已完成：三入口对象点查实测和61项定向测试通过，同一对象当前Fullnode版本14、GraphQL快照与归档指定版本1分别返回，未混用职责。NOT_FOUND无法独立区分从未存在／已删除的合同已按官方源码对齐，见[点查核验](./workLog/20261004-RPC-01-completion.md)。

RPC-19／20接口核验完成：checkpoint914双选择器真实结果一致，旧交易同摘要经Fullnode保留边界准入后从归档取回成功回执与详情；74项归档／执行测试、18项收据／协调器测试通过。此证据不代表此前两笔coin待恢复交易已可见，也不等于跨worker真实journal验收，见[归档读取核验](./workLog/20261004-RPC-19-20-completion.md)。

动态字段通用解码器新增childId与MoveObject内容UID核验；98项受影响测试及完整类型检查通过，真实系统普通动态字段列表／点查同快照一致。动态对象实链样本仍待补齐，RPC-08保留，见[动态对象完整性](./workLog/20261004-dynamic-child-integrity.md)。修改前全量回归91文件1008项通过，不冒充本次修改后全量结果。

RPC-10系统／epoch／验证者读取核验完成：认证快照20844的epoch2、protocol138、reference gas1000与验证者BCS组合读取通过，当前Fullnode新鲜资金质押准备及固定字节复模拟成功，未签名提交。见[系统状态核验](./workLog/20261004-RPC-10-completion.md)。本轮重查Mac仍锁定，Chrome验收尚无法开展，继续处理独立编码与接口工作。

法币入口已加入RTD对接验证门槛，远程开关／旧缓存不能启用未验证服务；Ledger不存在实现的创建分支已清理。hook回归与完整钱包类型检查通过，Qredo支持状态审计已在后续批次完成，见[外部入口修复](./workLog/20261004-external-support.md)。

两套文档已按 archive 主方案和固定官方依据整合为13章，14份原文保留，原目录未删除；文档覆盖检查通过。NetworkProfile v2、完整 H0／generation／revision 绑定、四服务入口、共同资产快照、Fullnode 新鲜对象／coin、账户历史窗口、名称、Kiosk／OriginByte、质押、新构建与固定 bytes 模拟／执行／恢复均已有实现。各接口是否完成以 Task 与对应工作日志验收为准，不将“已编码”当作全部运行通过。

NET-06 已核查完成：显式完整内置 profile，无标签推导默认节点／MVR／Faucet，旧单 URL 映射已删除。58项测试与完整钱包类型检查通过，见[配置核查](./workLog/20261004-NET-06-completion.md)。现代 SDK／Kit 与隔离安装已有 NET-09 证据。

最新 NET-12 改动启用新版查询缓存键／buster，旧缓存保留但不读取，链查询及全部 mutation 禁止持久化；交易恢复仍只走专用 journal。4项定向测试、完整钱包类型检查、开发版 Webpack 及新产物四入口静态审计通过，见[缓存迁移](./workLog/20261004-NET-12-query-persistence.md)。该批未重跑生产构建，也未代替 Chrome 重启／切网验收。

共享 core 已修正旧 DTO 的明确 jsonRpc 类型入口、Sentry传输基类及模块解析；完整类型错误由74条降到19条，剩余为旧 Kit 缺失与 Kiosk API差异。钱包完整类型检查通过，仍不能代表整个core或其它应用通过；NET-10／TRY-01仍未完成。见[共享合同修复](./workLog/20261004-core-explicit-contract.md)。

### 独立开发链与查询服务

独立 dev-20261003-01 使用指定 rtd 当前源码 debug 产物；H0 为 `3tEPxLxUysGx4gfr8UEycvH7xohMWuwKVbTX5np4TCYj`。部署／启动／合约脚本位于 link-u-smart-contract。原有其它开发链和数据未重建。运行进程与水位须在每次使用前重验，此处不将历史 PID 当作当前活性证明。

认证发布、KV／Ledger、GraphQL 与 consistent 准入、账户增量索引及 TLS 入口均已接通。最近生成的 profile03 revision2 配置 Fullnode39400、GraphQL39600、Archive39603/archive、账户历史39606/account/graphql。资产共同快照与非空账户历史已由真实钱包 reader 读取；账户完备标记仍有 false，不能称为完整历史。见[四服务配置](./workLog/20261004-four-service-profile.md)、[账户TLS](./workLog/20261004-account-tls-ingress.md)、[账户增量](./workLog/20261004-account-workers.md)。

ENV-04／08分别证明受限浏览器入口合同与当前绑定配置生成，不代表核心试用。真实 Chromium 扩展页面三入口同 H0 读取通过，但使用精确开发证书 SPKI 例外，正常 CA 信任尚未验收。最近原生权限确认受 Mac 锁定阻断；没有获得钱包自定义网络保存／完整账户操作证据。见[入口审计](./workLog/20261004-ENV-04-browser-entry-audit.md)。

### 真实交易与剩余核心工作

实际钱包 coin 准备、固定 bytes 模拟、gRPC 验签与一次 self-transfer 提交成功，测试账户仅转1原子单位；最大 u64 金额的无效转账在模拟阶段拒绝，未签名／提交。签名来自测试 debug CLI，不冒充后台签名或产品 journal 验收。见[交易验证](./workLog/20261004-wallet-coin-execution.md)。

原摘要 `Hb3LJi6m3wV8HYBYgZmitSwmVTMcwaiNaYsKhpuPTvwf` 的只读恢复尚未通过。最后已记录的 Fullnode 可用区间为129944–129968，Archive上界4534，存在历史覆盖缺口；这些是时间点观测，不是当前水位。成功回执已保存，未重建或重复发送。继续补齐原摘要恢复、GraphQL写后读、完整后台签名与 Chrome 核心链路。

随后已将本任务开发链对象历史保留从0调整为2个epoch，核验当前debug源码后保留数据库重启。新进程49633实际gRPC验证原H0不变、高度135647→135666且下界稳定135445；此为时间点就绪证据，不恢复旧裁剪数据。启动未完成时第二次独立交易探测被节点拒绝，原摘要保存且只读查询仍null，无重发；探测器现已强制检查runtime.ready。详见[保留窗口修复](./workLog/20261004-wallet-history-retention.md)。

下一步优先推进所有接口和依赖闭包剩余编码／核查，完成普通账户发送、dApp四项签名功能、持久 pending 跨 worker 恢复与可安装试用包；名称／PersonalKiosk部署与完整环境缺项仍待补齐。核心门槛成立后供主人试用，再继续22项细节回归。**当前不可试用，目标保持进行中。**

RPC-25已完成：移除Qredo旧远程提交入口和审批事件残留，保留账户／远程记录只读并增加明确提示；Ledger与法币支持边界已核验。修改后全量93文件1013测试、完整钱包类型检查、dev构建及四入口静态审计通过。见[支持状态核验](./workLog/20261004-RPC-25-completion.md)。

余额消费者后续修复：资产余额刷新失败不暴露旧data，Coin资金发送全部也必须匹配新鲜总额；64项相关测试、完整钱包类型检查、dev构建和四入口静态审计通过。本批未做新实链／Chrome验收，RPC-04／06仍保留，见[余额日志](./workLog/20261004-balance-consumers.md)。

OriginByte独立配置读取已修复：组合reader和NFT持有Hook不再强制原生OwnerCap配置，90项相关测试、钱包类型／dev构建和四入口静态审计通过。认证入口实测快照25703返回空集合，已知非空夹具证据来自36504，非空验收仍失败；RPC-22保留。见[独立分支日志](./workLog/20261004-originbyte-optional-routing.md)。本轮完整core复查仍19项错误，NET-10未完成。

RPC-16已完成编码与接口核验：新增显式窗口交易／事件GraphQL读取器、Provider能力与共享hooks，31项定向测试、完整钱包类型检查、dev构建和四入口审计通过。TLS实测窗口0–2000的一笔发送记录双向一致，模块事件为空；非空事件与真实多页回归仍待QA。见[交易事件列表日志](./workLog/20261004-RPC-16-indexed-lists.md)。

上述交易／事件列表修改后的全量钱包回归96文件1046项通过，输出20261004-indexed-lists-full-regression.log；不替代真实Chrome／故障验收。

RPC-18接口与页面编码核验完成：修复收据自动轮询只计成功而可在持续错误时无限重复的问题，38项受影响测试、钱包类型检查、dev构建和四入口静态审计通过。活动页窗口／覆盖／sender、收据独立终态／未知／冲突的React渲染已核验。见[页面核验](./workLog/20261004-RPC-18-history-receipt.md)。本轮Mac仍锁定，真实Chrome尚不可执行。

名称确认有效期缺口已修复：Coin／NFT在固定bytes模拟结束后再次检查名称期限，到期要求重新预览。97项定向与修改后全量99文件1057项、钱包类型检查通过。见[名称期限日志](./workLog/20261004-name-expiry.md)。RPC-21仍未勾选，未做名称实链或Chrome验收。

RPC-21接口与消费端编码核验完成：默认名称在初始化或非法期限时撤下，111项定向测试、钱包完整tsc、dev构建及四入口静态审计通过；[完整核查](./workLog/20261004-RPC-21-completion.md)。QA-A15的真实registry／改名续费／Chrome未完成，不改变不可试用状态。

NET-10补充：核实Explorer实际使用过时pnpm core副本，已统一TypeScript／Vite到工作区core；真实resolver验证通过。完整Explorer类型检查仍191项错误、core19项，未宣称构建通过，NET-10保留。见[共享解析核验](./workLog/20261004-NET-10-source-resolution.md)。

NET-10继续修复Explorer：49文件61处纯类型引用按SDK真实exports移到jsonRpc类型出口，49份生成JavaScript完全相同。完整Explorer类型错误191→140；恢复类型也暴露既有赋值问题，构建仍未通过。见[类型出口兼容日志](./workLog/20261004-NET-10-explorer-types.md)。

NET-07修复非法新版网络存储值被当作缺失并回退旧配置的问题；79项相关测试及钱包类型检查通过，损坏记录保留、不探测或写回。真实Chrome权限／重启仍待验，见[配置损坏处理](./workLog/20261004-network-settings-corruption.md)。

RPC-21审计更正：后台TransferObjects名称检查未覆盖OriginByte MoveCall，已重新打开该项，上一份完成日志加注更正。后台名称期限现覆盖账户复核与签名后边界，51项执行相关测试通过；[详情](./workLog/20261004-background-name-expiry.md)。当前计数以重新生成Task为准。

OriginByte名称目标编码已补齐：新建目标核对地址参数，已有目标在后台Fullnode核对Kiosk当前owner／共享版本／BCS；73项定向与钱包tsc通过，RPC-21等待后台集成与真实链验收，保持打开。见[实现日志](./workLog/20261004-originbyte-name-recipient.md)。

最终修改后全量100文件1086项通过，dev Webpack构建和四入口静态审计通过，日志前缀20261004-originbyte-recipient；这些结果不代替尚未执行的后台OriginByte命令集成／Chrome。

RPC-21遗漏闭合：OriginByte两种格式通过真实后台命令+协调器集成，错误owner／读取失败在签名前阻断；35项定向及tsc通过。真实Fullnode目标Kiosk版本11正确owner接纳／错误owner拒绝，dispatch0。接口项恢复完成，QA-A15与试用仍待，见[后台集成日志](./workLog/20261004-originbyte-background-integration.md)。

质押卡片修复safe mode被已知奖励掩盖的问题；真实reader夹具到React卡片的三类仓位回归及相关61项测试、钱包tsc通过。本轮Rust对照仅读取既有向量，未重跑Rust；Chrome复查仍锁定。见[展示修复日志](./workLog/20261004-staking-safe-mode-display.md)。

实链质押／待激活赎回已完成：独立测试账户质押1 RTD成功，非空StakedRtd BCS与owner校验通过；只读原摘要恢复后赎回成功，旧对象消失、余额增加，两个阶段各dispatch1。初次查询失败已保留，不曾重发。完整证据及边界见[实链往返日志](./workLog/20261004-staking-live-roundtrip.md)；GraphQL新仓位组合、跨epoch奖励与Chrome仍未验。

认证GraphQL已在S37228返回OriginByte独立配置的非空Kiosk／NFT，补齐此前受索引落后影响的读取证据。Fullnode181729与consistent水位37542仍差约14.4万；进程实际存活且水位在推进，未重启或改并发。后续须经受控预算迁移改善积压，见[索引核验](./workLog/20261004-index-catchup-assessment.md)。

索引预算工具已支持显式1–4并发及三消费者总额≤4校验，5项测试与现有三份活动override哈希兼容核验通过；尚未应用运行参数或重启，不宣称积压改善。见[预算参数日志](./workLog/20261004-consumer-budget-parameter.md)。

查询消费者已按受控流程调整为writer/indexer/consistent=1/2/1，使用绑定当前源码debug的原启动器恢复，仅替换indexer进程，未重建数据库。恢复后约74秒内22条indexer各推进331、4条consistent各推进166；consistent仍为较慢一侧，积压未解决。最新钱包全量101文件1093测试通过。详见[受控更新日志](./workLog/20261004-index-retune.md)，不改变不可试用与Task计数。

调整后认证GraphQL实测S40106返回已知OriginByte Kiosk与NFT，dispatch0；入口读取恢复核验通过，未代替完整试用验收。

APY展示修复提前舍入导致极小正值变确定零、排序与统计丢精度的问题。列表保留原值，列表／详情／汇总将显示精度下的正小值标记~0%，未知仍--。47项定向、钱包tsc、dev构建与四入口静态审计通过；不冒充修改后全量／Chrome／跨epoch验收，见[APY精度日志](./workLog/20261004-apy-display-precision.md)。

APY消费端继续核查补齐仓位详情和交易回执，仓位详情增加不受奖励已知状态影响的safe mode提示。15项定向测试、钱包tsc、dev构建与最终四入口静态审计通过；本批未重跑全量／实链／Chrome，见[剩余消费端日志](./workLog/20261004-apy-remaining-consumers.md)。

RPC-12接口／算法／消费端完成核验：认证S41616读取epoch0、1、2真实汇率，有效APY样本1；重新核对官方固定源码，95项当前质押相关测试通过。五类APY消费端已迁移，真实安全模式切换／活跃奖励／Chrome未冒充完成。见[RPC-12核验](./workLog/20261004-RPC-12-completion.md)。

NET-10共享Kiosk网络类型修复：按现代SDK公开字符串network类型替换已删除枚举，并拒绝未配置PersonalKiosk包产生的undefined伪类型。2项定向与钱包tsc通过；core完整错误19→17，仍未通过，见[共享网络类型日志](./workLog/20261004-NET-10-kiosk-network.md)。本批未重跑构建。

元数据缓存修复：同缓存键刷新失败后useCoinMetadata不再暴露旧decimals，避免发送表单继续按旧精度解析金额。新增真实Provider／reader夹具集成测试先复现失败，修复后65项定向、钱包tsc、dev构建及四入口审计通过；core仍17项相同错误。见[元数据刷新日志](./workLog/20261004-metadata-stale.md)。

RPC-08完成：认证S43002真实Kiosk的1个动态对象与4个普通字段通过同名称BCS列表／点查一致性校验，81项相关测试通过。双方迁移映射表残留epoch.systemState当前读取建议已按官方源码修正为同S当前0x5组合读。见[动态字段完成日志](./workLog/20261004-RPC-08-completion.md)，Chrome／NFT执行不计入本项。

RPC-09完成核验：真实未解析0x5系统Move调用经Fullnode正式解析gas和共享引用，再固定bytes两次正式模拟，未签名／提交。116项准备与模拟定向测试、四入口静态审计通过；双方映射表修正旧构建器逐项查询与新版模拟解析的混淆。见[构建依赖核验](./workLog/20261004-RPC-09-completion.md)，执行与Chrome仍待。

执行故障联动补齐：实际协调器+SDK gRPC reader覆盖五类提交异常，各自恢复到成功／链失败，共10新场景；网络层每例仅一个ExecuteTransaction，新协调器仅按原摘要恢复，48项相关测试通过。journal／互斥仍为测试实现，不冒充真实worker持久恢复，见[故障联动日志](./workLog/20261004-execution-wire-integration.md)。

NFT详情属性已移除旧fields布局强制假设，兼容现代JSON并保留零／false／大整数串，畸形属性向量展示原结构而不崩溃或错配。18项定向、钱包tsc、dev构建与四入口审计通过；RPC-03／23与Chrome仍待，见[NFT属性日志](./workLog/20261004-nft-attributes.md)。

提交窗口关闭故障组合：原生 Chromium 14 项、执行相关 4 文件 68 项通过；锁释放后接替窗口仍受旧 pending 约束，零再次签名／提交，NotFound 不解锁。共享 core 重验仍 17 条类型错误，Explorer 消费契约待处理；实际扩展与实链验收未通过。见[工作日志](./workLog/20261004-closed-owner-pending.md)。

混合资金发送全部：最终 bytes 新增逐 Coin 的 ID／version／digest 覆盖检查，防止自动 gas 选择上限使部分发送被误认为全部。全量 113 文件 1236 项、钱包类型检查、开发版构建与新产物四入口审计通过，见[日志](./workLog/20261004-pay-all-coverage.md)。实链混合资金与完整 TX-01 仍待，不改变 Task 计数。

共享 core 构建阻断已整改：Explorer 客户端显式注入，钱包保持独立领域 Provider。钱包／共享 core 类型检查、开发版 Webpack、114 文件 1238 项及新四入口审计通过，TRY-01 完成；Explorer 本身仍 111 条诊断，NET-10 与真实试用未完成。此前“core仍17条”是历史状态，由本批结果覆盖。见[工作日志](./workLog/20261004-core-injection.md)。

实际无界面 Chromium 扩展已验证私钥 UI 导入、密码设置、后台锁定／错误密码拒绝／正确密码解锁、完整浏览器重启后的账户保留和重新解锁；过程中修复账户表单 Zod 4 根导入与 core Zod 3 resolver 不匹配的未处理校验异常；最终从 core 统一导出 schema 构造器，钱包与 core 类型检查也通过。全量 115 文件 1239 项、开发版构建与四入口审计通过，见[日志](./workLog/20261004-extension-account-lifecycle.md)。未配置链、未签名或提交交易，不勾选 TRY-02／QA-A01。

当前 dist 已编译 profile03 revision2 到 Local 环境；不再是默认空注册表产物。实际扩展 UI 切换后读取 S62524 的0余额，账户地址一致，随后重启锁定／解锁通过。指定源码 debug 哈希已重新验证，读服务另读 S62270。使用 dev SPKI 例外，未验正常 CA／自定义权限、未发送交易，见[工作日志](./workLog/20261004-trial-profile-ui-assets.md)。

RPC-06完成：余额接口／发送前资金／active-coins、tokens、staking代码合同核验及7文件65项通过。实际扩展有资产账户在S62929读取149998999543361456原子单位并显示149.99 M，未提交交易。仍未验混合／非原生发送、正常CA权限及完整多币故障矩阵。见[完成核验](./workLog/20261004-RPC-06-completion.md)。

真实 dApp 连接授权与 PersonalMessage 已验证：公开测试账户经批准后验签通过，拒绝不返回签名，伪造账户被后台权限拒绝，断开连接成功，dispatch=0。修复 demo 双 React 白屏和账户能力声明缺失，全量116文件1246项／钱包tsc／开发构建／四入口审计通过。新dist仍编译Local profile，精确SPKI例外；交易sign-only／execute、正常CA与完整TRY-03仍待，见[工作日志](./workLog/20261004-dapp-live-personal-message.md)。

真实交易只签名已通过：批准页摘要与返回bytes一致，验签成功，5次模拟／0次执行。修复WorkerGlobalScope fetch接收对象及Chrome JSON消息丢失Uint8Array问题；最终117文件1253项、钱包tsc、开发构建与四入口审计通过。公开测试账户只领币一次，旧pending未触碰；TRY-03仍缺execute与完整授权矩阵，见[日志](./workLog/20261004-dapp-sign-only.md)。当前dist更新为该批，仍保留编译Local和精确SPKI测试边界。

TRY-03已完成：真实扩展四条dApp核心链路通过，执行5yEbxH4Ex5GUhQ1LwEWPrvQqcwppJGByLHiiuQUcBL4j，仅dispatch1，签名和effects校验通过；整个浏览器重启后同一confirmed-success journal保留。执行profile与尝试记录永久保留，不得删除重跑。代码产物同上轮，1253项及构建审计证据沿用；TRY-04故障注入恢复、完整授权及正常CA／权限仍待，见[完成核验](./workLog/20261004-TRY-03-completion.md)。

TRY-04已完成：同一保留profile中一次实链提交，节点响应被受控扣留至原生超时，pending跨批准popup关闭和整个浏览器／worker重启，原摘要4EqnBaAX7Bnb3j1iqnPsaw5efscHEwd2UUCr2ZrSicLN恢复成功，checkpoint255912；总dispatch1，另次锁定账户只读复核0模拟／0提交。不是全部故障矩阵／自然故障或正常CA验收，详见[完成日志](./workLog/20261004-TRY-04-completion.md)。

RPC-15完成：全部编码入口正式模拟／gas／共享预览合同核验通过，11文件185项及当前四入口审计通过，实际扩展证据参照TRY-03／04；见[完成日志](./workLog/20261004-RPC-15-completion.md)。审计另发现PersonalMessage可选chain尚未传入后台，已列TX-09具体后续，不将该项提前勾选。

PersonalMessage可选chain缺口已修复：页面到后台批准及签名前后复核完整贯穿，实际扩展错链零弹窗、正常消息验签通过；最终117文件1266测试、钱包tsc、dev构建与四入口审计通过。零模拟／执行，未触碰保留执行profile，TX-09／10仍待完整审计，计数不变，见[修复核验](./workLog/20261004-TX-09-followup.md)。

自定义Wallet Standard链发现修复：当前自定义链加入wallet.chains，事件携带chains／accounts，切网移除旧标签；69项及钱包tsc通过，真实自定义权限仍待。另定位可选AbortSignal未贯穿后台的缺口，下一步补请求绑定取消，TX-09／10不勾选。见[日志](./workLog/20261004-wallet-chains.md)。

现代交易AbortSignal已贯穿页面→原连接请求ID→后台批准signal，权限等待前登记、取消关闭批准窗口，保留持久journal；全量120文件1280项及后加公开接口8项／钱包tsc通过，真实主动取消与dispatch后恢复尚待。见[取消通路日志](./workLog/20261004-dapp-abort.md)，TX-09／10保持未完成。

真实扩展主动取消六例通过：sign-only／execute的预取消、等待序列化与批准窗口打开后取消，无交易签名结果，批准记录清空，模拟0／执行0。源码与debug哈希重验一致，原执行profile未改。提交后矩阵仍待，任务计数不变；见[实测日志](./workLog/20261004-dapp-abort-live.md)。

取消联动73项及钱包tsc通过；实际提交后取消观察断言失败（不计通过），原摘要tzHhXCPSvrJ95g4u6mWqtdU2cmZm6tULha6Vrq812KT已在锁定状态只读恢复成功，cp267087，恢复0模拟／0提交。保留第三条journal与一次性marker，禁止重发；继续定位失败。见[证据和边界](./workLog/20261004-dapp-abort-coordinator.md)。

取消失败根因已证实为保留档案旧worker：CDP源码cfd3…与当前磁盘7ff6…不一致，旧代码无取消处理。重载并重新启动后实际源码一致，当前后台锁定只读恢复原第三条成功交易，0模拟／0提交。新档案两种方法模拟中主动取消通过；新版提交后场景仍待。详见[定位证据](./workLog/20261004-worker-cache-cancellation.md)。

新版后台提交后主动取消通过：CDP源码一致、独立新请求CDaQEspaBbXHQxDiG9R6GzYmfX6eAB4yYa7X1CubRvHC只dispatch1；非timeout取消关闭批准窗口，pending跨重启后锁定恢复成功cp270250。四条journal保留，旧失败未覆盖。5文件33项通过；发现现代交易入口仍有缺省account回退，下一步移除再继续TX-09审计，计数不变。见[通过证据](./workLog/20261004-dapp-abort-verified.md)。

现代方法显式账户修复完成：移除交易默认首账户回退，三个入口缺账户均真实扩展零弹窗；正常消息与只签名验签通过，5模拟／0提交。121文件1289项、tsc、构建与静态审计通过。下一步修正交易缺省chain兼容，TX-09仍开，见[日志](./workLog/20261004-explicit-account.md)。

TX-09现代合同完成：交易显式chain页面与后台双重拒绝缺失，PersonalMessage可选chain保持；当前121文件1293项、tsc、构建、四入口审计及实际扩展输入／消息／只签名验证通过，5模拟0提交。逐项核验含此前实际执行／主动取消恢复，TX-10与QA仍开，进度40/98。见[完成核验](./workLog/20261004-TX-09-completion.md)。

TX-10授权账户快照修复：注册静默恢复已有权限，版本保护迟到查询，disconnect等待后台持久撤权确认。1297项全量＋后加确认用例、tsc／构建／审计通过；真实dApp重载恢复无弹窗，撤权持久记录删除后重载为空，零模拟／提交。TX-10仍待全部矩阵，计数40/98不变，见[日志](./workLog/20261004-wallet-authorization-state.md)。

TX-10跨tab／origin六项真实扩展验证通过：同源恢复、不同来源伪造origin拒绝读／签名／撤权、兄弟port不能取消原ID、只取消自己的批准、导航断连清理。4模拟／0提交，未改业务代码或保留journal；切网／切账户／frame矩阵继续，见[日志](./workLog/20261004-dapp-origin-tabs.md)。


批准前切网缺口已修复：三个现代入口真实扩展切网关闭批准、清理请求、拒绝结果，账户chains与事件同步；0模拟0提交。全量1300项、tsc、构建与审计通过，失败记录保留。提交后切网／切账户／frame仍待，40/98不变，见[日志](./workLog/20261004-network-approval.md)。


iframe直接消息边界实测通过；修复null／畸形页面消息中断钱包通信。新产物真实扩展正常签名／撤权／重启通过，0模拟0提交；全量1302项、tsc、构建、审计通过。同源JavaScript非独立来源边界，TX-10仍待切账户／提交后切网，40/98不变。见[日志](./workLog/20261004-window-message-frames.md)。


切账户批准生命周期已补齐：真实三个入口切账户取消，新账户不能沿用旧账户权限；批准前正常解锁事件保留请求。最终1305项、tsc、构建与审计通过，首次全量失败保留并修正测试订阅时序。TX-10仍待提交后切换及完整锁定解锁矩阵，40/98不变，见[日志](./workLog/20261004-account-approval.md)。


三个dApp入口真实批准页密码解锁通过，原请求保留；消息签名验签、交易入口取消清理与后续重启通过，0模拟0提交。仅测试脚本变更，沿用上一批1305项／tsc／构建证据。提交后切换及签名执行期间锁定仍待，40/98不变，见[日志](./workLog/20261004-dapp-locked-approval.md)。


真实模拟等待期间锁定测试通过：sign-only／execute均取消传输，StaleWalletSessionError而非超时；解锁后原调用方取消清理正常。6模拟0提交，测试脚本变更，未重跑构建。提交后切换与签名执行阶段锁定仍待，40/98不变，见[日志](./workLog/20261004-dapp-lock-simulation.md)。


RPC-11补充仓位跨页完整性验证，61项通过，官方治理算法重新复核；实际S77495汇率/APY只读读取成功、0提交。非空活跃仓位与生产规模历史仍待，40/98不变，见[日志](./workLog/20261004-staking-portfolio-audit.md)。


RPC-13真实扩展质押页未通过：外壳／选择验证者标题出现，但列表持续为空，无pageerror。独立同账户只读S77876返回0仓位1验证者，说明接口证据不能替代页面验收。正在验证重复组合查询与20秒快照刷新交互假设，未改业务代码，40/98不变，见[定位日志](./workLog/20261004-staking-page-investigation.md)。


质押列表与金额表单阻断已修复：复用父快照避免重复系统查询；同会话合并只读恢复以避免StrictMode自竞争。真实列表→选择→0／1金额校验通过，0模拟0提交；最终1310项、tsc、构建、审计通过。此前失败作为历史保留，活跃仓位／批准执行／赎回页面仍待，见[修复日志](./workLog/20261004-staking-page-fixed.md)。


实际Chrome质押1 RTD确认页通过，正确验证者／原子金额／gas／摘要，两次模拟零提交，返回表单与后续重启通过。首轮导入超时保留，成功重试单独记录；业务产物未改。批准执行及非空仓位仍待，见[日志](./workLog/20261004-staking-preview-live.md)。


实际钱包1 RTD质押已批准成功，4模拟1提交，预览摘要／effects一致、同摘要收据跳转及整浏览器重启journal验证通过。固定档案保留，禁止重跑执行模式。非空活跃仓位／奖励／赎回页面仍待，40/98和trial_ready=false不变，见[质押执行证据](./workLog/20261004-staking-ui-execution.md)。


追加收据冷打开检查发现账户未加载即跳转，现已修复。5项定向测试、完整wallet tsc、开发构建和静态审计通过；保留质押档案实际冷打开原摘要，确认成功和资产同步中同时可见，0模拟0提交。最终UI为9ce2d0402e1450a24fd9c593482771ff1238416f56dfea7db474914806bdc4f1；本轮未重跑全量1310项，TX-08仍待索引追上与全入口，见[最终证据](./workLog/20261004-staking-ui-execution.md)。


币发送页同会话重复只读恢复争锁已修复，跨会话旧结果隔离保持。真实1原子单位自转准备、最终按钮可用和返回表单通过，4模拟0提交；2项定向测试、完整wallet tsc、构建和静态审计通过。最终UI为9601f6ee38696c6527d162932030d5777cfc4607e85299e1037aaf5eaa28aa62，后台哈希不变。TRY-02仍待执行与链失败，40/98不变，见[日志](./workLog/20261004-coin-preview-recovery.md)。


保留账户实际发送进一步发现后台唤醒与UI恢复仍会争锁，现已在background按绑定／账户合并进行中只读恢复，并逐调用方复核授权。38项相关测试、tsc、构建／审计及真实1原子单位自转通过：AaAKoHj3DgqcwWBvTpPJLjaCwAd2zgoszj1Bu7MKrnSr，4模拟1提交，整浏览器重启后两笔journal成功。后台最终哈希3a85161e43e83c72be22dc6808dd20feea7b021ad3605c65bf31d7e45263eb10，UI仍9601f6ee38696c6527d162932030d5777cfc4607e85299e1037aaf5eaa28aa62；禁止重复执行保留coin脚本。TRY-02仍待普通创建和真实链失败，40/98不变，见[日志](./workLog/20261004-background-recovery-coalescing.md)。


普通新建助记词账户实际UI流程通过：备份显隐／确认门槛、SDK派生地址一致、密码锁定解锁与整浏览器重启保留。钱包同链空资产S84589读取成功，0模拟0提交，未持久化随机测试助记词；仅测试工具变化，业务产物哈希不变。新账户注资发送及真实链失败仍待，40/98不变，见[日志](./workLog/20261004-new-mnemonic-lifecycle.md)。


发布门禁连接复用已部署，32项主机／24项镜像测试与真实准入通过，请求中位下降约26.3%；实际资产共同快照87061读取成功。索引消费仍慢于链写入，积压未消除，额外探测503保留失败证据；40/98和trial_ready=false不变，见[连接复用日志](./workLog/20261004-guard-transport-reuse.md)。


账本普通维护固定前缀一致但未提速；同快照四种物理计划各7轮实测，覆盖索引诊断中位59.863ms、默认75.713ms。未强制生产查询计划，继续定位请求开销，40/98不变，见[查询计划证据](./workLog/20261004-guard-query-physical-plan.md)。


TX-05逐项审计完成：唯一底层提交路径及无自动重发链路核验，101项相关测试通过，当前实际扩展只读核查四笔保留交易终态，0模拟0提交。总体41/98，trial_ready=false；链失败与完整授权故障仍独立待验，见[完成日志](./workLog/20261004-TX-05-completion.md)。


RPC-03真实多页补齐：ownedObjects支持受限1–50页大小、默认50，同快照89079的13对象跨5页与默认集合完全一致。66项相关测试、wallet tsc、开发构建及四入口审计通过。UI更新为8e70974e8ed092f6cc97117107e30e14608a1d3eb773f8187d70beef47a696d2，后台哈希不变；普通NFT display和Chrome仍待，41/98不变，见[分页日志](./workLog/20261004-owned-pagination.md)。


NET-07旧customRPC空地址导致表单隐藏已修复，36项测试、tsc、开发构建与四入口审计通过；真实Chrome旧存储修复表单及整浏览器重启保留通过，0模拟0提交。新UI为71f5931fd7daa80c7c92ff8683fea773481410151e14f7b8286345bb1498a49d，后台不变。原生权限未获验收，完整保存仍待；41/98不变，见[修复日志](./workLog/20261004-legacy-network-repair.md)。


NET-10保护性整改：Explorer六处既有JSON-RPC消费者改显式SDK入口与网络标签，完整类型诊断111→101且无新增，7项客户端／共享注入测试通过。共享core及wallet tsc通过，钱包产物旧请求隔离仍通过；Explorer完整构建尚未通过，41/98不变，见[消费边界日志](./workLog/20261004-consumer-explicit-sdk.md)。


开发链专用发布覆盖索引已在线建立，固定前缀相等，默认查询计划块数10670→1028、中位44.365→32.508ms；实际门禁12/12与准入通过。当前活进程身份核验，indexer约5–6 cps、consistent／KV约2.4–2.7 cps，整体尚未追平；41/98不变，见[前缀索引日志](./workLog/20261004-prefix-index.md)。


现有真实InsufficientGas交易20776经Fullnode裁剪证明后归档读取成功，V2 effects核验失败与同digest，Chrome真实失败收据及原因展示通过，0模拟0提交且未改journal。定位并分别配置GraphQL／archive精确SPKI测试例外；正常CA／新批准失败提交与失败journal恢复仍待。47项相关测试通过，41/98不变，见[真实失败回执日志](./workLog/20261004-failed-receipt-live.md)。


### 2026-10-04：回执持久化中止补验

原生 Chromium 存储 harness 16 项通过，新增成功／失败回执在 put 与 delete 请求成功后异步 abort 的原子回滚、pending 阻挡新提交及只查原摘要恢复。未改业务代码与构建产物，无实链提交；TX-06／TX-12 仍未完成。证据：[终态事务异步中止验证](./workLog/20261004-receipt-atomic-abort.md)。总体仍 41/98，trial_ready=false。


### 2026-10-04：拥有对象与空 Kiosk Chrome 补验

实际 S96880 下 10 个非视觉对象完整类型、对象链接、Kiosk 卡片及空详情通过，0 模拟／0 提交；导入、锁定、解锁及浏览器重启通过。2 文件共 24 项相关测试通过。直接 NFT／隐藏资产／非空 Kiosk／转出仍待，41/98 不变。证据：[实际资产页面核验](./workLog/20261004-owned-assets-chrome.md)。


### 2026-10-04：缓存恢复过滤修复及新构建

同版本缓存可绕过保存过滤的问题已复现并修复，恢复前排除链查询、隐私查询、非成功查询和全部 mutation。实际库 7 项测试、钱包类型检查、Webpack 和四入口审计通过；新构建 Chrome 实际快照 [97725] 下资产／空 Kiosk 及密码／整浏览器重启通过，0 模拟／0 提交。UI 当前 9b991fd71c62d68f3e4beec763be4262211a090d2382fc3b46c03f0cc8c8984f，background 当前 d11c911981cc817408cea3374cf534728429b801dd46c3ef86d6eca0f092acc0。NET-12 完整切网／账户矩阵仍待，41/98 保持。证据：[缓存恢复修复](./workLog/20261004-cache-restore.md)。


### 2026-10-04：NET-12 完成

查询作用域、持久版本升级、取消／迟到隔离和网络重置已逐项核验。5 文件 33 项回归及类型检查通过；真实 Chrome 第二账户空集合→原账户 13 对象、未配置 devNet→Local 重新请求通过（S99351／S99404／S99414），0 模拟／0 提交，密码和整浏览器重启通过。NET-12 标记完成，总体 42/98；试用门槛仍未达到。两次因测试第二账户未解锁导致的路由断言失败保留。证据：[查询会话切换验收](./workLog/20261004-query-session-switch.md)。


### 2026-10-04：读取错误九入口补齐与全量回归

九个新接口读取页面／组件改用公开错误分类，NFT 卡片错误时撤下额外名称展示。当前钱包全量 127 文件 1351 项通过，类型检查、Webpack、四入口审计通过。实际 Chrome NFT 列表 GraphQL 错误注入后显示公开提示，撤销后 S100566 完整恢复 13 对象；密码和整浏览器重启通过，0 模拟／0 提交。只证明本次实际注入范围，NET-11 保持未完成，42/98 不变。UI 当前 1206db6d3bc6cba25418de38c5d2e476e6f4a41e20aa397086ddfe168b63cacf，background 当前 d11c911981cc817408cea3374cf534728429b801dd46c3ef86d6eca0f092acc0。证据：[九入口错误展示](./workLog/20261004-read-error-surfaces.md)。


### 2026-10-04：guard容量与消费者启动绑定诊断

额外1／2并发共48次guard读取全部成功，内容SHA相同，准入验证通过；当前debug来源与三消费者身份匹配。最终最低水位indexer162777、consistent101651、KV101658，未覆盖PersonalKiosk203097。已确认旧adapter配置摘要仍残留query／KV启动binding，下一步需受控同步后再扩容，未重启或改数据；42/98不变。证据：[容量及启动绑定诊断](./workLog/20261004-guard-capacity.md)。


### 2026-10-04：启动绑定滞后已修复

query／KV启动适配器摘要及KV manifest已依据保留的visibility-only升级证据受控同步，四进程身份与PID不变。4项守卫测试、当前debug来源、完整原启动绑定及不可变文件检查通过。未重启、未改并发／数据，尚未追平，42/98不变。证据：[启动绑定同步](./workLog/20261004-adapter-binding-reconcile.md)。


### 2026-10-04：RPC-26 编码闭环完成

21 个旧方法逐项落点与18个未用接口范围核验，四入口AST／依赖模块清单及4项工具测试通过，12文件353项领域测试通过；原Provider审计与实际SDK依赖核验通过。RPC-26勾选，总体43/98；不代表动态全流量、NFT/Kiosk实链或当前环境恢复已验收。证据：[RPC-26完成核验](./20261004-RPC-26-completion.md)。


### 2026-10-04：NET-03身份隔离完成

6文件80项测试及本机三入口两轮6次真实身份读取通过，dispatch=0。客户端／探针隔离及每次重验合同核对，NET-03勾选，总体44/98。实际资产仍处于消费者重启恢复窗口，身份通过不代表可试用。证据：[NET-03核验](./20261004-NET-03-completion.md)。


### 2026-10-04：NET-05绑定与取消合同完成

核对完整读取binding、独立session及执行scope，结合已通过的NET-12切换矩阵和原生换URL／别名仍阻挡pending证据，NET-05勾选。复用证据未标为本轮重跑，总体45/98；真实提交期间完整切换授权另验。证据：[NET-05核验](./20261004-NET-05-completion.md)。


### 2026-10-04：六名额升级，资产恢复待验

原启动器成功恢复2／2／2消费者，适配器6名额；6项守卫测试及guard12／12与准入通过。KV bitmap桶起点重放中，GraphQL共同上界104095暂低于consistent下界104096，实际资产probe失败已保留。未清数据／改水位，不能标记恢复通过或可试用。证据：[容量升级与恢复窗口](./20261004-capacity-upgrade.md)。


### 2026-10-04：TX-11统一恢复协调完成

四入口及后台9文件116项通过；同一保留Chrome profile重新启动后，当前worker与磁盘一致、两条原币／质押终态journal保留，0模拟／0提交。首次热重载ERR_BLOCKED_BY_CLIENT日志保留；未重新批准。TX-11勾选，总体46/98，环境资产恢复仍待。证据：[统一恢复核验](./20261004-TX-11-completion.md)。


### 2026-10-04：容量升级后资产恢复通过

第12次实际钱包reader在S104195恢复13对象读取，随后Chrome S104409对象／空Kiosk与锁定／整浏览器重启通过，0模拟／0提交。indexer／consistent／KV的22／4／14管线最低174807／111246／104334，当前来源和绑定均匹配。约26分钟恢复空窗及失败日志保留；不是追平或可试用，总体46/98。证据：[升级最终验证](./20261004-capacity-upgrade.md)。


### 2026-10-04：准备阶段跨窗口pending缺口修复

Provider两分支和dApp准备加入同执行scope锁及持久journal前后检查；存储错误、已有记录与取消均拒绝构建，后台原锁内最终模拟不重复加锁。70项定向、原生18场景、全量128文件1358项、tsc、Webpack与四入口审计通过。新构建Chrome S106970正常1原子单位自转预览通过，4模拟／0批准／0提交，密码与整浏览器重启通过。UI当前fba6cbb31821a204d2b34362f7dd844d39102d4813219cf73be1b9ee6e29c04c，background当前5498869640f084dfda4cc0773995bdb58c9eb9a821206d67c88fcfa827a36c05。TX-04保持未完成，总体46/98。证据：[准备守卫修复](./20261004-preparation-guard.md)。


### 2026-10-04：当前非空OriginByte NFT查询与构造

认证快照109089重新读到早期非空Kiosk；109433同快照两件NFT的列表／详情与Fullnode版本、摘要、类型、父对象、BCS一致，实际生产P2P构造和错误发送者拒绝通过。首次超时保留；两件Display为null，分类函数的隐藏分组不等于UI隐藏操作。0模拟／0签名／0提交，RPC-03／22／23仍未完成，总体46/98。最终脚本在S109849复核两件NFT，已有目标与无目标创建两条生产指令分支均通过，131次只读请求。证据：[当前NFT核验](./20261004-originbyte-nft-current.md)。


### 2026-10-04：NET-10 Kiosk消费与Display兼容整改

core旧Kiosk hook明确转换Explorer展示DTO，缺失/错对象拒绝，禁用OriginByte参数生效；四种藏品展示与详情按字符串消费Display，视频类型优先级修正，Kiosk读取失败不自动切走。18项定向、core/wallet完整tsc通过；Explorer诊断101→79且无新增，完整检查仍失败。现有钱包产物隔离审计通过，本轮未新构建或浏览器验收。NET-10仍开放，总体46/98。见[兼容整改](./20261004-kiosk-consumer-compatibility.md)。


### 2026-10-04：特色NFT配置准入与当前worker恢复

buynlarge远程JSON新增逐项schema与实际Move对象类型校验，异常配置不再破坏普通NFT分类，原类型拼写及seen偏好保留。28项相关测试、完整钱包tsc、开发Webpack和四入口审计通过。当前UI为6aba589a4317ac759c9b1ce839f525fda0c4f87ebc330f8ab9f6047da8a30251，background仍5498869640f084dfda4cc0773995bdb58c9eb9a821206d67c88fcfa827a36c05。同一保留profile冷启动复核原币／质押两条成功journal通过，0模拟／0提交；初次热重载拦截日志保留。RPC-23仍开放，总体46/98。新UI实际Chrome S114197拥有对象／非视觉／空Kiosk、密码及整浏览器重启通过，0模拟／0提交；不是直接NFT完整验收。见[配置与恢复日志](./20261004-featured-nft-config.md)。


### 2026-10-04：内部批准页固定字节有效期

币／NFT／质押赎回共用固定BCS有效期展示与按钮／执行处理守卫；坏BCS或当前不支持的时间戳约束禁止批准。币页坏BCS不再直接渲染崩溃。三入口精确大epoch及拒绝路径共36项相关测试、完整tsc、Webpack和四入口审计通过。两套执行合同已同步，TX-01仍未完成。当前UI9dc73b3cb54c97a5b7d74eb3b382c8f5317d249139c3936f5bcbdf0d38e68f11，后台保持5498869640f084dfda4cc0773995bdb58c9eb9a821206d67c88fcfa827a36c05。新UI Chrome S116171币预览有效期实际可见、批准按钮可用、返回及整浏览器重启通过，2模拟／0批准／0提交。总体46/98，见[内部有效期日志](./20261004-internal-validity.md)。


### 2026-10-04：真实失败恢复夹具已发布

当前RTD源码／debug摘要复核通过；合约仓库新增execution_gate及准备／一次发布／受控关闭脚本。3项Move和5项准备测试通过，独立账户成功发布digest5s7B3kFCocq1KiTatNY3bD45Mx6N24fxWPboaGMt8bEf，checkpoint380086；钱包只读恢复、ABI及Gate／AdminCap BCS核验通过，Gate仍开启、visits=0。发布仅1次，尚未关闭Gate或执行钱包失败竞态，TX-06／RPC-14仍开放，总体46/98。见[失败夹具日志](./20261004-failure-fixture.md)。

## 2026-10-04 20:12 · 新钱包真实失败终态

[TX-06完成](./20261004-TX-06-completion.md)：钱包d4kE2koaXQ829UWnhXd8exWawWa37zEuzCfA7WLdkRC一次派发，在cp390790以MoveAbort EClosed=1失败；现代dApp FailedTransaction与固定bytes一致。原profile共4 success＋1 failure，整个浏览器重启后锁定恢复、再次只读0模拟0提交通过；Gate closed=true／visits=0。管理关闭交易独立一次、cp390789。

[准备自竞争修复](./20261004-dapp-preview-session.md)：dApp按后台请求隔离并合并进行中的准备，逐观察者取消保持；43项＋78项测试、wallet tsc、Webpack与静态审计通过。最新UI a3451338bd8c51188ea239657de2d31bf93b2ff47571a97a0088e50e26a4c13d，background e355c0d81dbf3dc4e2eef83bac004ec6a549dc891124227c5826ab5f78799c5b。

总体47/98，trial_ready=false。保留dApp新增marker fault-execution-failure-01.json，仅运行test-dapp-failed-execution.cjs --recover-only；旧timeout runner仅认识4条journal，不能作为新5条记录的完整审计。failure-fixture-close-01和原publication目录不可重跑。未决旧deployer摘要及其它RPC／TRY范围继续保持原限制。

## 2026-10-04 · RPC-14接口闭环

[交易执行接口与标准结果映射完成](./workLog/20261004-RPC-14-completion.md)：124项测试通过；原失败摘要真实Ledger详情恢复、签名验证及输出逐字段相等，实际Chrome收据包含失败原因与0.000045744 RTD费用。所有新增验证0模拟0执行，5条journal保留。首次后台解锁沿用UI旧账户缓存的测试竞态已在新UI document只读复核，原失败日志保留。业务构建未变化；总体48/98，trial_ready=false。

## 2026-10-04 · 混合原生资金预览

[混合资金实证](./workLog/20261004-mixed-native-funding.md)：seed 6TAz5CW2KUTDHVZjDfT2L2U4BXtEL6zh4WqA39vtAcdf一次派发成功cp395329；立即余额断言失败后未重发，原摘要恢复及新鲜Coin／地址各1 RTD核验通过。受控target 0x1cedd5e3a0e54992fcf62656b0ec9b69aa0a93aca99e2d404a1fc77bac23b126该预览阶段保留2 RTD，后续发送结果见最新记录。runtime/mixed-native-funding-01已有pending及receipt不可重跑；probe-input.json来自intent＋原pending，不是新的执行。

生产准备器定额1.5 RTD／发送全部6次模拟0执行，真实Chrome 1.5 RTD批准预览2模拟0批准0执行；S130882资产快照仍早于入账，不能宣称资产追平。RPC-04／TRY保持打开，整体48/98；业务构建摘要未变化。后续混合／非原生执行需继续保留一次性attempt和原摘要恢复。


## 2026-10-04 · 混合原生实际发送

[实际钱包发送及只读恢复](./workLog/20261004-mixed-native-execution.md)：当前debug源码及二进制复核后，以Coin和地址各1 RTD发送1.5 RTD到外部受控地址。单次派发digest HR27Xmrhd2KPsN4YDCbJzsBYkmcpnnf3NN1m2kW5rEUd成功cp398996；净gas1009880，剩余地址余额498990120。固定bytes、effects、双方balanceChanges和锁定重启journal核验通过。原执行脚本最后报告序列化BigInt失败，保留日志；之后独立只读恢复exit0、0模拟0派发，没有重发。

runtime/mixed-execution-browser-01已有attempt、approved及成功恢复记录，仅允许原摘要恢复。旧混合准备的2 RTD前提已经失效，不得重跑seed或使用旧余额。非原生资金、发送全部实际UI、新建助记词账户注资和索引追平仍待。RPC-04及TRY-02保持打开，总体48/98，trial_ready=false。


## 2026-10-04 · 非原生准备与地址gas修复

[地址gas模拟问题及非原生实证](./workLog/20261004-address-gas-simulation.md)：指定合约仓库通过当前debug CLI部署WMIG测试币并一次种子入账，目标有Coin和地址各1000000。真实准备暴露旧统一doGasSelection=false会对空payment地址gas注入mock Coin，effects摘要改变；对照Sui／本地RTD源码后，将该资金形态改为true并保留严格原bytes／effects匹配，任何真实重选仍拒绝。83项回归、wallet tsc和开发构建通过；非原生0.5／1.5／2枚共9次生产准备及复核模拟通过，0签名0提交。

双方SDK、交易执行、接口矩阵已同步修正。保留coin-fixture-publication-01与token-mixed-funding-01，不得重跑；目标WMIG仍2000000。非原生实际批准、广播及metadata索引追平尚未验收，48/98、trial_ready=false保持。

新UI为b02611b529744eec74b283463863f0e6d5846b720302fa4a85a7999ffc7ec502，background为67ed736276452d8835d7c19d28ff29c4928bd49b9a6d55b784005cdb530a50cd。Provider／四入口审计通过；旧混合原生保留配置首次热重载被Chrome阻止，完整关闭后同目录冷启动只读恢复通过，0模拟0执行，原journal和余额保持；未重置配置或重发交易。

# 钱包 JSON-RPC 全量迁移 Task

创建日期：2026-10-03（北京时间）。每项只有源码／文档及规定验证证据全部成立才勾选；实施中的工作写 workLog，未通过不计完成。完整目标不缩小为局部切片。01–08 是钱包主体，09–13 的通用规范和有用 Mobile 参考已纳入，Mobile 编码不在本任务范围。

顺序：DOC → NET → RPC 与 TX（按依赖逐项）→ ENV／TRY 核心验证 → 主人试用期间 QA 全矩阵 → REL 发布审计。ENV 传输准备可提前，但不会阻断不依赖环境的全部接口编码；生产 HA 不阻断本地试用。每次变更后运行 scripts/update-migration-progress.py 更新 totalProgress.md。

## DOC · 方案与基准

依据：01–13；相关完整合同必须随本项实现。

- [x] `DOC-01` 读取两套全部章节，冻结原文、来源、哈希与原目录保留。
- [x] `DOC-02` 查询官方文档和固定提交源码，逐项裁决 C01–C12 并对齐正文。
- [x] `DOC-03` 完整合并重排 01–13、修复链接并核验正文／证据完整性。
- [x] `DOC-04` 当前源码 AST、依赖版本、分支提交与可恢复基准归档。
- [x] `DOC-05` 建立全部文档任务追溯、workLog 与自动计算总进度。
- [x] `DOC-06` 全量构建／类型检查记录基线，区分定向测试与真实验收。

## NET · 网络与数据层基础

依据：03、04、06、08、10、12；相关完整合同必须随本项实现。

- [x] `NET-01` NetworkProfile v2：三入口、完整 H0、generation、revision、同链 package／registry。
- [x] `NET-02` 生产 HTTPS／本地例外／凭据和 fragment 拒绝、URL规范化与显式配置状态。
- [x] `NET-03` 新客户端构造及未验证隔离、三入口 raw 身份握手与每次重验。[源码合同、80项测试及本机三入口两轮6次真实身份读取](./workLog/20261004-NET-03-completion.md)通过；不代表能力／资产快照／Chrome原生权限就绪。
- [x] `NET-04` 能力／SDL／覆盖／package 探测，ready/degraded/mismatch/reset 不混淆。 [NET-04 current contract](./workLog/20261006-NET-04-completion.md).
- [x] `NET-05` 按完整绑定缓存、执行锁键不含 URL／别名，迟到响应拒绝与取消。[逐项合同及已验证缓存／原生持久互斥证据](./workLog/20261004-NET-05-completion.md)核对完成；真实提交期间完整切换授权仍归TX-07／10。
- [x] `NET-06` 受控内置 profile、默认未配置、不使用 Sui 公网节点／MVR／faucet。[合同核查、58项测试及完整钱包类型检查](./workLog/20261004-NET-06-completion.md)。自定义权限、其它应用与动态抓包另归 NET-07／10、TRY／REL。
- [x] `NET-07` 自定义网络设置与 storage 版本迁移，旧单 URL 不猜测新端点。[旧空地址无法编辑已修复，36项测试及真实Chrome旧配置／重启保留通过](./workLog/20261004-legacy-network-repair.md)；[当前C13可见Chrome真实本机服务授权、三角色H0预检、四URL版本保存切换／重复版本拒绝／完整browser重启保留通过](./workLog/20261005-NET-07-four-service.md)。required API撤权拒绝明确单列，实际站点撤权／normal CA／最终授权仍归ENV-07／TX-10。
- [x] `NET-08` 自有 WalletRpcProvider、共享 core 领域接口注入、移除插件旧 Kit。证据：[Provider与四入口打包审计](./workLog/20261003-NET-08-provider-audit.md)。清洁安装／其他应用／动态网络另归NET-09／10与REL。
- [x] `NET-09` 依赖清单／lockfile／module resolution／Webpack／modern demo Kit 升级。[隔离安装与构建](./workLog/20261004-NET-09-sdk-lock.md)、[现代 Kit 接入和验证](./workLog/20261004-NET-09-modern-demo.md)。其他应用／真实扩展链路另归 NET-10／TRY。
- [x] `NET-10` 完整 import/export 消费者影响核对，保护无关消费者构建。[Explorer既有查询显式SDK入口与构造参数已修复，111→101诊断且无新增，7项边界测试通过](./workLog/20261004-consumer-explicit-sdk.md)；[Kiosk消费与Display兼容修复后101→79诊断、18项测试通过](./workLog/20261004-kiosk-consumer-compatibility.md)，[现代Kit／typed Provider与兼容修复后79→7诊断、24新合同／32Explorer测试、钱包新产物联检／Fullnode只签名及批准前授权有限复测通过](./workLog/20261005-consumer-kit.md)；缺失analytics及完整Explorer构建仍待。 [统计消费者显式不可用、6新合同／38全部Explorer测试、完整生产构建与core完整类型通过](./workLog/20261005-consumer-analytics.md)。当前production页面仅闭网fixture启动，真实Explorer数据／钱包试用不在本项证明范围。
- [x] `NET-11` read错误分类、有界重试／并发预算／取消，execute不自动重试。[当前16类新增错误及全部读取政策收口](./workLog/20261006-NET-11-completion.md)：312定向／2398全量、完整类型、稳定C14、当前UI／worker及原journal保留核验通过；此前[九个错误展示及真实NFT受控失败／恢复](./workLog/20261004-read-error-surfaces.md)保持有限范围，真实Chrome全页面故障仍归QA。
- [x] `NET-12` TanStack query／persist cache scope、版本升级、取消与网络重置。[逐项源码、33项回归及实际Chrome账户／网络往返核验](./workLog/20261004-query-session-switch.md)通过；[同版本持久缓存恢复过滤修复](./workLog/20261004-cache-restore.md)已入构建。 [后台快照轮换取消慢资产读取已修复，1408项及真实Chrome Kiosk恢复通过](./workLog/20261004-snapshot-rotation.md)。真实提交后的授权恢复与全面服务故障仍归TX／ENV／QA。

## RPC · 全部接口编码与页面接入

依据：04、05、06、08、12；相关完整合同必须随本项实现。

- [x] `RPC-01` 对象点查：资产 GraphQL、收件人 Fullnode、历史归档；新 include／owner／BCS。[三入口实际点查与合同核验](./workLog/20261004-RPC-01-completion.md)，NOT_FOUND语义已按官方源码修正；Chrome由TRY跟踪。
- [x] `RPC-02` 批量对象逐项 Error 保持位置、不可将缺字段当缺对象。[完整合同核验及真实归档跨批证据](./workLog/20261004-RPC-02-completion.md)；Chrome页面验收由TRY跟踪。
- [ ] `RPC-03` 拥有对象复杂筛选、全分页、NFT／隐藏资产／非视觉／display／owner 页面。[实际S55580／S55655拥有对象与分类](./workLog/20261004-owned-assets-live.md)已验证；[真实同快照13对象跨5页与默认读取深比较已通过](./workLog/20261004-owned-pagination.md)；直接NFT display及Chrome仍待。 [Chrome真实10个非视觉对象、Kiosk卡片及空详情已通过](./workLog/20261004-owned-assets-chrome.md)，不代表直接NFT／隐藏或转移验收。 [Personal五pin／实际NFT原摘要／C22风险名单与C23回执等待进展](./workLog/20261006-personal-current-progress.md)已记录；完整本项验收仍待。
- [x] `RPC-04` 发送 coin 用 Fullnode listCoins／完整分页／gas 构建，币详情用固定快照。[地址余额编码与纯地址资金真实执行](./workLog/20261004-address-funding.md)已验证；已补[混合发送全部的最终Coin覆盖检查](./workLog/20261004-pay-all-coverage.md)；[混合原生资金实际定额／全额准备及Chrome 1.5 RTD预览已通过](./workLog/20261004-mixed-native-funding.md)；[混合原生实际发送与重启恢复通过](./workLog/20261004-mixed-native-execution.md)；[非原生三种金额实际准备和地址gas模拟修复通过](./workLog/20261004-address-gas-simulation.md)；[非原生混合资金实际钱包批准／单次广播及锁定重启已验证](./workLog/20261004-mixed-token-execution.md)；[独立metadata／余额及当前精确原生预览](./workLog/20261005-balance-domain.md)已验证；上述历史时点的非原生表单／metadata、发送全部实际UI及剩余coin页面合同已由下述当前证据补齐。 [当前C21完整coin表单／双Max／两笔单次真实发送及独立审核完成](./workLog/20261006-RPC-04-completion.md)，原历史证据保留，QA-A05／A08和其余TX门槛独立开放。
- [x] `RPC-05` 全部余额 GraphQL 同 checkpoint 分页、coin/address balance 精度与完整集合。 [独立余额领域及当前首页／精确币预览回归](./workLog/20261005-balance-domain.md)已完成本批有限合同，完整资产原proof及全分页保持。
- [x] `RPC-06` 单币余额展示及发送前新鲜校验，更新 active-coins／tokens／staking 页面。[完整编码合同与实际非零余额渲染核验](./workLog/20261004-RPC-06-completion.md)：7文件65项通过；发送／混合资金与完整UI故障另归RPC-04／TRY／QA。
- [x] `RPC-07` 元数据缺失和依赖失败区分，单位与金额 bigint，不伪造 coinObjectCount。 [实际旧快照null的发送限制与说明、1408项及Chrome验证通过](./workLog/20261004-token-metadata-state.md)。
- [x] `RPC-08` 动态字段与动态对象区分、name BCS、child ID、列表与详情。[接口核验与S43002真实双类型列表／点查](./workLog/20261004-RPC-08-completion.md)、81项相关测试通过；Chrome与完整NFT执行另验。
- [x] `RPC-09` Move function／构建器解析对象、gas、reference gas、系统／协议配置间接调用。[源码合同与实际未解析Move调用验证](./workLog/20261004-RPC-09-completion.md)，116项定向及四入口审计通过；签名／执行与Chrome另验。
- [x] `RPC-10` 系统／epoch／验证者 GraphQL 组合和 Fullnode 新鲜状态读取。[完整接口核查和认证入口实测](./workLog/20261004-RPC-10-completion.md)；仓位、APY、质押执行及Chrome由其他条目验收。
- [x] `RPC-11` StakePosition 组合、BCS、pool／inactive／activation、全部仓位及奖励精度。[当前非空活跃仓位、精确归档BCS／独立奖励、10000总率200页有限夹具及85项通过](./workLog/20261006-RPC-11-completion.md)；估算0不称兑付，生产网络规模和Chrome质押业务由RPC-13／QA继续验收。
- [x] `RPC-12` APY 率历史／safe mode／样本过滤／舍入，缺覆盖为未知，替换旧 DTO。[逐项完成核验](./workLog/20261004-RPC-12-completion.md)：真实S41616多epoch汇率与有效样本、95项测试、五类消费端；真实safe mode切换及Chrome仍归QA。
- [x] `RPC-13` 质押／赎回／验证者页面接入新领域模型，系统合约交易使用 Fullnode。[C24当前完整合同验收](./workLog/20261006-RPC-13-completion.md)通过：固定S非空active／归档BCS、真实非零奖励赎回和C24收据；修复同会话初始化取消执行结果，新真实1 RTD列表→选择→预览→一次批准→成功收据自动跳转及锁定重启0重发通过。原C23自动跳转失败保留，索引追平与其他故障由剩余条目验收。
- [x] `RPC-14` 交易执行 executeTransaction 与失败联合类型、effects BCS／标准结果映射。[完整接口审计、124项测试、实际失败Ledger标准输出与Chrome收据](./workLog/20261004-RPC-14-completion.md)通过；NFT／币种等业务入口及完整故障仍由各RPC／TX／TRY条目验收。
- [x] `RPC-15` simulateTransaction 正式检查及 preflight／gas／preview 新模型。[全部编码入口与合同完成核验](./workLog/20261004-RPC-15-completion.md)：11文件185项、当前四入口审计通过；实际dApp预览／只签名／执行已由TRY-03验证；[现代地址资金预览的旧v1快照缺口已修复，1406项通过](./workLog/20261004-modern-preview-snapshot.md)，业务资金模式和完整授权另验。
- [x] `RPC-16` 交易与事件 GraphQL 列表显式筛选／排序，完整分页与空扫描页处理。[接口实现、Provider接入和实测](./workLog/20261004-RPC-16-indexed-lists.md)；非空事件／真实多页与Chrome故障回归归QA-A12，列表不代表账户收支全集。
- [x] `RPC-17` 账户历史 accountHistory 独立入口、证书／范围／计数／snapshot 验证。编码与定向核验：[账户历史迁移日志](./workLog/20261003-RPC-17-ledger-history.md)；真实 Chrome／同链服务另按 TRY／QA 验收。
- [x] `RPC-18` 历史 hook／收据页改新模型，sender／affected／收支业务语义分开。[页面合同核验与轮询修复](./workLog/20261004-RPC-18-history-receipt.md)；实际Chrome、多窗口恢复和索引故障仍归TRY／TX／QA。
- [x] `RPC-19` 长期 digest／checkpoint／对象版本归档受限 reader 与水位／选择器核验。[真实归档合同验收](./workLog/20261004-RPC-19-20-completion.md)；checkpoint结果为service-reference，Chrome与ENV另验。
- [x] `RPC-20` 近期 getTransaction／wait 查询 Fullnode，裁剪证明下才按同摘要查归档。[近期及归档原摘要读取核验](./workLog/20261004-RPC-19-20-completion.md)；未知状态不重发，跨worker真实恢复归TX／TRY。
- [x] `RPC-21` 名称正向与默认反向展示，发送钱包新会话／过期／lag／确认目标。OriginByte遗漏已补齐：[后台集成与Fullnode目标校验](./workLog/20261004-originbyte-background-integration.md)；真实名称registry／改名续费／Chrome仍归QA-A15／ENV／TRY。
- [ ] `RPC-22` Kiosk／PersonalKiosk／OriginByte 新 SDK 与明确 RTD package、持有／内容／转移。部分进展：直接持有和原生 Kiosk 的新批准／提交／恢复入口见[执行日志](./workLog/20261003-RPC-22-NFT-execution.md)；OriginByte、部署 ABI 与真实链验收未完成。PersonalKiosk 六模块已完成[受控准备及 debug 编译](./workLog/20261004-personal-kiosk-preparation.md)，已完成[实链发布、原 digest 恢复及 ABI 核验](./workLog/20261004-personal-kiosk-publication.md)，已完成[真实对象创建、NFT 放入和钱包 BCS 核验](./workLog/20261004-personal-kiosk-seed-and-place.md)，GraphQL 发现及钱包转出仍待验证。 [Chrome真实10个非视觉对象、Kiosk卡片及空详情已通过](./workLog/20261004-owned-assets-chrome.md)，不代表直接NFT／隐藏或转移验收。 [当前快照109433两件非空OriginByte NFT与生产P2P构造已验证](./workLog/20261004-originbyte-nft-current.md)，0模拟／0提交，不代替完整钱包转移。 [Personal五pin／实际NFT原摘要／C22风险名单与C23回执等待进展](./workLog/20261006-personal-current-progress.md)已记录；完整本项验收仍待。
- [ ] `RPC-23` NFT 转移、地址历史风险提示、buynlarge 与可达共享 core 旧调用清零。[buynlarge配置准入与28项NFT相关回归、新构建已完成](./workLog/20261004-featured-nft-config.md)；完整NFT转移验收仍待。 [Personal五pin／实际NFT原摘要／C22风险名单与C23回执等待进展](./workLog/20261006-personal-current-progress.md)已记录；完整本项验收仍待。
- [x] `RPC-24` zkLogin残留epoch/latest checkpoint/history已分类并默认禁用创建／签名，既有记录保留只读；历史旧RPC已移除，入口探测改gRPC。证据：[默认禁用与保留日志](./workLog/20261003-RPC-24-zklogin-disabled.md)、[入口日志](./workLog/20261003-RPC-24-entry-access.md)。此项不代表zkLogin业务或Chrome验收通过。
- [x] `RPC-25` Qredo 远程隔离新执行合同、Ledger 残留与法币入口明确支持状态。[支持边界与全量回归](./workLog/20261004-RPC-25-completion.md)；Qredo只读，Ledger／法币未启用，不代表第三方在线或Chrome验收。
- [x] `RPC-26` 21 线协议逐项复核、18 未使用接口不扩范围、构建器／Kiosk依赖闭包无旧请求。[逐项编码落点、四入口AST／模块清单及353项领域测试](./workLog/20261004-RPC-26-completion.md)通过；静态闭包核查不替代真实业务与完整动态流量验收。

## TX · 签名授权与持久恢复编码

依据：05、06、07、12、13；相关完整合同必须随本项实现。

- [ ] `TX-01` 最终 bytes／sender／gas／赞助／expiration 固定，重新模拟和授权边界。[dApp有效期展示与批准守卫](./workLog/20261004-validity-preview.md)已补齐；[SDK超大Epoch精度已整改](./workLog/20261004-epoch-precision.md)，[内部币／NFT／质押赎回有效期展示与批准守卫已补齐](./workLog/20261004-internal-validity.md)，[本批16文件336项与赞助／批准GasData边界核对](./workLog/20261005-final-bytes-authorization-audit.md)已完成；[C21当前完整gas／None／未来Epoch／赞助拒绝88项实际矩阵与独立验签通过](./workLog/20261006-TX-01-authorization-matrix.md)；内部全入口／gas变化再次授权与父合同最终验收仍待。
- [x] `TX-02` 保持 background 私钥与 Intent，签名 bytes 和预计算 digest 一致。[逐项源码及实际账户密码学核验](./workLog/20261004-TX-02-completion.md)，8文件121项测试；真实Chrome与持久恢复由TRY／其它TX项另验。
- [x] `TX-03` journal v2 IndexedDB durable commit 屏障，schema 升级与旧数据隔离。证据：[实现与原生 Chromium 验证](./workLog/20261003-TX-03-execution-journal.md)。
- [ ] `TX-04` 同 H0/generation/account 的跨窗口互斥，pending 禁止再次构建／签名／发送。已补[原生窗口关闭后持久互斥验证](./workLog/20261004-closed-owner-pending.md)，实际扩展全入口仍待。 [准备阶段新增持久pending与同scope守卫，原生双窗口及正常Chrome币预览通过](./workLog/20261004-preparation-guard.md)；全入口竞争矩阵仍待。 [StrictMode及前台会话变更造成的准备自竞争已修复并经实际扩展验证](./workLog/20261004-dapp-preview-session.md)。
- [x] `TX-05` 单次 dispatch，传输／取消／缺失回执／错 digest 保持未知。[全调用链核查、101项测试及保留四笔真实交易只读复核](./workLog/20261004-TX-05-completion.md)；真实timeout／caller取消均已有单次提交证据，完整链失败与其它竞态仍归TX-06／07／10／12。
- [x] `TX-06` 成功／FailedTransaction 终结回执验证与持久失败保守恢复。[完整合同、78项测试与新钱包真实MoveAbort／重启锁定恢复](./workLog/20261004-TX-06-completion.md)通过；原生IndexedDB事务中止矩阵亦已验证。其它故障、入口和切换仍归其余TX／RPC／TRY。
- [x] `TX-07` worker／popup／切网切账户重新唤醒恢复原摘要，不因 NotFound 解锁。[后台自动唤醒已编码并验证定向测试与真实alarm注册](./workLog/20261003-TX-background-wakeup.md)，[实链pending跨浏览器／worker重启恢复](./workLog/20261004-TRY-04-completion.md)已通过；后续完整矩阵见本项当前收口证据。 [当前C21完整TX-07合同收口](./workLog/20261006-TX-07-completion.md)：四事件115项及锁定pending跨新worker108项、20实际签名／30启用检查模拟／5各一次真实Execute、受控NOT_FOUND不解锁／0重发和独立原摘要审核通过；旧worker实际停止、原加密source不变，普通ChromeTLS及QA-A10／TX-10其余合同继续。
- [ ] `TX-08` GraphQL 写后读覆盖达到目标 checkpoint 后刷新，待索引不改链终态。[收据覆盖状态已编码](./workLog/20261003-TX-receipt-indexing.md)，[真实质押收据在索引滞后时保留终态及冷打开修复通过](./workLog/20261004-staking-ui-execution.md)；索引追上刷新与全入口验收待完成。 [Personal五pin／实际NFT原摘要／C22风险名单与C23回执等待进展](./workLog/20261006-personal-current-progress.md)已记录；完整本项验收仍待。
- [x] `TX-09` modern Wallet Standard sign-only／execute／PersonalMessage 新合同。[逐项完成核验](./workLog/20261004-TX-09-completion.md)：显式account／交易chain、可选消息chain与AbortSignal、BCS输出；1293项及实际核心链路证据。完整授权事件矩阵仍归TX-10。
- [x] `TX-10` origin/account/chain/request/tab 逐项授权与 events／disconnect／网络切换。已补[PersonalMessage 初始化与签名期间切网取消](./workLog/20261004-personal-message-session.md)，[交易初始化等待期间的网络／账户取消](./workLog/20261004-execution-init.md)也已补齐，[授权账户重载恢复／撤权确认实际扩展已通过](./workLog/20261004-wallet-authorization-state.md)，[真实跨tab／origin与导航断连隔离已通过](./workLog/20261004-dapp-origin-tabs.md)，[三个入口批准前切网取消与账户事件实测通过](./workLog/20261004-network-approval.md)，[iframe直接消息边界及畸形消息存活实测通过](./workLog/20261004-window-message-frames.md)，[批准前切账户取消及新账户权限隔离实测通过](./workLog/20261004-account-approval.md)，[三个批准入口实际密码弹窗解锁通过](./workLog/20261004-dapp-locked-approval.md)，[真实模拟等待期间锁定取消已通过](./workLog/20261004-dapp-lock-simulation.md)，提交后与签名等待矩阵见本项当前收口。 [完整TX-10收口](./workLog/20261006-TX-10-completion.md)：C21生产八签名等待104项／11实际签名／27模拟／0Execute、当前五提交后原摘要恢复通过；原C18完整origin/tab/events/disconnect实测由103个编译module和3桥接JS原字节继承，来源明确，不声称新C21全协议重跑。赞助预检实际88项单独再验，普通TLS及QA故障保持开放。
- [x] `TX-11` 发送／NFT／质押／dApp 入口统一恢复协调，不通过旧请求生命周期清除 journal。[四入口调用链、116项测试及当前worker原币／质押journal只读复核](./workLog/20261004-TX-11-completion.md)通过；NFT实链转出、链失败及完整故障另验。
- [x] `TX-12` 提交恢复单测故障注入、并发／崩溃／bytes 篡改／落盘失败分支。[逐项合同核验与实际隔离写入修复](./workLog/20261005-execution-fault-matrix-completion.md)：1479全量／68定向／27原生场景、tsc／Local构建／四入口39方法审计通过；真实扩展切换、物理断电及QA另验。

## ENV · 指定 dev 环境与浏览器协议

依据：03、06、07、08、11、13；相关完整合同必须随本项实现。

- [x] `ENV-01` 读取 rtd/AGENTS 与最新源码 revision，使用该源码编译 debug 节点／CLI。
- [x] `ENV-02` link-u-smart-contract 部署脚本核对、复用健康同链环境、禁止清数据冒充重建。证据：workLog/20261003-ENV-02-isolated-dev.md；独立新目录，原链保留。
- [x] `ENV-03` 按指定合约脚本部署同链受控合约／fixture并记录 H0、generation、包与地址。见[受控部署与实链转移日志](./workLog/20261003-ENV-03-fixture-live-transfer.md)；不等于RPC-22或扩展端到端验收。
- [x] `ENV-04` 归档 gRPC-Web 桥接：批准 upstream、Ledger/Move 白名单、可信门禁。证据：workLog/20261004-ENV-04-browser-entry-audit.md；不代表 ENV-05/06/07 或试用验收。
- [x] `ENV-05` 剥离可信上界／身份头、保留min checkpoint与timeout、错误／trailers／取消。[逐项收口及真实Chrome／原生mTLS30项、原同链20次只读](./workLog/20261006-ENV-05-completion.md)通过；传输控制与链读取分层记录，真实业务后端全部故障／正常CA／popup授权仍归ENV-06／07与QA。
- [x] `ENV-06` unary／server streaming binary/text、CORS／允许头／预算／部署持久化。[33协议／最新debug及消息限制／受控持久部署和原同链20读取收口](./workLog/20261006-ENV-06-completion.md)；正常CA、完整权限与业务共同S继续按ENV-07／TRY／QA验收。
- [ ] `ENV-07` 真实 Chrome UI／worker 的 TLS／host permission／同链三入口探测。[普通TLS三个HTTPS失败与独立profile CA方案](./workLog/20261006-ENV-07-profile-ca-design.md)；证书信任确认待回复，未导入，不记TLS通过。
- [x] `ENV-08` 按当前绑定生成 dev profile 与覆盖，不固化历史端口窗口为当前事实。证据：workLog/20261004-ENV-08-dev-profile.md；覆盖为带时间观测，非完整试用配置。

历史环境失败记录（原链随后已恢复，当前运行证据见本批Fullnode／归档实测）：[checkpoint间隔调整触发424107重放分叉保护，原参数与数据保留但链头停滞，实际ready被拒绝](./workLog/20261004-checkpoint-interval.md)。25项运维测试及有限窗口读取不代表dev就绪；先核对可验证的原共识恢复条件，ENV／TRY未完成项保持未勾选。

## TRY · 核心测试与可试用交付

依据：04–08、13；相关完整合同必须随本项实现。

- [x] `TRY-01` 完整钱包及共享 core typecheck／Webpack 构建，修复所有阻断错误。[共享core注入与完整构建](./workLog/20261004-core-injection.md)：双方类型检查、开发版Webpack、1238项测试及四入口审计通过；Explorer剩余错误归NET-10，真实试用另验。
- [ ] `TRY-02` 普通创建／导入账户的资产／币发送／模拟成功与链失败真实链验证。已补[实际扩展私钥导入与重启锁定](./workLog/20261004-extension-account-lifecycle.md)，已补[实际原生币预览及重复恢复修复](./workLog/20261004-coin-preview-recovery.md)，4模拟0提交；[原生币实际一次提交、后台并发恢复修复及重启journal已通过](./workLog/20261004-background-recovery-coalescing.md)；[普通助记词创建／备份／重启与空资产读取已通过](./workLog/20261004-new-mnemonic-lifecycle.md)；[现有真实链失败经归档和Chrome展示已通过](./workLog/20261004-failed-receipt-live.md)；[钱包新批准失败提交与重启恢复已通过](./workLog/20261004-TX-06-completion.md)；[混合原生实际发送与重启恢复通过](./workLog/20261004-mixed-native-execution.md)；[非原生混合资金实际钱包广播及只读恢复已通过](./workLog/20261004-mixed-token-execution.md)；新建助记词账户注资发送等剩余范围仍待。
- [x] `TRY-03` dApp 连接授权／sign-only／execute／PersonalMessage 核心 Chrome 验证。[实际四链路完成核验](./workLog/20261004-TRY-03-completion.md)：一次执行、签名及effects校验、重启后journal保留；headless真实扩展，精确SPKI例外，完整故障恢复归TRY-04。
- [x] `TRY-04` 真实 timeout 已上链／popup关闭／worker 重启／同摘要恢复核心验证。[实际受控故障完成核验](./workLog/20261004-TRY-04-completion.md)：原生超时后pending跨popup关闭和整个浏览器重启，同摘要恢复至checkpoint255912；总dispatch1，锁定账户再核验0模拟／0提交。完整故障矩阵仍归TX／QA。
- [ ] `TRY-05` 三入口历史详情／GraphQL 资产和分页／同链 package 核心验证。已补[门禁提速与资产快照87061读取](./workLog/20261004-guard-transport-reuse.md)及[专用覆盖索引与实际门禁核验](./workLog/20261004-prefix-index.md)，积压仍未消除。已补[实际扩展Local profile空余额读取](./workLog/20261004-trial-profile-ui-assets.md)，有资产／分页／完整三入口仍待。 [guard额外并发48次及当前来源／水位核对完成，发现待同步启动绑定](./workLog/20261004-guard-capacity.md)，尚未扩容或追平。 [启动绑定滞后已受控修复并复核](./workLog/20261004-adapter-binding-reconcile.md)，未扩容。 [六名额升级、完整管线恢复及S104409真实Chrome资产／空Kiosk复核已通过](./workLog/20261004-capacity-upgrade.md)，约26分钟恢复空窗保留证据，仍未追平。 [原开发链和服务退出后已沿用原debug／数据恢复，共同窗口、13对象及有限账户窗口读取恢复；正常安装与新资产追平仍待](./workLog/20261004-runtime-cold-recovery.md)。
- [x] `TRY-06` 产物初步审计无 JSON-RPC／旧 Kit／Sui 公网误访问，提供可装载试用包。[初步验收包收口](./workLog/20261006-TRY-06-completion.md)：全部生产闭包／独立发布registry／36成员ZIP与最终普通Chrome装载来源通过，启动零外部请求；HTTPS及完整资金业务仍待，trial_ready=false。
- [x] `TRY-07` 试用说明、端点／debug revision／安装流程、已验证与待回归清单。[当前候选安装与回归说明](./14-开发验收包安装与回归说明.md)含36成员ZIP／SHA、四入口／H0／generation／最新debug来源、独立profile安装、CA待确认及所有待验收范围；[审核](./workLog/20261006-TRY-07-completion-audit-01.json)。完整trial_ready仍false。

## QA · 试用期间细节与故障回归

依据：07 A01–A22 全表、04–06 细则与 13 补充；每项必须有真实 Chrome／同链 fixture 的预期与实际、时间、bundle 与部署身份，单元测试不代替此阶段。

- [x] `QA-A01` 新装插件、创建／恢复助记词、派生、多账户、导入私钥：地址与签名基准一致；锁定、解锁、导出需密码；升级不丢库。[当前审核候选实际116项、升级后4消息签名、3派生／4账户／两profile及同ID包更新保库完成](./workLog/20261006-QA-A01-completion.md)；8失败现场保留，0模拟／Execute。金额交易、普通HTTPS和突然终止观察恢复继续按TX／ENV／QA-A10／19／20验收。
- [x] `QA-A02` 三入口、身份／schema／包绑定：真实Chrome Fetch报文、服务身份、H0digest一致、能力声明与实际匹配。 [当前完整合同验收](./workLog/20261006-QA-A02-completion.md)：独立revision3回环开发profile真实Chrome五案81只读、四角色完整H0／11 SDL合同／七配置领域／native及独立四认证包匹配；真实错H0与错pin、零IO错revision拒绝，Node独立schema与包复核。聚合窗口推进partial保持、独立matched单列、两失败保存；0模拟／签名／Execute，不称产品UI调用测试驱动、全局ready或原HTTPS信任。
- [x] `QA-A03` 归档桥接unary／server stream／错误：Ledger与Move成功，State／Execution／管理方法不可误启用；trailers／取消／限流／deadline保留。[固定同renderer33协议、原链五帧流及真实Move两格式／四禁用路径收口](./workLog/20261006-QA-A03-archive-completion.md)；合成故障协议与原链成功分别留证，真实业务后端故障／普通CA分别归QA-A20／19。
- [x] `QA-A04` min-checkpoint：省略、H0、已观察H、不可满足、非法、负数、溢出；历史选择器不变；可信上界不可由外部header突破。[当前原同链binary/text 30只读、前后持久桥接审核完成](./workLog/20261006-QA-A04-minimum-completion.md)；正常Chrome证书及完整业务仍按ENV-07／QA-A19验收。
- [x] `QA-A05` 本项完成原多页、多币、总额精度、Coin／address balance、无元数据原子单位与依赖错误不归零合同。[QA-A05完整验收](./workLog/20261006-QA-A05-completion.md)：当前实际双币／明确metadata-null与8文件86项分页精度和依赖错误矩阵、C21币UI至C24原始源码内容一致；历史执行仍标历史。
- [ ] `QA-A06` NFT／动态字段／动态对象：多页双向、nameBCS、值／childId、owner、类型、缺失、历史版本、缺图与非视觉资产。
- [ ] `QA-A07` Kiosk：同链package、cap与personalKiosk、持有／内容／可转移性、转移前验证；按实际支持业务分支。
- [ ] `QA-A08` 普通转账／gas／模拟：大整数、小数边界、余额不足、错误版本、无效地址、未知命令、模拟失败、gas变化需再授权。
- [x] `QA-A09` 签名／执行／链失败：finalbytes／digest一致，普通／导入签名，成功和FailedTransaction真实链回执；无自动重复dispatch。[C20普通／导入106项、2实际成功单次广播及既有真实FailedTransaction在当前BCS／签名／12项UI复核收口](./workLog/20261006-QA-A09-completion.md)；历史失败不称新C20失败提交，3页面失败保留；完整金额／赞助／故障窗口／HTTPS继续由其余父任务验收。 [C21同合同当前成功106项／失败UI12项及原字节／签名再次复核通过](./workLog/20261006-C21-completion.md)，历史失败仅原一次派发，未新增失败提交。
- [x] `QA-A10` pending／多窗口／worker：dispatch前后关闭、timeout但链成功、回执落盘失败、锁失效防护、旧digest恢复；持久记录与链事实一致。 [当前C21完整合同验收](./workLog/20261006-QA-A10-completion.md)：三案321项、12实际签名／20模拟／3原digest单次Execute与独立BCS／签名／effects审核；真实strict事务abort／约20秒原deadline／批准前后关闭、旧worker停止后新locked pending、原WebLock失效及第二窗口拒绝重准备、原摘要自动恢复均通过。首轮失败保留并单独0派发恢复原profile；正常TLS及独立hard kill／物理断电不作声明。
- [x] `QA-A11` 裁剪后的长期详情：Fullnode查不到的同链历史交易／checkpoint／对象版本由归档读取；返回ID／版本／摘要核验。[完成证据](./workLog/20261006-QA-A11-completion.md)。
- [x] `QA-A12` 交易／事件分页：ascending／descending、空扫描页、SCAN_LIMIT／terminal、重复／无进展／坏cursor、超时页不提交。[C19实际双向16交易／13事件与type5、真实空终态及坏cursor、分层24故障／6过滤、原七journal和当前产物通过](./workLog/20261006-QA-A12-completion.md)。
- [ ] `QA-A13` 账户历史语义：sender、收款、对象变动、Kiosk／token／capability范围；缺证书／未注册不冒充全集，按扩展实际承诺验收。
- [ ] `QA-A14` read-after-write：执行确认后GraphQL故意落后，显示索引同步；覆盖到目标checkpoint才刷新完整资产snapshot。
- [ ] `QA-A15` 名称：正向／默认反向、缺失／过期、registry错链、解析lag、显示名与发送目标分开；确认最终地址。
- [x] `QA-A16` 质押与治理：Pending／Active／赎回、多pool／inactive、rate缺失、safe-mode补洞、APY多epoch、奖励舍入与大额值。[真实兑付与明确夹具／算法／组件分级矩阵](./workLog/20261006-QA-A16-completion.md)通过：当前12文件151定向、181文件2551全量；不冒充真实链已切换全部治理状态或生产吞吐，原UI失败保留。
- [ ] `QA-A17` 网络与dev归零：同host换genesis、同genesis换generation、保留数据重启、只归档重建、URL／registry变动、迟到请求拒绝。
- [x] `QA-A18` dApp与Wallet Standard：modernconnect／disconnect／account／chain事件、PersonalMessage、sign-only、sign-and-execute、origin／权限错配拒绝。[当前 C18 实际完整八事件与一次执行收口](./workLog/20261006-QA-A18-completion.md)；HTTPS／提交后完整故障继续由 QA-A19／10 验收。
- [ ] `QA-A19` Chrome权限与证书：新装／更新、hostpermission批准／拒绝、自定义网络、正确CA／错误SAN、UI和worker实际调用；demo网页CORS另验。
- [ ] `QA-A20` 故障与冷启动：Fullnode／GraphQL／archive分别不可用与恢复、Docker保留数据冷启动、入口依赖顺序、不误清journal。
- [ ] `QA-A21` 发布清理与成本：bundle／依赖／抓包无JSON-RPC与旧Kit、无Sui公网误访问、单活动钱包、限流／日志／配置说明。
- [ ] `QA-A22` UI与非RPC资产：国际化、账户／锁定／设置、资产隐藏、链接、授权窗、支持的应用入口保持；不支持的外部业务明示。

## REL · 发布清理与完整验收

依据：02、06–08、13。TRY 提供试用，REL 才证明完整目标达成。

- [x] `REL-01` 发布依赖图与全部生产 bundle 无 JSON-RPC 请求器／旧 Kit，历史 fixture 明确排除。[独立production构建、完整模块／四chunk审计与7反例测试完成](./workLog/20261006-REL-01-production-completion.md)；原C16保留，真实流量与最终发布分别由REL-02／05验收。
- [ ] `REL-02` Chrome 实际抓包与三入口观测，证明全部钱包功能无旧 RPC 和 Sui 公网误访问。
- [ ] `REL-03` 错链／journal 不兼容暂停执行，保留密钥和 pending 的包／profile 回滚说明与验证。[生产包三阶段51项及158定向通过](./workLog/20261006-REL-03-package-rollback.md)，加密密钥／公共future journal／播种profile保持；实际custom profile授权保存、新revision回退和错H0身份拒绝仍待，不把权限拒绝记为错链。
- [x] `REL-04` 运行端点／schema／revision／限流／查询预算／日志脱敏及可维护部署说明。[完整操作手册、公开配置/当前11拥有进程/原链只读、8恢复门槛与5白名单投影测试](./workLog/20261006-REL-04-operations-completion.md)通过；正常Chrome/完整冷启动/部署签认/业务共同S及最终发布仍按对应任务验收。
- [ ] `REL-05` 逐文档、逐 RPC、逐页面、逐 A01–A22 最终完成审计，无缺失或未证实必需项。

本批增量证据：[旧依赖清理与完整构建](./workLog/20261003-legacy-signer-faucet-build.md)。完整类型、dev/prod构建及821项单测通过；NET-09／RPC-26／REL-01仍有完整审计范围未结束，不据此勾选。

NET-06增量：[Faucet受控配置与内置完整性](./workLog/20261003-NET-06-profile-faucet.md)，全量828项通过；自定义配置主链仍未完成。

NET-07增量：[自定义配置预检确认与存储](./workLog/20261003-NET-07-custom-profile.md)，全量852项通过；实际Chrome与副本恢复等仍未完成。

NET-07恢复增量：[副本恢复与重启版本检查](./workLog/20261003-NET-07-profile-restore.md)，19项定向测试与真实扩展欢迎页／只读通信验证通过，尚不覆盖权限授权及实链。

TX增量：[dApp原签名恢复与构建前检查](./workLog/20261003-TX-dapp-original-signature-recovery.md)，87项定向测试通过；pending保留及恢复UI未完成，不勾选。

TX UI增量：[pending保持与只读恢复](./workLog/20261003-TX-dapp-pending-ui.md)，全量889项及最终20项定向通过；真实多窗口／worker／实链仍未验。

## 日志与证据规则

workLog 每次记录任务 ID、变更、执行命令、结果、限制、下一项；提交日志不得包含私钥／助记词／签名 payload／服务秘密。所有已勾选项必须能由当前文件或保存输出重验。总进度按本清单已完成项数计算，另列接口编码、核心试用、Chrome 回归；不将文档比例当作功能迁移比例。

## 线协议到实施任务的追溯

08 中的 RPC-xx 是线协议编号，与上面的任务 RPC-xx 属于不同表的标识，以下显式映射消除歧义。构建器、等待与 Kiosk 的间接请求同时按 RPC-26 核验。

| 08 线协议编号 | 实施任务 |
| --- | --- |
| RPC-01 | RPC-01 |
| RPC-02 | RPC-02 |
| RPC-03 | RPC-03、RPC-22、RPC-23 |
| RPC-04 | RPC-04 |
| RPC-05 | RPC-05 |
| RPC-06 | RPC-06 |
| RPC-07 | RPC-07 |
| RPC-08 | RPC-08、RPC-22 |
| RPC-09 | RPC-18、RPC-19、RPC-20 |
| RPC-10 | RPC-14、TX-01–11 |
| RPC-11 | RPC-15 |
| RPC-12 | RPC-16、RPC-17、RPC-18、RPC-23、RPC-24 |
| RPC-13 | RPC-16 |
| RPC-14 | RPC-21 |
| RPC-15 | RPC-21 |
| RPC-16 | RPC-10、RPC-24 |
| RPC-17 | RPC-11、RPC-13 |
| RPC-18 | RPC-12、RPC-13 |
| RPC-19 | RPC-24、NET-03 |
| RPC-20 | RPC-09 |
| RPC-21 | RPC-09 |

2026-10-04增量：原摘要受控重放已恢复开发链（runtime.ready=true），原证书／YAML／三笔回执和余额及实际链推进通过，见[恢复日志](./workLog/20261004-original-summary-recovery.md)。Kiosk同reader发现复用、131文件1416项／tsc／Webpack／四入口静态审计通过；当前新扩展Chrome及OriginByte完整读取仍超时，已隔离display，见[复用日志](./workLog/20261004-kiosk-discovery-reuse.md)。官方Display v1按类型查sum_displays未传S；RPC-03／NET-04的模板快照合同需补齐，不勾选完成。

2026-10-05增量：对象版本生产七键 SQL 改写7.114ms／32页、3项真实 PostgreSQL 回归、当前 debug 重编译与19项运维守卫通过；六服务受控替换及 KV mTLS 环境恢复已执行。新 GraphQL 能力被重启后共同S缺口拒绝，完整 display／OriginByte／Chrome 未验收，核心 CLI 最新产物切换尚未完成，48/98不增勾，见[本批日志](./workLog/20261005-query-range-recovery.md)。

2026-10-05后续增量：核心CLI已沿用原数据受控切换为当前源码debug PID21240，33项守卫及同H0／原三笔回执余额／438627→438698推进通过；runtime.ready=true。14条KV和4条consistent持久化水位可核实，GraphQL Ledger171325仍低于consistent176712–184248；共同S、完整资产与当前Chrome未通过，48/98不增勾，见[切换与范围日志](./workLog/20261005-core-debug-current.md)。

## REL-03：生产包与配置回滚子任务

按[实施前设计](./workLog/20261006-REL-03-rollback-design.md)执行，子项不另计98父项。

| 子项 | 状态 | 证据与范围 |
| --- | --- | --- |
| R1 | 真实三阶段完成 | 原生产C19→审核候选03→原包，同安装身份，实际UI三脚本及后台字节匹配 |
| R2 | 未注资测试账户完成 | UI导入／重启锁定／错密码拒绝／正确密码实际解密与加密字段保持，秘密仅内存 |
| R3 | 公共future journal夹具完成 | version3／dummy pending三阶段完整store SHA保持，实际恢复拒绝；非广播pending／物理断电 |
| R4a | 有限持久配置／拒绝完成 | 第11轮使用真正网络存储键、播种profile保持；实际预检因权限拒绝，未到错H0身份校验 |
| R4b | 必需待验 | 正常CA／host授权后的实际预检保存、新revision回退及真实错H0身份拒绝 |
| R5 | 本轮完成 | 全程0签名／模拟／Execute、0原profile／CA／dev改动；首次失败保留 |
| R6 | 有限测试与操作说明完成 | 6文件158项、最终候选只读回归，两侧回滚说明对齐；父仍开放 |

第10轮遗漏实际网络选择键及未分类预检原因已明确降为局部证据；当前采用[第11轮与完整说明](./workLog/20261006-REL-03-package-rollback.md)。

## RPC-03／NET-04：Display v1历史发布模板子任务

以下D1–D6从属于既有顶层任务，不单独计入98项总数；只有完整合同和验证全部成立才勾选父任务。执行顺序及详细合同见[权威语义和设计](./workLog/20261005-display-history-design.md)。

| 子任务 | 实施顺序／验收内容 | 状态 |
| --- | --- | --- |
| D1 | 核对Sui VersionUpdated发布语义、同checkpoint事件顺序、多Display ID和未发布编辑，对齐双方方案 | 已完成本批源码与manifest核对 |
| D2 | 历史schema／processor／冲突拒绝／提交fencing、从genesis连续回放与覆盖 | 索引／覆盖已编码；66项索引器测试（新增12项实际PG）及6项回放准备守卫通过；认证回放已启动，完整覆盖／终态待执行 |
| D3 | (type,S)批量loader、scope resolver、v1／v2优先和模板basis | 本批编码／库回归完成；36项Reader和247项GraphQL（新增17项含8项实际PG）及SDL通过，两个sourceUnchanged=true，见[本批日志](./workLog/20261005-display-history-reader.md) |
| D4 | 服务能力／coverage和钱包basis准入、完整失败／取消预算 | 本批编码／回归完成：Reader38、GraphQL249项稳定源码通过，钱包133文件1463项／tsc／开发构建／静态闭包通过；见[本批日志](./workLog/20261005-display-history-admission.md)，部署／Chrome待D6 |
| D5 | 真实PG、同cp／版本边界／多ID／未发布编辑、认证回放中断与覆盖原子性 | D2已有12项实际PG；D3 Reader新增6项、GraphQL新增2项，D4两库各新增2项实际PG函数通过；完整认证回放已从0启动、最新只读TLS连续覆盖15581／15582 marker、原22水位保持，上界386503尚未完成；未发布编辑及中断恢复仍待执行 |
| D6 | 最新指定debug与保留数据部署、实际完整display和Chrome | 独立cache与八个原debug备份已验证；最新八目标及三个publication helper构建成功，完整索引器66项同源码回归通过；受控安装及停止恢复41项守卫通过，实际8个debug与schema安装、原链核心ready证明完成；认证回放PID66145执行中，生产Display／Chrome未验收，见[准备日志](./workLog/20261005-display-debug-build-preparation.md) |

## ENV-05／NET-11：授权监听建连修复子任务

| 子任务 | 验收内容 | 状态 |
| --- | --- | --- |
| L1 | 公开503定位到TCP建连，排除授权／SQL执行；原队列5、8路/live故障证据 | 已完成定位 |
| L2 | 队列32，保持8／32检查和请求预算，保存身份／绑定后仅替换监听器 | 已完成；5测试及实际部署身份通过 |
| L3 | 相同建连测试、公开与原生固定S、完整NFT及Chrome；失败记录保留 | 本机建连／端点／完整NFT单次通过；Docker残余超时待修复 |
| L4 | 用审核profile重建Local产物，AST逐字核对UI／后台registry，Chrome再验 | 已完成；显式profile构建／双入口AST／4测试及新Chrome有限资产验收通过 |
| L5 | 存储迁移ready缓存被切网清除后重新核验，保留切网缓存隔离；真实QueryClient／Chrome | 已完成；14定向／1418全量／tsc／新Local构建及真实Chrome恢复通过 |

见[本批日志](./workLog/20261005-current-assets-window.md)。子任务不另计98项总数。

2026-10-05历史索引增量：D2 schema／processor／覆盖／数据库不变式／epoch注册和回放配置准备已编码，66项索引器测试／6项脚本守卫和GraphQL编译通过；当前debug部署与认证回放仍待验证，D2及父任务未完成。见[实现日志](./workLog/20261005-display-history-indexer.md)。

## D5／D6：认证读取前缀索引子任务

每次取块重复全前缀聚合，真实单次40–43ms；辅助外键前缀索引的P1–P6设计与严格验证顺序见[设计及子任务](./workLog/20261005-publication-prefix-index-design.md)。P1–P5已编码、26真实PG／守卫回归及431328原行保留安装、实际mTLS终验通过；P6连续回放和live／Chrome执行中；当前回放继续，父项48/98、trial_ready=false保持。

## TX-12：提交恢复故障矩阵子任务

按[F1–F5细分设计](./workLog/20261005-execution-fault-matrix-design.md)审计并补齐授权／异步取消／批准输入TOCTOU及原生存储失败矩阵。F1–F5已按[完整故障合同及原始日志](./workLog/20261005-execution-fault-matrix-completion.md)核验完成，父TX-12已勾选；真实网络切换与扩展端到端继续归TX-04／07／10，不以harness冒充实链或正常CA验收。


## TX-01：最终批准字节与授权边界子任务

### C20 完整 gas／赞助／有效期实际矩阵

按[实施前合同](./workLog/20261006-TX-01-authorization-matrix-design.md)和[88项有限完成证据](./workLog/20261006-TX-01-authorization-matrix.md)推进；本批子任务不增加98个父项，不以只签名替代赞助双签执行或内部所有页面。

- [x] G1 最新源码／八个 debug 只读核验，原 demo／harness 字节保存。
- [x] G2 localnet 完整交易 fixture／21项定向测试／独立 demo 构建。
- [x] G3 普通／导入账户实际固定 sender／完整 GasData／None 与未来 Epoch 批准、原 BCS 与签名验证。
- [x] G4 单签赞助执行明确拒绝、无 Execute 派发及 journal 原样保持。
- [x] G5 当前产物与服务／模拟字节独立审核，工作日志和总进度同步，逐父合同复核。

按[B1–B5细分设计](./workLog/20261005-final-bytes-authorization-design.md)核对完整调用链和官方赞助签名规则，再补缺失边界测试。B1–B4已完成，新增7项／336定向／1486全量／tsc及Local构建通过；B5和父TX-01继续pending，完整授权与新产物实际验收不由TX-12代替。


## TX-01／TX-10：当前产物Fullnode批准与授权子任务

### QA-A10当前持久与窗口故障Q1–Q6

按[原合同矩阵](./workLog/20261006-QA-A10-current-design.md)顺序实施，已完成TX-07／10不替代本项。

- [x] Q1 当前来源／最新debug／fresh账户资金准入与全路径源保存（最新8debug／H0不变，各案独立fresh且一次V2，全路径快照保存）。
- [x] Q2 dispatch前／后关闭窗口、临时request与durable pending独立（popup107项／原摘要审核，批准前0签名leaf调用／0journal／0Execute，提交后原pending保持）。
- [x] Q3 真实reader超时但链成功、原digest跨窗口恢复不重发（timeout01实际107项／约20秒原TimeoutError，独立审核通过，0重发）。
- [x] Q4 当前Chrome原terminal receipt事务受控abort，pending保持／原digest恢复（receipt-abort02实际107项、strict native abort及独立原摘要审核；01原失败profile另0签名／0派发锁定恢复，不覆写失败）。
- [x] Q5 旧worker实际停止、新worker原pending跨窗口竞争／锁失效防护（三个实际案旧context／worker停止、新worker locked pending／实际WebLock可获取后仍被原pending阻止，0追加模拟／派发；三案均独立原摘要审核）。
- [x] Q6 原digest独立审核／失败保留／原父合同逐项审计及总进度同步（综合审核01／02、69/98，产品与CA不变）。

### C21签名返回等待S1–S4

按[真实生产签名等待设计](./workLog/20261006-signature-wait-current-design.md)推进，父计数不预改。

- [x] S1 当前生产sourceMap及真实签名leaf精确定位、矩阵安全／来源合同保存。
- [x] S2 fresh H0／账户／资金准入与测试源码全路径保存（02独立fresh一个账户一次V2；01失败profile保持）。
- [x] S3 两个签名leaf×四生命周期事件真实签名完成后无返回／无journal／无派发、原方法与scope恢复（02完整104项／11签名／27启用检查模拟／0Execute）。
- [x] S4 当前来源／正常重启／父合同逐项审计、工作日志与总进度同步（独立等待审计、103module／3桥接精确历史继承和完整TX-10审核通过，68/98）。

### C21提交后原摘要恢复L1–L6

按[实施前恢复合同](./workLog/20261006-lifecycle-current-design.md)串行推进，不增加98个父项。

- [x] L1 当前源码／候选来源及最新八debug只读核验。
- [x] L2 fresh profile／账户／H0／资金准入，测试源码全路径保存（01独立profile、两账户各一次V2；完整矩阵结果另验）。
- [x] L3 network／account／lock／cancel真实提交后原字节与pending／受控NOT_FOUND保持（当前C21实际四案115项／16签名／24模拟／4单次派发）。
- [x] L4 同scope新准备阻止、不同scope隔离、真实自动wake恢复原摘要／effects，0重签重发（四原摘要独立BCS／签名／effects只读审核通过）。
- [x] L5 当前locked browser／worker重启与原journal保持、独立原摘要审核（108项、旧worker实际停止、全部账户仍锁定／原source不变，独立原digest审核）。
- [x] L6 所有失败与当前版本来源审核、父合同逐项检查、工作日志／总进度同步（完整TX-07审计通过、67/98，其余31父保持）。

按[C1–C5细分设计](./workLog/20261005-current-extension-authorization-design.md)先只读核验7条保留journal，再验证独立于资产准入的当前Fullnode批准／只签名与授权链路。保留当前产物来源、原scope和完整父任务门槛。 C1–C4已按[当前实测日志](./workLog/20261005-current-extension-authorization.md)完成7条原journal及当前只签名／授权范围；C5双方合同／文档审核及进度同步通过，父TX-01／10与资产／提交后验收保持开放。

## ENV-05／06：查询传输实测子任务

按[E1–E5设计](./workLog/20261005-query-protocol-design.md)分别核对隔离Envoy协议、实际同链查询入口和完整预算／持久部署合同；历史回放保持原supervisor，未通过的范围不勾选父任务。 [本批E1–E3](./workLog/20261005-query-protocol.md)的当前绑定、17项协议fixture及真实4组合有限页通过；E4预算／取消／持久化故障保持待验。

## NET-10：Explorer消费Kit子任务

按[M1–M5设计](./workLog/20261005-consumer-kit-design.md)接通现代钱包Kit与应用自有查询Provider，保留Explorer既有显式查询范围。缺失analytics API及完整构建不得伪造通过；钱包与共享core隔离合同继续核验。

| 子任务 | 当前状态 | 证据范围 |
| --- | --- | --- |
| M1 | 完成 | 基线与真实SDK／RTD源码核对；epoch声明与实现区分 |
| M2 | 完成有限合同 | typed query、network／endpoint隔离、取消／select；现代Kit Provider |
| M3 | 完成有限合同 | 消费imports／stories／显式签名接入；实际Kit本地签名验签 |
| M4 | 部分完成 | React19／Display／BCS修复，analytics服务缺口保持7诊断 |
| M5 | 部分完成 | 钱包／core／定向检查、新Local及只读Chrome通过；完整Explorer构建与真实产品验收待 |

全部证据与失败边界见[本批日志](./workLog/20261005-consumer-kit.md)。本批不勾选父NET-10／TRY／QA，完整试用未达门槛。

## NET-11：跨会话／窗口读取预算子任务

按[G1–G5实施前设计](./workLog/20261005-cross-context-read-budget-design.md)完成上下文队列及同扩展bucket原生锁；不把本地资源策略记为服务端限额或完整故障验收。

| 子任务 | 当前状态 | 证据范围 |
| --- | --- | --- |
| G1 | 完成编码 | 所有session共用上下文4申请／64等待，同bucket跨窗口／worker四个物理读取名额；缺少原生API拒绝读取 |
| G2 | 通过有限合同 | 新增8项并发／取消／错误测试及1项错误分类，钱包134文件1495项及完整tsc通过 |
| G3 | 通过有限合同 | 当前生产模块的Chromium6组合成HTTP正文／多页与worker／取消／关闭／错误实测；无链请求 |
| G4 | 通过有限合同 | 1001份源码稳定Local构建／双入口AST／四入口39方法；当前worker及原7条journal只读一致；只签名3模拟、批准前8组授权4模拟，均0Execute |
| G5 | 本批文档／观察完成，回放终态待 | 双方新增网络合同精确对齐；最新06:25原回放0–63732／63733 markers，原22水位不变；父任务保持开放 |

父NET-11／ENV-05／06和TRY仍开放，49/98，trial_ready=false。64为每上下文队列，跨profile／设备不共享；实际服务取消传播／故障覆盖仍需回归。全部当前证明、两次旧worker失败及更新前状态见[本批日志](./workLog/20261005-cross-context-read-budget.md)。

## RPC-11／13：质押领域快照子任务

按[S1–S5实施前设计](./workLog/20261005-staking-domain-snapshot-design.md)推进。质押仅声明实际BCS治理依赖，完整NFT资产继续要求Display覆盖；原全部仓位／池／汇率和末验合同保持。

| 子任务 | 当前状态 | 证据范围 |
| --- | --- | --- |
| S1 | 完成编码／有限合同 | 六项依赖、最小对象及原完整治理组合；NFT Display保持 |
| S2 | 完成编码／有限集成 | 真Provider pending／Display失败独立读取、切会话及错误撤值 |
| S3 | 有限验证完成 | 58定向、1531全量、双方tsc／core4项通过 |
| S4 | 部分完成 | native S282633及后续公开S288425完整3汇率／空仓位与Chrome列表通过；cp300333后的非空活跃奖励／规模待 |
| S5 | 本批完成 | 双方合同对齐、1006源码稳定Local／AST／闭包及当前只签名通过 |

本批UI b24b8f／background f2628c（后台字节与前批相同），原7条journal与链上effects只读不变，只签名3模拟0Execute；61c89f UI证据为历史。原回放06:43连续0–70187、原22水位不变、未达终态。父RPC-11／13保持开放，49/98，trial_ready=false；公开503、非空活跃奖励、大规模汇率和完整质押／赎回页面仍待，见[本批日志](./workLog/20261005-staking-domain.md)。


## ENV-05／NET-11：可选Display管线准入子任务

按[H1–H5实施前设计](./workLog/20261005-query-optional-pipeline-design.md)修复已定位的23行被旧22行合同拒绝问题；原22必需管线严格校验，Display字段覆盖保持。

| 子任务 | 当前状态 | 证据范围 |
| --- | --- | --- |
| H1 | 已定位／私有baseline已保存 | 新鲜发布前缀、22有效＋hist_displays一行，当前window=null |
| H2 | 本批有限合同完成 | 11新＋10旧测试、真实RR/TLS五投影拒绝，Display覆盖保持 |
| H3 | 本批完成 | 指定合约仓库7守卫／计划／owned单次替换11462→82796；预算保持 |
| H4 | 有限验证完成 | 公开16请求／真实Chrome列表与选择、表单metadata拒绝；1534全量／tsc／稳定Local；原22水位保持 |
| H5 | 本批完成 | 双方网络合同逐字一致、来源清单／失败／日志和进度同步 |

父任务49/98、trial_ready=false保持；不能将修复入口作为完整资产／活跃奖励／Chrome或回放终态验收。

H1–H5完整证据见[本批日志](./workLog/20261005-query-optional-pipeline.md)；一次历史状态拒绝及后续新鲜一致证明分开保存，D5调查与终态保持开放。


## RPC-04：Coin metadata独立领域快照子任务

按[K1–K5实施前设计](./workLog/20261005-coin-metadata-domain-design.md)解除metadata对无关Display准入的依赖；精度未知／读取失败仍禁止金额解析，同S组合仍用完整reader。

| 子任务 | 当前状态 | 证据范围 |
| --- | --- | --- |
| K1 | 设计已保存 | 官方映射／固定源码与RTD consistent＋obj_versions依赖核对 |
| K2 | 本批编码完成 | 独立两依赖reader／共同严格decoder及末验／Provider／core hook |
| K3 | 本批有限合同完成 | 22reader＋5实际Provider／66定向、1561全量、core4及双方tsc |
| K4 | 本批有限验证完成 | 稳定1009源码Local／AST／闭包、公开TLS9请求、当前Chrome9位输入／10位拒绝，原7journal保持，0模拟0Execute |
| K5 | 本批完成 | 双方SDK当前共同proof表述已修正、独立合同精确对齐，来源／失败／日志同步 |

子任务不另计98项，RPC-04完整代币／发送全部与TRY验收继续开放。

K1–K5证据及失败更正见[本批完整日志](./workLog/20261005-coin-metadata-domain.md)，正常CA与其余父任务完整验收仍待。


## RPC-04／11／TX-01：当前质押正式预览子任务

按[V1–V4实施前设计](./workLog/20261005-staking-current-preview-design.md)核验最新UI的链上metadata金额换算、正式模拟BCS与预览摘要；仅预览，零广播，原journal保持。V1–V4已按[实际预览日志](./workLog/20261005-staking-current-preview.md)完成本批有限合同：当前UI／worker逐字一致、9位金额准确转u64、两次checks启用模拟、末BCS与预览摘要一致、最终批准未点击／0Execute及原两journal保持；父任务开放，不另计98项。


## RPC-05／06／04：完整余额集合独立快照子任务

按[Q1–Q5实施前设计](./workLog/20261005-balance-domain-design.md)迁移独立完整余额集合；完整资产内部同S、全分页／错误与写后读覆盖合同保持。Q1–Q5已完成本批有限合同，不另计98项，RPC-04／TRY完整验收开放。

| 子任务 | 当前状态 | 证据范围 |
| --- | --- | --- |
| Q1 | 完成 | 官方／本地consistent依赖、设计先存、5 Provider新例复现4失败 |
| Q2 | 本批编码完成 | 独立完整余额、共享解码／full asset原proof、Provider／hook／确认失效；精确批准金额与摘要补齐 |
| Q3 | 本批有限合同完成 | 新增25reader＋5实际Provider＋3金额用例，96定向、1594全量、core4及双方tsc |
| Q4 | 本批有限验证完成 | 1014稳定源码Local／AST／四入口，公开S288451完整一页一币余额及末验，当前Chrome首页／ActiveCoinsCard／精确正式预览，0Execute |
| Q5 | 本批文档同步 | 双方SDK／执行合同对齐、Task／workLog／来源与总体进度保持实证范围 |

金额舍入／摘要缺口的前置失败、两次Chrome失败以及旧构建均保留；通过证据对应新UI189c8c。原7条journal只读复核和回放终态分别按[本批工作日志](./workLog/20261005-balance-domain.md)判断；完整非原生／发送全部、实际多币多页、NFT与活跃仓位仍待。


## NET-04／TX-01：后台交易三入口身份授权子任务

按[N1–N5实施前设计](./workLog/20261005-background-network-identity-design.md)先补已知跨入口错链阻止后台交易授权，保留同链临时降级与只读原摘要恢复。身份守卫不冒充完整SDL／package／UI能力ready，父NET-04／TX-01仍开放，不另计98项。

| 子任务 | 当前状态 | 证据范围 |
| --- | --- | --- |
| N1 | 完成 | 官方／固定源码、前置7失败、Task先存 |
| N2 | 本批编码完成 | 实际SDK新身份、session隔离／水位、等待后复核及只读恢复权限 |
| N3 | 本批有限合同完成 | 新24、139定向、1618全量、钱包／core tsc |
| N4 | 本批有限合同完成 | 稳定Local／公开TLS／原7journal；当前只签名＋三组错链、5模拟0Execute；旧失败保持 |
| N5 | 本批文档审核完成 | 双方网络／执行合同精确对齐、最终证据／来源／失败与实时进度审核 |

本批失败证据与待验证范围见[当前日志](./workLog/20261005-background-network-identity.md)。


## TX-10／TX-07：签名等待与提交后生命周期子任务

按[AUTH1–AUTH6实施前设计](./workLog/20261005-sign-dispatch-lifecycle-design.md)补当前真实后台签名交付等待及单次dispatch后四类变化。子任务不另计98项，父TX-10／07与试用保持开放，原7条journal／有界回放保持。

| 子任务 | 当前状态 | 已证实范围与余项 |
| --- | --- | --- |
| AUTH1 | 完成 | 当前调用、Sui官方文档与固定99b823源码、设计与Task先存 |
| AUTH2 | 本批完整8组通过 | [串行08](./workLog/20261005-sign-dispatch-lifecycle-sign-hold-08.json)：两类真实签名返回暂扣×四种事件，27模拟／18同bytes正式模拟、0Execute／0返回签名／0journal变化，原方法及安全拦截恢复，当前worker与启动／重启核验通过 |
| AUTH3 | 四类脚本已编码，实测未完整通过 | 锁定一笔实际提交CCNYbcx、真实200／grpc-status0成功BCS及pending保持；初始整轮清理失败，原摘要只读复核另成功。初次模拟帧未持久化，不扩展为整轮通过；切网／切账户／caller取消01三轮各3模拟1Execute完整通过，原pending保持及锁定原摘要恢复通过；原lock整轮失败与模拟帧缺口保持 |
| AUTH4 | 当前8组批准前完整通过 | [第三轮03](./workLog/20261005-sign-dispatch-lifecycle-approval-matrix-03.json)6模拟0Execute，启动／重启worker一致；01／02失败不改写；生产源码未变，无重复全量／tsc声明 |
| AUTH5 | 本批有限审核完成，后续逐次延续 | 最终原7逻辑SHA与N逐项相同；新增四attempt当前绑定／3 stores／原签名与effects只读终态审核通过，0模拟0提交；原回放0–122625／122626 markers、原22水位保持，无终态不resume |
| AUTH6 | 本批有限范围已同步 | 全部失败／成功／来源、脚本清单和双方新增2处合同同步；AUTH3余项随实测继续更新，完整父合同及试用门槛仍开放 |

本批准确范围见[完整工作日志](./workLog/20261005-sign-dispatch-lifecycle.md)。

## NET-04：持久网络观察与完整能力状态子任务

按[CAP1–CAP7实施前设计](./workLog/20261005-network-observations-design.md)推进，先补跨操作／窗口／worker持久水位与准入，再完成完整SDL／package／coverage和全局UI状态。父NET-04仍开放，子任务不另计98项。

| 子任务 | 状态 | 范围与门槛 |
| --- | --- | --- |
| CAP1 | 本批编码与有限验证完成 | 独立数据库、严格scope／原生角色水位、迟到并发与真实倒退区分、strict complete隔离 |
| CAP2 | 本批编码与有限验证完成 | 后台每次授权接入，取消／不可用／损坏拒绝；只读旧摘要不借恢复签名 |
| CAP3 | 原生夹具16项通过 | 原生Chromium跨连接／窗口／worker、abort、损坏、迟到、新generation |
| CAP4 | 本批有限合同完成 | 新稳定产物／AST／闭包、原7＋新增四只读审计、新产物只签名与隔离，不沿用N旧通过 |
| CAP5 | NC1／NC2本批有限合同完成；完整合同仍开放 | [NC1–NC6实施前拆解](./workLog/20261005-network-capabilities-design.md)：完整SDL／服务能力／coverage／package／registry／accountHistory聚合 |
| CAP6 | 后续必需 | 全局缓存撤值、跨操作负面身份、完整UI状态与受控重新绑定 |
| CAP7 | 本批审核同步，后续逐批延续 | 来源／双方合同／所有失败和进度；逐项完成才勾父任务 |

NC1／NC2实现、全量1712项、真实六领域与两项未通过、optional自省扩展失败及来源见[本批日志](./workLog/20261005-network-capabilities.md)。NC3–NC6和CAP6继续必需，新产物／Chrome尚未完成。

CAP1–CAP4本批有限证据、所有失败和未完成父合同见[实施日志](./workLog/20261005-network-observations.md)；CAP5／6继续必需，子任务不另计98项。

## NET-04 CAP5 NC3：原生服务／部署合同子任务

按[NC3A–C实施前设计](./workLog/20261005-native-service-capabilities-design.md)实施；父98项计数不变。

| 子项 | 当前状态 | 交付 |
| --- | --- | --- |
| NC3A | 本批有限合同完成 | 六Fullnode／二Archive明确只读方法正例与身份包围／预算／实际只读报告 |
| NC3B | B1–B3目录编码与本配置有限验证完成；完整验收开放 | 当前固定codec／显式调用ABI与bytecode关联；全部实际部署／可选业务由后续合同继续验证 |
| NC3C | C1–3 Move声明／名称锚编码与有限验证完成；完整签认开放 | 独立发布pin／包版本／profile revision及suins-v1嵌入双Table；当前无声明／名称部署，服务运行revision／签认C4–5及NC4–6仍必需 |

NC4账户限定合同、5条真实事实与默认20秒末验本批通过；服务全集认证仍false。NC5完整聚合／CAP6全局撤值、NC6新产物及完整Chrome继续必需。

NC3A编码、新增36／全量1748项、两组完整类型、实际十只读请求及首轮失败保留见[实施日志](./workLog/20261005-native-service-capabilities.md)；NC3B／C与父NET-04继续开放。

## NET-04 NC3B：包及完整ABI子任务

按[B1–B3实施前设计](./workLog/20261005-move-package-capabilities-design.md)；子项不另计98。

| 子项 | 当前状态 | 交付 |
| --- | --- | --- |
| B1 | 本批所选合同完成 | Kiosk／PersonalKiosk／OriginByte及基础依赖完整结构／函数ABI审核模板与严格比较 |
| B2 | 本批有限验证完成 | 实际包BCS／GetPackage／typeOrigin／对象稳定关联与同链只读探测，领域依赖／负状态 |
| B3 | 本批目录编码与有限验证完成 | 全钱包固定codec／调用目录、Coin／staking／名称ABI及类型引用闭包；实际registry／声明、可选业务、NC4–6与CAP6仍必需 |

B1／B2新增74／全量1822、完整钱包与五能力脚本类型实际0、当前两包8次只读及所选完整ABI通过；未配置Kiosk／PersonalKiosk／名称不作实链通过。B3／NC3C–6／CAP6及父仍开放，详见[本批日志](./workLog/20261005-move-package-capabilities.md)。

## NET-04 NC3B B3：全钱包目录子任务

按[B3.1–3编码前设计](./workLog/20261005-move-contract-catalog-design.md)，原B1／B2源码已保存；不另计98。

| 子项 | 状态 | 范围 |
| --- | --- | --- |
| B3.1 | 本批编码与有限验证完成 | 标准库／Coin及完整reader依赖、动态字段与Display键 |
| B3.2 | 本批编码与有限验证完成 | 系统v1／v2及完整质押类型／函数 |
| B3.3 | 本批目录编码与有限验证完成 | 名称ABI／目录闭包、来源独立反例及真实全量验证；NC3C–6和CAP6仍必需 |

B3全配置50布局／8函数、源码独立结构／调用闭包、149文件1874项与类型实际0、当前46布局／6函数／14只读请求通过。PK／names／原生Kiosk配置不冒作实链业务通过；首轮失败及原7源码字节保留，NC3C–6／CAP6和父仍必需。见[本批日志](./workLog/20261005-move-contract-catalog.md)。

## NET-04 NC3C：部署与名称锚子任务

编码前依据[实施设计](./workLog/20261005-deployment-contract-design.md)拆解；当前无名称配置／独立审核声明，不将观测自签为部署证明。

| 子项 | 状态 | 必需交付 |
| --- | --- | --- |
| C1 | 编码与夹具完成 | 独立可信摘要／精确profile revision绑定及全部包BCS／版本／模块pin；实际声明未配置 |
| C2 | 编码与夹具完成 | 来源审核RegistryKey与嵌入双Table UID，根共享／确定性字段／稳定引用；当前实际名称未配置 |
| C3 | 本批有限验证完成 | 新增67／全量1941、钱包／六脚本类型与14只读负面声明报告；并非实际签认通过 |
| C4 | 当前配置四包独立发布pin完成；可选未配置业务不作通过 | [24,451认证检查点及原编译逐字审核](./workLog/20261006-NET-04-independent-release.md)，四包真实匹配／错误pin降级；名称／PK等启用时仍需对应部署与业务验收 |
| C5 | 后续必需 | 服务build／运行revision／部署签认；不把GetServiceInfo.server或本地profile revision当权威证明；C4离线认证不提升serviceDeployment |

C1–3范围／全部首次失败保留与后续C4–5见[本批日志](./workLog/20261005-deployment-contract.md)；父NET-04、NC4–6／CAP6及试用门槛仍开放。

## NET-04 NC4：账户历史子任务

先按[实施设计](./workLog/20261005-account-history-capabilities-design.md)拆解，独立入口受限合同不要求自省。

| 子项 | 状态 | 必需交付 |
| --- | --- | --- |
| H1 | 本批有限合同完成 | 唯一两根协议／原生六依赖与固定source／SDL合同，独立原生窗口／digest末验 |
| H2 | 本批编码及反例完成 | reader单期限／2MiB／共享leaf与异步cleanup、取消迟到／角色与已知末尾错链；生产限额保持 |
| H3 | 本批限定scope完成 | coverage-only五读、显式账户六读完整5条及原六旗标；默认20秒独立reader末验通过，全集认证false |
| H4 | 本批有限验证完成 | 新增91项，147定向／153文件2032全量及完整类型通过；实际有限scope／双方／来源／进度同步，默认并发全量首次超时保留 |

H4a（本批编码与有限验证完成）：按[真实503诊断后的实施前补充](./workLog/20261005-account-history-capabilities-design.md#h4a真实上游503诊断后的错误合同补充编码前)补服务公共错误白名单与有限UI／capability分类，不接纳partial或自动重试；全集认证与完整试用验收保持开放。

H4b（本批编码与5条真实末验完成）：按[真实包发布修复前设计](./workLog/20261005-account-history-capabilities-design.md#h4b真实包发布事实修复编码前)修正package标记与BCS PackageWrite的严格对应，保留全部原事实校验，新增反例后只读复核原5条实际账户历史。

NC4最终有限证据见[本批完整日志](./workLog/20261005-account-history-capabilities.md)及[生产默认20秒证明](./workLog/20261005-account-history-capabilities-default-budget-proof-01.json)；包含所有初次失败、权威来源、原字节、最新debug与受保护回放原22水位证明，父49/98及trial_ready=false保持。

## NET-04 NC5／CAP6：完整聚合与全局撤值子任务

按[实施前设计](./workLog/20261005-network-capabilities-aggregate-design.md)及[只读接入审计](./workLog/20261005-network-capabilities-aggregate-pre-audit.md)实施；G1–5／G4a本批有限验证见[完整日志](./workLog/20261005-network-capabilities-aggregate.md)，CAP6 F1–4继续。子项不另计98项。

| 子项 | 状态 | 工作及验证 |
| --- | --- | --- |
| G1 | 编码／有限合同通过 | 复用schema／领域、native、Move部署及独立account有限报告聚合，精确本次binding／session |
| G2 | 编码／有限合同通过 | 单总期限／精确四入口与只读method白名单、共享leaf／2MiB／等待异步cleanup，禁止执行与迟到 |
| G3 | 编码／有限合同通过 | 新鲜前后身份／已知错链优先、角色明确降级、取消／过时与旧值拒绝 |
| G4 | 当前完整轮次通过 | 完整组合／proof边界／body及所有故障、来源／全量／类型验证 |
| G4a | 夹具修复及完整轮次通过 | 全量01并发批准窗口夹具按实际关联请求等待，保留同时发起／独立关闭，不假设摘要完成次序 |
| G5 | 本批真实有限报告通过 | 同profile当前真实聚合只读报告及各负项，0模拟／签名／Execute |
| F1 | 部分实际接入／有限验证通过 | F1a–b、F1c当前Provider NC5及受控编译输入完成有限范围；F1d后台同审核ABI／真实发布pin仍待 |
| F2 | 部分实际接入／有限验证通过 | F2a–b、F2c.1／2a及2b原ticket NC5协调完成有限范围；当前SDK＋native协调／最终竞争及恢复边界仍待 |
| F3 | 部分编码／有限验证通过 | Provider精确query撤值／已接入读Hook当前error或disabled隐藏旧值；全部批准UI及旧journal边界仍待 |
| F4 | 待实施 | 全局UI／后台／cache测试、新产物／核心Chrome／journal保护与双方日志进度 |

### CAP6 F1–4编码前细化（不另计父任务）

按[17来源接入审计](./workLog/20261005-network-admission-global-pre-audit.md)与[实施前细化](./workLog/20261005-network-admission-global-design.md)推进；F1a–b编码及75项新增／2151项全量有限验证见[本批日志](./workLog/20261005-network-admission-view.md)。F1c–d接入依赖F2a–b精确持久门槛，先完成后者再接入；未新增父任务完成数。

| 子项 | 状态 | 范围 |
| --- | --- | --- |
| F1a–b | 编码／有限合同通过 | 纯core状态投影／精确受控发布registry；75项新增、2151全量／类型0，真实独立发布签认仍待 |
| F2a–b | 编码／原生有限验证通过 | F2a.1–3及F2b.1–2完成；本批13新项／2225全量／26原生／三套类型0，实际门槛未接入 |
| F1c–d | F1c有限实现通过／F1d待 | 当前Provider NC5及受控编译输入；后台同审核ABI仍待，聚合不授权交易 |
| F2c–d | 部分后台身份已接入 | F2c.1完成19新项／2244全量／14原生；观察协调／跨context撤值／最终竞争和恢复反例仍待 |
| F3a–c | 部分编码／有限验证通过 | 精确binding/session清理与多数读Hook撤值、原save/hydrate过滤保持；全部批准UI／readonly原journal例外仍待 |
| F4a–b | 部分UI／后台有限验证通过 | 后台守卫／存储失败和实际React查询撤值通过有限范围；全部新旧交易边界仍待 |
| F4c–d | 待实施 | Chromium多context／新产物／核心Chrome／正常CA、原journal保护与文档进度 |

### CAP6 F2a–b：观察前占位／分类与存储细项

按[编码前设计](./workLog/20261005-network-admission-state-design.md)与[本批日志](./workLog/20261005-network-admission-state.md)继续，纯状态成功不代替原生存储或实际接入。F2b独立存储已按[实施前设计](./workLog/20261005-network-admission-store-design.md)编码并通过[原生有限验证](./workLog/20261005-network-admission-store.md)，先占位提交后IO，失败后新实例不能补造正面。F1c–d／F2c实际门槛继续，父计数保持。

| 子项 | 状态 | 范围与门槛 |
| --- | --- | --- |
| F2a.1 | 纯合同编码／有限验证通过 | 精确有限Fault／area／记录、pending reserve／当前值complete、单调并发合并与依赖拒绝 |
| F2a.2 | 分类编码／有限协议通过 | 真正identity错误类、当前生产报告的领域schema／Move ABI；不伪造瞬时失败／缺签认 |
| F2a.3 | 当前完整轮次通过 | 61新项、四文件120／完整159文件2212、RPC／钱包类型与格式0，首次失败字节保留 |
| F2b.1 | 编码／有限合同通过 | 独立strict IDB／原对象所有权／首次决定、同一5000ms总期限、即时失败及迟到拒绝；13新项／2225全量／三套类型0 |
| F2b.2 | 原生有限验证通过 | 26项native事务／多实例／跨页／worker及浏览器正常重启；首次失败留存，不替代物理断电／全局业务验收 |

### CAP6实际接入下一步顺序（不另计父任务）

[F2b已验证存储](./workLog/20261005-network-admission-store.md)后，按[12来源实际接入审计](./workLog/20261005-network-admission-runtime-pre-audit.md)推进，业务文件修改前保存原字节。F2c.1已按[实施前设计](./workLog/20261005-network-admission-authorization-design.md)编码并取得[有限验证](./workLog/20261005-network-admission-authorization.md)；其它子项仍待，12来源原始只读审计不计编码通过。

| 子项 | 状态 | 范围与验证 |
| --- | --- | --- |
| F2c.1 | 编码／原生有限验证通过 | 实际默认后台守卫先strict占位后SDK、负面／取消／完成失败保守拒绝；19新项／2244全量／14原生／三套类型0；三入口不伪造accountHistory正例 |
| F2c.2 | 部分编码／有限验证通过 | F2c.2a负面consumer及2b同session NC5原ticket协调通过有限验证；当前SDK＋native／最终授权竞争仍待 |
| F1c–d接入 | F1c有限实现通过／F1d待 | Provider当前NC5及受控编译registry已接；后台同审核ABI仍待，依赖范围隔离，不用聚合授权／跨域S |
| F3撤值 | 部分编码／有限验证通过 | 保留21秒慢资产与余额独立；identity全binding、domain依赖及精确QueryClient撤值通过；全部批准UI仍待 |
| F2d／F4 | 待实施 | 原scope／H0旧journal只读摘要恢复、0新模拟签名Execute，反例／新产品构建与完整核心Chrome |

### CAP6 F2c.2a／F3：实际Provider负面消费有限收口

按[实施前设计](./workLog/20261005-network-admission-provider-design.md)与[完整日志](./workLog/20261005-network-admission-provider.md)完成本轮编码／有限验证；41新项、163文件2285全量、18文件178定向、13原生多context／正常浏览器重启、三套类型与37来源格式实际0。首次失败与30份原字节、完整产品哈希重建保留。F1c–d同session NC5／受控发布输入尚未实施；普通读不新造观察ticket，original-owner协调与最终授权竞争、完整批准UI／readonly原journal例外和当前扩展核心Chrome继续必需，父计数保持。

### CAP6 F1c／F2c.2b：当前会话NC5与原ticket协调有限收口

按[先存设计](./workLog/20261005-network-admission-observation-design.md)及[完整日志](./workLog/20261005-network-admission-observation.md)完成本轮编码／有限验证：32新项、165文件2317全量、187定向功能、三套类型与12来源格式、6真实common配置独立编译实际0。Provider独立生命周期、原占位先提交后SDK、叶请求取消／cleanup在途不空完成、闭会话负面模板及旧正面撤销通过；13当前来源／120完整来源、8原字节／15诊断副本及1072产品精确重建保留。memory／React不能代称当前SDK＋native协调及扩展验收；F1d真实后台审核ABI、独立发布pin、最终原子授权竞争／批准UI／journal恢复例外及F4核心Chrome继续必需，父计数保持。

### CAP6 F2c.2b：当前SDK＋native协调补充证据

按[先存设计](./workLog/20261005-network-capability-observation-native-design.md)执行，[完整日志](./workLog/20261005-network-capability-observation-native.md)记录10项原生全部通过、48合成请求、类型／格式／语法实际0。120既有来源及1072产品字节未变，加2验证来源共122；没有新扩展／真实链或物理故障验收。F2c.2b仅上述协调边界有限通过，后台同审核ABI、最终授权竞争、批准与恢复例外、四入口正常CA和F4核心Chrome继续开放；父49/98保持。

### CAP6 F1d：后台审核部署与固定交易依赖细项

[当前审计](./workLog/20261005-background-move-admission-pre-audit.md)与[实施前设计](./workLog/20261005-background-move-admission-design.md)已存。F1d.0仅25来源只读调用链／4官方快照已核对；F1d.1精确固定bytes依赖、.2后台原ticket SDK／存储协调、.3依赖政策末检、.4内部新操作边界、.5dApp只签名／执行与readonly例外、.6定向／全量／native／扩展收口均待，不增加已完成父计数。builtin不能伪成Move ABI；现阶段没有业务修改或新发布／签名／模拟／Execute。

### CAP6 F1d.1–6：后台固定依赖门槛本轮有限收口

[本轮日志](./workLog/20261005-background-move-admission.md)记录.1–5上述有限编码、.6定向／全量／native实际证据：41新项、167文件2358全量、9文件164定向、14原生58请求与类型／格式通过；首次两类失败原日志／字节保留。真正后台完整dApp批准／恢复、独立真实发布pin／服务签认、最终原子授权竞争、正常CA与当前扩展核心Chrome继续必需；父清单不预勾，49/98、trial_ready=false保持。


## NET-10 M4/M5：统计消费者收口

A1–A4按[设计](./workLog/20261005-consumer-analytics-design.md)与[实际检查](./workLog/20261005-consumer-analytics.md)完成：明确无能力、不伪SDK或零数据、实际Checkpoint精度／错误、38完整测试、完整Explorer构建／core类型与闭网production启动。父NET-10按消费者构建合同已完成；未启用统计服务／真实Explorer数据与钱包试用未提升。


## NET-04 / TX-01: C11 P1-P4

按[实施前设计](./workLog/20261005-transient-capability-observation-design.md)完成P1–P4有限范围：持续页面独立观察，精确dApp连接／批准路由及toolbar popup不自动启动完整被动NC5，明确unavailable/policy，不复用正报告。owned session／native负面订阅、所有reader合同与后台固定BCS依赖门槛保持。旧pending、已知Fault及取消未知状态不删除，不使用TTL或空complete。

两个C10失败profile及C11成功profile均保留，私有恢复密码仅权限0600文件。正常CA三个HTTPS失败仍待，精确SPKI不代替CA。持续页面首轮未知原因、旧票据安全恢复、真实发布签认、最终原子授权、完整Move与全试用继续。有限子任务不新增父完成：50/98、trial_ready=false。

[workLog](./workLog/20261005-transient-capability-observation.md)


## NET-04 / NET-11 / TRY-06: owned deadlines

[复现与设计](./workLog/20261005-identity-deadline-design.md)、[C12边界及失败](./workLog/20261005-local-external-services.md)：九个有限读取路径计时器已修正，360定向／2382完整回归／类型／构建通过，当前真实只签名3模拟／0Execute通过；旧pending保留，环境随后退出，父项仍开放。见[完整日志](./workLog/20261005-probe-deadline.md)。

## 2026-10-05：dev冷启动恢复子任务

按[设计与实际恢复](./workLog/20261005-dev-cold-resume.md)完成Docker依赖／当前debug核心／十伴随服务／publisher恢复及8门槛测试；原有界失败保留，独立严格前缀续跑至386503中，全22流水线尚未resume。共同快照和fresh业务／NET-07仍失败待复验，父50/98不变；不以进程Up勾完成。

## 2026-10-05：checkpoint TCP诊断与恢复

按[计划及实际结果](./workLog/20261005-checkpoint-transport-latency.md)完成候选34主机／3部署守卫、原CA/mTLS同链字节证明、实际应用与12对12延迟比较；没有收益，原镜像和精确源字节恢复，恢复后02日志34通过。不勾性能／积压／业务试用，51/98不变；发布与SQL共同S仍待。


## NET-04／TX-01：最终动作准入F1–F5有限收口

按[设计](./workLog/20261006-final-admission-design.md)和[收口](./workLog/20261006-final-admission-completion.md)完成F1原生／reader复现、F2事务事件同步门槛、F3 authorizer每次末检、F4实际fetch及签名开始／返回接入、F5原生33项／189定向／2408全量／C15真实只签名及原七journal。子项均完成其有限范围，不新增98父任务；外部dApp真正消息出口、发布权威、完整权限与未知交易恢复继续，父保持开放。

## ENV-06：连接预算G1–G5

| 子项 | 当前状态 | 必需证据 |
| --- | --- | --- |
| G1 | 候选编码完成 | 原renderer复用，128全局连接／64 H2流 |
| G2 | 未部署候选实际验证通过 | 固定镜像33协议，64合法流PING、第65连接关闭，原基线134空连接保留 |
| G3 | 完成 | 原生64MiB／钱包帧头64MiB、64KiB、调用128MiB；真实codec四项及2426全量 |
| G4 | 完成 | 原字节与无重放守卫、最新debug与bounded桥接安装、真实同链／持久启动复验 |
| G5 | 完成 | 双方预算合同与收口日志对齐；父ENV-06完成，ENV-07／试用继续 |

见[设计](./workLog/20261006-ENV-06-budget-design.md)及[连接实测](./workLog/20261006-ENV-06-connection-verification.md)。


### ENV-06 G3：消息预算M1–M5

按[实施前设计](./workLog/20261006-message-budget-design.md)：M1原生64MiB编码门槛已编码；M2真实Tonic边界测试进行中；M3钱包全部实际binary客户端64MiB／64KiB／128MiB帧头检查已编码、18新增通过；M4全量与最新8 debug构建进行中；M5受控安装／实际同链及文档完整收口待。原部署／旧产物不能充当新源码验收，父未勾选。

### ENV-06 M1–M5实际终态

M1–M4编码、真实codec四项、18新增／171文件2426全量、类型、C16与8 debug通过；M5最新debug与三辅助、bounded桥接持久升级及原同链20请求通过。原全部失败与七journal保留，无数据库重置／手改水位／强杀／广播。见[收口](./workLog/20261006-ENV-06-completion.md)。先前进行中记录为历史阶段，当前54/98，trial_ready=false。

## NET-04／TX-01：实际页面签名出口E1–E7

按[实施前设计及原生fixture结果](./workLog/20261006-dapp-egress-design.md)推进；子项不另计98项，父任务保持未完成。

| 子项 | 状态 | 必需交付 |
| --- | --- | --- |
| E1 | 有限审计完成 | Chrome官方宿主/扩展存储边界与原代码IPC后出口缺口 |
| E2 | 原生原语验证完成 | 03共享IDB/negative守卫；04原CSP拒绝；05popup COOP断opener；零签名/交易，非产品通过 |
| E3 | 候选编码/原生通过，正式集成待 | 同原生DB严格context/ticket、来源/账户/binding/TTL及升级保持原Fault |
| E4 | 真实状态写入编码/原生47项通过，生命周期组合待 | 所有上下文状态变更前原生pending/revision屏障；来源/请求监听随E5保持到交付结束 |
| E5 | 实际producer/封存/交付lifetime已接入，实签待 | 同lease动作前门槛、持久一次性消费、最终同步post与ack；abort不重放 |
| E6 | 产品入口与UI双门槛已接入，完整来源矩阵待 | 正式通道33、UI原生5项；CSP/COOP及跨tab/frame伪造/取消 |
| E7 | C17/全量/类型/生产闭包/原7journal通过，实签待 | 当前源码/异步UI/worker匹配；实际签名及父合同审核继续 |

[候选原生62项与失败修复](./workLog/20261006-dapp-egress-protocol.md)仅E3/E4/E5有限候选；当前C16未改，父NET-04/TX-01/TX-10仍开放。

[E6候选42项与全部失败保留](./workLog/20261006-dapp-egress-surface-completion.md)：两端private挑战/native当前context/UI入口和后台top-frame、盗取cap跨tab/同tab未确认、导航/拆除/真实30秒超时实际通过；正式canonical/状态写入/真实签名出口与产品CSP组合仍待，子项不增加98项父计数。

E3正式编码按[E3A–D实施前清单](./workLog/20261006-canonical-egress-design.md)推进：shared原库v2保留、canonical profile/negative/one-use门槛、编译正式代码原生Chrome矩阵及新源码验证。E4/E5/E6产品组合继续后续，未由候选或class独立关闭父项。

E3A/B/C有限编码与正式原生44项、原准入33项、114定向/2442全量/类型及最新独立production闭包已通过，见[E3日志](./workLog/20261006-canonical-egress-implementation.md)。原生产库实际升级、C17UI/worker/七journal随E7组合；产品当前源码1087/d0b8767b，原distC16，不冒用旧动态验收。E4真实写入/E5真实私有签名/E6产品组合继续。

E4状态写入按[编码前清单](./workLog/20261006-context-mutation-design.md)接入，[有限验收](./workLog/20261006-context-mutation-implementation.md)47原生/28定向/173文件2452全量/类型/最新production闭包通过。最新1090份源码444a0d20，C16/E3为精确保留的历史来源；源/请求生命周期及真实签名出口继续E5/E6，原数据升级与UI/worker随E7，父58/98不变。

### E8 · 真实网络切换失败观察收尾

依据：[编码前合同](./workLog/20261006-observation-terminal-settlement-design.md)。原 C17 网络切换 02／03 的真实失败和未知 pending 保留，父项计数 59/98。

- [x] E8-1 原 ticket／binding lifetime、全部 raw work 和 fetch／body／cancel 清理跟踪；一次性 WeakMap 收尾、Fault 保留及 strict 原拥有者 finishFailed。
- [x] E8-2 忽略取消／未结束清理、零 IO 取消、失去所有权／克隆／重放／事务 abort，以及已确认 schema／ABI 后取消验证。86 定向、额外 6 负面、原生四类实际检查通过。
- [x] E8-3 完整 178 文件 2510 测试、钱包类型、独立 production 构建与 5274 模块／2032 源码／7 chunks 闭包通过；首次类型注解错误保留。
- [x] E8-4 保存 C17 原产物，C18 实际 UI／worker 与新字节匹配、原七 journal 惰性保持；完整真实网络切换／账户／取消和 signData 持有八事件验证。[有限实施验收](./workLog/20261006-terminal-observation-implementation.md)。
- [ ] E8-5 当前证据总审计、逐父合同审核；普通 Chrome TLS、独立发布声明、全部域／业务与回滚未验收项继续开放。

### 独立回环开发查询入口J1–J5

按[实施前合同](./workLog/20261006-loopback-query-design.md)推进；不增加98父项，不以回环HTTP替代原HTTPS信任验收。

- [x] J1 原政策／官方权限／三入口manifest、最新debug与H0准入。
- [x] J2 link-u-smart-contract独立回环透明入口，原TLS与publication准入保持。
- [x] J3 独立revision与认证离线声明、隔离候选和完整闭包。
- [x] J4 无Chrome证书例外的四角色真实H0／字节／末status。
- [x] J5 双方文档与进度同步、实际业务回归继续。

### QA-A02当前真实Chrome能力R1–R5

按[实施前合同](./workLog/20261006-QA-A02-loopback-design.md)推进，只有全部验收后才改变父项；HTTPS仍独立验收。

- [x] R1 当前候选／profile／独立声明与实际四角色H0准入（独立回环J1–J5及有限综合审核通过，不称原HTTPS验收）。
- [x] R2 当前源码浏览器只读驱动与真实Fetch报文／前后身份。
- [x] R3 schema／各领域／native／Move与独立包声明比对。
- [x] R4 实际错H0及错pin／revision拒绝，0模拟／签名／Execute。
- [x] R5 完整原父合同审核、失败保留及双方进度同步。

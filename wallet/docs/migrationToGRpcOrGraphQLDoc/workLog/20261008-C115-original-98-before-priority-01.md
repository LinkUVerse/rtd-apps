# 钱包 JSON-RPC 全量迁移 Task

当前状态（2026-10-08，C102完整五父合同已实际验收）：**89/98，剩余9父；细分剩余9.18%，trial_ready=false**。RPC-22／23、TX-08、TRY-05和QA-A07依据[完整父审核](./workLog/20261008-C102-five-parent-completion-01.json)及[完整当前页面原文](./workLog/20261008-C102-current-three-owner-browser-independent-04.json)收口；当前API164完整回复、13／5／3／6及全部三账户页面、24历史对象批量槽位／51typed S已核验。三真实504分别留作负向连接失败证据，不能当数据或根因修复；全部原失败保留。额外03页面行为通过871／317、三个profile正常锁定关闭，完整HTTP均200，严格补充审核05／06真实503失败，不计额外轮完成。两组链／索引器用途核查后保留，0停止信号；本轮临时网关已精确正常清理并释放三个端口，原29／14／25保持。

以下阶段摘要保留为历史，当前数字以上段与totalProgress为准。

最新状态（2026-10-08，C98实际安全接续完成）：**84/98，14父继续（14.3%），trial_ready=false**。[实际六阶段独立终验](./workLog/20261008-C98-actual-handoff-independent-01.json)认证原709569批次自然waiting_timeout、无child／lock0和完整32104行连续prepared不变，原92149正常stopped／PID移除，新83360实际原venv／C96合格候选已安装并工作。[唯一观察终态](./workLog/20261008-C98-terminal-handoff-watch-01.json)真实1150.836秒结束、一次attempt／installed，完整原父STOP／TERM／CONT收据，0child／group信号、0直接SQL／object业务写。原1456文件／29容器14健康25actors／source八debug及产品1120a03保持，清理累计181。[安装后七门03](./workLog/20261008-C98-successor-nft-post-write-readiness-03.json)正式553728／pending709569，六门仍不足原524022；完整13／5／3／6 API与C88独立审核、全部Chrome／四路M3及14父仍待。P98-4及P96-4限定接续完成，P98-5／P96-5继续；普通Chrome安装许可已执行，原初始化／CA步骤待主人。


创建日期：2026-10-03（北京时间）。每项只有源码／文档及规定验证证据全部成立才勾选；实施中的工作写 workLog，未通过不计完成。完整目标不缩小为局部切片。01–08 是钱包主体，09–13 的通用规范和有用 Mobile 参考已纳入，Mobile 编码不在本任务范围。

顺序：DOC → NET → RPC 与 TX（按依赖逐项）→ ENV／TRY 核心验证 → 主人试用期间 QA 全矩阵 → REL 发布审计。ENV 传输准备可提前，但不会阻断不依赖环境的全部接口编码；生产 HA 不阻断本地试用。每次变更后运行 scripts/update-migration-progress.py 更新 totalProgress.md。

最新状态（2026-10-08，C97隔离实验完成且拒绝安装）：**84/98，14父仍开放（14.3%），trial_ready=false**。[完整实验独立审核](./workLog/20261008-C97-socket-experiment-independent-01.json)认证128ABBA／136完整帧、15SQL／14对象与真实错误CA／SAN／缺client拒绝；2路1.043／4路1.221，预设双场景门未全部通过，未安装、未证明live提速。五临时容器全部清理，累计181；原29／14／25／1456／source八debug保持，0原信号／业务写／签名或Execute。[C96观察](./workLog/20261008-C96-terminal-handoff-watch-01.json)自然3600秒结束、未尝试交接；原92149／59696工作。[最新七覆盖03](./workLog/20261008-C96-successor-nft-post-write-readiness-03.json)正式553728／pending709569，HBase／SQL／Rocks最低507841/507839/507846、账户507818，六门仍不足524022。P96-4／5与全部14父继续，普通Chrome安装已完成，初始化／CA仍待原用户步骤。

最新状态（2026-10-08，C95真实Wallet Standard赞助NFT双签／外部执行已完成）：**84/98，剩余14父项（14.3%），trial_ready=false**。[C95完整日志](./workLog/20261008-C95-progress.md)与[独立交付](./workLog/20261008-C95-delivery-independent-01.json)核验当前生产sender实际批准／同byte双签、唯一专用mint695204和唯一外部Execute696489，178请求／176成功完整回复＋2真实滞后headers、5ENABLED模拟／同批准三模拟。sender余额不变、sponsor实际gas1024244，原27对象／1456文件／29容器14健康25actors／source八debug／1120产品a03保持。失败和两次原digest只读恢复留存，0重发／Faucet／新Docker／原服务信号。额外serial95当前位于C93 newTarget，后续完整账户资产不得遗漏；原四类库存不移动。Wallet单签赞助execute拒绝保持，全部Kiosk内部授权／竞争、正式索引、普通Chrome与14父继续。

下列旧阶段摘要保留为历史，当前数量与运行状态以上述最新入口及totalProgress为准。

2026-10-07最新依赖推进见[发布门禁分段诊断／隔离TLS候选／C40 framework前置](./workLog/20261007-guarded-ingestion-progress.md)：当前28容器／14healthy、原25命令／两套中间件保持；吞吐未达安装门槛的候选未启用，两只临时只读容器已清理。framework十字段154298未达到180806，实际执行仍未开始；81/98和17父项开放不变。

当前后续细粒度P9／R2a–d见[对象并行候选与有限认证区间清单](./workLog/20261007-parallel-objects-progress.md)：候选已测但未提速达标，未安装；30只确认退役只读容器已清理。新有限输入R2a已经519.57秒实际完成完整认证／SQL／SHA／允许成员双端latest复核；R2b有限服务与独立debug等价已通过，正式切换仍待，父计数保持81/98。

R2b已经[实际资格03与独立全审核](./workLog/20261007-parallel-objects-progress.md)完成；后续R2c按[C1–C7正式三消费者追平／恢复／ownership子清单](./workLog/20261007-certified-interval-catchup-design.md)依次推进，C1真实计划和持久HBase／28容器已审核、0信号／0launch，C2–C7待；原失败范围保留，98父计数不据此增加。

R2c[C1–C7实施](./workLog/20261007-certified-interval-catchup-design.md)已进入C4运行：C2实际source验证／C3指定三consumer有限启动完成，原数据和其它22进程／两core／28容器保持。控制器负责完整终态、失败恢复原命令及后继认可；未完成不可重复启动或记父任务成功。

最新子项：[质押数量重新预览与私有可信前缀准备](./workLog/20261007-G3-staking-preview-revision-progress.md)。B1–B4实测及独立审核通过，Gas变化／全部内部入口／赎回／C42完整运行验收未完成；84/98保持，P1–P4私有可信前缀准备及独立审核已通过，servable=0／未安装；原G4完整目标及恢复已完成并独立通过，当前C42实际矩阵和framework只读补证见最新进度。

最新核心子项：[新仓位赎回W1–W4](./workLog/20261007-G3-withdraw-core-progress.md)实际43原帧／四ENABLED模拟和独立审核通过，含真实Gas变化后的旧摘要拒绝；只Node核心，不勾TX-01／TX-04／TX-08或其他98父项。

最新运行子项：[G4完成、C42真实收件人与退役清理](./workLog/20261007-C42-live-registration-risk-and-restoration-progress.md)。G4、D5限定子合同完成，98父项仍84/98；[当前framework F1–F4](./workLog/20261007-C42-framework-post-transfer-design.md)已完成限定写后读与两角色C42 UI，完整TX08/名称/质押/竞争继续，归档503与普通Chrome CA尚未收口。

截至2026-10-08 02:15:30的当前状态见[实时记录](./workLog/current-state.md)：84/98，14父项开放；C58四轮完整有限数据与独立04通过，H58-1–3完成、116确认退役；中位比1.087低于1.20，未部署。C51网关21实际请求通过、普通Chrome页面／CA仍待；C60已自然3600秒结束并独立终验，未attempt／安装／信号。上方旧阶段条目保留为历史。

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
- [x] `RPC-03` 拥有对象复杂筛选、全分页、NFT／隐藏资产／非视觉／display／owner 页面。[实际S55580／S55655拥有对象与分类](./workLog/20261004-owned-assets-live.md)已验证；[真实同快照13对象跨5页与默认读取深比较已通过](./workLog/20261004-owned-pagination.md)；直接NFT display及Chrome仍待。 [Chrome真实10个非视觉对象、Kiosk卡片及空详情已通过](./workLog/20261004-owned-assets-chrome.md)，不代表直接NFT／隐藏或转移验收。 [Personal五pin／实际NFT原摘要／C22风险名单与C23回执等待进展](./workLog/20261006-personal-current-progress.md)已记录；完整本项验收仍待。 [C26 Display V2 D1-D3](./workLog/20261006-display-v2-fixture-progress.md)；D4–D5仍待。 [新链完整认证账户重建A1–A4、六pin生产C28/四角色/原journal保持Chrome验证](./workLog/20261006-default-generation-account-positive-rebuild-design.md)已完成限定范围；[正面夹具P1–P4](./workLog/20261006-default-generation-positive-fixtures-design.md)准备完成，indexed正面内容/最终名称/NFT转移及完整父合同仍待。
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
- [x] `RPC-22` Kiosk／PersonalKiosk／OriginByte 新 SDK 与明确 RTD package、持有／内容／转移。[C102完整父合同审核](./workLog/20261008-C102-five-parent-completion-01.json)保持原C46／C48及既有基础合同；当前1121／763d生产、完整API与三账户页面／原文独立通过13对象／5cap／5Kiosk页／8NFT详情／9-6-1完整历史／6原交易与12receipt查看、24实际archive批量槽位及51完整typed S。风险与历史保守语义／原journal保持，原六笔未重发；普通Chrome与其余父仍独立验收。
- [x] `RPC-23` NFT 转移、地址历史风险提示、buynlarge 与可达共享 core 旧调用清零。[C102完整父合同审核](./workLog/20261008-C102-five-parent-completion-01.json)保持原C46／C48及既有基础合同；当前1121／763d生产、完整API与三账户页面／原文独立通过13对象／5cap／5Kiosk页／8NFT详情／9-6-1完整历史／6原交易与12receipt查看、24实际archive批量槽位及51完整typed S。风险与历史保守语义／原journal保持，原六笔未重发；普通Chrome与其余父仍独立验收。
- [x] `RPC-24` zkLogin残留epoch/latest checkpoint/history已分类并默认禁用创建／签名，既有记录保留只读；历史旧RPC已移除，入口探测改gRPC。证据：[默认禁用与保留日志](./workLog/20261003-RPC-24-zklogin-disabled.md)、[入口日志](./workLog/20261003-RPC-24-entry-access.md)。此项不代表zkLogin业务或Chrome验收通过。
- [x] `RPC-25` Qredo 远程隔离新执行合同、Ledger 残留与法币入口明确支持状态。[支持边界与全量回归](./workLog/20261004-RPC-25-completion.md)；Qredo只读，Ledger／法币未启用，不代表第三方在线或Chrome验收。
- [x] `RPC-26` 21 线协议逐项复核、18 未使用接口不扩范围、构建器／Kiosk依赖闭包无旧请求。[逐项编码落点、四入口AST／模块清单及353项领域测试](./workLog/20261004-RPC-26-completion.md)通过；静态闭包核查不替代真实业务与完整动态流量验收。

## TX · 签名授权与持久恢复编码

依据：05、06、07、12、13；相关完整合同必须随本项实现。

- [ ] `TX-01` 最终 bytes／sender／gas／赞助／expiration 固定，重新模拟和授权边界。当前C46 [dApp完整授权矩阵](./workLog/20261007-C46-current-authorization-matrix-independent-02.json)及[内部Gas再授权](./workLog/20261007-C46-internal-gas-authorization-audit-02.json)已有限定证据；原六NFT批准字节已保存。剩余：全部内部NFT／赞助／有效期及重新授权实际矩阵、逐入口最终完整审核；拒绝型赞助证据不冒充双签实际执行。
- [x] `TX-02` 保持 background 私钥与 Intent，签名 bytes 和预计算 digest 一致。[逐项源码及实际账户密码学核验](./workLog/20261004-TX-02-completion.md)，8文件121项测试；真实Chrome与持久恢复由TRY／其它TX项另验。
- [x] `TX-03` journal v2 IndexedDB durable commit 屏障，schema 升级与旧数据隔离。证据：[实现与原生 Chromium 验证](./workLog/20261003-TX-03-execution-journal.md)。
- [ ] `TX-04` 同 H0/generation/account 的跨窗口互斥，pending 禁止再次构建／签名／发送。按[当前入口矩阵](./workLog/20261006-TX04-current-entry-matrix-design.md)推进，M1a／b／c、M2和C43完整质押／赎回M4均已完成限定合同。剩余M3：直接NFT／framework／Personal／OriginByte当前真实live竞争与durable pending；M5：全入口原帧／journal／签名及请求次数独立审核。六笔成功转移不替代M3。
- [x] `TX-05` 单次 dispatch，传输／取消／缺失回执／错 digest 保持未知。[全调用链核查、101项测试及保留四笔真实交易只读复核](./workLog/20261004-TX-05-completion.md)；真实timeout／caller取消均已有单次提交证据，完整链失败与其它竞态仍归TX-06／07／10／12。
- [x] `TX-06` 成功／FailedTransaction 终结回执验证与持久失败保守恢复。[完整合同、78项测试与新钱包真实MoveAbort／重启锁定恢复](./workLog/20261004-TX-06-completion.md)通过；原生IndexedDB事务中止矩阵亦已验证。其它故障、入口和切换仍归其余TX／RPC／TRY。
- [x] `TX-07` worker／popup／切网切账户重新唤醒恢复原摘要，不因 NotFound 解锁。[后台自动唤醒已编码并验证定向测试与真实alarm注册](./workLog/20261003-TX-background-wakeup.md)，[实链pending跨浏览器／worker重启恢复](./workLog/20261004-TRY-04-completion.md)已通过；后续完整矩阵见本项当前收口证据。 [当前C21完整TX-07合同收口](./workLog/20261006-TX-07-completion.md)：四事件115项及锁定pending跨新worker108项、20实际签名／30启用检查模拟／5各一次真实Execute、受控NOT_FOUND不解锁／0重发和独立原摘要审核通过；旧worker实际停止、原加密source不变，普通ChromeTLS及QA-A10／TX-10其余合同继续。
- [x] `TX-08` GraphQL 写后读覆盖达到目标 checkpoint 后刷新，待索引不改链终态。[C102完整父合同审核](./workLog/20261008-C102-five-parent-completion-01.json)保持原C46／C48及既有基础合同；当前1121／763d生产、完整API与三账户页面／原文独立通过13对象／5cap／5Kiosk页／8NFT详情／9-6-1完整历史／6原交易与12receipt查看、24实际archive批量槽位及51完整typed S。风险与历史保守语义／原journal保持，原六笔未重发；普通Chrome与其余父仍独立验收。
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
- [ ] `ENV-07` 真实 Chrome UI／worker 的 TLS／host permission／同链三入口探测。[普通Chrome空profile实际安装独立核验](./workLog/20261007-C51-installation-independent-01.json)已完成安装子项。剩余：主人完成该profile初始化、待决CA信任步骤之后，实际普通Chrome UI与worker同链三入口、host permission允许／拒绝及TLS合同。安装许可已使用，不重复申请。
- [x] `ENV-08` 按当前绑定生成 dev profile 与覆盖，不固化历史端口窗口为当前事实。证据：workLog/20261004-ENV-08-dev-profile.md；覆盖为带时间观测，非完整试用配置。

本批环境／启动增量：[G3传输复用、51测试／192实际读取、28容器与两adapter cold启动完整日志](./workLog/20261007-pg-pool-progress.md)及[当前独立总审核](./workLog/20261007-pg-pool-current-increment-audit-01.json)。父完成81/98不变，消费持续追赶及名称／write-after-read仍未达门槛，ENV-07保持开放。

历史环境失败记录（原链随后已恢复，当前运行证据见本批Fullnode／归档实测）：[checkpoint间隔调整触发424107重放分叉保护，原参数与数据保留但链头停滞，实际ready被拒绝](./workLog/20261004-checkpoint-interval.md)。25项运维测试及有限窗口读取不代表dev就绪；先核对可验证的原共识恢复条件，ENV／TRY未完成项保持未勾选。

## TRY · 核心测试与可试用交付

依据：04–08、13；相关完整合同必须随本项实现。

- [x] `TRY-01` 完整钱包及共享 core typecheck／Webpack 构建，修复所有阻断错误。[共享core注入与完整构建](./workLog/20261004-core-injection.md)：双方类型检查、开发版Webpack、1238项测试及四入口审计通过；Explorer剩余错误归NET-10，真实试用另验。
- [x] `TRY-02` 普通创建／导入账户的资产／币发送／模拟成功与链失败真实链验证。[当前C24新助记词内部发送与锁定恢复、完整合同验收](./workLog/20261006-TRY-02-completion.md)完成；创建／导入／双币发送／链失败原历史证据按日期保留，78份完整源码逐字继承，最新资产追平与HTTPS仍独立待验。
- [x] `TRY-03` dApp 连接授权／sign-only／execute／PersonalMessage 核心 Chrome 验证。[实际四链路完成核验](./workLog/20261004-TRY-03-completion.md)：一次执行、签名及effects校验、重启后journal保留；headless真实扩展，精确SPKI例外，完整故障恢复归TRY-04。
- [x] `TRY-04` 真实 timeout 已上链／popup关闭／worker 重启／同摘要恢复核心验证。[实际受控故障完成核验](./workLog/20261004-TRY-04-completion.md)：原生超时后pending跨popup关闭和整个浏览器重启，同摘要恢复至checkpoint255912；总dispatch1，锁定账户再核验0模拟／0提交。完整故障矩阵仍归TX／QA。
- [x] `TRY-05` 三入口历史详情／GraphQL 资产和分页／同链 package 核心验证。[C102完整父合同审核](./workLog/20261008-C102-five-parent-completion-01.json)保持原C46／C48及既有基础合同；当前1121／763d生产、完整API与三账户页面／原文独立通过13对象／5cap／5Kiosk页／8NFT详情／9-6-1完整历史／6原交易与12receipt查看、24实际archive批量槽位及51完整typed S。风险与历史保守语义／原journal保持，原六笔未重发；普通Chrome与其余父仍独立验收。
- [x] `TRY-06` 产物初步审计无 JSON-RPC／旧 Kit／Sui 公网误访问，提供可装载试用包。[初步验收包收口](./workLog/20261006-TRY-06-completion.md)：全部生产闭包／独立发布registry／36成员ZIP与最终普通Chrome装载来源通过，启动零外部请求；HTTPS及完整资金业务仍待，trial_ready=false。
- [x] `TRY-07` 试用说明、端点／debug revision／安装流程、已验证与待回归清单。[当前候选安装与回归说明](./14-开发验收包安装与回归说明.md)含36成员ZIP／SHA、四入口／H0／generation／最新debug来源、独立profile安装、CA待确认及所有待验收范围；[审核](./workLog/20261006-TRY-07-completion-audit-01.json)。完整trial_ready仍false。

## QA · 试用期间细节与故障回归

依据：07 A01–A22 全表、04–06 细则与 13 补充；每项必须有真实 Chrome／同链 fixture 的预期与实际、时间、bundle 与部署身份，单元测试不代替此阶段。

- [x] `QA-A01` 新装插件、创建／恢复助记词、派生、多账户、导入私钥：地址与签名基准一致；锁定、解锁、导出需密码；升级不丢库。[当前审核候选实际116项、升级后4消息签名、3派生／4账户／两profile及同ID包更新保库完成](./workLog/20261006-QA-A01-completion.md)；8失败现场保留，0模拟／Execute。金额交易、普通HTTPS和突然终止观察恢复继续按TX／ENV／QA-A10／19／20验收。
- [x] `QA-A02` 三入口、身份／schema／包绑定：真实Chrome Fetch报文、服务身份、H0digest一致、能力声明与实际匹配。 [当前完整合同验收](./workLog/20261006-QA-A02-completion.md)：独立revision3回环开发profile真实Chrome五案81只读、四角色完整H0／11 SDL合同／七配置领域／native及独立四认证包匹配；真实错H0与错pin、零IO错revision拒绝，Node独立schema与包复核。聚合窗口推进partial保持、独立matched单列、两失败保存；0模拟／签名／Execute，不称产品UI调用测试驱动、全局ready或原HTTPS信任。
- [x] `QA-A03` 归档桥接unary／server stream／错误：Ledger与Move成功，State／Execution／管理方法不可误启用；trailers／取消／限流／deadline保留。[固定同renderer33协议、原链五帧流及真实Move两格式／四禁用路径收口](./workLog/20261006-QA-A03-archive-completion.md)；合成故障协议与原链成功分别留证，真实业务后端故障／普通CA分别归QA-A20／19。
- [x] `QA-A04` min-checkpoint：省略、H0、已观察H、不可满足、非法、负数、溢出；历史选择器不变；可信上界不可由外部header突破。[当前原同链binary/text 30只读、前后持久桥接审核完成](./workLog/20261006-QA-A04-minimum-completion.md)；正常Chrome证书及完整业务仍按ENV-07／QA-A19验收。
- [x] `QA-A05` 本项完成原多页、多币、总额精度、Coin／address balance、无元数据原子单位与依赖错误不归零合同。[QA-A05完整验收](./workLog/20261006-QA-A05-completion.md)：当前实际双币／明确metadata-null与8文件86项分页精度和依赖错误矩阵、C21币UI至C24原始源码内容一致；历史执行仍标历史。
- [x] `QA-A06` NFT／动态字段／动态对象：多页双向、nameBCS、值／childId、owner、类型、缺失、历史版本、缺图与非视觉资产。 [当前S677361两种字段双向多页／历史版本及C25实际Chrome完整核验](./workLog/20261006-QA-A06-completion.md)。
- [x] `QA-A07` Kiosk：同链package、cap与personalKiosk、持有／内容／可转移性、转移前验证；按实际支持业务分支。[C102完整父合同审核](./workLog/20261008-C102-five-parent-completion-01.json)保持原C46／C48及既有基础合同；当前1121／763d生产、完整API与三账户页面／原文独立通过13对象／5cap／5Kiosk页／8NFT详情／9-6-1完整历史／6原交易与12receipt查看、24实际archive批量槽位及51完整typed S。风险与历史保守语义／原journal保持，原六笔未重发；普通Chrome与其余父仍独立验收。
- [x] `QA-A08` 普通转账／gas／模拟：大整数、小数边界、余额不足、错误版本、无效地址、未知命令、模拟失败、gas变化需再授权。 [C25真实再授权及独立完成审核](./workLog/20261006-QA-A08-completion.md)。
- [x] `QA-A09` 签名／执行／链失败：finalbytes／digest一致，普通／导入签名，成功和FailedTransaction真实链回执；无自动重复dispatch。[C20普通／导入106项、2实际成功单次广播及既有真实FailedTransaction在当前BCS／签名／12项UI复核收口](./workLog/20261006-QA-A09-completion.md)；历史失败不称新C20失败提交，3页面失败保留；完整金额／赞助／故障窗口／HTTPS继续由其余父任务验收。 [C21同合同当前成功106项／失败UI12项及原字节／签名再次复核通过](./workLog/20261006-C21-completion.md)，历史失败仅原一次派发，未新增失败提交。
- [x] `QA-A10` pending／多窗口／worker：dispatch前后关闭、timeout但链成功、回执落盘失败、锁失效防护、旧digest恢复；持久记录与链事实一致。 [当前C21完整合同验收](./workLog/20261006-QA-A10-completion.md)：三案321项、12实际签名／20模拟／3原digest单次Execute与独立BCS／签名／effects审核；真实strict事务abort／约20秒原deadline／批准前后关闭、旧worker停止后新locked pending、原WebLock失效及第二窗口拒绝重准备、原摘要自动恢复均通过。首轮失败保留并单独0派发恢复原profile；正常TLS及独立hard kill／物理断电不作声明。
- [x] `QA-A11` 裁剪后的长期详情：Fullnode查不到的同链历史交易／checkpoint／对象版本由归档读取；返回ID／版本／摘要核验。[完成证据](./workLog/20261006-QA-A11-completion.md)。
- [x] `QA-A12` 交易／事件分页：ascending／descending、空扫描页、SCAN_LIMIT／terminal、重复／无进展／坏cursor、超时页不提交。[C19实际双向16交易／13事件与type5、真实空终态及坏cursor、分层24故障／6过滤、原七journal和当前产物通过](./workLog/20261006-QA-A12-completion.md)。
- [x] `QA-A13` 账户历史语义：sender、收款、对象变动、Kiosk／token／capability范围；缺证书／未注册不冒充全集，按扩展实际承诺验收。 [当前空窗口实际UI／六旗标与原响应审核](./workLog/20261006-QA-A13-current-window-progress.md)通过限定子项，非空各类语义保持开放。 [新链完整认证账户重建A1–A4、六pin生产C28/四角色/原journal保持Chrome验证](./workLog/20261006-default-generation-account-positive-rebuild-design.md)已完成限定范围；[正面夹具P1–P4](./workLog/20261006-default-generation-positive-fixtures-design.md)准备完成，indexed正面内容/最终名称/NFT转移及完整父合同仍待。
- [x] `QA-A14` read-after-write：执行确认后GraphQL故意落后，显示索引同步；覆盖到目标checkpoint才刷新完整资产snapshot。见[当前C40完成裁决](./workLog/20261007-QA-A14-current-completion.md)和[独立父审核](./workLog/20261007-QA-A14-current-completion-audit-01.json)：三原摘要真实滞后→完整覆盖／刷新，四当前收据及原生审核、7关键实现C39/C40/当前源码逐字节相同，新framework仍如实滞后保留终态；仅完成本QA合同，TX08全入口／目标收款UI仍开放。
- [ ] `QA-A15` 名称：正向／默认反向、缺失／过期、registry错链、解析lag、显示名与发送目标分开；确认最终地址。名称合约／registry ABI与规范BCS、固定认证声明及真实lag拒绝已有证据，全部旧轮次保留。剩余：当前G3正式窗口中的正向／默认反向、改名续期／过期与缺失、错链／lag拒绝、显示名和最终发送目标当前UI联验；不以其他generation的旧正面样本或静态构建替代。
- [x] `QA-A16` 质押与治理：Pending／Active／赎回、多pool／inactive、rate缺失、safe-mode补洞、APY多epoch、奖励舍入与大额值。[真实兑付与明确夹具／算法／组件分级矩阵](./workLog/20261006-QA-A16-completion.md)通过：当前12文件151定向、181文件2551全量；不冒充真实链已切换全部治理状态或生产吞吐，原UI失败保留。
- [ ] `QA-A17` 网络与dev归零：同host换genesis、同genesis换generation、保留数据重启、只归档重建、URL／registry变动、迟到请求拒绝。同URL换H0迟到请求拒绝、有限查询保留数据恢复／归档重建已有限定证据；当前运行已由后续恢复日志更新为两条debug链、29容器／14健康。剩余：当前浏览器和完整查询／归档／HBase／account生命周期的换代、同H0换generation、URL／registry变化及迟到请求完整矩阵。旧native-only／ready=false观察均为历史，不代表当前状态。
- [x] `QA-A18` dApp与Wallet Standard：modernconnect／disconnect／account／chain事件、PersonalMessage、sign-only、sign-and-execute、origin／权限错配拒绝。[当前 C18 实际完整八事件与一次执行收口](./workLog/20261006-QA-A18-completion.md)；HTTPS／提交后完整故障继续由 QA-A19／10 验收。
- [ ] `QA-A19` Chrome权限与证书：新装／更新、hostpermission批准／拒绝、自定义网络、正确CA／错误SAN、UI和worker实际调用；demo网页CORS另验。C51实际新装／加载四脚本及本来源网关已经验证；剩余普通Chrome新装／更新、host permission批准／拒绝、自定义网络、正确CA／错误SAN、UI／worker实际调用及demo CORS完整矩阵。CA确认尚未取得，不绕过TLS或代替主人初始化。
- [ ] `QA-A20` 故障与冷启动：Fullnode／GraphQL／archive分别不可用与恢复、Docker保留数据冷启动、入口依赖顺序、不误清journal。原三服务物理故障子项、C67实际输入离线／19次503恢复、C79有限七服务保留数据冷恢复及完整14HBase／27SQL／8CF独立字节审核已通过限定合同。剩余：完整当前dev／普通Chrome保留数据冷启动、入口依赖次序、全部恢复及journal保持。原发布批次未结束前不为验收中断原publisher或改正式marker。
- [x] `QA-A21` 发布清理与成本：bundle／依赖／抓包无JSON-RPC与旧Kit、无Sui公网误访问、单活动钱包、限流／日志／配置说明。 [C28完整发布清理与成本审核](./workLog/20261006-QA-A21-completion.md)通过；全部业务实际抓包由REL-02继续验收，正常CA和原生权限由ENV-07／QA-A19继续验收。
- [x] `QA-A22` UI与非RPC资产：国际化、账户／锁定／设置、资产隐藏、链接、授权窗、支持的应用入口保持；不支持的外部业务明示。[当前C40完整父验收](./workLog/20261007-QA-A22-current-C40-completion.md)：42实际UI、中英现代连接与界面撤销、四主题／偏好／密文／journal完整Chrome重启，真实自然auto-lock及原始历史snapshot／当前native owner区分；应用明确空态、未对接法币明示，逐项独立审核通过。普通ChromeHTTPS／所有业务流量与indexed转移按其他父任务验收。

## REL · 发布清理与完整验收

依据：02、06–08、13。TRY 提供试用，REL 才证明完整目标达成。

- [x] `REL-01` 发布依赖图与全部生产 bundle 无 JSON-RPC 请求器／旧 Kit，历史 fixture 明确排除。[独立production构建、完整模块／四chunk审计与7反例测试完成](./workLog/20261006-REL-01-production-completion.md)；原C16保留，真实流量与最终发布分别由REL-02／05验收。
- [ ] `REL-02` Chrome 实际抓包与三入口观测，证明全部钱包功能无旧 RPC 和 Sui 公网误访问。当前生产闭包／bundle无旧RPC的静态合同已完成；剩余当前实际Chrome全部资金、NFT、质押、名称、dApp、历史与设置入口抓包，三服务调用／无旧JSON-RPC及无Sui公网误访问独立审核。API原帧和局部UI记录不代替全部业务实际流量。
- [x] `REL-03` 错链／journal 不兼容暂停执行，保留密钥和 pending 的包／profile 回滚说明与验证。[生产包三阶段51项及158定向通过](./workLog/20261006-REL-03-package-rollback.md)，加密密钥／公共future journal／播种profile保持；[当前C29完整合同完成](./workLog/20261006-REL03-current-C29-completion.md)：25项真实配置／51项三阶段包保留及独立35原始身份帧审核通过；未来pending为公开夹具，原HTTPS／新可选权限另验，不把权限拒绝记为错链。
- [x] `REL-04` 运行端点／schema／revision／限流／查询预算／日志脱敏及可维护部署说明。[完整操作手册、公开配置/当前11拥有进程/原链只读、8恢复门槛与5白名单投影测试](./workLog/20261006-REL-04-operations-completion.md)通过；正常Chrome/完整冷启动/部署签认/业务共同S及最终发布仍按对应任务验收。
- [ ] `REL-05` 逐文档、逐 RPC、逐页面、逐 A01–A22 最终完成审计，无缺失或未证实必需项。原14父基线现剩余9项，按[当前验收依赖表](./workLog/20261008-remaining-parent-acceptance-order.md)推进；逐文档、逐RPC、逐页面和A01–A22完整最终审计，关联每项实际范围／证据／失败和当前source。只有全部必需合同成立才勾选本项并结束goal。

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


## 索引阻塞解除：认证前缀 B1–B5

按[实施合同与失败裁决](./workLog/20261006-certified-local-bootstrap-design.md)推进。B1完整75098份认证及B2独立SQL／Rocks／实际生产资产合同已完成；B3有限追平、B4原在线恢复、B5全业务正面验收继续开放。这五个子项不增加98个父项，当前80项父完成保持。


## C29打包权限与REL03当前回退子项

按[内置权限M1–M5](./workLog/20261006-profile-manifest-permissions-design.md)与[回退R1–R5](./workLog/20261006-REL03-positive-current-design.md)推进，子项不增加98父计数。M1–M5在C29限定范围完成。REL03当前C29完整R1–R5及25配置／51包阶段／35身份帧审核02已通过，父项已完成；[具体完成裁决](./workLog/20261006-REL03-current-C29-completion.md)保留版本与验收边界。所有失败原证据保留。


## TX-04当前C29原窗口关闭持久pending子项

按[实施前P1–P4](./workLog/20261006-C29-durable-pending-design.md)推进：实际产品生成pending、原worker关闭、新窗口币／dApp禁止重复准备及原摘要只读恢复。子项不增加98父计数，不以未广播pending替代链成功或全NFT／质押入口。


## C30准备互斥顺序与当前索引NFT

按[O1–O4](./workLog/20261006-C30-preparation-order-design.md)推进，O1–O3完成当前代码/2595全测/两类型/独立生产及闭包；O4实际pending和完整业务尚待，不增加98父项。原C29[持久pending P1/P2](./workLog/20261006-C29-product-pending-partial-audit-02.json)限定范围完成；[S57215 indexed NFT五对象/全分页/两未签名OB分支](./workLog/20261006-default-generation-indexed-nft-paths-01.json)真实通过，不等于Chrome隐藏或转移。当前C30首轮Execute及Kiosk详情未通过，保留失败，不能关闭RPC-03/22/23、TX-04或完整QA。

2026-10-06 C30 O1–O4 限定范围已验证（恢复续测 02/独立审核 01），全 TX04/coin pending 展示/终态恢复仍开放。只读真实 Kiosk QueryCache 诊断确认该次稳定快照上的复合读取 20 秒超时，详情条目尚未通过。有限前缀进度 09 仍未终止；本批不增加已完成的 98 父任务计数。

C31 子清单：[Kiosk 复合读取期限设计](./workLog/20261006-C31-kiosk-collection-budget-design.md)。先完成 K1/K2 的代码和核心取消/超时测试，再做当前生产 artifact 与真实 UI/worker 的 K3；K4 完整矩阵继续开放。

2026-10-06 C31 K1–K3 已通过：184 文件2598测试/两套类型/独立生产闭包；实链 S62279 两件 OriginByte/空目标/5对象/两条 unsigned 构造及真实Chrome12项 NFT/非视觉读取和锁定。K4/隐藏/Display正面/真实转移仍开放，98父任务仍80完成。

C32 准备子清单：[完整 NFT 转移准备期限](./workLog/20261006-C32-nft-preparation-budget-design.md)。C31 的读取成功不能覆盖顶层20秒准备deadline，按 N1–N4 验证，完整父任务保持开放。

C33 子清单：[NFT准备表单生命周期](./workLog/20261006-C33-nft-preparation-lifetime-design.md)。处理快照临时loading导致的原准备取消，明确negative/锁定/会话变化仍撤回，真实NFT预览与完整转移单列。

C34 子清单：[交易身份观察归属与实际结束](./workLog/20261006-C34-transaction-identity-lifetime-design.md)。新观察使用原生归属标记，取消仍等待原始请求清理后收尾；原无标记占位保留，实际全入口回归单列。

C35 子清单：[交易Move ABI观察归属与清理](./workLog/20261006-C35-move-observation-lifetime-design.md)。真实ABI函数采用同归属/实际工作机制，原native/opaque-only本地路径保持；25定向/2618全量/两类型/原生Chrome12项/独立生产闭包通过，完整实链竞争仍单列。

C36 子清单：[认证账户历史实际保留与受控部署](./workLog/20261006-C36-certified-history-retention-design.md)。H1–H4候选／canonical145测试、实际15页／15原生回执、三个API与两个新worker自然提交已完成；B4在线恢复与桥接E3子项后验完成，当前Chrome／完整转移及父任务保持独立。

C37 子清单：[钱包账户历史实际原生依赖](./workLog/20261006-C37-history-native-dependencies-design.md)。C33实测前端额外snapshot依赖导致页面拒绝，后端成功不覆盖此失败；修复与最新浏览器独立后验进行中。

重启恢复账户子清单：[连续根与查询窗口桥接](./workLog/20261006-postboot-account-bridge-design.md)。保留67667原根、在线batch1000限制及实际发布认证，通过独立连续增量进入75097冷窗口后再启新worker；不增加98父项。

当前C37实链执行子清单：[NFT单次执行与写后读X1–X5](./workLog/20261006-C37-nft-execution-design.md)。六账户worker自然提交均已有封存SQL独立审核02；真实三种NFT预览01通过，98父项保持80/98。

当前C38子清单：[NFT原派发结果的界面生命周期L1–L4](./workLog/20261006-C38-nft-outcome-lifetime-design.md)；Display/隐藏按[真实按钮与持久化V1–V4](./workLog/20261006-C37-display-hidden-design.md)独立推进。

C38实链01失败/0 Execute，当前按[C39自身读取保护F1–F4](./workLog/20261006-C39-nft-owned-read-fence-design.md)修正并独立验证。Display/隐藏V1–V4已完成有限合同，原始失败和resume/独立原生审核分别保留；不增改98项父合同。

2026-10-07：C39 F1–F4限定子项完成，真实new-target NFT唯一一次Execute、自动收据、confirmed-success／pending0、checkpoint176999及新目标Kiosk／OwnerToken／NFT owner独立核验；只读收据15检查确认成功和实际索引同步提示。当前[PersonalKiosk P1–P3](./workLog/20261007-C39-personal-transfer-design.md)真实16检查／单次Execute／checkpoint177615、原签名／BCS／effects及内部cap规范BCS返回通过；P4覆盖后刷新仍开放。重启后当前28容器／14healthy、两条保留debug链同H0推进、14 HBase／23 SQL／4 Rocks在线持久水位独立通过。TX-04当前C39原窗口关闭／严格pending保留与币入口拒绝已观察，完整dApp守卫和独立审核继续，首轮整体失败保持。98父项仍80完成／18开放，不将这些子项代替完整父合同。

同日后验：[TX-04 M2](./workLog/20261006-TX04-current-entry-matrix-design.md)当前C39 coin／dApp冷关闭后durable pending拒绝、完整原帧与journal独立审核完成；[三NFT严格pending N1–N3](./workLog/20261007-C39-nft-pending-design.md)14真实检查及独立审核通过，0新模拟／签名／Execute。[framework非空夹具K1／K2](./workLog/20261007-framework-nonempty-fixture-design.md)指定LD当前debug单次创建／放入与独立规范对象审核通过；K3 indexed及实际转出等待180806真实共同覆盖。M3全部分支与live-lock、完整父TX-04／RPC-22仍开放；首轮和resume01整体失败保留。


2026-10-07第二次主机重启增量（子项不另计98）：[恢复R1–R5](./workLog/20261007-postboot2-recovery-design.md)两原链／八debug／28容器／两套SQL-HBase／25查询账户进程／两发布器、三API六循环及原链共同窗口通过；20确认替代临时容器精确清理，无卷／镜像删除。TX-04 M2实际host boot后15检查／完整原pending与密文／独立原帧／0新增模拟签名Execute通过。[C39直接Display D1–D4](./workLog/20261007-C39-direct-display-transfer-design.md)15当前Chrome／单次Execute／198775及独立受控目标owner通过，D5与framework180806写后indexed仍待；[名称N1](./workLog/20261007-C39-positive-name-design.md)按真实当前高度不足拒绝，正面未完成。RPC-03／22／23、TX-04／08、QA-A14／15／20及普通CA等父项保持开放，80/98不预勾。


2026-10-07 C40推进：[当前UI U1–U6](./workLog/20261007-C39-ui-preferences-apps-design.md)C3920实际偏好检查／保留两应用缺明确空态诊断；完整重启导航失败保持。[空态A1–A5](./workLog/20261007-apps-empty-state-design.md)A1/A2缺陷确证及编码完成，10定向、两类型和新production build通过；全量／实际Origin／当前UI及完整父QA-A22仍待，80/98不预勾。

C40本批[明确空态改造A1–A4](./workLog/20261007-apps-empty-state-design.md)、[编码10／2637／两类型及完整生产](./workLog/20261007-C40-coding-verification-01.json)、[32实际UI／完整Chrome重启](./workLog/20261007-C40-ui-preferences-apps-chrome-01.json)及[原响应和native审核02](./workLog/20261007-C40-ui-preferences-independent-audit-02.json)完成限定范围；中间件当前28／14正常、九Origin门禁、确认弃用C39入口精确清理，累计21容器。连接授权和密文按独立C1–C4继续，80/98不预勾；十字段共同上界123446未达到180806。

QA-A22已按[C40独立父审核](./workLog/20261007-QA-A22-current-C40-completion-audit-01.json)完成，当前81/98／余17。其前述“完整父范围开放”仅为历史阶段，普通HTTPS／权限、所有业务流量及indexed转移按对应父项仍开放。

当前C40四角色真实历史12检查及native15原始BCS／effects／2覆盖digest通过，16非空活动和lo0、六覆盖旗标如实；[H1–H3完成](./workLog/20261007-C40-history-revalidation-design.md)，完整QA-A13收款／最新转移、indexed刷新等继续开放，81/98保持。

## 2026-10-07：有限追赶与当前生产快照（父项计数不变）

[独立实际审计05](./workLog/20261007-interval-live-independent-audit-05.json)及[工作日志](./workLog/20261007-interval-live-and-snapshot-policy-progress.md)记录恢复环境、唯一活跃有限追赶、当前完整非空framework生产只读证明和候选比较／清理。C4–C7及完成恢复proof尚待；有限S184826正面读取不可授权C40转出，9项fake故障测试不可当真实故障注入。81/98、17开放，不新增父项或勾选部分验收。


## 认证区间后继 E1–E4（隔离只读准备，不另计98父项）

- [x] E1：读取真实当前有限状态及完整输入SHA，固定原0–200000认证state／源debug／genesis，指定LD创建新私有操作目录；不改活跃source允许区间。
- [x] E2：仅checkpoint200001，真实fresh SQL reference／primary与replica固定版本body／两端latest及复制状态前后复核；禁止cache授予权限或无证扩展成员。
- [x] E3：最新源码debug verifier从固定200000可信state验证下一条quorum／连续性／digest／bodySHA；错stateSHA必须拒绝且无输出。后验再次读取SQL与两role latest、独立环境和输入SHA。
- [x] E4：独立核对原native输出／新stateSHA／body／reference／输入及服务未改，无安装／namespace后继／名称freshness或完成父项声明。完整扩展、资格及受控上线另需明确计划。

## 有限追赶完成与 C40 原摘要写后索引验收

C1–C7实际完成，恢复后ownership及原三命令已接受；framework K3a真实16项与原生独立审核完成，K3b竞争保持开放。[收据R1–R4](./workLog/20261007-C40-receipt-index-catchup-design.md)按原有TX08／QA-A14推进，当前81/98不改部分父合同。

QA-A14按[当前完成Q1–Q3](./workLog/20261007-QA-A14-current-completion-design.md)独立核验，R1–R4全部真实证明通过后才裁定父项，不改变TX08全入口边界。

当前收款人D5b／QA-A13按[受控真实UI V1–V4](./workLog/20261007-C40-receiver-display-design.md)推进，原direct198775只读收款端验收，不重发，不以原发送人替代目标账户；82/98保持。

当前C40 receiver03／native02完成直接Display D5和受控收款V1–V4：真正目标账户incoming活动／原收据／完整S204560／NFT图片与Display、规范归属／原PNG、最新debug及密文journal重锁，0新交易；82/98保持，QA-A13全账户覆盖／TX08全入口仍开放。

RPC03完整合同按[当前C40拥有对象F1–F5](./workLog/20261007-C40-owned-completion-design.md)补齐；两账户production真实type过滤／全分页、recipient隐藏冷重启、sender非视觉与Personal当前空内容都须完成后再裁定父项，82/98保持。

2026-10-07当前RPC03完整拥有对象合同F1–F5收口，见[父审核](./workLog/20261007-RPC03-current-completion-audit-01.json)。两账户23/8页与6/2页／完整规范BCS／Display／复杂type过滤，recipient真实隐藏及冷Chrome保持、sender19非视觉与Personal原cap空内容当前UI、fresh原生及完整产物／旧边界独立审核均通过；仅RPC03父项新增完成，**83/98、15开放、trial_ready=false**。上文旧“仍待”保留为相应日期阶段，不代表当前RPC03状态。

当前TX04 M1b已由[C40真实28竞争＋6cold／独立原帧与完整子审核](./workLog/20261007-C40-WalletStandard-lock-completion-audit-01.json)完成，第二真正Wallet Standard准备明确执行锁拒绝，原两模拟／一次私有signData但0返回签名／0Execute，原密文及完整三store保持。仅子项完成，不增父计数；TX04 M3／M4／M5仍开放，83/98保持。

下一优先QA-A13按[当前C40非空账户历史H1–H5](./workLog/20261007-C40-account-nonempty-semantics-design.md)推进，已有recipient原direct局部证据不代替sender／对象变动／Kiosk-token-cap范围全合同。83/98保持。

[C41账户历史预算修复B1–B5](./workLog/20261007-C41-account-history-budget-design.md)本轮完成：146定向/完整构建差异/18真实UI及原生窗口、明确无状态edge后继/28环境和1退役清理通过。QA-A13继续H3独立Kiosk wrapper/交易相对authority根核验；其他必需TX/QA/REL父项保持开放，83/98，不提高完整历史coverage旗标。

当前[QA-A13独立完整合同](./workLog/20261007-QA-A13-current-completion.md)及[父审核](./workLog/20261007-QA-A13-current-completion-audit-01.json)通过，H1–H5完成；84/98、14开放，trial_ready=false。按实际扩展窗口及Token/Cap/Kiosk交易相对权限验收，不提高账户全集旗标。此前非空/H3待补的文字保留为历史阶段。

## TX-04 M3：当前C41直接NFT真实跨窗口子合同

TX-04 M4 新链前置另见[C42质押完整入口设计](./workLog/20261007-C42-staking-lock-design.md)及[真实新链夹具日志](./workLog/20261007-G3-staking-fixture-progress.md)：S1／S2盘点、F1–F4唯一1RTD新批准与独立原生审核完成，T332734。当前C42实际质押／赎回全表单竞争及indexed S>=T仍待，不能据此勾TX-04／TX-08。原成功摘要只读恢复、不重发；98父任务84完成保持。

[实施前L1–L4](./workLog/20261007-C41-direct-NFT-live-lock-design.md)与[30真实检查／独立原帧和native闭环](./workLog/20261007-C41-direct-NFT-live-lock-progress.md)完成限定范围，0返回签名／0Execute；原两失败保留。未新增98父项，完整其余NFT／质押及durable矩阵仍待。当前环境与确认失败临时容器清理见[续检日志](./workLog/20261007-current-restored-C41-environment-increment.md)。下一优先按[真实索引前置G1–G5](./workLog/20261007-C41-required-index-catchup-design.md)推进，不重跑原200000操作或放宽名称合同；84/98、trial_ready=false。

[当前G2计划与G3认证准备／独立核验](./workLog/20261007-C41-followup-interval-progress.md)完成限定阶段：原可信200000续接83000新检查点至283000，完整283001 SQL/body与限定49811双角色before/after、10fresh sentinel及原framework281963新鲜native digest通过；newIntervalQualified=false、installed=false，0新consumer／Docker／数据库写。完整G3等价、G4切换和G5业务验收仍待，84/98不预勾。

上述为原准备阶段。当前G3已由[资格01](./workLog/20261007-C41-followup-interval-qualification-01.json)及[独立审核01](./workLog/20261007-C41-followup-interval-qualification-independent-01.json)完成：96真实HTTP、7越界拒绝、隔离205自然exit0／23SQL／4Rocks、27表／五生产对象一致；四probe退出，data保留，0新Docker／原服务信号。当前G4新283000操作经[独立计划／八安全测试](./workLog/20261007-C41-finite-catchup-plan-independent-01.json)已启动，[finite环境01](./workLog/20261007-C41-finite-live-independent-audit-01.json)原28／14及保护服务保持；inProgress=true／catchupAccepted=false，G4恢复与G5业务不预勾，原200000操作不重跑。另按[当前NFT收款风险R1–R4](./workLog/20261007-C41-recipient-risk-design.md)补RPC-23实际UI，84/98、trial_ready=false保持。


2026-10-07当前后续：[全Kiosk库存及三个空分支Chrome](./workLog/20261007-C42-kiosk-current-inventory-design.md)K1/K2和空分支16项/独立02完成，当前55库存原帧/六canonical cap-root，三个均为空、非空/locked/listed/转移竞争和K3全合同仍开放；真实503/504保留。归档[stage08](./workLog/20261007-G3-staking-publication-stage-08.json)实际提交337567，按[原质押新333000区间S1–S6](./workLog/20261007-G3-staking-required-index-catchup-design.md)S1只读计划通过/S2新独立区间准备启动，0consumer安装。原stake332734和已完成283000不重发/不重跑，98父项仍84完成、14开放。


当前333000后继区间S1–S4资格及独立审核已完成，新有限计划与八安全测试通过，实际三受控consumer追赶已经启动；[在线独立01](./workLog/20261007-G3-staking-finite-live-independent-audit-01.json)确认28运行/14healthy及全部保护进程不变。inProgress=true/catchupAccepted=false，共同窗口暂为空，目标自然完成/三原命令恢复/原332734质押production及C42界面验收仍待；S5/S6和14父项不预勾。84/98、trial_ready=false保持。

当前C42新增四个质押/赎回验证工具，仅静态准备，等待原332734实际共同覆盖后才运行，不预勾TX-04/TX-08。另[QA20授权连接隔离对比](./workLog/20261007-C42-admission-connection-reuse-design.md)C1–C5完成限定观察/回收：96真实请求及独立审核、三个拒绝，三个明确临时容器/listener已清理且28/14/30保护不变；两原启动失败保留，未安装、未认根因修复或持续可用。84/98、14父项、trial_ready=false保持。

当前[C42直接NFT完整表单L1–L4](./workLog/20261007-C42-direct-NFT-full-form-lock-design.md)实际完成，32UI/四完整模拟/独立05、两真实native占锁窗口/原Review明确竞争拒绝/原31秒签名失败关闭/释放后正常规范预览/Back/relock/三store保持/测试Chrome自然退出，0 Execute。442已采集响应逐项核验，35个实际S fresh typed审核；14个原读取body未捕获及其中8个503/504保留，原Chrome01及独立01–04工具失败不记通过。只限定直接分支，不预勾TX04/M3全集或其他父项，84/98保持。

[有限在线独立06](./workLog/20261007-G3-staking-finite-live-independent-audit-06.json)确认28运行/14健康、保护服务及最新debug保持，实际最低314677/320596/320598，共同窗口已恢复。原stake332734尚待完全覆盖，inProgress=true/catchupAccepted=false；S5自然退出/恢复及S6仍待。质押工具新增v2按实测协议路径解码并允许原正常VerifySignature，同时保留未捕获读取body，不放宽关键八模拟、零Execute或业务准入；未运行实际M4，不计完成。

[当前C42直接NFT持久pending P1–P4](./workLog/20261007-C42-direct-NFT-durable-pending-design.md)19真实检查及独立01完成：新专用DEFM一次真实产品签名Execute尝试被浏览器截断、0转发，冷启动正常解锁/实际native锁可用后NFT只恢复原摘要、0竞争模拟/签名/发送、三store及密文保持；两完整模拟、原生/本地验签、canonical NFT/Gas与S321312独立通过。六原NOT_FOUND body缺失保留。新profile保留且creator不得重跑，原C39和原成功交易不变；只直接NFT子项，不计其他Kiosk/M3全集或父TX04完成。

[有限源只读诊断I1–I3](./workLog/20261007-G3-replay-latency-diagnostic-design.md)八点原gates时耗／精确SQL AST及fresh完整prefix聚合独立核验完成，三个索引已存在，八轮事务局部planner对照无稳定收益，未安装任何候选。最新[在线独立07](./workLog/20261007-G3-staking-finite-live-independent-audit-07.json)最低320738/326694/326696，28/14及保护不变；[发布stage09](./workLog/20261007-G3-staking-publication-stage-09.json)正式355797/pending=null，仅发布事实。

质押完整live v2及[新DEFM只读durable D1–D4](./workLog/20261007-C42-staking-durable-pending-design.md)工具准备／十项静态05通过；实际S>=332734后才运行生产仓位和两类当前Chrome矩阵。14父项及84/98、trial_ready=false保持，不降低名称当前native高度/minimumCheckpoint/S+20合同。

后续实际进展：333000有限[S5](./workLog/20261007-G3-staking-required-index-catchup-design.md)自然终态／恢复后继及[C42/C43生产原仓位](./workLog/20261007-C43-original-stake-indexed-independent-01.json)独立完成；C42 [durable D1–D4](./workLog/20261007-C42-staking-durable-pending-design.md)15真实检查通过，两个live轮次失败／零模拟签名执行保留。金额草稿卸载丢失已按[A1–A3](./workLog/20261007-staking-draft-retention-design.md)修复：2复现失败→47边界通过／生产类型／C43构建闭包及唯一运行叶独立，原C42产物保持。C43第十二来源已实际注册／78接口规则／12同H0独立，原27服务及TLS保留；[唯一旧C42无状态清理及独立](./workLog/20261007-retired-C42-loopback-cleanup-independent-01.json)完成，累计37确认退役，其他14exited保留。C43 live及[原332734回执索引读取计划](./workLog/20261007-C42-staking-indexed-receipt-design.md)继续，84/98和父项不变。

最新当前 C43：[完整质押／赎回live与独立02](./workLog/20261007-C43-staking-live-independent.md)实际通过，两真实锁下Review拒绝、8完整模拟／5规范最终effects／3kind选择、0签名返回／执行；1027原帧及108补充，15读取body缺失与实际503/504保留。按官方共享输入bool／新枚举兼容核验，原独立01工具失败保留，18实际帧语义变异均拒绝。[C43原回执R1–R4](./workLog/20261007-C43-staking-indexed-receipt-design.md)9真实Chrome检查及独立01完成，S347463／十依赖／Display／原332734effects／typed摘要一致，真实资产刷新与空三store／密文保持／重锁／自然关闭，零模拟／签名／执行。新C43 pending P1–P4继续；84/98、14父项、trial_ready=false保持，TX08全入口不预勾。

C43后续 [新严格pending P1–P4](./workLog/20261007-C43-staking-pending-design.md) 已实际19项创建／直接NFT冷恢复及15项质押赎回冷续验、各自独立01完成，原产品BMWQ唯一执行尝试截断0转发，原三store／密文与实际free锁下durable拒绝保持；creator绝不重跑，profile和原摘要保护，六／八原NOT_FOUND body缺失保留。[M4收口V1–V5](./workLog/20261007-C43-staking-matrix-close-design.md)13份当前证据独立关联通过，TX04 M4和草稿A4子合同已完成，M3／M5及父TX04仍开放。最新恢复06实际28运行／14健康、349045／350207／350207且最新源码debug／全部保护服务保持；98父计数84完成不变。

C43后续 [气费旧批准G1–G4](./workLog/20261007-C43-staking-stale-gas-design.md) 七实际Chrome检查／两分支／六真实模拟及独立01完成：规范gas budget仅+1000，真实生产参数克隆故障后拒绝原digest、可见批准不变，四规范最终effects／两kind选择，S351765／原仓位gas／三store／密文／Back／重锁／关闭保持，0验签／Execute；一份关闭body缺失及一份503保留，不宣称市场价格或持续可用。原333000区间S6限定子合同已收口。另 [确认退役初始化B1–B4](./workLog/20261007-retired-bootstrap-cleanup-design.md) 清理两exit0一次性任务并独立02通过，原独立01数组顺序失败保留；全局109＝97运行／12退出，剩余所有配置／启动身份／挂载、卷／镜像与钱包28／14及原五archive healthy不变，累计确认退役39。最新恢复08实际353485／354317／354317及debug后继保持。当前状态汇总已更新；84/98、14父项及trial_ready=false不变。

[在线独立08](./workLog/20261007-G3-staking-finite-live-independent-audit-08.json)确认HBase328105／SQL333000／Rocks333000及indexer自然exit0、当前28/14与保护服务保持；HBase尚待332734/333000，未运行实际M4。独立live审核另存v3，三个kind费用选择只核验真实kind/gas/Validity，五个最终bytes模拟仍核验规范effects／摘要；[六工具静态06](./workLog/20261007-C42-staking-tools-static-06.json)仅语法通过，父项计数保持。


## QA-A20：C43 实际鉴权连接计数与池因素诊断

本段不增加98父项。按[计数T计划](./workLog/20261007-C43-admission-counted-transport-design.md)及[同监听器U计划](./workLog/20261007-C43-admission-pool-isolation-design.md)实施，两个producer及独立审核均已完成；672真实查询原帧、实际TCP计数／所有失败留存，原保护范围与配置、数据保持，不把实验通过勾成QA-A20父项。

- [x] T1–T4：两独立同fresh guard监听器／HTTP1.0与HTTP1.1 ABBA384＋原control16、三否定门槛；真实188短连接／72长连接与120次复用，四个实际鉴权TCP connect timeout；一容器两PID精确清理、29原进程／28容器14健康／全局109及卷镜像配置启动身份保持；[独立672前400](./workLog/20261007-C43-admission-counted-transport-independent-01.json)。
- [x] U1–U4：单HTTP1.1 listener、无池／pool8两个ABBA256＋原control16、三否定门槛；两lane128均成功，128对104连接与24次复用，零本轮connect/read超时，耗时接近；一容器一PID精确清理及全部资源保持；[独立272](./workLog/20261007-C43-admission-single-pool-independent-01.json)。
- [ ] 后继正式传输候选：明确admission／ingress受控后继，不覆盖旧guard／启动authority；验证容量、真实故障关闭与回滚、持续业务可用后再评估安装。原隔离实验未直接安装；下文H1–H6独立HTTP1.1后继已实际接入dev。根因修复／全Docker冷启动／全Chrome／QA-A20父合同尚未完成。


## QA-A20／ENV恢复／TX-08：C43 HTTP1.1正式dev后继

按[H1–H6实际实施设计](./workLog/20261007-C43-http11-successor-design.md)完成以下范围，源代码／所有旧metadata与原命令保持；不增加98父计数，不冒称整个QA-A20、普通ChromeCA或全资金业务。

- [x] H1–H2：最新RTD source／八debug／原29进程和28／14保护；独立HTTP1.1 dev启动器继承原fresh Handler仅协议变化；五同socket拒绝／准入／真实boot谓词测试和[actual already-running零动作恢复入口](./workLog/20261007-C43-http11-restore-already-running-01.json)通过，原8／32／backlog32及5s／12s不变。
- [x] H3：新private mTLS41981／fresh guard41980，原41840后端／visible窗口；16真实十域warm、三否定门槛、仅暂停新guard的20.02s真实503及SIGCONT后fresh恢复，[准备独立](./workLog/20261007-C43-http11-transport-prepared-independent-01.json)通过。
- [x] H4–H5：当前C43 GraphQL target与该location的client证书变化，原archive／account、12来源、三原端口不变；真实新／旧rollback／再切换36完整查询成功，78实际来源／method／预检和CA/SAN／mTLS独立通过；旧C43退役精确清理及[全局独立](./workLog/20261007-retired-C43-http10-edge-cleanup-independent-01.json)通过。当前29／14、原29进程＋新listener，全局110＝98运行／12退出，累计42退役容器清理；卷／镜像／原data／profiles保持。
- [x] H6：新入口[九真实Chrome读取](./workLog/20261007-C43-http11-indexed-receipt-chrome-01.json)及[独立native／BCS／typed核验](./workLog/20261007-C43-http11-indexed-receipt-independent-01.json)通过：原新M4空journal profile、原GYF332734，S365010十依赖／Display与Observer indexing=true／真实refresh，57原GraphQL帧零读取error，密文及三store不变、正常重锁／Chrome退出，零模拟／验签／Execute；双方架构段落、当前C43第14章、下次boot顺序和总进度同步。
- [ ] 后续完整父合同：持续可用／所有间歇503根因、整个Docker／后续实际host boot与新PID authority、普通Chrome系统CA／权限／全业务、全部TX08写后indexed刷新继续开放；原三有限任务不重跑，原FFMB／DEFM／BMWQ pending与原GYF执行profile不再打开／发送。


## RPC-22／23、QA-A07、TX-04／08：C43 全新非空 Kiosk 夹具

按[新 K1–K6 计划](./workLog/20261007-C43-nonempty-kiosk-successor-design.md)推进。仅已执行和验证的子项更新，原 98 父计数不变。

- [x] K1：全新三受控账户／source 一次本地 Faucet，原全部 pending／keys／gas 不使用；[funding01](./workLog/20261007-C43-nonempty-kiosk-funding-01.json)。
- [x] K2a：当前明确 HTTP1.1 authority、八 debug 与原 profile 文件保持，独立新单模块／framework依赖1和2实际 debug 编译通过；未发布证据 [prepared01](./workLog/20261007-C43-nonempty-kiosk-prepared-01.json)。
- [x] K2b：正式完整模拟／私有持久 pending／验签／单次发布与原摘要恢复；[recovered01](./workLog/20261007-C43-nonempty-kiosk-publication-recovered-01.json)，原合并gas读取失败保留、零重新提交。
- [x] K3：普通／普通挂牌／锁定／独占挂牌、非空 Personal 与 OriginByte 新夹具一次实际播种；[seed01](./workLog/20261007-C43-nonempty-kiosk-seed-01.json)，424677，八件新NFT。
- [x] K4：独立规范 native BCS／DF／cap／数量和成功／拒绝模拟；[native01](./workLog/20261007-C43-nonempty-kiosk-native-independent-01.json)／[take-independent01](./workLog/20261007-C43-nonempty-kiosk-take-independent-01.json)，四明确ENABLED模拟、零签名／Execute；两初始工具失败保留。
- [ ] K5／K6：本次高度真实 indexed、当前 Chrome 全转移分支／競争／原回执与收款刷新。

实际[36.16秒进度观察](./workLog/20261007-C43-http11-current-catchup-performance-01.json)native4.48、writer3.87／consistent3.84 cp/s，只是短时实測；不能把持续运行误当名称 current-native／S+20 已通过。账户 continuation 实際使用既有 optimized debug helper，此前 build provenance installed=false 仅指当时构建步骤，不能由此判定当前未使用。

K5前置已完成[当前七门槛只读观察02](./workLog/20261007-C43-nonempty-kiosk-readiness-02.json)及[实际生产minimumCheckpoint424677拒绝独立01](./workLog/20261007-C43-nonempty-kiosk-production-readiness-independent-01.json)：正式376723／pending401214，41管线与账户尚未覆盖424677；当前生产共同上界376103，明确coverage拒绝、零profile／模拟／签名／执行。正面三非空Kiosk／八NFT库存工具v2仅准备，K5／K6与14父项继续开放。

## RPC-22／23、QA-A07：当前Kiosk页面转移准入 E1–E5

按[页面准入修复设计](./workLog/20261007-kiosk-transfer-eligibility-design.md)先复现再修复当前详情／转移页忽略独占挂牌及OriginByte登记／独占的入口判断。共用资产快照判断不能代替fresh输入／cap／正式模拟；普通挂牌仍允许取出。E1–E5仅完成验证后勾子项，98父计数保持。

- [x] E1：真实转移页5／详情页3个错误准入断言复现；收集配置失败单独保留。
- [x] E2：两页共用snapshot eligibility；普通挂牌保留、locked／exclusive／OB未登记或独占拒绝；fresh准备器不改。
- [x] E3：六相关文件100实际测试及生产类型零诊断，draft／已dispatch原结果生命周期保持。
- [x] E4：C44独立02生产构建、5285模块／2036源码／7chunks闭包及精确三个运行叶差异通过；新来源Chrome实际权限／字节匹配，严格403尚未注册。
- [ ] E5：正式424677覆盖后，以已受控接入的C44及新专用profile验八件NFT／两页准入／完整转移与写后刷新；不复用原成功／pending执行profile。

所有实际证据及失败边界见[页面修复验收](./workLog/20261007-kiosk-transfer-eligibility-design.md)。84/98父项保持；C44候选不等同当前C43安装或可试用交付。

C44后继准备子合同已完成：[严格edge准备01](./workLog/20261007-positive-C44-http11-edge-prepared-01.json)／[独立03](./workLog/20261007-positive-C44-http11-edge-prepared-independent-03.json)：仅第13个已实测origin、候选project／config路径变化，实际临时nginx -t后自动删除；当前C43未切换。固定全局计数与外部并行Testcontainers变动的01／02失败保留，03只接受110常驻完整配置／启动及29钱包／14health保持，不称全局全部无变。

[C44库存工具类型01](./workLog/20261007-C44-nonempty-kiosk-indexed-tool-typecheck-01.json)零诊断；[当前读器拒绝独立01](./workLog/20261007-C44-nonempty-kiosk-production-readiness-independent-01.json)在共同377510时拒绝minimum424677，零profile／模拟／签名／Execute。正式publication已[提交401214](./workLog/20261007-G3-nonempty-kiosk-publication-stage-04.json)，[七门槛04](./workLog/20261007-C43-nonempty-kiosk-readiness-04.json)仍未覆盖424677，正向／Chrome及父项保持开放。


## C44严格来源运行后继 S1–S5

按[受控切换计划](./workLog/20261007-C44-http11-origin-switch-design.md)实施，原98父计数保持。

- [x] S1：当前C43／C44构建／来源及准备manifest、原运行权威与1015私有文件验证，一次switch-intent保存。
- [x] S2：实际C44 13来源→旧C43 12来源／新来源403→最终C44 13来源，38完整十域查询及四状态。
- [x] S3：独立38原查询、84三个入口来源／method规则、三private TLS／SAN／client mTLS和fresh当前来源通过，新增明确C44 authority保留全部前继原文件。
- [x] S4：独立确认退役旧C43 HTTP1.1 edge后精确无force rm，一份原logs／inspect／source／recipe保留；累计43、其他110非Testcontainers及29钱包／14health保持。
- [x] S5a：当前C44专用空Chrome三查询入口及renderer／worker来源、五权限／未知端口拒绝，规范gRPC-Web原帧独立核验通过。零原profile／签名／Execute。
- [ ] S5b／E5：424677完整覆盖后完整C44 NFT／资金／写后刷新；不据transport更新父项。

新覆盖工具保留v1原response缺失的非200失败；v2先留存所有原帧、当前C44来源首次200观察通过，正式401214、七门槛仍未齐。普通ChromeCA、完整资金业务及持续503/504原因未收口。


S5a后续范围核验：[v2当前C44观察02](./workLog/20261007-C44-nonempty-kiosk-readiness-02.json)首次200，原v1非200原帧缺失失败保留；正式401214、41管线381122起、account381082。实际当前生产minimum424677拒绝及[独立02](./workLog/20261007-C44-nonempty-kiosk-production-readiness-independent-02.json)共同381543通过，正向库存与E5仍开放。[原publisher活阶段02](./workLog/20261007-G3-C44-switch-publication-stage-02.json)原7463／子79715正在工作，继续追赶性能复核，不以状态／旧快照替代验收。


## TX-08／QA-A20：C44 checkpoint 传输性能 P1–P5

按[分段测量与连接复用计划](./workLog/20261007-C44-checkpoint-transport-performance-design.md)推进，父项计数保持。

- [x] P1：当前 29／14 与原运行核验；40.10 秒 native4.264／writer3.441／consistent3.416 cp/s 实测。
- [x] P2：四次完整读取 profiler、八次同 blob adapter／guard 原帧／SHA；失败01／02保留，03原运行核验通过。
- [x] P3／P4：128次同blob成功响应／七否定门槛、64次候选读取实际16连接及独立03审核；两轮4临时容器精确回收，累计47。ratio1.09956未达1.20门槛，不安装。
- [ ] P5：只有实际收益和完整传输后继合同成立后切换／回滚，再验 durable 追赶和完整 NFT 门槛；未安装不勾选。

P3／P4原失败均保留：[实验01](./workLog/20261007-C44-checkpoint-keepalive-benchmark-01-failure.json)、[独立01](./workLog/20261007-C44-checkpoint-keepalive-independent-01-failure.json)、[独立02](./workLog/20261007-C44-checkpoint-keepalive-independent-02-failure.json)；后继成功不覆盖失败。最终29／14正常，正式401214／管线386440起仍不覆盖424677，14父项开放。P5安装条件不成立；继续发布／持久管线追赶及完整资金验收。


## TX-08／QA-A20：C44 正式publisher完整namespace N1–N5

按[完整命名空间与受控后继计划](./workLog/20261007-C44-publisher-namespace-successor-design.md)推进，不增加98父计数。

- [x] N1：原owned工作子当前活性／private原生样本／当前实际diagnostic阶段。
- [x] N2：实际运行源码、官方当前客户端与完整namespace边界／错误拒绝测试。
- [x] N3：同H0／TLS整个published bucket真实8-worker分区枚举、fresh SQL前后与每分区收据。
- [x] N4：仅串行namespace枚举调用改变的独立候选、全部原检查／反向源码／独立完整收据核验。
- [ ] N5：自然no-child／pending=null边界及明确publisher生命周期后继实际切换／回滚；工作批次不终止。正式publication／durable七门槛与全部父项依实际证据继续。


## TX-08／QA-A20：完整旧前缀并发对比 C1–C5

按[有界设计](./workLog/20261007-C44-prefix-audit-capacity-design.md)先验证性能与完整检查，不改原publisher，不另计98父项。

- [x] C1：独立audit函数候选只提高合法整数并发上限8→16，实际原源码／authority保存。
- [x] C2：实际函数全部对象及原11类损坏／并发边界／后台故障测试，精确源码反向还原。
- [x] C3：同H0最新debug1024真实证书、独立inode、TLS只读原SQL／S3，8／16／16／8四轮逐对象原始收据。
- [x] C4：独立原始证书／调用收据／所有原检查／运行authority审核，实测收益门槛。
- [ ] C5：全部完整namespace证明与自然无子／pending=null生命周期后才组合与实际安装／回滚；原批次保持。


## TX-08／QA-A20：明确发布器后继生命周期 L1–L6

按[生命周期实施设计](./workLog/20261007-C44-publisher-lifecycle-design.md)推进；原434325工作子不终止，父98保持。

- [x] L1：当前前继fresh拆解、所有未变source／静态pins／进程／容器／退役源与原完整capture相等。
- [x] L2：完整new authority schema、真实旧drain／新canonical venv PID身份，缺失证明拒绝。
- [ ] L3：真实控制器的自然窗口、单parent freeze race恢复、独立运行目录及失败恢复。
- [x] L4：schema／身份／source／working／pending／race拒绝与实际前继等价测试。
- [ ] L5：自然边界真实切换／回滚，额外正式新准入维护需先证明原值／scope／权限及恢复，旧工作期间不操作。
- [ ] L6：明确最终authority与实际完整publisher推进、424677七门槛及全NFT／写后回归。

L1／L2／L4实际完成范围及100实现测试／四真实身份否定／TLS验证见[本轮生命周期证据](./workLog/20261007-C44-publisher-lifecycle-design.md)。L3完整恢复及L5／L6真实操作仍开放；98父计数84不变。

后续实际[16回滚／恢复实现测试](./workLog/20261007-C44-publisher-transition-tests-01.json)、[9当前authority选择测试](./workLog/20261007-C44-current-publisher-ownership-tests-01.json)和[真实超时／pending分析](./workLog/20261007-C44-natural-publisher-timeout-analysis-01.json)已记录；原working child由原timeout结束，正式仍未提交。L3完整恢复与L5／L6继续开放。


## TX-01：当前C44内部最终字节／Gas授权 U1–U5

按[当前版本实施设计](./workLog/20261007-C44-internal-authorization-design.md)推进，旧执行／pending profile不打开；98父计数保持。

- [x] U1：当前product／source及正式窗口、原质押native前置，全新私有profile与真实worker／UI来源。
- [x] U2：币／质押／赎回三实际内部预览完整bytes／GasData／expiration与ENABLED原帧。
- [x] U3：实际生产重校验克隆gas故障拒绝，原批准／journal保持，正常Back后新requestId。
- [x] U4：独立规范BCS／原帧／source-map／实际native对象与S审核，重锁／自有Chrome退出。
- [ ] U5：完整NFT／赞助／有效期／全内部重新授权父合同汇总；限定子项不代替TX-01。


U1–U4当前C44验证：[真实三链路02](./workLog/20261007-C44-internal-gas-authorization-chrome-02.json)12检查／15 ENABLED模拟，原批准及正常Back新requestId；[独立原帧01](./workLog/20261007-C44-internal-gas-authorization-audit-01.json)三组9原始／故障帧、6规范完整effects、3真实选Gas、9补充原生帧与实际S通过。1015私有原文件、空journal／密文保持，重锁／自有Chrome退出，零签名／Execute。限定克隆BCS参数故障，不代表Gas市场或完整父验收。

实际币点击另发现未捕获Promise；C44接受范围保留此缺陷。[red03](./workLog/20261007-coin-revalidation-rejection-red-03.log)全部6断言通过但1 unhandled rejection导致exit1，之前测试工具失败01／02均保留。按钮改用mutate，由既有onError消费错误；新版C45构建与独立验证另记录，不把C44构建称为已修复。U5与TX-01父项继续开放。

## TX-01／QA-A20：修复版本独立真实网关 V1–V5

按[独立网关实施设计](./workLog/20261007-C45-isolated-gateway-design.md)推进，不替换原 C44／publisher 的 authority。

- [x] V1：实际旧配置／新 profile 仅三端口差异、来源及空闲端口前置。
- [x] V2：C45 相同产品源码的 C46 构建／闭包审计／实测来源／权限。
- [x] V3：只启动自有临时 gateway，真实三入口及负向规则，原 29／14保持。
- [x] V4：C46 三内部实际预览／故障重授权无 pageerror，独立 BCS／native 审核。
- [x] V5：原私有文件／环境保持及自有临时容器精确正常清理，更新父范围。


V1–V5实际完成范围、独立绑定／完整闭包、实际三入口及三内部场景、所有失败原记录、正常自有临时清理和后续14父项见[本轮收口记录](./workLog/20261007-C45-C46-internal-authorization-completion.md)。C45／C46源码一致，C46仅独立实际回归，临时网关已移除；C44仍为当前安装。并未据此勾选任何98父项。

## TX-01：当前C46完整Gas／赞助／有效期矩阵

按[实施设计](./workLog/20261007-C46-current-authorization-matrix-design.md)推进，原pending profiles保持、98父计数不变。

- [x] A46-1：真实当前前置／新独立临时gateway续用配方，原01已清理证据保持。
- [x] A46-2：独立demo编译／真实C46来源与全新两类型账户，各最多一次V2注资。
- [x] A46-3：两类型默认／完整GasData/None／赞助未来Epoch签名，单签execute准备拒绝。
- [x] A46-4：原帧／完整BCS／nativegas／签名独立审核，重锁／观察收尾／1015原文件保持。
- [x] A46-5：仅本轮自有临时网关精确清理，环境与98父范围更新。

## RPC-22／RPC-23／QA-A07：正式434325后的当前C46非空索引 K46-1–4

正式发布已自然达到434325、pending=null；窗口06未授予切换，原父继续工作。以下只读正向工作须先取得fresh七覆盖全部通过，不重建／重发原424677 fixture。

- [x] K46-1：fresh正式publication及41持久管线／Display／十域与native／账户七覆盖门424677全部通过。
- [x] K46-2：实际当前C46生产reader同S发现三owner、三kiosk、全部8NFT／5Item及cap／lock／listing／Personal／OB；原生版本／digest／owner／content相等。
- [x] K46-3：独立原GraphQL及protobuf／完整类型BCS／source复核，零profile／签名／Execute及1015原文件保持。
- [x] K46-4：更新剩余Chrome／转移与98完整父合同，保留真实限制；只清理本轮确实不用的自有临时gateway。

任务实施边界见[当前非空查询计划](./workLog/20261007-C46-nonempty-indexed-design.md)。覆盖12已证明正式提交，但其余六门仍低于424677；不得勾选正向查询，也不得以低S替代。

A46-1–5限定子项见[本轮实际收口](./workLog/20261007-C46-current-authorization-completion.md)，全部规定证据通过；完整父项继续开放。

## ENV／QA-A20／非空查询依赖：当前实际摄取瓶颈 G46-1–4

- [x] G46-1：当前29／14及原debug、原进程／容器保持，30秒三摄取cohort原指标、native head、持久管线与资源／预算实测。
- [x] G46-2：原guard算法隔离进程真实SQL／catalog／MinIO HEAD／GET／body计时；不用历史高负载请求重播，不修改实际handler／facts。
- [ ] G46-3：独立核对原始指标／计时／源码与正向覆盖缺口，确定下一步实际瓶颈；不把诊断通过算为追赶完成。
- [ ] G46-4：只实施证据支持且保留全部fresh marker／SQL／固定对象版本／副本／H0／generation门的优化，再完成真实回归与必要部署；没有实际优化和达标证据保持开放。

执行边界见[当前瓶颈检查计划](./workLog/20261007-C44-ingestion-bottleneck-design.md)。不重启原finite，不停止活动publisher子，不修改原水位、profile或journal，也不再创建目前不需要的临时容器。

G46-1／2限定测量经[当前原始性能](./workLog/20261007-C44-current-ingestion-performance-01.json)、[八次原算法](./workLog/20261007-C44-current-ingestion-stages-01.json)及[独立02](./workLog/20261007-C44-current-ingestion-independent-02.json)核验完成。独立01 catalog调用次数误假设失败原样保留；实际marker三次／body四次fresh catalog，不删查也不复用facts。G46-3／4与完整父项继续开放。

## RPC-22／23、QA-A07、TX-01：当前非空Chrome预览N46

实施合同见[非空浏览器设计](./workLog/20261007-C46-nonempty-browser-design.md)，父项不因限定预览而自动勾选。

- [x] N46-1：准备03独立gateway／新profile及当前源码／保护文件严格绑定，并完成自己的实际入口启动。
- [x] N46-2：七覆盖／完整生产inventory达标后的实际Chrome三kiosk／8NFT、六转移预览及锁定／独占双入口拒绝、Back／重锁／journal保持。
- [x] N46-3：原protobuf／规范BCS／effects／完整最终GasData／expiration／UI及原生对象、source／1015私有文件独立审核。
- [x] N46-4：仅本轮03临时容器实际正常精确清理、其他运行环境独立保持及98父范围更新。

N46-1本轮03[实际启动](./workLog/20261007-C46-nonempty-gateway-started-01.json)及[独立21原帧](./workLog/20261007-C46-nonempty-gateway-independent-01.json)通过：三个真实服务200、18来源／method／OPTIONS／未知／空Execute路径拒绝，原29／14和publisher未动。03当前为需继续使用的唯一自有临时实例；N46-2／3／4尚未运行／验收，不代表普通ChromeCA。

K46-1–3经[七门23](./workLog/20261007-C44-nonempty-kiosk-readiness-23.json)、[当前生产reader81原帧](./workLog/20261007-C46-nonempty-kiosk-indexed-02.json)与[独立完整类型字节审核](./workLog/20261007-C46-nonempty-kiosk-indexed-independent-01.json)完成：共同上界424807／账户424797覆盖原seed424677，当前同S三kiosk／8NFT／5Item／Personal wrapped cap／普通挂牌／lock／exclusive／OB登记及两target状态成立，8对象native版本摘要所有者内容相等。此限定查询为0profile／0模拟／0签名／0Execute，不代表完整Chrome／NFT资金／写后刷新或98父合同完成。N46页面实际运行中。

N46第一轮[完整原始失败](./workLog/20261007-C46-nonempty-kiosk-browser-01.json)与[保留数据限定审核](./workLog/20261007-C46-nonempty-kiosk-browser-retained-independent-01.json)已保存；6预览／2拒绝和12原模拟已实际执行，但14抓包异常尚未分类，整轮false、N46-2／3保持开放。v2新增真实请求完成／失败身份诊断，0产品改动／旧profile重开／额外签名或资金发送。

## ENV-07／QA-A19：独立普通Chrome安装与只读入口 C47-1–4

普通Chrome仅使用全新独立profile及当前C46同一不可变目录，原用户Chrome／已有钱包profile／系统CA不动。复用当前仍需用的03网关，不新建额外容器。此分组不增加98父任务；普通CA与可选权限／更新完整合同分别保持开放。

- [x] C47-1：封存普通Chrome当前应用包元数据、新profile路径、C46产物／来源／03网关及保护文件绑定；本次无load-extension参数。
- [x] C47-2：独立普通Chrome的扩展管理页实际开发者模式及Load unpacked安装，核验原实际ID／UI／MV3 worker字节与manifest权限。[明确授权后的C51独立新profile安装及四UI／worker字节审核](./workLog/20261007-C51-installation-independent-01.json)完成同一安装合同；原C47关闭／锁屏失败保持，不重开旧profile。Local／CA／权限完整分支仍分别开放。
- [ ] C47-3：该普通Chrome实际Local只读入口／H0／generation及保守空态，0签名／Execute／CA改变；不冒称普通HTTPS或可选权限已通过。
- [x] C47-4：仅关闭本次自有普通Chrome、保留新profile及日志；NF诊断与本次都不再需要03后才正常精确清理03并独立复核环境。

C47-1[普通154实际独立进程40593／端口41996及封存](./workLog/20261007-C47-ordinary-chrome-started-01.json)通过；[本机锁屏原阻塞](./workLog/20261007-C47-ordinary-chrome-native-ui-blocked-01.json)导致扩展管理页实际操作未开始，已异步请主人解锁，C47-2／3／4仍开放。N46新版抓包等待异常的[原失败02](./workLog/20261007-C46-nonempty-kiosk-browser-02.json)及[精确自有浏览器watchdog](./workLog/20261007-C46-capture-watchdog-01.json)保留；2模拟／0Execute，钱包内正常重锁未通过，不重开02。v3仅修订验证工具有界body及实际请求身份，不改产品。

N46-2／3经[实际03整轮21检查](./workLog/20261007-C46-nonempty-kiosk-browser-03.json)及[独立审核01](./workLog/20261007-C46-nonempty-kiosk-browser-independent-01.json)通过：845原响应／12 ENABLED模拟／6最终规范BCS与effects、完整GasData／expiration／ABI、6预览Back、2锁定独占双入口拒绝；23只读响应取消按真实requestfailed的唯一身份独立匹配，48失败请求全部实际net::ERR_ABORTED只读，0未知抓包错误／pageerror／签名／Execute、正常重锁退出、1015保护文件保持。01未知抓包和02无界finished等待失败保持，不重写为通过。不代替NFT资金、持续可用、普通CA、全部98父合同。

N46-4／K46-4及C47-4的资源收尾经[03精确正常清理](./workLog/20261007-C46-nonempty-gateway-cleanup-01.json)、[独立50](./workLog/20261007-C46-nonempty-gateway-cleanup-independent-01.json)、[最终环境](./workLog/20261007-C46-nonempty-final-environment-01.json)及[空普通Chrome进程关闭](./workLog/20261007-C47-ordinary-chrome-closed-01.json)通过：110全局＝105运行／5退出、原29／14及源／八debug／原进程／1015私有文件保持，三个03端口与C47自有41996空闲，无force／卷／镜像或未知退出容器删除，累计50。C47-2／3锁屏安装仍未执行，C47-4只完成资源收尾，不能据此勾完整ENV／QA父项。原普通Chrome应用包92→98漂移触发首个关闭预检拒绝，失败保留；v2仅接纳两app文件版本变化，实际原92 PID／birth／command／profile／port及全部项目pin仍严格相符。


## RPC-22／QA-A07、TX-01／04／08：C48 六路径首次真实NFT转移 R48

[执行合同](./workLog/20261007-C48-nft-execution-design.md)。旧N46只读预览全部保留；本轮独立首发与写后查询，不重跑注资／seed，不重开旧profile。

- [x] R48-1：原库存／七门／当前编译源独立前置与全新自有临时gateway真实启动。
- [x] R48-2：六个不同测试NFT各一次真实UI Send、最终封存字节／原生签名验证、terminal journal及正常重锁。
- [ ] R48-3：独立原protobuf／规范BCS／真实effects／NFT所有者与cap、执行检查点后的生产索引验证。
- [x] R48-4：自有临时资源精确正常清理及原环境保持，按98完整合同更新真实范围。

[G46当前marker／body合同审核](./workLog/20261007-C44-marker-body-contract-01.json)通过：三原Rust消费者每次fresh marker后body、实际guard CHECKS16和checkpoint模块镜像SHA一致；Sui不可变上游直GET与RTD fork提交门差异已同步双方方案。合并传输仍只是候选假设，0部署／重启／数据写入，G46-3／4开放。

R48-1经[实际网关](./workLog/20261007-C48-nft-execution-gateway-started-01.json)、[独立21入口原帧](./workLog/20261007-C48-nft-execution-gateway-independent-01.json)、[七门01](./workLog/20261007-C48-nft-execution-readiness-01.json)、[81生产帧](./workLog/20261007-C48-nft-execution-inventory-01.json)及[独立八件BCS审核](./workLog/20261007-C48-nft-execution-inventory-independent-01.json)完成。新01网关仍需执行测试，不是退役；累计确认清理仍50。R48-2／3／4尚未完成。

R48-2[实际六首发19检查／24 ENABLED模拟](./workLog/20261007-C48-nft-execution-browser-01.json)与[独立原签名／Execute／规范effects及六新owner审核02](./workLog/20261007-C48-nft-execution-browser-independent-02.json)通过：六不同NFT各一次Execute、六native验签、六terminal journal／零pending、正常重锁／Chrome关闭、1015保护文件与当前1120来源保持。额外faucet／seed／deploy／CA为0。独立工具01失败原记录保留，02只重读原响应及原生结果，零额外模拟／签名／Execute。

- [x] R48-3a：独立六原生回执、recipient所有者、OriginByte已有／新target Kiosk、source cap及锁定／独占两NFT保持；最大执行checkpoint524022。
- [ ] R48-3b：正式publication／41管线／Display／十域及account七覆盖达到524022后的同S生产写后索引与实际页面刷新，不降低target。

旧K46／N46八件原库存及Gas未变仅代表真实发送前的历史证据；此后六件已真实转出，不再重跑原库存或重复这些NFT发送，也不重开C48签名profile。完整R48-3仍开放。

R48-4[精确正常清理](./workLog/20261007-C48-nft-execution-gateway-cleanup-01.json)、[独立51](./workLog/20261007-C48-nft-execution-gateway-cleanup-independent-01.json)及[当前环境](./workLog/20261007-C48-nft-execution-final-environment-01.json)通过：原29运行／14healthy，110全局＝105运行／5用途未确认退出，累计51确认退役、三个本轮端口空闲；无force／卷／镜像或未知容器删除。

[写后524022七覆盖观察](./workLog/20261007-C48-nft-post-write-readiness-01.json)全部未达到；[实际生产minimum拒绝](./workLog/20261007-C48-nft-post-write-admission-01.json)及[独立两原帧](./workLog/20261007-C48-nft-post-write-admission-independent-01.json)验证assets／account head均434325、同H0、两reader均coverage拒绝，六个链上成功与journal仍终态。不能以该否定验证替代写后索引，R48-3b及完整98父项保持开放。

## QA-A07／RPC-22／TX-01：C49 已转出NFT的fresh所有权守卫 V49

[合同](./workLog/20261007-C49-previous-transfer-design.md)先建立，六笔旧发送与签名profile保持关闭。

- [x] V49-1：六成功／新覆盖观察与新独立gateway／空profile严格前置。
- [x] V49-2：实际六旧路由经fresh native持有关系拒绝，零模拟／签名／Execute／journal变化，正常重锁。
- [x] V49-3：独立原protobuf／规范BCS／六以前转移摘要与UI拒绝及保护文件保持。
- [x] V49-4：只正常精确清理本轮已不用的唯一gateway并核验原世界。

V49-1[新01启动](./workLog/20261007-C49-previous-transfer-gateway-started-01.json)、[独立21入口](./workLog/20261007-C49-previous-transfer-gateway-independent-01.json)及[新524022覆盖](./workLog/20261007-C49-previous-transfer-readiness-01.json)完成；原29／14保持，当前旧head434325仍低于六执行checkpoint，唯一C49临时实例需用于此验证，尚未退役。

[当前34秒测量03](./workLog/20261007-C44-current-ingestion-performance-03.json)和[独立计数审核](./workLog/20261007-C49-committed-boundary-stall-independent-01.json)：18持久水位停在正式434325，native前进160，三cohort成功摄取均0，128／129／128为NOT_FOUND尝试；latency count包含重试，不能当作成功fetch。此时优先正式发布边界推进，不据此宣称唯一永久瓶颈或关闭guard。

V49-2–4经[完整本轮记录](./workLog/20261007-C49-previous-transfer-completion.md)、[实际291原响应／六拒绝](./workLog/20261007-C49-previous-transfer-browser-01.json)、[独立六规范Object及原成功摘要](./workLog/20261007-C49-previous-transfer-browser-independent-01.json)、[精确清理](./workLog/20261007-C49-previous-transfer-gateway-cleanup-01.json)、[独立52](./workLog/20261007-C49-previous-transfer-gateway-cleanup-independent-01.json)与[当前29／14环境](./workLog/20261007-C49-previous-transfer-final-environment-01.json)完成。两debug链及faucet另有[四实际健康读取](./workLog/20261007-C49-current-native-health-01.json)，仅GET faucet健康、不注资。[自然观察05](./workLog/20261007-C44-publisher-handoff-watch-05.json)结束无安装或observer signal。E5／S5b写后524022覆盖及页面刷新仍未通过；84/98、14完整父项开放，不能据六真实转移及以前转移拒绝提前关闭父项。

[06唯一实际有界观察器](./workLog/20261007-C44-publisher-handoff-watch-06-running.json)已启动，最多1800秒；仅修改自有intent和输出编号，不改五封存控制器或其资格／自然终态／pending=null／prepared=0／no-child门。截至该观察没有freeze／activation，不等于安装；06结束前不同时开启其它观察器。

## ENV／TX-08：C50 未发布尾段缓存并发候选

[实施合同](./workLog/20261007-C50-parallel-hydration-design.md)先于编码；不改原发布器、五封存控制器、旧候选或正式缓存。

- [x] H50-1：原每序号读取／固定版本／历史保存／fsync／原子替换语句可逆保留，有界最多16且失败排空的隔离候选及负向／取消测试。
- [x] H50-2：实际256未发布序号1／16／16／1对照，原帧／版本／摘要与原环境保持，性能至少1.20倍。
- [x] H50-3：独立审核原调用及所有真实轮次，形成明确未安装的候选结论；全前缀认证、自然切换、写后索引仍独立开放。
- [x] H50-4：准备另一独立loop，实际调用上述候选、pin helper及原hydrate源码并纳入启动hash；保留原tick／invoke全部业务门，测试真实调用与取消／失败，仍不替换原五封存实现。

[C50完整限定记录](./workLog/20261007-C50-hydration-completion.md)

## ENV-07／QA-A19：C51 普通Chrome当前可操作桌面

[实施合同](./workLog/20261007-C51-ordinary-chrome-design.md)先于操作；原C47与签名profile保持关闭，官方市场外安装按浏览器工具政策需最终确认。

- [x] U51-1：新的独立普通Chrome空profile、应用包／钱包MV3完整产物封存与实际原生管理页／目录选择框。
- [x] U51-2：安装确认后实际Load unpacked，核验来源ID／manifest权限／MV3 worker与UI字节。
- [ ] U51-3：独立自有gateway的该普通Chrome实际Local只读H0／generation及host permission／CORS，无钥匙／签名／Execute；普通HTTPS／CA仍另验。
- [ ] U51-4：本次自有Chrome及退役gateway精确正常收尾，原服务／源码／八debug／1015私有文件保持。

[C51安装记录](./workLog/20261007-C51-current-progress.md)保持；[当前网关21实际读取／拒绝](./workLog/20261008-C51-ordinary-gateway-independent-01.json)经独立审核，普通Chrome Local／host permission／CA及新密码／条款确认仍待，U51-3／4保持开放。C58完整有限独立终验与116清理见当前状态；C56自然结束、C60唯一观察未作为实际安装。

## ENV／TX-08：C52 自然窗口驻留控制器

按[实际耗时与实施设计](./workLog/20261007-C52-resident-handoff-design.md)推进；原五个实现、PLAN和全部fresh门不变。

- [x] Q52-1：实际资格／完整环境／完整窗口耗时测量，区分短窗口风险与实际激活失败。
- [x] Q52-2：独立驻留控制器使用原完整before／after校验及原handoff，负向、冻结恢复和单控制器锁测试；零实际信号。
- [ ] Q52-3：原07实际结束并检查所有阶段后，仅一个有界实际观察器，满足原完整门才一次交接。
- [ ] Q52-4：独立核验实际authority、后继推进和正式发布／写后覆盖；无真实交接不计安装。

- [x] Q52-3a：旧07已真实结束，其陈旧窗口拒绝／0实际信号／无阶段收据经独立检查；49项及源码结构审核后，唯一3600秒驻留观察真实启动并绑定实际进程。
- [ ] Q52-3b：驻留观察终态及实际原完整自然门／交接收据，不把启动计为安装。

47项初版及49项当前版本分别保留；后者新增实际独立解释器启动与旧只读失败门。旧07原失败、首个工具import错误和两运行审核路径／macOS launcher误假设均保留，后续实际49项、独立结构审核、旧失败检查和进程绑定通过。原五实现及PLAN不改；C50未安装。

## RPC-22／QA-A07／TX-08：C53 六笔NFT写后的正向查询

按[写后查询实施合同](./workLog/20261007-C53-post-write-indexed-design.md)推进；524022最低检查点及七覆盖不降低，六笔原发送不重发。

- [x] P53-1：按原六转移／两保留NFT建立写后库存合同，生产查询工具与负向fixture测试；当前51项fixture、主方案04与实际服务false全集旗标、五生产类离线解析及当前七门不足时零IO前置拒绝经独立02通过。旧45资格仅作历史，正向查询尚未执行。
- [ ] P53-2：七覆盖达标后的同S三owner库存／五cap／OB新target、十三对象（八NFT与五cap）fresh native／归档固定版本／S认证及六原摘要详情。
- [ ] P53-3：三owner受支持账户活动窗口完整分页及六原发送checkpoint／原生事实独立核验，false／nullable全集旗标保持，账户窗口与资产S分别记录。
- [ ] P53-4：当前实际Chrome写后页面与限定资源收尾；完成证据后再审核完整父合同。

## ENV／TX-08：C54 发布恢复后的 transport 对照

按[隔离对照实施合同](./workLog/20261007-C54-post-commit-transport-design.md)执行。原先低于1.20的结果保留；正式发布恢复及当前负载变化后，只作新的同镜像有限对照，不改变原消费者或正在观察的交接计划。

- [x] B54-1：两份同实际guard镜像的只读预览，继承全部业务Handler；原候选transport字节保持，128实际固定blob ABBA对照与七拒绝检查。
- [x] B54-2：独立审核128原帧／版本／socket／业务继承及全部原服务保持；1.20准备门不降低，不以本样本代替部署或持续摄取。
- [x] B54-3：两个自有临时容器正常信号退出、精确删除和端口空闲；独立核验原29／14与累计清理。
- [ ] B54-4：仅在完整生命周期与新运行权威资格成立后再实施服务变化；本次有限比较不计安装。

## ENV／TX-08：C55 有限原生消费者并发对照

按[实施前合同](./workLog/20261007-C55-finite-native-budget-design.md)执行；只启动独立同镜像只读guard／自有proxy及新的有限debug indexer，原服务和C52计划不改。

- [x] F55-1：当前八debug／部署scope和同镜像只读输入绑定，四个新私有database／identity及4／8／8／4独立原生消费者。
- [x] F55-2：每轮自然exit0／23SQL水位205与全部27业务表等于原认证205；记录真实耗时／指标与拒绝，不能将latency count当作成功数。
- [x] F55-3：独立核验原服务／输入、四自然终态、四进程命令及108次fresh SQL等价、新guard／proxy准确关闭和累计清理；数据与首审工具失败留存。本次没有HTTP原帧采集，不冒称原帧审核。
- [ ] F55-4：只有完整三cohort预算、HBase／Rocks等价与生命周期资格成立后才能实施运行服务变更；有限SQL试验不计部署或父完成。

## ENV／TX-08：C56 原完整门的单一驻留续期

按[独立续期合同](./workLog/20261008-C56-resident-continuation-design.md)推进；C52无交接的终态保留，新意图和结果不覆盖。

- [x] Q56-1：C52实际PID消失、零attempt／信号／阶段与原父完整独立终验。
- [x] Q56-2：独立命名的不可变新观察工具，原完整政策／before／after／五实现与49测试保持，新源码结构资格。
- [x] Q56-3：唯一3600秒实际观察，精确PID／命令／cwd／资格绑定；不计安装。
- [ ] Q56-4：实际完整自然窗口及交接／新authority／推进／完整524022写后门和父验收。

## ENV／TX-08：C57 三cohort容量与物理隔离

按[容量前置合同](./workLog/20261008-C57-three-cohort-capacity-design.md)推进；C55不直接用于部署，原HBase14表不作为新测试namespace。

- [x] G57-1：实际guard／冻结adapter与三cohort配置、源码／gateway字节码及readonly PG资源快照。
- [x] G57-2：共享聚合预算及真正物理隔离的独立拒绝审核，工具容器正常精确收尾。
- [x] G57-3：独立完整14HBase／23SQL／4Rocks有限验证、业务等价及真实故障闭合。[C58四轮完整独立04](./workLog/20261008-C58-three-cohort-finite-independent-04.json)与[C67实际输入故障完整数据独立02](./workLog/20261008-C67-actual-fault-data-independent-02.json)成立；冷恢复、持续追平与完整父合同分别验收。
- [ ] G57-4：完整资格后受控生命周期／authority／持续追平及全部写后／父合同。

## ENV／TX-08：C58 完整有限验证的物理目标

按[物理隔离合同](./workLog/20261008-C58-physical-cohort-finite-design.md)准备，蓝图解析不能计真实部署或等价。

- [x] H58-1：四个全新project／network／S3／HBase WAL／ZK卷及同源mTLS八服务蓝图，实际Compose解析与冲突／原服务审核；0启动。
- [x] H58-2：实际新物理目标及24共享输入预算／PG资源／全部拒绝门资格。
- [x] H58-3：四轮最新debug三cohort有限终态与14HBase／27SQL业务表／4Rocks持久水位及全部8 CF键值等价，完整原始证据和独立复核。
- [ ] H58-4：自有资源精确正常收尾、原数据保持；随后才审核完整资格与受控部署／持续追平／父合同。


## C58实际初始化与指标错误、C60观察延续（2026-10-08）

[当前限定结果](./workLog/current-state.md)及[指标后继实施合同](./workLog/20261008-C58-metric-label-successor-design.md)已记录。02数据保留和正常精确收尾经独立终验，累计79；原失败不升格为四轮资格。03必须完整四轮及独立复核，之后才审H58-2／3／4。C56实际自然终态通过，C60准备／唯一运行只证明观察资格，Q56-4仍开放。98父项不据准备、局部数据或观察启动增加。


C58收口：[四轮实际数据与独立04](./workLog/20261008-C58-three-cohort-finite-independent-04.json)完成H58-2／3限定范围，完整原生终态和37新退休ID已复核；H58-4部署及持续追赶仍开放，中位比1.087不足1.20。98父项仍84/98。


C60实际自然终态：[独立终验](./workLog/20261008-C60-resident-final-independent-01.json)确认原父与全部阶段缺失，0信号、未attempt／安装；Q56-4实际交接与七覆盖合同保持开放。


## 2026-10-08：C64自然终态、C66待提交批次安全交接

按[待提交批次交接设计](./workLog/20261008-C66-pending-drain-handoff-design.md)推进，旧完整100项保留，扩展不允许冻结工作 child 或修改 pending、epoch、admission。

- [x] D66-1：C64实际3600秒自然结束／无安装／0信号／原父及全部阶段保持的独立终验。
- [x] D66-2：原五实现与 sealed plan 可逆保留，独立新目录，仅接纳自然 waiting_timeout、无 child、prepared0、精确 pending553728及版本、原作用域 advisory lock0；134项实际政策／控制器检查和完整fresh lineage通过。
- [x] D66-3：57观察器拒绝／单次失败无重试／明确新旧目录检查及独立直接进程入口通过；唯一实际35045／cwd／源码／3600秒绑定，不计交接。
- [ ] D66-4：实际自然窗口、完整fresh before／after、原父正常退出、新authority及后继推进；不得根据观察启动勾安装。
- [ ] D66-5：正式发布、HBase14／SQL23／Rocks4／Display／资产／受支持账户七覆盖达到524022，原六交易写后索引及当前页面刷新；无重发。

[C64终态独立01](./workLog/20261008-C64-resident-final-independent-01.json)、[C66政策134](./workLog/20261008-C66-pending-handoff-tests-01.json)、[独立准备](./workLog/20261008-C66-pending-preparation-independent-01.json)、[直接入口及57检查02](./workLog/20261008-C66-pending-observer-preparation-independent-02.json)、[唯一运行绑定](./workLog/20261008-C66-pending-observer-running-01.json)。首次独立启动的导入顺序错误在main前拒绝，0意图／信号，原源码与失败保留；新增真实子进程--help验收后才启动。

## 2026-10-08：实际有限输入故障与保留数据冷启动

- [x] FC-1：C67真实20秒以上输入容器离线、19个实际503帧及三原生重试后，14HBase完整cells／27SQL／8Rocks与基线相同；十自有正常精确退出及数据保留独立通过。
- [x] FC-2：C69／C71七服务实际同ID冷重启、初始化未重跑；first有限完整数据、fresh SQL26业务＋fence精确1→2、fresh八CF及自有正常收尾独立通过。第二轮终态／HBase完整资格不随部分结果完成。
- [x] FC-3：依据当前RTD与[Sui固定官方源码](https://github.com/MystenLabs/sui/blob/712c7263297c01fce764e8f99c17150c9b8120f6/crates/sui-indexer-alt-consistent-store/src/db/mod.rs)区分持久BCS水位和瞬时snapshot，保留原指标／epoch／查询范围；C75下界恒0假设失败及原数据保留。
- [x] FC-4：按[C79最终合同](./workLog/20261008-C79-fault-cold-final-design.md)用全新隔离栈，真实输入故障、七服务保留数据冷重启及两轮完整14／27／8、真实native终态和独立fresh数据／精确清理闭合；仍不完成全dev／普通Chrome／QA-A20父合同。

C65 Mounts顺序工具误拒绝、C67旧导出器路径白名单拒绝、C69真实输入marker未就绪、C71冷恢复指标0导致900秒控制器等待、C74晚于原控制器收尾的前置拒绝均原样保留；有限隔离验证不降低目标／改原服务。C79新增11范围检查和原8信号拒绝；完整实际结果与独立复核之前不勾FC-4。


C66实际协议后继：[精确35045停止与独立审核](./workLog/20261008-C66-owned-observer-retirement-independent-01.json)确认只向自有观察器发SIGINT，原父／child0信号、阶段缺失，非自然3600终态。[C81设计](./workLog/20261008-C81-pending-observer-wire-contract-design.md)、[独立57＋10真实状态检查02](./workLog/20261008-C81-pending-observer-preparation-independent-02.json)与[唯一79714运行绑定](./workLog/20261008-C81-pending-observer-running-01.json)完成后继观察资格。D66-3只证明已实际观察；D66-4／5仍待真实交接／覆盖。C81使用同一C66交接operation和既有failure receipt，owner选择器保持；首次标签资格与临时state_dir fixture错误原样保留，0启动／信号。

[C75部分冷数据独立01](./workLog/20261008-C75-partial-cold-data-independent-01.json)确认完整首轮、fresh SQL26＋fence1→2／八CF和十新自有正常精确清理，累计165；不计完整第二轮HBase／native终态。FC-4当前C79执行，仍待实际及独立完整验收。


FC-4实际收口：[C79执行](./workLog/20261008-C79-finite-fault-cold-01.json)与[完整独立终验01](./workLog/20261008-C79-fault-cold-independent-01.json)通过两轮：writer／SQL两次自然exit0、Rocks两次SIGINT0，14HBase／26SQL业务表／八CF完整字节相同、fence唯一行严格1→2、四原生BCS持久水位205。实际冷恢复AvailableRange从0–205变为205–205，原gauge0保持；不认证历史0–204。十一新自有正常精确清理、五卷／SQL／Rocks保留，累计176。QA-A20全dev、journal与普通Chrome仍分别开放，98父数不增。


C81实际终态与[C82独立审核](./workLog/20261008-C82-rejected-handoff-independent-01.json)：04:23 attempt被拒绝，79714已结束，未安装、0信号、全部交接阶段缺失，原父及完整lineage保持。失败原样保存、不自动重试；当前15116 prepared记录要求独立断点续发与正常缓存排空合同，D66-4／5仍开放，84/98不变。


## C83：完整 prepared 尾部与正常排空交接

依[新合同](./workLog/20261008-C83-prepared-tail-drain-design.md)另建目录，旧C66/C81失败及源码保持。

- [x] PD83-1：C82独立确认C81结束、未安装、0信号、交接阶段缺失、原父及完整lineage保持。
- [x] PD83-2：只读封存486335–501450的15116 prepared完整行，连同chain／fence／admission所有列摘要、精确pending553728及staging版本；封存不代表无child或可安装。
- [x] PD83-3：81政策与控制器race检查、实际原函数缓存正常写完／SIGTERM正常exit0／stopped与PID移除／0新child资格，以及47观察与所有权拒绝检查通过。
- [x] PD83-4：单次10800秒观察器实际启动，唯一PID33511、原venv／cwd／birth／源码及sealed plan独立绑定，失败不自动重试；原工作child未被发信号。
- [ ] PD83-5：实际无child／lock0／全尾部保持的fresh before与冻结后TLS、正常停止、独立fresh afterDrain、新PID及authority、后继发布推进。
- [ ] PD83-6：原六NFT目标524022的七覆盖与生产同S读、页面刷新及98父项完整审核，无重发原六交易。

[81项与真实测试进程正常排空](./workLog/20261008-C83-prepared-drain-qualification-01.json)、[47观察与owner审核](./workLog/20261008-C83-prepared-observer-independent-01.json)、[实际唯一观察器](./workLog/20261008-C83-prepared-observer-running-01.json)为限定资格。准备初次无child断言及过早读取startup intent的拒绝均保留；未安装／未发布不计D66-4／5或98父项，84/98保持。


## C84：原六交易正向写后读取准备

依[补充执行合同](./workLog/20261008-C84-post-write-positive-design.md)，完整范围继续按C53／C85十三对象及三账户；当前新鲜[C83七覆盖](./workLog/20261008-C83-nft-post-write-readiness-01.json)仍全部未达到524022，不运行正向或打开旧签名profile。

- [x] PW84-1：原六已成功摘要、八件NFT、三控制地址、C51实际profile、原1015文件及1120产品源码校验；零网络[实际preflight](./workLog/20261008-C84-positive-input-preflight-01.json)及[独立输入审核](./workLog/20261008-C84-positive-input-independent-01.json)通过。
- [x] PW84-2：正向生产reader工具完成、[限定类型检查02](./workLog/20261008-C84-target-typecheck-02.json)exit0；七门／5分钟／minimum524022、精确六已转移BCS、三账户完整资产分页／cap／lock／exclusive／OB目标及原摘要账户历史检查保持。只证明编码与准备。
- [ ] PW84-3：全部七门实际满足后的八件NFT／六归属／完整分页及源账户历史正向运行，保存全部原帧，无模拟签名执行。
- [ ] PW84-4：独立protobuf／BCS／同S GraphQL／完整history原帧审核、实际Chrome写后刷新及原journal无重发；不替代其他父门。


## C85：保持C53完整十三对象、固定归档版本与三账户历史

依[完整合同](./workLog/20261008-C85-full-post-write-design.md)，C84补充不得代替原P53-2／3／4。

- [x] P85-1：仅将原完整C53工具的qualified ownership改为C83；原51合同、十三对象／五cap／明确archive版本／资产S和三账户六／五／一历史范围完整保持。实际0IO coverage-denied preflight与独立断网准备通过。
- [x] P85-2：独立完整原帧审核工具完成；实际历史对象22检查、两个旧窗口全部24行／两个checkpoint／原六详情22检查、语法与positive工具拒绝负面preflight资格通过；不计当前正向。
- [ ] P85-3：七覆盖达到524022后，实际生产同S八NFT及五cap、十三native／archive固定版本、原六详情和三账户全部受支持历史窗口，完整原帧及独立终验。
- [ ] P85-4：当前Chrome只读写后刷新、原journal保持及正常重锁，完成全部剩余父任务实际门；普通Chrome CA／权限分开，不重发六笔。


C85运行更新：[05:29独立观察](./workLog/20261008-C85-post-prefix-runtime-observation-01.json)原审核诊断486335/486335，正式上界仍486334、pending553728及工作锁1；原child自然续发、29服务／14健康保持。[七覆盖03](./workLog/20261008-C83-nft-post-write-readiness-03.json)尚未满足目标，P85-3／4及98父完成数不增加。普通Chrome安装字节与当前进程保持，密码／条款及CA仍另验。


## C86：过期观察器精确退役

- [x] R86-1：原child自然继续prepared尾部，15116封存已过期；精确PID33511身份复查、单一正常SIGINT、退出与独立全lineage审核通过，原父及child零信号。
- [x] R86-2：保存实际提前KeyboardInterrupt结果及旧源码／plan，不记10800秒自然完成、安装或PD83-5完成，不启动新观察器。

## C87：独立 MinIO 源站与副本读取并行

依[实施合同](./workLog/20261008-C87-paired-guard-design.md)推进，原1.20资格、16请求上限和完整fresh准入均保持。

- [x] P87-1：从实际安装guard封存原8文件，仅两调度文件及新helper变化，原source／debug／29容器与14健康保持；尚未构建或安装。
- [x] P87-2：原51合同＋九role/race检查＋四helper检查共64实际通过；独立AST／固定版本调用集／SQL与结束复查保持。模拟aggregate oracle与实际prefix catalog明确分开。
- [ ] P87-3：实际隔离image／两个preview，原完整env／只读secrets／mTLS／用户和资源条件保持。
- [ ] P87-4：实际fixed4三组ABBA逐字节性能、拒绝门与16并发有限能力，1.20中位门保持。
- [ ] P87-5：实际原帧／配置／精确退役独立审核；有限候选资格不计部署、持续三cohort改善或98父完成。


C87决策：当前[完整发布上界独立审核](./workLog/20261008-C87-publication-limit-independent-01.json)确认41管线／Display／资产／账户均到正式486334，pending553728尚未提交，原child已经完整prepared36132行至522466。八实际HTTP读取全部200、0.05–0.14秒，八delegated阶段和四profile共十二原算法读取通过；未认证持续吞吐或C87候选收益。旧同image并行384实际实验两档0.943／1.016不足1.20。因此P87-3／4／5作为条件优化暂不启动，不是98父任务完成的前置要求；不创建临时容器、不改原并发，直接等待原发布完成再跑完整C85。首次临时身份字段错误与新工具导入顺序失败保留，均0操作，最终03及独立01通过。


## C88：补齐完整 checkpoint summary 外层审核

依[实施合同](./workLog/20261008-C88-full-summary-design.md)，旧C85 prefix限制和历史证据保持，新增full外层decoder不改变13／5／3范围。

- [x] S88-1：固定Sui官方／当前RTD与SDK源封存，四类型字段布局一致；实施前Task与workLog合同保存。
- [x] S88-2：十字段完整BCS规范解码与全部protobuf字段对齐、opaque版本字节保持。
- [x] S88-3：两实际历史checkpoint、遗漏字段红灯与变异拒绝；epoch／commitment／高u64分支fixture明确限定。
- [x] S88-4：新完整原帧auditor仅扩展parser，完整source delta／51合同与decoder资格独立审核。
- [ ] S88-5：七门后原C85实际positive＋C88完整独立终验，再验Chrome／98父合同。

C88完整外层summary已按[固定Sui／当前RTD源对齐](./workLog/20261008-C88-summary-source-authority-01.json)补齐十字段BCS与全部protobuf一致性，opaque版本向量仅比对完整字节。[29项资格](./workLog/20261008-C88-full-summary-qualification-01.json)涵盖两个真实历史checkpoint、13个旧前缀未拒绝的元数据反例及明确隔离的高u64／epoch／两种承诺分支；不把fixture认证为epoch quorum。[独立准备](./workLog/20261008-C88-full-summary-preparation-independent-01.json)核验原51合同、新旧auditor仅四处允许差异、其余parser函数身份保持和拒绝未覆盖preflight。S88-2／3／4限定完成；S88-5与当前十三／五／三正向及Chrome仍待，98父保持84/98。路径选择器的只读错误假设已由[真实路径核对](./workLog/20261008-C88-readiness-selector-hypothesis-01.json)推翻，源码未改。

## TX-08／ENV：C89完整原批次自然提交后的明确发布后继

按[实施前合同](./workLog/20261008-C89-completed-batch-handoff-design.md)推进，旧C66／C81／C83操作保持、原工作child零信号、完整namespace／版本／证书／复制／SQL／admission不变；不增加98父分母。

- [x] P89-1：保存旧文档及新plan／五源码／明确所有权投影，原文件保持。
- [x] P89-2：108原合同＋完成批次／pending／lock／race拒绝与实际工作窗口零信号审核、完整lineage逆向。
- [x] P89-3：新readiness／完整十三／五／三／六production与C88 full auditor仅ownership变化、51合同保持。
- [ ] P89-4：准备全部通过后唯一有界观察、仅自然published≥553728且pending／prepared／child／lock均清空时单次交接及真实独立终验。
- [ ] P89-5：实际新publisher推进、七覆盖和完整production正向及C88原帧独立审核。
- [ ] P89-6：当前Chrome／journal／14父最终完整合同继续，不把候选安装计父完成。

C89限定准备与实际唯一观察见上方六证据及[完整readiness](./workLog/20261008-C89-nft-post-write-readiness-01.json)、[未覆盖preflight零IO拒绝](./workLog/20261008-C89-full-post-write-preflight-01.json)。P89-4–6与98父保持开放。旧模式字符串沿用兼容标签，真实所有权必须以C89 operation／plan SHA／qualified source／实际PID绑定核验，不能凭标签推断安装。

## QA-A15：C90 当前名称验证工具接口修正

依[实施前合同](./workLog/20261008-C90-current-name-probe-design.md)，保留C39失败／旧脚本和当前名称reader完整fresh合同。

- [x] P90-1：另存v3完整八案例，默认反向使用当前defaultName，补完整原帧／失败source pins。
- [x] P90-2：无IO接口／限定类型资格，保留生产源码与原输入，禁止把资格算名称positive。
- [ ] P90-3：fresh当前生产八案例＋独立原帧及原N1–N4／全部QA-A15当前验收。

C90接口准备按[最终源码02](./workLog/20261008-C90-name-probe-source-prepared-02.json)、[限定类型exit0](./workLog/20261008-C90-name-probe-target-typecheck-01.json)与[实际生产prototype／AST零IO资格02](./workLog/20261008-C90-name-probe-interface-qualification-02.json)通过；原八案例及生产initial head／end20新鲜度保持。首个模块exports路径失败和限定driver相对目录错误分别保留，最终已修复；初始v3源码旧SHA已精确重建封存，未丢失准备证据。P90-3／原N1–N4／完整QA-A15仍开放，不把零IO资格当名称positive。

## TX-08／ENV：C91 完整prepared与已持久化版本断点接续

依[实施前合同](./workLog/20261008-C91-full-prepared-versions-successor-design.md)，原child自然timeout后保留全部67394行与三pending版本，旧操作和全部fresh边界保持。

- [x] P91-1：完整真实ledger封存、独立plan／六源码与三版本精确匹配。
- [x] P91-2：原81政策／race／真实正常cache-stop资格、新增完整版本拒绝及独立逆向审核。
- [x] P91-3：资格通过后精确退役C89，再启动一个新有界单次observer，原父和原数据保持。
- [x] P91-4：fresh无child／lock0／完整版本freeze、最长原7200秒自然cache排空、明确正常旧退出及后继接续与独立终验（C91原安装实为C44；正确C50由C92真实恢复及审核补齐）。
- [ ] P91-5：正式提交与七覆盖、完整生产／原帧／Chrome／14父验收。

C91准备及实际排空入口由[完整ledger前置](./workLog/20261008-C91-full-prepared-prerequisites-01.json)、[六源码／plan](./workLog/20261008-C91-full-prepared-source-plan-01.json)、[93完整版本／race与真实源cache-stop](./workLog/20261008-C91-full-prepared-drain-qualification-01.json)、[逆向独立审核](./workLog/20261008-C91-full-prepared-sources-independent-01.json)、[47观察与ownership](./workLog/20261008-C91-prepared-observer-independent-01.json)、[完整binding](./workLog/20261008-C91-observer-complete-binding-01.json)及[真实62832冻结边界／排空观察](./workLog/20261008-C91-running-drain-independent-01.json)通过。初始相对CLI输出被严格入口拒绝、0intent／0信号，见[原拒绝及绝对路径修正](./workLog/20261008-C91-observer-cli-scope-rejection-01.json)。[完整写后读准备](./workLog/20261008-C91-full-post-write-preparation-independent-01.json)只改ownership，当前[七覆盖](./workLog/20261008-C91-nft-post-write-readiness-01.json)仍不足，[preflight](./workLog/20261008-C91-full-post-write-preflight-01.json)0IO拒绝；P91-4／5及14父保持开放。控制器实际信号总数尚待终态收据，不把进行中阶段称正常旧退出、C50安装或正式覆盖。

C91原有界观察已在158秒正常完成一次真实接续，[watch](./workLog/20261008-C91-prepared-handoff-watch-01.json)／[实际安装](./workLog/20261008-C91-prepared-handoff-activated-01.json)与[独立终验](./workLog/20261008-C91-installed-handoff-independent-01.json)通过；不称10800秒全部elapsed，也不伪造原non-child exit0。P91-4的旧安装67724实际是C44入口，旧C50叙述由C92纠正；正常旧排空证据成立，正确C50接续由C92补齐，P91-5仍待正式七覆盖／完整索引及Chrome父合同。进行中delivery driver被真实终态变更拒绝的[竞态记录](./workLog/20261008-C91-delivery-driver-transition-race-01.json)保留，不重试activation。旧返回mode兼容标签不作所有权依据，以C91 operation／plan SHA／完整stage／实际PID及新venv命令为准。


## TX-08／ENV：C92 失败发布器依赖修复及正确C50接续

实施前依据：[恢复合同](./workLog/20261008-C92-failed-publisher-recovery-design.md)。原67724已失败，历史安装有效，当前live/C50叙述纠正。父项仍84/98。

- [x] P92-1：完整失败日志／断点／fresh TLS与原lineage独立核对、旧五文档封存。
- [x] P92-2：新候选精确C50入口／逐字依赖、实际父子--help及独立源码资格。
- [x] P92-3：无旧PID／child／lock0、完整67394三版本保持后一次恢复／新authority及独立运行审核。
- [ ] P92-4：七门达到524022后完整13／5／3／6生产＋C88审核、Chrome／全部14父合同。

## TX-01／TX-04：C93 独立四类 NFT 夹具与实际授权／竞争

按[实施前合同](./workLog/20261008-C93-independent-nft-fixture-design.md)推进；原 C48 六笔不重发，原 C92 十三对象／五 cap／三账户写后读继续单独验收。夹具不增加 98 分母或勾父项。

- [x] P93-1：当前 ownership／源 debug／原数据核对及六文档精确封存。
- [x] P93-2：已部署四 package／原 publication／Shared policy 原生准备，新一次操作 intent 和 SHA。
- [x] P93-3：四独立新角色、仅新 source／sponsor 各一次 Faucet，完整私有资金回执。
- [x] P93-4：八 NFT／五能力对象单次规范 seed、最终 ENABLED 模拟／同字节签名／唯一 Execute 和只读恢复。
- [ ] P93-5：独立全部原始交易／对象 BCS／原对象保持；正式快照后完整四路竞争／内部授权与父合同。

## TX-01：C94 当前独立 NFT 字节与授权核心矩阵

按[实施前合同](./workLog/20261008-C94-current-nft-core-authorization-design.md)推进；原 C93 全八／五不缩小，正式快照／全部四类／Provider Chrome guard／双签执行／父任务继续独立验收。

- [x] P94-1：C93 六文档原字节封存及当前完整原数据／ownership／debug 输入审核。
- [x] P94-2：真实 direct NFT 生产核心最终 bytes／Gas／expiration、相同 bytes 复验及变更 digest／sender／会话／取消拒绝。
- [x] P94-3：新 sponsor fresh gas、生产核心准备／同字节双签独立验证和旧签名变更拒绝，当前产品执行边界保持；0 Execute。
- [x] P94-4：完整原始帧独立审核及新八NFT／五cap、原十三／policy不变，限定核心证据／未完成完整父范围。

C94按[完整交付独立审核](./workLog/20261008-C94-core-delivery-independent-01.json)完成14真实core检查／84请求／9ENABLED模拟／2本地签名及27对象保持；[完整原帧02](./workLog/20261008-C94-current-nft-core-independent-02.json)核验83成功reply与1实际过期header，三个真实成功模拟的changed digest拒绝和四pre-IO守卫。原三次工具失败／源保留，双方方案按官方及固定RustSDK来源校正Simulate外层digest／实际路径，见[日志](./workLog/20261008-C94-progress.md)。0 Execute／Faucet／新Docker／原信号，不认证Provider Chrome guard、全部Kiosk、双签执行或父；84/98及14父继续。

C93 P93-1–4按[完整独立绑定](./workLog/20261008-C93-recovered-fixture-independent-01.json)限定完成，真实新夹具checkpoint687127、八NFT／五cap／原十三与policy保持；原一次Execute后的即时not found失败留存，recover0模拟／签名／发送。38成功gRPC原帧和两个Faucet已独立解码，唯一失败空body回复未保存headers、错误grpc-status未认证，明确不计全部回复正面。完整原生审核／两次限定类型已通过；[完整日志](./workLog/20261008-C93-progress.md)保留全部源和失败。P93-5／四类实际competition、正式资产快照、内部完整授权及所有14父仍开放，84/98保持。


## C95 当前 Wallet Standard 赞助 NFT 双签收集／外部执行

实施前合同：[C95完整范围](./workLog/20261008-C95-sponsored-nft-design.md)，[八文档原字节封存](./workLog/20261008-C95-before-implementation-doc-archive-01.json)。保留现有单签execute拒绝；仅独立新NFT、新空测试profile、真实sender批准＋独立sponsor双签与外部原生执行，27保护对象保持，0Faucet／新Docker／原服务信号。84/98及全部14父继续。

- [x] P95-1：完整输入／当前生产产物与demo、原数据和最新dev scope准入。
- [x] P95-2：独立专用新NFT一次mint及原摘要只读终态，无原库存转移。
- [x] P95-3：当前生产Wallet Standard真实sender sponsor／Epoch批准、完整bytes签名和单签execute UI拒绝／journal保持。
- [x] P95-4：独立sponsor同完整bytes双签、一次外部gRPC执行与原摘要终态／实际gas／NFT新owner。
- [x] P95-5：全部原帧／UI／完整27对象与原环境独立审核、正常关闭清理及真实进度更新。

C95 P95-1–5按[178原始请求／唯一双签执行完整独立审核](./workLog/20261008-C95-delivery-independent-01.json)限定完成，只有外部赞助工作流实测；[实际日志](./workLog/20261008-C95-progress.md)保留两个真实执行成功／即时读取工具失败和只读原摘要恢复、原v1–3及两原始审核失败。现有单签Wallet execute仍禁用，全部父范围继续，84/98保持。


## TX-08／ENV：C96 完整副本读取并发

实施前合同：[完整设计](./workLog/20261008-C96-replica-read-parallel-design.md)，[八文档封存](./workLog/20261008-C96-before-implementation-doc-archive-01.json)。原C92正常工作，不以耗时重启；仅全量副本读取调度候选，全部内容／版本／epoch／admission／正式提交合同保持，父仍84/98。

- [x] P96-1：当前完整lineage／ledger／PID／前缀阶段与staging只读诊断、原文档封存。
- [x] P96-2：精确原两个只读循环逆变换、bounded两阶段scheduler及完整单元／对抗资格。
- [x] P96-3：实际固定version ABBA性能／完整原读取证据、原venv父子入口与独立候选资格。
- [x] P96-4：实际自然终态限定窗口、完整断点和fresh authority下正常交接及真实安装认证。
- [ ] P96-5：正式七覆盖／完整六NFT写后索引和生产Chrome及14父实际验收。

P96-2补充合同：[已退役观察器完整身份](./workLog/20261008-C96-retired-observer-identity-design.md)。原PID16417被macOS复用导致只读审核误拒绝；仅资格selector精确核对旧birth／command，原实现和失败保留，禁止信号／安装及父项推进。

P96-5工具依据：[完整写后selector合同](./workLog/20261008-C96-full-post-write-selector-design.md)。只复制C92已资格的完整工具并接续精确只读身份，不降低七覆盖或原13／5／3／6；工具资格不勾父验收。

P96-4实施细化：[双终态完整交接](./workLog/20261008-C96-terminal-handoff-design.md)，[本次八文档封存](./workLog/20261008-C96-before-handoff-doc-archive-01.json)。原child96377已经自然完成，当前下一批child59696工作；资格与观察不算安装；真实终态／lock0／完整fresh断点后才执行精确正常父接续。


### P96-4 实际接续后的完整查询归属

依据：[编码前完整合同](./workLog/20261008-C96-installed-selector-design.md)，[九文档SHA封存](./workLog/20261008-C96-before-installed-selector-doc-archive-01.json)。只补当前ownership与历史fixture明确绑定，原控制器／candidate／接口合同不变；模拟安装与实际原分支等价不能代替真实安装。

- [x] P96-4a：原C92历史authority／C93 fixture与当前九文档完整封存。
- [x] P96-4b：完整selector、7组53子检查、实际原分支逐字等价与历史projection资格。
- [x] P96-4c：四份完整13／5／3／6工具精确逆向、原51／29保持、当前0IO覆盖拒绝。
- [x] P96-4d：经C98当前批次完整资格、真实六stage和独立终验完成正常交接；新83360已安装，全部14父业务合同继续。


### P97 响应TCP调度隔离实验

依据：[编码前合同](./workLog/20261008-C97-socket-delay-design.md)，[scope03九文档封存](./workLog/20261008-C97-before-socket-doc-archive-01.json)和[实际Python／Nagle状态](./workLog/20261008-C97-actual-socket-prerequisites-01.json)。只做隔离候选，原发布和完整98父范围保持。

- [x] P97-1：原九文档、运行实际配置／源码身份及编码前合同封存；未认证吞吐。
- [x] P97-2：单属性精确逆向、完整image／app／原方法与真实TCP setup资格03，原失败保留。
- [x] P97-3：原TLS／SQL／对象故障、128ABBA／136完整帧及原服务保持／五临时清理，实验完成但性能资格拒绝，未安装。
- [ ] P97-4：完整实际后继／回滚与fresh归属审核后再评估安装；本轮不安装、不计14父。

P97实际收口依据：[完整日志](./workLog/20261008-C97-progress.md)及[独立136帧审核](./workLog/20261008-C97-socket-experiment-independent-01.json)。P97-4实际安装未实施，本性能不合格候选不进入安装，不冒充安装完成；原14父范围保持。


## TX-08／ENV：C98 当前709569完整前缀自然接续

按[实施前合同](./workLog/20261008-C98-current-pending-handoff-design.md)及[十文档原字节封存](./workLog/20261008-C98-before-implementation-doc-archive-01.json)推进P96-4；原C91/C96不修改、原14父范围不缩小。

- [x] P98-1：本轮原文档、source与完整当前非空连续prefix／原PID封存。
- [x] P98-2：新批次三个明确phase及完整controller／race资格、当前working拒绝。
- [x] P98-3：完整selector／四原写后工具接续，原51／29与13／5／3／6保持。
- [x] P98-4：自然终态、全部fresh门后唯一正常实际交接与完整独立终验。
- [ ] P98-5：七覆盖／完整API与Chrome、全部四路M3及原14父验收。

P98-2／3实际依据：[283子检查与独立源码](./workLog/20261008-C98-handoff-source-independent-01.json)、[完整四工具准备](./workLog/20261008-C98-successor-post-write-preparation-independent-01.json)。[45917唯一有界观察](./workLog/20261008-C98-observer-running-01.json)已真实启动，但P98-4／5及原P96-4、全部14父仍开放；[完整进度](./workLog/20261008-C98-progress.md)明确未安装、六覆盖不足及普通Chrome步骤。


## TX-04：C99 当前 C46 四路 NFT M3 完整测试

实施前合同：[四路完整设计](./workLog/20261008-C99-current-four-nft-M3-design.md)，[十文档原 SHA 封存](./workLog/20261008-C99-before-implementation-doc-archive-01.json)。原98父84/98及14完整范围保持；当前原发布和观察不调整。

- [x] P99-1：完整四路库存绑定、live／durable／原帧独立审核合同及实施前拆解。
- [ ] P99-2：完整新库存696489七门／同S八NFT五cap与额外serial95，fresh native／归档固定版本和独立 canonical 审核。
- [ ] P99-3：当前四完整表单实际 live 竞争、原结果失败关闭及释放后四路正向预览，完整原帧独立审核。
- [ ] P99-4：产品唯一未转发 dispatch-pending、正常冷启动／解锁和四路 durable gate，完整原签名／journal 审核。
- [ ] P99-5：原完整写后／内部授权／有效期／普通Chrome和其他14父逐项验收，按原98范围收口。

C98 P98-4／P96-4与4d限定依据：[实际独立终验](./workLog/20261008-C98-actual-handoff-independent-01.json)、[真实一次安装](./workLog/20261008-C98-terminal-handoff-activated-01.json)和[观察自然终态](./workLog/20261008-C98-terminal-handoff-watch-01.json)。旧C96的固定批次没有自行通过，以C98独立新批次资格和完整原算法实际接续完成；P98-5／P96-5和全部14父未收口。

C99准备子项：[35真实守卫资格／七JS语法](./workLog/20261008-C99-current-nft-tools-qualification-01.json)及[完整日志](./workLog/20261008-C99-progress.md)完成限定工具准备，原正向门继续。

- [x] P99-2a：696489全量库存／十四对象／固定版本与独立原帧工具、实际0IO覆盖拒绝及七持久门重算资格。
- [x] P99-3a：当前C46四真实表单live／lease失败关闭／释放后四路预览程序和完整审计、实际建profile前拒绝。
- [x] P99-4a：产品唯一拦截pending／自然context关闭及UI解锁、四路durable与完整审计程序，实际建profile前拒绝。


## RPC-22／RPC-23／TX-08：C100 完整账户历史分页验收

实施前合同：[完整分页合同](./workLog/20261008-C100-full-post-write-pagination-design.md)，[十一文档SHA封存](./workLog/20261008-C100-before-implementation-doc-archive-01.json)。C98真实150回复失败保持，不降低原98父范围和完整13／5／3／6。

- [x] P100-1：真实失败／原协议分页边界及十一文档完整封存，实施前拆解。
- [x] P100-2：完整工具唯一pageSize2→4逆变换、原51／29和原60秒合同、正向跨页独立审核准备资格。
- [x] P100-3：fresh完整七门、一次完整三账户全新窗口与完整13／5／3／6原帧独立审核。
- [ ] P100-4：生产Chrome实际页面及其他原14父完整业务验收。


## RPC-22／23、QA-A07／TX-08：C101 当前三账户生产页面

实施前合同：[当前完整页面设计](./workLog/20261008-C101-current-three-owner-browser-design.md)，[十三文档原SHA封存](./workLog/20261008-C101-before-implementation-doc-archive-01.json)；完整C100 API已独立通过，C51普通Chrome初始化另验。

- [x] P101-1：完整API独立前置、原数据／当前页面合同及十三文档封存。
- [x] P101-2：当前C46三账户／五Kiosk／八NFT／六原收据完整页面与独立原帧工具。
- [x] P101-3：三个新空CFT profile实际完整页面、保守风险／历史、原帧／journal和正常锁定关闭独立审核。
- [ ] P101-4：对原14父完整合同逐项确认，实测通过后推进实际父任务。


## RPC-22／QA-A07／TX-08：C102 完整Kiosk期限内并发修复

按[编码前完整合同](./workLog/20261008-C102-kiosk-collection-parallel-design.md)执行，原60秒、所有完整分页／BCS／末验保持，不扩大业务支持或用partial冒充完整。原98分母不变。

- [x] P102-1：原1120产品SHA清单／八文件封存、实际04失败诊断及完整合同。
- [x] P102-2：原串行反例、并发及取消／失败／完整分支回归。
- [x] P102-3：精确产品delta、完整类型与新独立production／闭包审核。
- [x] P102-4：当前完整API和三账户页面／原帧独立，完整父项验收与细分进度。
## TX-01／TX-04：C103 当前构建四路 NFT 验收接续

按[实施前合同](./workLog/20261008-C103-current-four-nft-source-design.md)接续完整C99，原89/98、剩余9.18%和九父完整合同保持，准备不计业务通过。

- [x] P103-1：原归档补读503的完整负向帧／原入口配置／同刻日志只读阶段诊断，[两帧／六错误关联拒绝](./workLog/20261008-C103-archive-connect-stage-02.json)完成；底层根因和可用性修复未确认。
- [x] P103-2：C99库存／live／durable／独立审核精确接续当前763d构建，[五完整逆变换／17源码及13准入检查／六份实际0IO证据](./workLog/20261008-C103-current-nft-tools-qualified-01.json)完成；不计NFT正向或业务父项通过。
- [ ] P103-3：fresh696489七门后独立新operation／实际构建origin／资源完整保护资格和自有网关。
- [ ] P103-4：完整当前四路库存正向及独立原帧、实际live／过期释放／四路正向预览。
- [ ] P103-5：产品唯一未转发pending／正常冷启动解锁及四路durable完整独立审核、按原权重更新。

## QA-A17／QA-A20：C104 完整重建与冷恢复

按[实施前完整合同](./workLog/20261008-C104-complete-generation-rebuild-design.md)和[本轮日志](./workLog/20261008-C104-progress.md)推进；固定709569正式源及全HBase／SQL／Rocks／账户范围，不复用C79的有限205资格收口。

- [x] P104-1：七份原文封存、完整实施合同及实际只读准入诊断完成；[资源／发布观察](./workLog/20261008-C104-resource-and-publication-observation-01.json)保留实际余量6.227GiB、12GiB准入未通过、新operation及容器均不存在，发布核验322560→324608。此项是诊断完成，不是部署或业务验收。
- [ ] P104-2：资源余量成立后独立六健康服务、PG verify-full／S3私有CA／完整14 HBase与gateway实际探针。当前[prepare01](./workLog/20261008-C104-foundation-prepared-01.json)在创建前失败，新增代码仅AST解析，不计运行资格。
- [ ] P104-3：正式709569和全部固定版本／bytes门后完整新消费、账户索引／API及入口；零Fullnode归档摄取。
- [ ] P104-4：全物理范围从归档重建、完整当前资产／账户窗口和全数据独立审核。
- [ ] P104-5：完整新服务同时down／依赖恢复、另一次空范围归档重建及当前浏览器全换代／URL／registry／迟到矩阵，原九父按完整证据收口。

## C105 精确staging读取候选

依[实施前合同](./workLog/20261008-C105-staging-read-pipeline-design.md)、[本轮日志](./workLog/20261008-C105-progress.md)推进，全部原串行写入／认证／完整副本／commit保持，准备不计业务。

- [x] P105-1：七文档原字节封存、原stage代码字节抽取及完整候选设计。
- [x] P105-2：原构造器和v1 SQL空白精确拒绝保留，v2完整子／parent逆变换、原SQL字符串及12组／12子例通过。
- [x] P105-3：真实256固定prepared ABBA02、2560只读HTTP／1024完整body、全部原帧及七变异独立审核，片段提升2.0163倍；候选未安装。
- [x] P105-4：C106独立资格、自然窗口一次完整实机交接及六阶段独立审核；新80964／候选02／14400已安装，整批提交仍待。
- [ ] P105-5：实际固定709569正式提交、41管线及696489七门追平、当前四NFT和九父完整验收。

## C106 完整批次受控预算接续

按[实施前合同](./workLog/20261008-C106-bounded-budget-handoff-design.md)和七文档原字节封存推进；保持现有7200、仅新后继14400有界预算，所有原认证门不变。

- [x] P106-1：原预算60..14400源码及测试依据、当前长批次阶段事实、完整合同及七文档封存。
- [x] P106-2：完整精确delta／49组592子检查与预算、实机0信号working拒绝、全部原authority及新selector资格；独立源码通过，安装分支仍待实机。
- [x] P106-3：一次3600秒观察器在993.108秒内捕获自然终态，完整六阶段／49896全prepared行实机交接及独立审核通过；83360正常退出、新80964启动、0原child信号／新容器。
- [ ] P106-4：完整709569正式提交、全管线／当前696489七门及九父完整业务验收。

- [x] P106-3a：一次3600秒观察器PID50674与完整源／出生／请求／watch独立核验，0信号；激活fingerprint为空，不计实机交接或业务通过。

## C107 当前四路 NFT 接续新发布器

按[实施前合同](./workLog/20261008-C107-current-nft-successor-source-design.md)、[18原文封存](./workLog/20261008-C107-before-implementation-archive-01.json)和[实施日志](./workLog/20261008-C107-progress.md)执行，完整696489七门及原五工具合同不减。

- [x] P107-1：当前新selector接续完整合同、18原文／完整原源字节封存。
- [x] P107-2：八文件完整逆变换、17 source／13准入检查、真实0IO库存／两种0profile及六完整负向独立审核，当前1121 source和全原保护通过；所有正向仍待。
- [ ] P107-3：fresh696489七门后新独立gateway全原origin／TLS／端口与全局保护实测；当前CLI在门前拒绝、operation不存在。
- [ ] P107-4：当前完整十四库存／实际live／四路预览及durable完整独立原帧、原九父完整收口。

## C108 当前构建核心链路实际验收

按[完整合同](./workLog/20261008-C108-current-core-browser-design.md)，原父及权重保持，准备／局部通过不计父项。

- [x] P108-1：十原文／完整源封存，九完整来源逆变换与25准入反例、fresh524022旧核心七门、当前C106 authority及独立gateway实机启动通过；准备不计父项。
- [x] P108-2：当前build03真实三内部完整矩阵02及独立01通过：12检查／15 ENABLED模拟／9 canonical最终effects／6实际gas选择／10补充原帧；完整最终BCS／GasData／expiry／克隆故障／Back新批准及fresh native核验，0签名／Execute。
- [ ] P108-3：当前币／质押／dApp／历史／设置实际页面与三服务流量逐范围补齐；browser04实际十二页／连接／断开通过，但独立01遇三504、独立02缺worker archive正文；补全捕获的browser05在质押页真实TimeoutError失败。全部失败保持，完整REL-02仍要求NFT／名称及全部入口。
- [ ] P108-4：精确自有gateway正常exit0清理、原完整scope保护及当前来源／限定范围独立交付；自有exit0／删除／端口空闲与原两链／25actor／29容器／当前source独立通过，全局不变因其它项目evolvesay-minio重启拒绝并保留。完整核心页面及限定交付未通过，保持开放。
- [ ] P108-5：基于已封存48质押阶段请求时序及原20秒aggregate源码，定位真实TimeoutError，保留快照／H0／全部物理准入／期限及取消合同；确定根因后先写实施方案、再编码和当前构建完整重验。下一次实机使用新自有operation，不复用已退役C108网关。

## C109 质押完整集合读取与真实超时排查

按[编码前方案](./workLog/20261008-C109-staking-parallel-design.md)和[21原文及完整1121源manifest封存](./workLog/20261008-C109-before-implementation-archive-01.json)推进；原03方案4.4的20秒／完整同S／1000／10000及全部BCS／分页／末验保持，原98权重不变。

- [x] P109-1：两个reader及含准入的static入口用实际GraphQLSnapshot／BCS夹具、每leaf1500ms复现原串行20秒到期，三失败和原测试源码已封存；候选相同延迟完整成功，不当作真实底层根因全部证明。
- [x] P109-2：完整validator元数据前验，独立pool全rate及owner完整集合最多四任务；23项新增并发／顺序／scope／失败／caller／session／20秒／迟到／末验测试和184相关回归通过，所有原断言保持。实际浏览器修复仍待P109-4。
- [x] P109-3：184相关回归／13文件、RPC及完整production TS、独立production build01与5285模块／2036源码／七块完整闭包通过；精确两文件来源差异、其余1120、原dist／C46／C102构建及九来源拒绝通过，旧current C102 guard正确拒绝新源。实机尚待。
- [x] P109-4：同一C109当前1122构建由C110自有gateway／唯一启动UI完成当前三内部原12检查／15模拟独立验收及全部十二页／Wallet Standard连接重载断开，195consumer＋202完整browser／worker network正文和三服务原帧独立02通过；全部旧失败保留，持续可用、NFT／名称及完整REL-02仍开放。
- [x] P109-5：原C109及接续C110确切自有网关均正常exit0／删除、完整全局及原29／14／25／两链indexer／当前publisher保持；当前三内部及十二页、全源逆变换／397原帧／全部旧失败／当前1122源／原fine字节由C110完整限定交付独立01通过，不代替九原父验收。


## C110 独立测试浏览器表面与请求来源核查

按[实施前计划](./workLog/20261008-C110-isolated-browser-surface-diagnostic-plan.md)推进，保持当前C109源及全部原业务门。

- [x] P110-1：同一本轮自有CFT profile四次offline启动库存及独立审核通过：一个现有UI目标先URL未就绪、后三次tokens＋about:blank，0额外newPage／凭据／签名／Execute、当前worker正文及原scope保持；首次属性访问失败保留，只接受表面库存，在线请求归属仍待。
- [x] P110-2：fresh C110 gateway真实单页对照和独立原正文重放通过：唯一现有UI、88请求同一page／81原帧、当前完整staking及余额成功，13精确原GraphQL正文离线完整BCS／fold／末验相等，原20秒／四槽保持；完整根因及当前矩阵仍待。
- [x] P110-3：按实际单页请求归属及成功证据确定测试表面修正方案，四个完整test／audit全源逆变换只新runtime／fixture／复用已有UI和增加单页断言；当前三内部原12检查／15模拟／9规范effects／6gas选择／10补帧独立通过，产品不变，双页全部根因不作已修复结论。
- [x] P110-4：当前C109构建的三内部完整原矩阵独立01与十二页／Wallet Standard连接重载断开完整独立02通过，195consumer＋202 browser／worker network原正文／trailer、三服务、source/runtime和空journal均核对；browser01及504拒绝原文保留，范围不含全部NFT／名称／持续可用或原父验收。
- [x] P110-5：本轮确切CIDabf9正常stop20／exit0／rm、三端口空闲、全局配置及原29／14／25／两链indexer／工作publisher独立保持；完整限定交付01核对四工具原源逆变换、当前三内部／十二页原帧、所有旧失败、当前源及原fine字节，0原服务信号／卷／镜像／force。原89/98／9.18%保持。

## C111 当前 prepared 对象完整读取接续

按[实施前完整边界](./workLog/20261008-C111-prepared-published-read-design.md)执行。当前C106工作父／子与原两链／全部scope保护，原98分母及fine权重保持；不改变14400预算，不使用诊断文件授予提交或交接准入。

- [x] P111-1：原16文档／源码字节与当前完整函数、只读代理／串行写边界封存，原C106工作父子及全scope保持。
- [x] P111-2：原函数12组／19子例及整个原／候选循环2组／4子例、完整child／parent／全部SQL逆变换与真实两入口通过；两次驱动缺外围变量失败及精确另存修正保持，候选未改／未安装。
- [x] P111-3：同256真实prepared完整stage＋published ABBA及5632响应／2048完整GET独立审核完成，原7.284481秒／候选7.866238秒，比例0.926044未过1.20门；候选未安装，不算性能资格或业务。
- [x] P111-3b：candidate02只独立路径及published四线程、stage原16／全部fresh HEAD保持；原／候选完整循环2组4子例／两真实入口通过，同256 ABBA02比例1.510062及5632响应／2048完整正文独立02通过，原16线程失败保留，0安装。
- [x] P111-4：当前四线程候选完整准备独立01通过，四工具全源逆变换／原函数及整个循环／两真实入口／同256完整原响应／SDK7.2.20、额外fresh版本及全部原SQL／写／14400资格保持，读取片段比例1.510062≥1.20；未安装，不计正式或业务。
- [ ] P111-5：自然终态且无child／lock0的完整安全接续，再做真实正式提交和全部当前NFT／名称／九父验收。

## C112 四线程候选自然终态接续

按[实施前完整自然接续合同](./workLog/20261008-C112-qualified-read-handoff-design.md)推进；保护C106父80964及其实际当前子进程，不发送信号，候选性能资格不等于安装／正式发布，原98／fine权重保持。

- [x] P112-1：20原文／原14工具封存与11完整全源逆变换通过，当前80964／C111四线程资格、独立operation／runtime及完整原六阶段、全部19字段／14400预算保持；0安装。
- [x] P112-2：完整70组／963子案例与两实际入口、当前working拒绝及原完整scope独立通过，原49＋新21全部阶段／冻结恢复／历史／selector／argv／预算断言保持；C111性能／全范围／worker／源码资格变异拒绝。
- [x] P112-3：完整独立资格及唯一3600秒observer77507实际启动、出生／命令／lock／全部当前authority独立通过；原C111整个审计再次核对5632响应／2048正文，仍未安装，观察到期不重启原publisher。
- [ ] P112-4：真正自然终态／无child／lock0的完整原六阶段实际接续及独立审核。
- [ ] P112-5：真正709569提交／696489全部七覆盖／当前NFT及完整剩余九父业务验收。


## C113 当前构建完整四NFT验收

按[实施前完整方案](./workLog/20261008-C113-current-four-nft-design.md)接续，原98及fine权重不变，原publisher和两链不信号，准备不计业务。

- [x] P113-1：原八工具／关键来源／文档封存，完整可逆当前C109构建／实际Origin／C112 selector与独立namespace。
- [x] P113-2：全部原源／准入反例及当前source／build／profile／Origin反例、完整四路／启动主页面合同与来源独立资格。
- [x] P113-3：fresh完整七门／target derive、六实际0IO／0profile拒绝及manager前置拒绝、当前原scope及限定准备交付。
- [ ] P113-4：真正完整696489七门后独立gateway实机、当前14规范对象／四owner／全部页及native／archive完整库存。
- [ ] P113-5：完整四类live与durable自然pending／冷重启、M3／M5完整实机和原正文独立。
- [ ] P113-6：完整内部NFT final bytes／费用／有效期／赞助及全部入口汇总，按原父合同完成TX-01／TX-04。
- [ ] P113-7：确切自有正常清理与原全scope／实际限定业务交付，更新原fine并继续九父全部工作。


### C114 全部内部NFT最终字节与重新授权矩阵

方案：[完整范围及官方来源](./workLog/20261008-C114-complete-internal-nft-authorization-design.md)。当前九原父及fine权重不变。

- [x] P114-1：官方结论与当前源码对齐，原驱动／source-map工具／当前来源和文档封存。
- [x] P114-2：NFT参数工具完整旧源逆变换，当前production map唯一定位和克隆变化合同资格。
- [ ] P114-3：完整四路内部UI／gas／expiry／sender／sponsor／recipient驱动及全帧审核，七门前真实拒绝。六场景克隆参数驱动／正向审核器及54真实有效期UI驱动已编码，测试dApp55源码／54 BCS及mock资格通过；本地RTD与Sui时间戳拒绝合同修正，七v2全源逆变换保持原282／54范围和实际300秒准入，24成功／6过期／24时间戳UI分类资格通过。历史资格及合成headers仅计准备。G3 RegionServer21:12重启后旧StartedAt覆盖门拒绝，修正版两CLI均在任何副作用前exit1；13:30只读水位及原actor／两链／当前publisher保持，不代表完整恢复／新authority。当前正向矩阵、真实错误帧与完整正向有效期独立审核器资格仍待，本子项不勾选。[最新限定实证](./workLog/20261008-C114-timestamp-preparation-post-restart-observation-01.json)
- [ ] P114-4：四路全部真实内部预览和重新授权UI矩阵，逐原帧独立审核。
- [ ] P114-5：四路赞助／expiry production API和同byte签名及当前Wallet Standard完整边界；原交易不重发。
- [ ] P114-6：所有当前入口最终汇总与全M5，按原TX-01／TX-04合同完成审核。
- [ ] P114-7：确切自有清理、全原scope／实际交付和原fine计量，继续全部开放父项。

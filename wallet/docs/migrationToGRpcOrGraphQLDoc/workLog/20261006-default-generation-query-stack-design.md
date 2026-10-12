# QA-A17 新generation完整查询栈细分

沿用已认证206前缀并保留数据恢复的 dev-20261006-03，native H0 `BkuLHhdtnoK7yLxo2eQuvcjHtdyipE7MMyxgTJiyHGg4` / PID36954。仅该独立workspace部署；父QA-A17开放。当前global readiness仍queryServicesReady=false。

- [x] G1：复核原链与新链/source/八debug/六消费者、原pending/keys/config不变，新隔离v3 foundation+私有TLS+唯一bucket/端口及client缓存严格delta核验。[准备02](./20261006-default-generation-foundation-prepare-02.json)通过。
- [x] G2：独立六中间件实际健康、HBase tables/gateway真实探针、PG verify-full只读TLS与S3 private-CA只读namespace、immutable TLS overlay独立审核通过：[TLS repair01](./20261006-default-generation-foundation-tls-repair-01.json)、[再次verify01](./20261006-default-generation-foundation-verify-01.json)、[独立9项audit03](./20261006-default-generation-foundation-audit-03.json)。此时只有HBase bucket，publication bucket仍未初始化，不宣称published版本或query就绪。
- [x] G3：新generation原生完整有界前缀0–205、独立publisher身份/初始控制准入/副本/fence与实际固定版本认证发布；[独立完整206项audit01](./20261006-default-generation-publication-audit-01.json)核验每项SQL事实、stage/published/同VersionId副本SHA、COMPLETED/REPLICA与最新debug原生重新认证。pending=null/epoch1/published205；不借用原链水位、keys、租约或已发布bucket，不宣称覆盖新链当前head。
- [x] G4：最新源码debug的独立indexer/consistent/kv writer/ledger/GraphQL与account ingress，四角色实际H0及原前缀/对象数据身份一致；发布与索引coverage分开。
- [ ] G5：新独立wallet profile/声明/pins、当前production Chrome真实准入和同host换H0迟到/拒绝，旧scope缓存/journal保持；部署未完不改global readiness。
- [ ] G6：保留数据查询全栈重启、仅归档重建与generation/URL/registry变动完整QA-A17验收；分别留证；现有native-only R1–R4不替代。

初次prepare01的CLI chain-identifier会cache chain_id；已在最新源码 client_commands.rs及wallet_context.rs找到明确写盘行为。移除唯一新增的`chain_id: 9fd40443`行后，完整client.yaml字节SHA精确等于原retained-restart intent；其余config全部保持。准备02保留该正常缓存并再次检查全部原数据/服务身份；原prepare01失败日志不改写。

初次up01失败，scope为新独立project，原主链/六消费者/publisher未变。私有HBase日志有S3 400 BadRequest和master退出，初次hbase-init连接拒绝；copy了原immutable base spec中的旧HBase image，而原当前正常foundation使用独立已审核TLS image revision。计划使用指定LD upgrade_wallet_foundation_hbase_tls.py：candidate继承原base全部layers，entrypoint/template精确匹配archive当前source，只重启新project并保留其volumes，之后重新实际verify。修复/全部query发布就绪前G2与global queryServicesReady均不勾选。私有CA仅用于该中间件，不安装到用户信任库。


独立audit01/02误要求在G3之前存在publication bucket及其版本控制，实际G2仅初始化HBase bucket，publication bucket由G3认证source seed按独立scope tags创建；故两失败日志保留，不用于声称中间件异常。audit03验证当前正确阶段：六服务精确immutable image/healthy、实际PG私有CA verify-full/ssl=true、实际S3私有CA认证只读bucket list与publication bucket不存在。Docker immutable manifest reference与content image ID分别从本地image inspect绑定。此9项不替代后续G3的版本历史、fence、replica或发布水位验证。

[新206完整prefix/source准备实际日志](./20261006-default-generation-source-prepare-01.log)已完成，使用最新RTD debug verifier及writer provenance、独立新H0/genesis/raw0–205 native签名验证，原source/原prefix未替换。[seed01](./20261006-default-generation-source-seed-01.log)及[独立staging audit01](./20261006-default-generation-staging-audit-01.json)完成；之后[独立身份01](./20261006-default-generation-publication-identity-01.json)、[版本副本01](./20261006-default-generation-replica-01.json)、[native prepare01](./20261006-default-generation-publisher-prepare-01.json)、[初始准入01](./20261006-default-generation-publisher-admit-01.json)、[实际once01](./20261006-default-generation-publication-once-01.json)执行完成。只按独立全206项审核声明有界published205；queryServicesReady仍false，G4/G5/G6及父QA-A17未完。

G4初次guard01复制了原链当前indexed image；其image内冻结的prefix-proof.json绑定原H0与原PG catalog，实际新链准入503，直接只读诊断明确Frozen prefix catalog proof differs from reader scope。错误未被放行。guard02又候选原immutable base时source-exact核验发现visibility.py落后当前源，实际启动前停止。两失败保持。guard03改用原已审核transport revision，五文件严格等于当前source；先实际新namespace native probe（0/205固定版本、未来/非法路径拒绝），再仅新guard兼容image revision；六项实际mTLS/read-only/版本/SHA/越界/无client证书拒绝通过。原链guard及所有消费者未改。小206前缀沿用完整精确SQL聚合；无需复制原链特定catalog proof。[guard03](./20261006-default-generation-publication-guard-03.json)。

新checkpoint adapter41891采用四请求permit；三个后端在首次启动前明确1+1+1<=4并发预算，原始config不覆盖，effective私有override逐项hash和规范化公式校验。独立KV/mTLS端口41880/85/86/87/88，query41840/41/42/43/44，与原服务端口分离。native-only/global query false直到G4–G6完整验收。

G4后端限定进展：KV writer75924/Ledger77791/indexer78385/consistent78389/GraphQL79649均按最新八debug启动，三个消费者明确1+1+1<=4预算。初次KV wrapper因私有输出前含urllib3运行警告被JSON parser拒绝，实际writer已启动、Ledger等genesis；未重复启动writer，output-frame修复后复核原进程、实际genesis入库才启动Ledger，KV02通过。query01等实际watermarks，query02复用两原消费者后才启动GraphQL。初失败、原intent/process/log保留。

[原生Ledger](./20261006-default-generation-native-ledger-01.json)真实H0/genesis/height205；[全部14 KV及4 consistent durable管道/原生range](./20261006-default-generation-query-window-01.json)为0–205，GraphQL Ledger205；[实际新三角色](./20261006-default-generation-query-roles-01.json)Fullnode/新archive gRPC-Web/新TLS GraphQL同新H0，GraphQL latest205。新[三surface准入](./20261006-default-generation-query-admission-01.json)及[listener](./20261006-default-generation-query-admission-listener-01.json)、[TLS ingress](./20261006-default-generation-query-ingress-01.json)完成；unknown拒绝。[bounded bridge](./20261006-default-generation-archive-bridge-01.json)、[当前source/八debug/renderer/运行配置独立audit](./20261006-default-generation-archive-bridge-audit-01.json)、[实际binary/text 30请求最低checkpoint拒绝矩阵](./20261006-default-generation-archive-minimum-matrix-01.json)通过。所有Node私有CA仅该进程，用户Chrome/系统trust变更0。

当前只证明3角色，account role未安装；不能以consistent当第四角色或以空历史完成account。G4完整保持开放。为account及真实NFT矩阵，指定LD已从固定干净OriginByte源码派生新generation独立5包/22源码，编译环境9fd40443，原部署/源码保持。只按逐包既有精确bytes正式模拟、验签、fsync pending、单次execute脚本部署；未知结果不自动重发；现有新published205不包含后续部署，须新认证发布与索引实际追上再验。

OriginByte 5包已逐包通过精确bytes模拟/验签/fsync原pending/单次执行；[独立只读native审核02](./20261006-default-generation-originbyte-native-audit-02.json)再次验5签名/原BCS/原摘要/成功effects/CP42378、42644、42745、42905、43022和实际package/module/function/datatype描述。01错误要求GetPackage返回bytecode contents导致停止，原失败不改；最新RTD get_package.rs/conversions.rs实际只设置模块名/函数/datatype，不设置contents，02明确未验证省略字节、不宣称完整ABI。账户发现/执行绑定为实际新kiosk首次发布包，未借原链或上游地址。

[新native连续staging](./20261006-default-generation-native-live-source-01.json)及[独立native publisher启动](./20261006-default-generation-native-publisher-start-01.json)完成；仍须观察实际stage→certification→published→index进度，不能以进程运行替代CP43022覆盖。新NFT fixture已指定LD准备并完成单次发布；[独立原签名/原BCS/成功native回执/包描述审核](./20261006-default-generation-nft-native-audit-01.json)通过，与原fixture保留隔离。

account-prefix01在任何导入前拒绝旧account helper构建记录：其旧diff a276…与当前source e670…不一致，不能重标记为最新源码编译。保持其原3个debug helpers/原workers；指定LD仅新runtime内APFS克隆隔离target，从当前source重新构建3个account helpers，正在进行。新account第四角色仍未就绪。原失败fixture binding及private log保持；下一轮使用新proof/独立binaryRoot与新输出，不覆写01。


账户查询阶段：最新source e670 / HEAD49a的[隔离3个account debug helpers构建](./20261006-default-generation-account-helper-build-01.json)完成；原3个helpers/原workers保留。[有界206账户prefix认证02](./20261006-default-generation-account-prefix-02.json)及[独立账户索引导入01](./20261006-default-generation-account-index-01.json)通过；[两worker准备](./20261006-default-generation-account-workers-prepare-01.json)、[持续同步](./20261006-default-generation-account-workers-start-01.json)、[账户WSGI](./20261006-default-generation-account-api-01.json)及[新TLS入口41906](./20261006-default-generation-account-ingress-01.json)完成。未安装系统/Chrome CA。

[四角色新鲜真实探针06](./20261006-default-generation-account-role-06.json)通过：Fullnode48690/归档4050/GraphQL4050及账户0–3986同新H0；固定历史0–205实际1笔创世交易再次只读native核验digest/checkpoint/genesis-kind/零地址sender/成功状态。registrationComplete=false、allAccountActivityCertified=false、allAccountTransfersCertified=false，三个已发现范围旗标true仅对应实际空token/capability/root范围，不能等同全账户覆盖。错原H0拒绝、超当前native head区间拒绝及伪造可见header不能扩展范围通过。01误要求持续水位205、02探针语法错误、03误要求空历史、04误用系统sender映射及05实际准入TCP连接503失败均保留；06在不重启/不改放行条件后重新实际读取通过，仍保留可用性问题，不能以单次成功完成冷恢复合同。

[双generation只读SQL](./20261006-dual-generation-publication-progress-01.json)观测：原链published726884/pending907824/epoch1，独立新链published7483/pending45455/epoch1；[新持久query window02](./20261006-default-generation-query-window-02.json)consistent0–3591、GraphQL3588。两观测不同时间；各覆盖独立，不把publisher、水位或process running当作全资产/包范围。

G5真实profile生成01遭钱包快照完整性拒绝；03保留原GraphQL FEATURE_UNAVAILABLE，定位新indexer未配置hist_displays绑定。当前latest debug默认该pipeline=None；指定source明确要求exclusive writer/published watermark/H0/sourceId/generation且新hist_displays必须从创世开始，不能用sum_displays旧水位补造。准备仅对新indexer/GraphQL增加独立immutable配置，保留原config/预算/DB及原链所有进程，再真实等待Display历史coverage后重验。02的pnpm cwd版本检查失败也保留，未改packageManager。G4完整钱包资产/对象合同与G5/G6、QA-A17父项仍开放。


Display整改[install02](./20261006-default-generation-display-binding-install-02.json)通过：仅新indexer/GraphQL停止并用同最新debug、同数据库、同端口恢复，94341/94346；原config/消费预算/旧process+intent全部保留，新H0/source40c660…/generation绑定独立immutable TOML，hist_displays从0真实重放。01误写consumer-budget-01路径在任何信号之前停止，失败保留。[indexer预算retune01](./20261006-default-generation-display-budget-retune-01.json)仅新indexer改为2，PID1868；writer1/consistent1，总4<=adapter4，Display绑定/原config/GraphQL及其他新服务保留，不承诺倍速。

[钱包实际TLS profile04](./20261006-default-generation-profile-prepare-04.log)通过：生产源码WalletAssetReader的所有coverage/Display依赖和同一固定snapshot444、5对象/RTD余额/有界账户读取完整成立，trialReady=false。新的仅loopback HTTP ingress01虽然启动，却实际遭Nginx把IP127.0.0.1当DNS名导致上游certificate mismatch；[TLS name修复01](./20261006-default-generation-loopback-tls-name-01.json)先对三TLS端口按真实localhost SAN/私有CA实际握手，再仅替换新HTTP listener，全部旧目录和失败profile01保留，系统/Chrome trust变更0。实际loopback profile02重新用全部production readers同链准入、snapshot2387/5对象和账户2417读取通过；仍非正常Chrome HTTPS或新合约索引覆盖。

[独立新全43023 certificate-backed导出](./20261006-default-generation-originbyte-certified-export-01.json)通过：当前源码debug exporter、原genesis/raw0–43022完整native签名/对象引用认证、1/2/3三个framework及新OriginByte首次发布包的完整原BCS/module ABI，三编译模块仅self-address relocation后逐字节完全相同。与先前GetPackage省略contents的限定描述不同，此证书导出才证明包字节；不代表S3 published/索引已覆盖43022。[新正式四pin发布authority](./20261006-default-generation-certified-release-01.log)由原current native exporter来源、干净固定上游22source、真实发布digest/CP/module/object-digest、production verifyReviewedDeployment/selectReviewedDeployment核验生成，profile为独立newH0/generation/revision1/实际HTTP endpoints，原声明/profile不改。独立new production编译[build01](./20261006-default-generation-C28-production-build-01.json)通过0error/2原警告，source仍精确C28 SHA4cca…1113文件；当前compiled profile与新registry在UI/worker真实AST字面量完全相同。闭包/Chrome/source及实际assets尚需各自留证，G5/G6/父QA-A17不因编译或四pin提前勾选。


G4在实际有界原前缀与对象合同内完成：[query-window03](./20261006-default-generation-query-window-03.json)全部14 KV/4 consistent durable、GraphQL/原生range均7483；[四角色fresh08](./20261006-default-generation-account-role-08.json)Fullnode55592、archive/GraphQL7483、account0–7483同H0，固定0–205创世账户回执/六旗标/错链/未来/header拒绝再次通过。[生产钱包资产独立identity02](./20261006-default-generation-assets-native-identity-02.json)真实S7483/完整10依赖及Display历史0–7483，五创世coin的全部BCS余额与两native角色十对象ID/version/digest/owner/type/contents/previousTx逐项一致，共14实际请求。探针01把SDK Balance.balance误当totalBalance而失败；未改产品，独立修正探针02通过。07四角色命令误用不存在的CA路径失败，08实际指定私有trust/ca.crt通过；OS/Chrome信任变更0。G4仅有界数据身份，不等于当前head、NFT/账户全语义或G5/G6/父QA-A17。

[独立production闭包01](./20261006-default-generation-C28-production-audit-01.json)及[Chrome source01](./20261006-default-generation-C28-chrome-source-01.json)通过；新独立extension llangmmpddeagafnanlmiaepgfiliomg的loopback Origin被精确加入新HTTP frontend，原C28/原链不改。[实际Chrome assets02](./20261006-default-generation-C28-assets-chrome-02.json)10检查/117实际请求通过：四类新接口、正确H0、真实余额/有界账户历史、UI锁定、完整journal不变；0模拟/签名/提交/公网旧RPC，正常HTTPS未验。01因历史响应采集时机失败保留，02等待原API真实raw响应落盘后判断，不合成响应。G5换host/H0/generation/registry完整矩阵仍待。

新NFT夹具[seed01](./20261006-default-generation-nft-seed-01.json)CP53967及[mint01](./20261006-default-generation-nft-mint-01.json)CP54771各自正式模拟/验签/持久pending/唯一执行成功；[独立native audit01](./20261006-default-generation-nft-fixtures-native-audit-01.json)22真实只读请求核验两原签名/bytes/digest/checkpoint/成功及19新对象全部身份/归属/内容：两个共享OriginByte kiosks/两个OwnerToken、源kiosk两NFT serial1/2，直接持有serial3。原seed producer沿用只读launcher而报告0签名/0提交是报告字段错误；原文件保持，本audit明确该操作实际1签名/1execute；新mint producer已正确报告1/1。不能以本机native成功冒充published/GraphQL已覆盖53967/54771。

下一批依照[查询保留数据重启Q1–Q5设计](./20261006-default-generation-query-cold-restart-design.md)实施；Q1固定S7483钱包/十对象及fresh四角色通过，第一次restart01因原publisher记录在runtime/native-process.json而在准备期路径校验失败，尚未建operation/未发送信号；修正真实owned publisher路径的独立02继续。全部Docker冷启动、归档重建及父QA-A17/20仍开放。


新查询保留数据Q1–Q5按[完整限定日志](./20261006-default-generation-query-cold-restart-design.md)和[独立审核01](./20261006-default-generation-query-cold-restart-audit-01.json)已完成：仅五新查询后端与现有mTLS proxy实际重启，固定S7483对象/余额与14HBase/SQL Display数据不变，C28实际Chrome03十检查/162请求通过。gauge冷初始化0／consistent内存范围最新-only、account建议window与固定历史page区别已按原源码和真实请求留证；全部失败保持，不改产品或放行门禁。G6剩余完整Docker冷恢复／archive-only重建及URL/registry/change lifecycle仍未完。

[最新双链只读SQL02](./20261006-dual-generation-publication-progress-02.json)08:27UTC：原published726884/pending907824、copy907824；新published7483/pending45455、copy45455。两批已复制到pending目标，仍必须完整认证/副本/发布CAS成功后才可使用新索引覆盖。新publisher launch-intent保留原once模板；实际run由上游脚本展开默认interval15/timeout7200/workers4，不能把模板误当live完整argv；new supported4→8准备01–03的模板/解释器/八debug集合假设失败保留，04按真实current run/可信venv实际解释器/源默认值完整校验继续，仅自然published/idle/nochild/pending=null可安装。


最新实施：[新publisher自然边界安装01](./20261006-default-generation-supported-capacity-install-01.json)已在published45455/pending=null/epoch1实际4→8、PID32015，原scope不改。[有界归档重建R1–R5](./20261006-default-generation-archive-rebuild-design.md)实际从空SQL/Rocks恢复0–205，Fullnode请求0、23 SQL/Display/四consistent及五对象/余额审核通过；历史KV41885复用，完整HBase/account及全部Docker仍开放。[新查询并发S1–S5](./20261006-default-generation-query-capacity-design.md)完成4→6配置/4新owned服务恢复，[独立持久数据审核01](./20261006-default-generation-query-capacity-audit-01.json)14HBase最小9596/23SQL最小14073/Display绑定保持。资产01暂时无交集被拒绝；[实际资产02](./20261006-default-generation-capacity-assets-02.json)随后共同S10398十对象/余额原生比较通过，四角色/Chrome恢复另验。新NFT N1–N5及新链正面夹具P1–P5已拆解，三个包仅在当前debug下独立编译/单次发布，原C28包/profile/keys/pending/源保持；全部indexed/Chrome语义继续按真实覆盖验收。

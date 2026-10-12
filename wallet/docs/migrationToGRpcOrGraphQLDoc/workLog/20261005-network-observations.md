# NET-04：持久原生水位与跨操作交易准入

2026-10-05。按[实施前CAP1–CAP7设计](./20261005-network-observations-design.md)先落地CAP1–CAP4；CAP5／6完整SDL、服务能力、package／registry／accountHistory聚合及全局缓存撤值／跨操作负面身份／UI状态仍必需。父NET-04／TX／TRY开放，49/98、trial_ready=false。原N与AUTH证据保留为历史产物。

## 本批编码与权威依据

独立`RtdWallet NetworkObservations`／version1／`observations-v1`，严格白名单schema与canonical u64十进制，scope为[1,H0,generation]，原生Fullnode／Archive分角色最高水位。别名、revision、URL、账户和新操作不归零；显式新generation另建scope，旧记录不删除。不保存密码、密钥、签名、批准bytes或交易journal。损坏／未来版本／错误keyPath／IDB不可用拒绝，不用内存替代生产数据库；无自动删除、降级、修复入口。正常重启保持的合同不宣称抵抗用户清除整个浏览器数据。

网络探测前capture已提交快照；探测后在原生串行readwrite事务重读并合并。低于探测开始时已提交水位，strict事务complete后保存reset-required并拒绝；只低于期间并发提交的更高水位，则拒绝迟到准入，保留最高水位且不误隔离。临时不可用不清该角色水位。已存在记录在探测期间丢失／下降视为损坏。request success不是发布许可；abort、写失败、非strict事务均拒绝。存储open与每次事务分别至多5秒，原生握手10秒；一次准入最坏有两个存储步骤各至多10秒，不把新增存储等待冒充原10秒端到端预算。会话取消在capture／probe／observe前后复核，迟到complete不能许可签名；已提交正事实不是被取消操作的授权。

后台现有所有transaction authorize路径接入；已知错链／不兼容仍优先拒绝且本操作保持隔离。网络储存不可用与并发迟到分别采用公开固定错误，不透出服务原文或自动执行重试。readonly原摘要恢复保留账户、H0／generation、选择与origin合同，仅跳过新交易身份守卫，不借恢复签名；PersonalMessage离线合同未扩大。跨操作wrong-chain／incompatible负面身份与全局UI仍是CAP6待实现。

依据[Sui固定GetServiceInfo源码](https://raw.githubusercontent.com/MystenLabs/sui/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-rpc-api/src/grpc/v2/ledger_service/get_service_info.rs)的完整genesis digest与latest checkpoint，以及[IndexedDB 3.0事务调度](https://w3c.github.io/IndexedDB/#transaction-scheduling)与[事务durability合同](https://w3c.github.io/IndexedDB/#dom-idbdatabase-transaction)。strict是hint，complete是API提交屏障，实际测试不证明物理断电安全。低水位需复核是RTD保守准入策略，不能据此断言物理链已重建或自动推进generation。原始源与SHA见[本批manifest](../evidence/official/20261005-network-observations/manifest.json)。最初误用固定源码路径404保持在设计记录，正确源码SHA与前N来源一致。

## 编码验证与所有失败

[定向01](./20261005-network-observations-targeted-01.log)113/114：样例给archive传undefined触发默认80而非不可用，产生正确倒退拒绝。改用null明确不可用。[定向02](./20261005-network-observations-targeted-02.log)121/123：后台夹具构造时bind旧方法，spy故障未命中；改为调用时委派后[定向03](./20261005-network-observations-targeted-03.log)4文件123项全通过。新增33状态、4身份存储／取消、2后台存储拒绝、3公开错误用例，原后台倒退用例还检查全新操作仍拒绝。

[首次类型01](./20261005-network-observations-types-01.log)误用无JSX的基础common配置，终态2，大量JSX错误不是有效完整类型检查。修正命令后[完整钱包02](./20261005-network-observations-types-wallet-02.log)和测试夹具修正后的[钱包03](./20261005-network-observations-types-wallet-03.log)、[RPC](./20261005-network-observations-types-rpc-01.log)、[core](./20261005-network-observations-types-core-01.log)均实际终态0。[完整钱包](./20261005-network-observations-full-wallet-01.log)143文件1660项全通过。失败原文不覆盖、不记通过。

[Chromium原生01](./20261005-network-observations-native-storage-01.log)15项通过；新增实际两个窗口同时提交后[原生02](./20261005-network-observations-native-storage-02.log)16项通过：strict complete与put success区分、成功后原生abort回滚、隔离写abort、受控relaxed拒绝、已存在记录被删、损坏字段、未来版本／错误keyPath、安全拒绝、open期限、角色水位与临时降级、新generation保留旧隔离、迟到窗口、同时readwrite无丢失更新、页面重载、真实worker停止新实例重启、整个Chromium关闭后同profile重启。全部controlled identity reports，0链请求／0模拟／0签名／0Execute；不能当真实扩展或物理断电验收。

## 新稳定产物与当前环境

[Local构建](./20261005-network-observations-local-build-01.json)实际终态0，1019源码SHA2c1cc18de65ec53ac674ddee927996c43c0e2ed97906ee944996824d753bfe04前后稳定，profile SHA318f1d850c95d24afc23561cbce224c87cac79ab4e423d0a6be18fc1f1a32b5d；UI3a40822e54c619c85ae962929650f1b33a48bddd07db3a3252b9eb818ee052d7、后台c9e3780e9ab02ae1fbeed534bbcdafcebcfe793c71ca76e5b31b43d0ec1eec58。完整旧N dist保存于runtime/extension-before-network-observations-20261005-01，不覆盖N通过。[四入口AST闭包](./20261005-network-observations-wire-closure-01.json)21已用／18未用旧方法、envelope／legacy模块核验通过；静态范围保持，不冒充全部动态字符串证明。

[当前公开TLS](./20261005-network-observations-public-tls-01.json)7组30请求，基线6次实际三入口，0模拟／签名／提交。Node无原生IDB，此脚本显式注入unit-only memory model用于transport／决定，不证明数据库持久化；生产默认仍必须原生IDB，Chromium单列。只读[部署合同](./20261005-network-observations-history-01.json)验证最新RTD源码及8个debug产物，连续0–134049／134050 markers、原22水位逐项保持，原PID66145运行、上界386503、无终态。supervisor59830重新轮询仍运行，不重启／提前resume。合约部署脚本、planner／adapter／受保护RTD来源不变；D5此前严格拒绝调查仍保持。

## 当前扩展与原交易保护

[Chrome首轮01](./20261005-network-observations-current-chrome-01.json)实际终态0、当前worker启动及全浏览器重启两次逐字等于新后台。正常sign-only摘要9zuUdgPJCjhNVjAJLk9vPhkSZdQPGbXCKs7rPHf5DJRp与返回BCS匹配、SDK TransactionData Intent验签；BCS SHA0140f1d057660fa539d196a23bc9693739b8601128e6344b2760ae8681cbcea3。归档健康预览后，实际响应完整SDK解码H0相同／height347747，再在worker返回层明确注入checkpointHeight0及相应最低水位0；签名批准处原最高Archive347744形成strict隔离，新dApp请求0身份／0模拟即拒绝。整个浏览器重启后同scope隔离保持，原已批准有效bytes通过真实内部执行命令在任何transport前被拒绝，0模拟／0提交，readonly空恢复仍可用，journal保持空。全轮5次checks启用模拟，其中3次正式固定BCS，正常签名的两次正式BCS与返回值同SHA、doGasSelection=false。两份精确leaf SPKI例外，不宣称正常CA或完整UI状态；不向用户日志输出bytes／signature／密码。首轮断言已逐条检查实际三角色响应，日志未输出identityWire；第二轮仅补足原始身份响应持久证据，不把首轮改成失败或复用为新轮证明。

原7只读01／02在两个旧worker分别切换时ERR_BLOCKED_BY_CLIENT，0模拟／提交；[03](./20261005-network-observations-original-journal-03.json)与[04](./20261005-network-observations-original-journal-04.json)新worker源一致、两profile7摘要／effects及前后内容通过。新增四attempt只读01–04依次未完成旧worker切换，前三轮原始错误与第四轮cancel失败保持；增加失败event／worker核验阶段记录，不输出敏感值。worker唤醒对明确ERR_BLOCKED_BY_CLIENT改为12秒有界等待，CDP逐字检查仍必须通过，未宣称此改动消除全部切换失败。每次全浏览器关闭再启动后才在原profile继续只读；[第五轮](./20261005-network-observations-new-journal-audit-05.json)四条当前worker及原bytes／signature／effects终态全通过，0模拟／0提交、前后内容不变。所有原根目录／摘要保持，没有重签、重发或以新根重试不确定交易。

## 后续与计数

CAP1–CAP3本批有限合同完成；CAP4最后身份wire补足、原7末验和源码／文档最终审核正在推进。CAP5／6和全部原有NET／RPC／TX／TRY余项未削减；锁定提交后整轮失败及首次模拟帧缺口不因本批通过消失。49/98、trial_ready=false，最新状态及全部最终证据随后追加，父任务不按子批数勾选。


## 第二轮失败与保留profile只读调查

[Chrome补充02](./20261005-network-observations-current-chrome-02.log)终态1，stage仍为unlock after restart，布尔断言false／true，0页面错误／0Execute、5模拟。该stage原先涵盖后续多项断言，未持久化stack／逐条identityWire，具体失败位置无法确认，第二轮不计通过。一次性失败profile保留，未用新目录重试任何执行。[原profile只读01](./20261005-network-observations-chrome02-readonly-01.json)当前worker逐字一致，同scope reset-required／Archive348778→0仍在，journal／pending为空、账户锁定且selected，0模拟0Execute，未解锁、签名、执行、清除或修复。

测试脚本检查发现identity响应body异步读取只在关闭旧浏览器后统一等待；这可能产生CDP body不可读，属于已识别的脚本时序风险，不能倒推为第二轮的确定原因。现在在关闭浏览器前完成已启动读取，仍保留结束末验；新增重启阶段、失败脚本位置及身份／模拟解码统计。生产源码保持1019／2c1cc18d，新产物不重建。后续第三轮是无提交存储／签名夹具验证；旧02失败及原profile保持，不以成功覆盖。


## 第三轮、最终保护与双方内容审核

[Chrome03完整日志](./20261005-network-observations-current-chrome-03.log)终态0，[逐条保留证据](./20261005-network-observations-current-chrome-03.json)74身份响应（Fullnode30／GraphQL22／Archive22）均HTTP200、完整H0相同、无解码失败，当前worker启动及整浏览器重启两次C9逐字匹配。正常sign-only摘要CHUBUNJ4gRz56n66iVNFgwgtgBCrgSgzW64rYmjFwRT7、BCS SHAe556c777340edbc20e0ce0fbdd6297bcc61fa2e0019aa4991a3b5f428fe6317a、预览匹配及TransactionData Intent验签通过。归档受控0响应前的真实SDK解码水位为351188，开始前最高351182，持久隔离后新dApp零身份／零模拟拒绝；全浏览器重启已批准有效bytes零transport拒绝、readonly空恢复及空journal保持通过。5次checks启用模拟，3次正式固定BCS；0Execute。01通过保持，02整轮失败和具体原因未知保持，03不声称复现并确诊02原因；原保留失败profile不修复／删除。

[原7末验](./20261005-network-observations-original-journal-final-01.json)与[新增四末验](./20261005-network-observations-new-journal-audit-final-01.json)在Chrome03后分别终态0，新worker与原摘要／bytes／signature／effects、前后内容保持，0模拟0提交。首次[逻辑比较01](./20261005-network-observations-journal-comparison-01.json)错误假定上一轮新四wrapper使用rows而非profiles，KeyError只使比较脚本失败，不改原生审核结果；[更正比较02](./20261005-network-observations-journal-comparison-02.json)原7与新增四逻辑SHA均逐项等于AUTH最终审核。原7两SHA为fbcd760beab8dc0945ce3012abcb4f024601852b4c23320cb739e89c74574855与bc62e339ae81c22a35c3923e2b29c3867501196818cc9873a1b2ef7797bb38b5。

[最后只读回放](./20261005-network-observations-history-02.json)当前源码及8 debug产物严格核验、原22水位保持，连续0–141019／141020 markers，原PID66145运行、boundedExitCode=null、上界386503；supervisor59830仍运行，不提前resume。新增可复用只读脚本调用合约库inspect／status和原验证器，禁止启动／恢复／清库，不输出processIdentity／argv／连接凭据。D5之前严格拒绝的调查不因当前快照通过而被覆盖。

全文比较另发现三处双方差异：SDK迁移表的本地编号引用（语义相同但wallet句子仍写07）、仅archive保留的Explorer旧DTO说明、仅wallet已有的持久缓存说明。两边已统一引用文字并保持各自07／08真实链接；根据当前ExplorerRpcClient／DefaultRpcClient、现代Kit接入和[官方Core API](https://sdk.mystenlabs.com/sui/clients/core)重写同一DTO边界段，保留Explorer独立JSON-RPC／分析7项未迁移事实，不从上游当前方法列表推断本地SDK已有全部方法；根据实际queryPersistence编码将缓存隔离要求同步archive。官方Core原文加入来源manifest，先前两源manifest另存，不删除14份保留源。

新增网络／执行两份合同精确同步；历史N“当前未变”改为明确该批历史产物。CAP1–CAP4本批有限合同完成，CAP7本批文档／来源与错误审核完成后逐批延续；CAP5／6完整探测与全局状态、原有六接口验收、锁定整轮和全试用余项保持。父49/98、trial_ready=false，不按新增42单测或子任务数增长父计数。最终来源清单、全章节／链接／共享段落及diff检查以随后生成证据为准。

## 本批封存末验

[最终来源清单](./20261005-network-observations-source-inventory-final-01.json)确认当前1019产品源码和UI／后台与构建及Chrome03完全相同，21份本批源码／当前脚本摘要逐项记录；脚本格式化发生于试验之后，不倒推为每轮开始时已冻结。[文档末验01](./20261005-network-observations-document-verification-final-01.json)实际通过27份文档、722个本地链接、双方68个共享H2段落：67份文本精确一致，1份仅各自07／08正确编号链接差异；3份官方源摘要相符，14份原文保留，49/98、trial_ready=false。首次链接检查将合法index.tsx:47行号误作文件名，失败记录保留，修正检查器后实际文件存在。

[diff／脚本语法末验01](./20261005-network-observations-diff-syntax-final-01.json)三仓git diff --check均实际0；一项Node语法检查误用scripts根目录而非lib内已存在personal-message文件，MODULE_NOT_FOUND不算语法通过。按真实清单修正后[末验02](./20261005-network-observations-diff-syntax-final-02.json)9项全通过；其他8项沿用该批未变化的实际检查，不重写失败。[格式末验](./20261005-network-observations-format-check-01.log)终态0。CAP1–CAP4有限合同与本批CAP7审核封存；CAP5／CAP6及所有未验收父合同继续，未更改父完成数。

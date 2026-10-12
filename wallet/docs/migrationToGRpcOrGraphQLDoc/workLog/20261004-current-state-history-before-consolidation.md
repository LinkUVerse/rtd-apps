## 当前事实与下一步

2026-10-04 已补 NET-12 持久缓存迁移：新版 IDB key／buster，旧 queryClient.v1 保留但不读取，链查询与所有 mutation 禁止持久化，执行恢复仍只走 journal。4项定向测试和完整钱包类型检查通过；真实扩展重启／切网验收未替代，NET-12保持未完成，详见[日志](./workLog/20261004-NET-12-query-persistence.md)。

2026-10-04 NET-06 完成合同核查：显式完整内置 profile、无标签推导端点／默认公网 MVR 或 Faucet，删除已无人使用的旧单 URL 映射。58项测试和清理后完整钱包类型检查通过；总体21/98。共享 core 独立检查仍有74条诊断（bundler对照72条），不冒充整个 core 通过；NET-10／TRY-01保持未完成。见[配置完成核查](./workLog/20261004-NET-06-completion.md)。

2026-10-04 新增实际钱包 coin 准备／固定 bytes 模拟／gRPC 验签及一次提交验证：独立测试账户 self-transfer 1 原子单位，回执成功；最大 u64 金额被真实模拟拒绝且无签名／提交。原摘要恢复仍未通过：Fullnode 历史窗口已前移，可信 Archive 仅到4534，未覆盖新交易。保留原摘要，仅只读恢复，不重发。详见[交易验证](./workLog/20261004-wallet-coin-execution.md)。既有四个产物的可达共享 core 审计通过，但未代替新构建／动态抓包，见[审计日志](./workLog/20261004-shared-core-artifact-audit.md)。总体保持20/98，未达到可试用门槛。

截至2026-10-03本批验证，两套方案已按archive主方案合并为13章，原目录及14份来源保留；任务总体17/98完成。以下为当前状态；历史过程、旧诊断数及被后续替换的实现见各日期workLog，不作为当前验收结论。

NetworkProfile v2、完整H0／generation绑定、共同GraphQL资产快照、Fullnode当前对象／coin与新构建器、账户历史全窗口准入已实现。余额、名称正反查、NFT列表／详情、framework／PersonalKiosk读取与转移、质押／赎回展示及执行页面已接现代领域接口。原生BCS与当前debug Rust对象／事件／质押向量有交叉证据；未知数据不填零。OriginByte发现／内容／P2P准备已编码，受控部署ABI及两条脚本实链转移已验证；完整钱包批准／恢复链路仍未完成；隐藏偏好作用域已编码，自定义profile设置已有主链，两者的完整扩展验收仍待完成。

币、NFT、质押及dApp交易采用固定批准bytes，后台Intent签名／验签、正式模拟、一次dispatch和journal原摘要恢复。journal严格持久事务及隔离已完成TX-03；Chromium153 harness的12项IndexedDB／Web Locks／worker验证通过，但并非扩展运行验收。dApp后台已检查请求／来源／账户／chain／profile／权限，批准token单次消费，断连撤销未使用凭据；个人消息后台签名及普通账户本地验签已接入。dApp既有终态原签名恢复及独立只读恢复命令已编码，dApp准备前后增加journal／pending检查；批准页pending保持与恢复UI已接通，初次记录核验前不挂载预览、未知结果不重建重发；其它入口完整检查、自动唤醒及真实Chrome尚需完成。相关6文件87项通过，见[原签名恢复日志](./workLog/20261003-TX-dapp-original-signature-recovery.md)。

按主方案，zkLogin默认不引入新业务，创建／解锁／签名禁用，既有账户只读展示保留，RPC-24完成。Qredo为可选隔离能力，已清除无消费的旧RPC signer，保留账户／API／事件；不将其远程成功当作普通钱包基础验收，也不宣称当前已支持执行。Ledger残留不冒充硬件签名能力。

本批完整TypeScript检查已清零；开发版及生产版Webpack均通过，生产版3条体积建议警告。上一批全量Vitest为74文件821/821通过，后续Faucet配置检查为74文件828/828；自定义profile接入后全量78文件852/852；当前dApp恢复UI接入后全量80文件889/889通过，最终补充缓存键后的20项定向复验通过。四个生产JS入口／source map静态审计未发现旧链RPC请求器或旧Kit模块，jsonrpc文本命中为密码库依赖的数据校验工具；源码扫描的共享core旧hooks仍供其它应用使用。动态网络与Chrome抓包尚未验证，静态产物不能替代REL-02。详见[构建与依赖清理日志](./workLog/20261003-legacy-signer-faucet-build.md)。

Faucet已适配当前SDK和RTD的V2直接响应，金额安全整数校验后用bigint求和，无任务轮询、无自动发币重试。Faucet已纳入显式profile配置，删除网络标签默认地址映射；发币前校验Fullnode身份与账户／会话稳定性。内置profile已要求完整数据入口。自定义网络的编辑／权限申请／预检／确认／版本化持久保存已接通，后台和UI统一读取profile，旧URL不推导。切回内置后的自定义副本恢复已接通，19项恢复相关测试通过；实际Chrome权限／worker生命周期／自定义链demo仍待完成，见[自定义配置日志](./workLog/20261003-NET-07-custom-profile.md)。见[受控配置日志](./workLog/20261003-NET-06-profile-faucet.md)。本批类型检查通过，开发版重新构建；生产构建和产物审计仍为前批源码证据。当前SDK私钥字符串导入的scheme字段已修复，三算法及旧格式开关验证通过。

当前源码与debug CLI／节点哈希已重新核对编译记录。已使用link-u-smart-contract新增隔离初始化入口建立独立dev-20261003-01，checkpoint推进且内部健康HTTP 200，原归档链保留运行。真实gRPC-Web完整H0与checkpoint 0一致，V2 Faucet发币后通过钱包新coin／object读取核对金额及对象，探测未发JSON-RPC。ENV-02完成；合约、新链GraphQL／archive及扩展交易尚未验收，仍不可试用。见[独立dev日志](./workLog/20261003-ENV-02-isolated-dev.md)。

接下来优先补齐profile／所有接口剩余编码与恢复路径，再做真实核心链路、扩展运行和试用交付，最后推进22项细节回归。**当前仍不可试用，目标保持进行中**；全量单测和构建通过不能替代真实服务／Chrome／用户试用验收。

配置副本恢复和跨切网／模块重启版本校验见[恢复日志](./workLog/20261003-NET-07-profile-restore.md)。真实Chromium153已加载实际扩展、进入欢迎页并通过真实runtime.Port读取空配置，pageerror为0；仅是首次启动／只读通信证据，不是已登录设置、权限授权或实链验收。开发版构建通过，当前仍不可试用。

批准页pending保持、解锁及只读恢复见[恢复UI日志](./workLog/20261003-TX-dapp-pending-ui.md)。本批完整类型检查通过；真实扩展跨窗口／worker与实链执行未验，不冒充核心试用通过。

隐藏偏好已按H0／generation／账户隔离，保留无来源旧全局记录，原子增删及单项撤销、迟到结果隔离和读取失败提示已接入。18项定向测试、完整类型检查与Chromium153双标签页持久化检查通过，见[偏好日志](./workLog/20261003-NET-12-hidden-preferences.md)；未代替实际扩展UI与NET-12全部缓存验收。

OriginByte已补显式发现／执行双包配置、严格OwnerToken及同快照Kiosk发现基础，61项相关测试通过。该token不当作原生OwnerCap；内容、页面、部署ABI及p2p执行仍待接通，RPC-22不勾选。见[OriginByte日志](./workLog/20261003-RPC-22-originbyte-discovery.md)。

OriginByte内容及页面查询已接入统一kiosks接口，固定v3扩展表与原生Item交叉核验，未登记项仅展示。83项领域定向测试和15项NFT页面／hook回归通过；p2p执行、受控部署及实链／Chrome仍未验收，见[内容接入日志](./workLog/20261003-RPC-22-originbyte-contents.md)。

OriginByte P2P准备已接通NFT批准入口，支持已有目标Kiosk与成功发现空集时新建目标；使用当前Fullnode对象，拒绝未登记／独占及快照不一致，不自动更换失败路径。当前全量83文件950项通过；仍缺RTD真实部署ABI／Chrome／实链执行，不勾选RPC-22，见[转移接入日志](./workLog/20261003-RPC-22-originbyte-transfer.md)。

受控OriginByte五包现已全部在独立debug链发布，后四包均正式模拟原bytes、先持久记录摘要签名、单次提交，并用gRPC GetPackage复核。旧utils未知调用经epoch有效期边界与gas／cap检查排除迟到；后续明确InsufficientGas终态已保留，再提高预算正式模拟成功发布。见[部署日志](./workLog/20261003-ENV-03-originbyte-deployment.md)。受控NFT fixture及两条P2P实链验证已在后续批次完成，ENV-03完成；GraphQL／钱包完整调用链／Chrome仍未验，RPC-22不勾。

实链发现并按官方Sui／当前RTD源码修正模拟外层摘要可省略的契约，effects与原生BCS摘要校验仍严格，历史摘要不放松。60项定向、完整类型检查、开发版构建通过；实际WalletTransactionReader在独立debug链完成prepare及同bytes正式simulate，没有签名发送。见[模拟契约日志](./workLog/20261003-simulation-digest-contract.md)。全量950项为此前版本证据，本批仅声明相关定向检查。当前仍不可试用。

受控NFT合约已部署并seed两个NFT，OriginByte已有目标／新建目标两条P2P调用均实链成功。实际钱包Fullnode严格对象读取器再次核对NFT wrapper归属、目标Kiosk所有者／item_count与OwnerToken。H0／generation／包／部署者清单已记录，ENV-03完成，总体16/98；见[实链fixture日志](./workLog/20261003-ENV-03-fixture-live-transfer.md)。两次调用由指定部署仓库脚本发起，GraphQL共同快照发现、钱包完整准备／批准／恢复和Chrome仍待验，不将RPC-22标为完成。

独立查询服务已从当前rtd源码编译debug并启动：PostgreSQL索引器、一致性存储与GraphQL的进程／水位已核实。GraphQL完整H0正确，但热Fullnode裁剪导致创世及head digest为空，尚不满足钱包快照准入，ready=false。该缺口已由后续持久归档接入解决；初始诊断见[查询服务日志](./workLog/20261003-query-services-bootstrap.md)。ENV-04–08／TRY不勾，仍16/98。

同链持久HBase／MinIO已物理隔离部署，当前源码debug归档写入器及Ledger从创世回补，native gRPC已核实完整H0／checkpoint0。GraphQL改接持久Ledger后创世与head digest恢复；实际WalletAssetReader在checkpoint36504完成共同快照准入、资产／余额与OriginByte Kiosk内容读取（1件实链转入NFT）。见[持久归档与资产日志](./workLog/20261003-persistent-archive-graphql-assets.md)。内部native服务不等于浏览器gRPC-Web入口，发布门禁／accountHistory／Chrome尚未完成，进度仍16/98。

归档gRPC-Web已新增Envoy配置生成器，真实Envoy配置验证、6项渲染守卫及8项合成mTLS上游协议探测通过，包括实际SDK binary unary与text双帧trailers。已修复可信头剥离触发路由重匹配404的问题。尚未接真实发布门禁、持久浏览器入口或Chrome，取消／超时／流错误还待验，ENV-04–07不勾；见[协议日志](./workLog/20261003-ENV-grpc-web-protocol.md)。

桥接故障协议探测已达14项，通过真实SDK／Envoy／合成mTLS上游验证取消传播、客户端deadline、Envoy流截断、错误trailers及4MiB请求拒绝。客户端deadline与Envoy截断的错误码不同，按实测保留，半页不可提交。见[取消日志](./workLog/20261003-ENV-grpc-web-cancellation.md)。真实发布门禁仍未接入；当前RTD源码绑定的原生证书helper已完成debug构建，后续认证前缀校验见下文。

当前源码原生证书helper已完成debug构建；独立链创世至47221共414174笔交易通过完整认证前缀校验，跨epoch 0→2，固定可信状态哈希续验至47321成功。8项有效／拒绝探测通过，见[原生证书日志](./workLog/20261003-native-certificate-verification.md)。这些结果尚未替代source／replica与PG发布提交门禁，进度保持16/98。

后台只读恢复已加入worker求值、startup、Port连接、网络／账户事件与一分钟alarm，合并并发触发并重新检查当前作用域。30项定向、完整类型及dev构建通过；真实Chromium153确认恢复alarm注册与空配置启动，见[后台唤醒日志](./workLog/20261003-TX-background-wakeup.md)。实际pending跨worker重启和实链恢复尚未验收，TX-07仍未勾。

收据页已加入独立资产索引覆盖提示，只在同binding共同快照追上目标checkpoint后结束同步；链终态不随索引错误改变。20项定向及完整类型检查通过，见[索引覆盖日志](./workLog/20261003-TX-receipt-indexing.md)。真实延迟／Chrome与全部写后读验收未完成，TX-08不勾。

真实质押链路已有新增证据：钱包共同快照读取epoch2系统／验证者和仓位，页面共用准备器完成1RTD质押及pending仓位赎回的当前对象检查、构建和同bytes正式模拟；指定合约部署仓库脚本两次单次提交均成功，钱包仓位从0→1→0。见[实链质押日志](./workLog/20261003-staking-live-roundtrip.md)。不替代Chrome／background journal与active奖励验收，仍16/98。

实链批量对象发现40项请求超过GraphQL默认5000B，已改20项并通过43输入跨三批的重复ID／缺失槽位验证；76项定向及完整类型检查通过，见[批量预算修复](./workLog/20261003-RPC-02-batch-budget.md)。归档指定历史版本批量仍未实现，RPC-02／19不勾。

归档指定版本对象reader基础已实现：强制ID＋版本、受限方法、完整原生BCS与摘要／版本核验、逐项错误保留、覆盖前后复核。46项定向和完整类型检查通过，见[历史对象日志](./workLog/20261003-RPC-19-archive-objects.md)。历史消费者及真实公开归档入口尚未接通，相关任务不勾。

历史对象已进一步接WalletRpcProvider与收据ObjectEffects消费者，按原生effects的ID／版本／摘要核对归档结果，仅实体写入开放只读查询。完整类型、dev构建和全量87文件976项通过，见[历史对象页面日志](./workLog/20261003-RPC-19-historical-ui.md)。真实Chrome／可信归档入口以及RPC-19其它选择器仍待验收。

NET-08编码范围审计完成：自有Provider根树、共享领域Hook注入、旧Kit生产源码及四入口打包图均核实；无消费的钱包旧Kit声明和锁文件importer已移除，重建通过。见[Provider审计](./workLog/20261003-NET-08-provider-audit.md)。总体更新17/98，清洁安装／其他消费者／实际网络与试用门禁仍未完成；前文16/98为此前批次记录。

2026-10-04隔离安装已修复explorer清单无效前缀；frozen安装及新版SDK模块加载成功，但隔离完整类型检查暴露core表单Zod3与resolver所见Zod4不一致。见[隔离依赖日志](./workLog/20261004-NET-09-isolated-install.md)。NET-09仍未完成，现有工作区通过不代表可复现安装通过，总体17/98。

2026-10-04隔离Zod问题已修复：精确packageExtensions给resolver3.10.0补Zod3.25.76，已同步生成checksum及对应锁依赖。隔离frozen安装、完整类型、真实合法／非法表单验证通过，见[依赖修复日志](./workLog/20261004-NET-09-zod-resolution.md)。全量SDK锁更新会影响旧Kit消费者，尚未直接同步；NET-09／10仍待完成，17/98。

### 2026-10-04 NET-09 新版 SDK 锁文件已落地

已同步隔离 frozen 安装通过的 SDK 锁文件，实际解析范围核对通过；87 文件／976 项测试、完整类型、dev／prod 构建通过。测试解析器已绑定安装依赖，其他应用非 SDK 记录及入口未改。正式 node_modules 未重装，modern demo Kit／其他应用／真实 Chrome 与公开门禁未验；17/98 不变。详细证据：[SDK 锁文件与隔离构建](./workLog/20261004-NET-09-sdk-lock.md)。

### 2026-10-04 NET-09 完成

现代 core／React Kit 已作为 demo 开发依赖接入，显式网络与 gRPC-Web 配置，正常动作调用 Kit，错误账户通过现代 Wallet Standard 测试钱包边界。隔离 frozen 安装、完整类型、976 项钱包测试＋3 项 Kit 接入测试、demo／扩展生产构建通过；Chrome 153 两种配置状态渲染通过，未执行真实扩展交易。NET-09 完成，总体 18/98，仍不可试用；其他应用及公开门禁继续。证据：[现代 demo](./workLog/20261004-NET-09-modern-demo.md)。

### 2026-10-04 浏览器环境与账户入口

移除 Playwright 默认 force-regenesis／cargo 节点启动，仅管理 demo；faucet 改显式 URL，测试按 spec 收集并串行。真实 Chrome 新建账户、导入账户、zkLogin 不可用 3 项通过；未配置网络明确报错且不显示伪余额。其他链场景未执行，18/98 不变。详见[浏览器环境日志](./workLog/20261004-browser-test-environment.md)。

### 2026-10-04 RPC-19 checkpoint 受限读取

按官方／当前 RTD oneof 契约增加显式高度或完整摘要 reader，前后同链／覆盖验证与取消 fence，21 项归档定向测试及完整类型通过。结果为服务定位引用，不冒充委员会证明；真实公开入口未验，RPC-19 不勾，18/98 不变。证据：[checkpoint reader](./workLog/20261004-RPC-19-checkpoint-reader.md)。

### 2026-10-04 独立可信发布 foundation 已运行

新 project rtd-dev-wallet-pub-20261004 六个基础服务健康，PG／HBase表／gateway复验通过，S3 HTTPS CA验证200；修复旧HBase镜像发明文到TLS端点，通过镜像修订保留卷。原链／GraphQL／内部归档保持运行。证书源／发布者／副本／公开门禁仍未接入，18/98不变。详见[基础环境日志](./workLog/20261004-publication-foundation.md)。

### 2026-10-04 当前源码 debug 认证 staging 源已接通

当前源码新构建 blob writer，source v3 固定源码／产物／构建证据；实链0–100共867笔交易写入、版本固定回读证书、水位／H0及published写入拒绝均通过，并独立复验。7项相关测试通过。持续源／认证发布者／副本／公开门禁尚未接入，18/98不变；见[认证 staging 日志](./workLog/20261004-certified-staging-source.md)。

### 2026-10-04 发布身份及独立副本已配置

当前 source v3 已接最小权限发布／协调身份，epoch1提交时fence验证通过，发布准入保持关闭；同机独立TLS副本39582启动、versioning／复制规则与独立复验通过。7项相关测试通过，尚未证明实际checkpoint复制和发布提交，18/98不变。详见[发布身份与副本日志](./workLog/20261004-publication-authorities.md)。

### 2026-10-04 有界认证发布与实际副本通过

当前debug verifier原生发布入口已启用初始认证发布准入，实链0–100认证发布成功，重复执行idle；独立逐项核对101个检查点的PG版本／摘要、源与副本状态／字节及原生证书，共867笔交易，committed marker同步。9项相关守卫测试通过。持续跟链、公开查询门禁与Chrome仍待完成，18/98不变；见[认证发布日志](./workLog/20261004-native-certified-publication.md)。

### 2026-10-04 原生持续 staging 源运行

当前debug blob writer以同一PID持续推进，采样14330→43355，重复start复用原进程；seed100在持续期间复验通过，13项相关测试通过。published仍100，下一步接常驻认证发布者；公开查询／Chrome未验，18/98不变。见[持续源日志](./workLog/20261004-native-live-source.md)。

### 2026-10-04 常驻认证发布者及私有guard

常驻publisher PID20639已启动并复用，副本gate开启；采样仍working补取后续checkpoint，PG发布上界100，不能报追赶完成。私有mTLS guard39590实测同链边界、固定版本摘要、未来／任意路径／缺客户端证书拒绝通过，完整查询消费者未切换。6项入口测试及26项guard测试通过，18/98不变。见[常驻发布与guard日志](./workLog/20261004-persistent-publisher-and-guard.md)。

### 2026-10-04 原生检查点适配入口已验证

本机39591→私有mTLS guard39590适配器真实读取0／100摘要正确，未来／任意／非规范路径拒绝，3项manifest测试通过。原publisher PID20639进入pendingHi100251、采样ledger1070行，published仍100，继续原进程不能视作已提交。查询消费者尚未接入，18/98不变。见[适配入口日志](./workLog/20261004-native-checkpoint-adapter.md)。

### 2026-10-04 认证原生KV／Ledger运行

当前源码debug KV与Ledger构建并接独立HBase，来源固定认证适配器39591；本机HBase mTLS39580已修ALPN，Ledger增加genesis前置检查后恢复。原生Ledger39585完整H0／创世摘要通过，采样14管道水位及height16；2项定向测试通过。仍追赶且未接完整查询／浏览器入口，18/98不变。见[认证KV日志](./workLog/20261004-certified-native-kv.md)。

### 2026-10-04 认证查询组件已启动，最新覆盖未准入

当前debug indexer／consistent／GraphQL完成构建，使用独立PG库和只读GraphQL角色，真实H0／创世／固定16摘要正确；最新checkpoint仍异常哨兵值，PG100与consistent18不同步，19重试503待修消费预算。保持publicQueryReady=false，18/98不变。见[查询启动日志](./workLog/20261004-certified-query-bootstrap.md)。

### 2026-10-04 共同覆盖恢复，实际钱包reader通过

三个消费者以保留DB的受控重启应用单并发／1s重试预算，GraphQL最新checkpoint恢复100及有效摘要，覆盖0–100。实际WalletAssetReader共同快照、系统对象、余额、5个账户对象读取通过；2项预算守卫测试通过。私有数据面证据不替代公开入口／Chrome，18/98不变。见[预算与共同快照日志](./workLog/20261004-consumer-budget-and-snapshot.md)。

### 2026-10-04 私有查询准入已接通

独立只读发布／索引身份与 TLS 配置已绑定当前 guard 源码，loopback39592 真实三类准入返回204／上界100，未知surface403。索引／源端不可达时拒绝、恢复后重新通过；证据已保存。PID19053，macOS Python 路径切换已核实修复记录并成功复用，未视作通用启动竞争根治。公开 ingress／内部consistent门禁／浏览器桥接仍待接入，18/98不变。见[查询准入日志](./workLog/20261004-native-query-admission.md)。

### 2026-10-04 真实认证查询入口与 gRPC-Web

TLS GraphQL39600、mTLS Ledger39601、内部consistent39602及TLS gRPC-Web39603已启动。实际Node SDK经桥接／准入入口读取同链H0和height100通过，未批准执行路由404，未来读取拒绝。配置与证据不替代Chrome；GraphQL内部consistent仍需切到门禁，实际扩展Origin／CORS等尚未完成，18/98不变。见[查询入口日志](./workLog/20261004-certified-query-ingress.md)。

### 2026-10-04 GraphQL 内部 consistent 已切准入

GraphQL以保留DB和旧记录的受控重启切到39602准入，PID58173；indexer65781／consistent65784复用。实际钱包reader经TLS39600共同快照100、系统对象、余额和5个账户对象通过，2项路由守卫测试通过。Chrome等仍待验，18/98不变。见[内部准入日志](./workLog/20261004-graphql-consistent-admission.md)。

### 2026-10-04 扩展 Origin 真实桥接读取通过

实际dist扩展Origin已加入桥接白名单，隔离Chromium153扩展页面fetch真实TLS gRPC-Web返回H0／height100／grpc-status0。仅精确开发叶证书SPKI例外，未证明正常CA信任、钱包网络配置或交易验收。publisher20639仍实测运行，18/98不变。见[扩展桥接日志](./workLog/20261004-extension-certified-bridge.md)。

### 2026-10-04 ENV-04 结项，三入口浏览器读取通过

当前运行容器及manifest重新核验、6项renderer测试、真实桥接／门禁证据满足ENV-04，进度19/98。扩展页面Fullnode／GraphQL／Archive同H0读取通过；权限申请pending，Mac锁定阻止原生确认，后台配置预检未通过，ENV-07仍未完成。无等待测试进程，继续不依赖桌面的工作。见[入口审计](./workLog/20261004-ENV-04-browser-entry-audit.md)。

### 2026-10-04 ENV-08 当前绑定配置已生成

新增部署侧生成器读取runtime及代理配置，校验manifest／运行容器／三角色H0，实际钱包共同快照100与OriginByte GetPackage通过。profile与coverage位于runtime/wallet-profile-20261004-02，证据含时间与明确缺项；不是完整可试用配置。ENV-08结项，20/98。见[配置生成日志](./workLog/20261004-ENV-08-dev-profile.md)。

### 2026-10-04 账户认证索引前缀生成

当前源码debug账户工具编译通过，0–100共101个固定版本检查点生成OwnerToken与标准Kiosk能力认证索引，逐行对照PG并前后复核准入。尚未导入账户DB或启用API，20/98不变。见[账户前缀日志](./workLog/20261004-certified-account-prefix.md)。

### 2026-10-04 账户独立库与私有 API 已接入

认证账户根索引导入独立PG，最小权限查询身份实际检查通过。私有39605 WSGI取消preload后重复HTTP读取成功，实际WalletAccountHistoryReader接纳100–100窄窗口空页并保持完整性false。尚未公开TLS／持续增量／非空历史／Chrome验收，20/98。见[账户库与API日志](./workLog/20261004-native-account-index-api.md)。

### 2026-10-04 账户常驻增量已提交

补齐v1根索引独立认证续接，真实101–200导入通过；token74622／capability74627常驻运行，采样连续提交至628，6项worker测试通过。未宣称追赶完成；账户API下次重启需核验新的worker源码绑定。公开入口／非空历史／Chrome仍待验，20/98。见[增量日志](./workLog/20261004-account-workers.md)。

### 2026-10-04 账户TLS入口与非空历史通过

新增准入TLS39606/account/graphql，账户API受控源绑定更新至PID83299。实际钱包reader经TLS读取100–1471窗口、1条真实交易并保持完整性false；明确Origin预检及未知路径测试通过。仍待profile更新、持续追赶与Chrome页面，20/98。见[账户TLS日志](./workLog/20261004-account-tls-ingress.md)。

### 2026-10-04 四服务配置已生成

当前profile03 revision2纳入账户TLS入口，生成前重新核验运行manifest／H0／包存在性及实际资产与账户读取器。资产快照本次2263；覆盖作为观测落盘，旧配置保留，CLI可显式递增revision。仍不可直接视为试用通过，20/98。见[四服务配置日志](./workLog/20261004-four-service-profile.md)。

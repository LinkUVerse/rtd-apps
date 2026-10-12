# 07 · 落地批次与验收清单

> 合并核对：2026-10-03。当前实施基线见 01 与 evidence；历史局部改动已撤销，以下功能合同是待实现要求。完成状态仅以 Task.md、totalProgress.md 和 workLog 的当前证据为准。

日期：2026-10-02。本文所有实施项当前均为**待执行**。本轮只完成设计文档，不勾选钱包编码、浏览器接入或生产部署。

## 发布包与配置回滚操作补充（2026-10-06）

1. 退出目标钱包所属Chrome profile，按受控备份流程保存其账户库、完整journal、网络配置和当前包SHA；加密存储副本应保留权限，禁止导出或记录明文密钥／助记词／密码。不得重建链、换generation或清理pending来完成回滚。
2. 保持同一个扩展安装身份。开发包使用原安装路径，在Chrome扩展管理页开启开发者模式后正常重新加载；正式发布保持原签名／extension ID。只替换审核过的包文件，不卸载扩展，不覆盖账户／IndexedDB／chrome.storage，不改manifest key来规避加载失败。
3. 实际核验已加载UI及MV3 worker的脚本SHA。磁盘文件变化并不保证worker更新；若来源不匹配、扩展被禁用或UI未加载，暂停验收。开发者模式是普通开发包安装流程，不能据此跳过CA、host permission或链身份校验。
4. 配置回退须恢复预期字段并作为新revision重新预检／确认；同一profile身份不得降低或重复revision。检查所有必需入口H0、schema、包及覆盖合同，保持原generation。预检因权限／TLS失败不等于已发现错链，必须按真实原因分类，不写入未经确认的配置。
5. 回滚包遇到未来journal版本或未知record schema，必须停止新构建／签名／dispatch，保留原记录、pending占用和加密账户。已广播交易只依据原H0／generation／账户／digest恢复；NotFound、索引落后、库不兼容均不能解除未知pending。
6. 逐项记录旧包→新包→回滚包的实际来源、账户地址／加密字段SHA、完整journal所有store逻辑SHA及真正使用的`wallet_network_v2`／`wallet_custom_profile_v2`。公共dummy pending、直接播种的配置、密码导出比对属于有限测试，不能冒充实际配置授权保存、广播中的pending或物理断电验收。

Chrome可能因开发者模式关闭而禁用未打包扩展，官方枚举对应`DISABLE_UNSUPPORTED_DEVELOPER_EXTENSION`。应通过正常扩展管理页处理，不修改浏览器安全偏好文件或开启证书绕过。[Chromium官方禁用原因源码](https://github.com/chromium/chromium/blob/main/extensions/browser/disable_reason.h)。

## 1. 工作包与依赖

| 编号 | 工作包及必要交付 | 依赖 | 估算人日 |
| --- | --- | --- | --- |
| W00 | 固定完整源码工作区基准；账户／页面／调用依赖盘点；冻结测试网络合同 | 文档决策确认 | 1–2 |
| W01 | NetworkProfile、身份握手、三客户端、能力隔离、取消；归档gRPC-Web桥接、TLS／host权限及启动配置 | W00 | 3–5 |
| W02 | wallet Provider、共享core显式注入、新SDK导出／package／锁文件；移除旧dApp Kit读取Hook | W01 | 2–3 |
| W03 | 构建／模拟／签名／执行结果迁移、journal v2、恢复、Wallet Standard、授权网络验证 | W02 | 4–6 |
| W04 | 余额／coin／metadata／NFT／Kiosk／名称／收件人及回执页迁移；一致snapshot | W02，涉及执行需W03 | 3–5 |
| W05 | 历史／accountHistory扩展／归档详情、质押／验证者／APY组合；完整分页与覆盖 | W02，端到端需W04–04 | 4–7 |
| W06 | 同链Chrome全功能／故障回归，修复，冷启动／断网／worker恢复／缓存reset | W04–05 | 4–6 |
| W07 | 发布清理、无JSON-RPC网络证明、打包／回滚／配置及观测说明 | W06 | 2–4 |
| 合计 | 普通账户功能完整迁移，包含协议入口与dev验收 | — | **23–38** |

新建功能等价钱包预计额外12–20人日：账户安全／存储／安装迁移、UI／设置／权限连接、旧行为复现和完整新项目回归，总计约35–58。两条路线都承担上表端点、质押与历史工作。估算是工程判断；W02的真实Chrome切片后更新，不承诺固定日历工期。

### 1.1 范围与预留

- 普通助记词、导入私钥、币、NFT／Kiosk、质押、历史、名称、Wallet Standard、账户管理和设置在基本功能范围。
- 实时流是增强；首版可以轮询／前台刷新，但必须具有无遗漏的重开／恢复查询和正确历史，不能靠略过历史功能缩减工作。
- zkLogin成功、Qredo远程系统、硬件Ledger新实现、法币商户接入、生产K8s高可用单独排期。已有开发数据保留与不支持入口说明属于基本清理。
- 当前名称fixture仅证明dev读协议；钱包转账名称验收需受控同链registry和有效／过期记录，不能宣称生产名称注册商业流程已上线。
- 不实施无关UI全面改版、第二个钱包、钱包服务器签名或一个JSON-RPC兼容网关。

## 2. 第一批切片与停损点

先完成W00–01，而不是先改完所有页面再第一次尝试Chrome传输：

1. 从当前chain及运行时配置生成一个完整dev profile，固定SDK／服务镜像／fixture版本。
2. 插件真实Chrome加载：Fullnode.GetServiceInfo、GraphQL H0／一个余额快照、桥接后的archive.GetCheckpoint(0)／已裁剪历史交易各一条。
3. 三者genesis完全一致；验证错误头、Unavailable／InvalidArgument、TLS、host permission、取消与一条server-streaming List。
4. 做一笔普通账户签名执行与原digest恢复的端到端切片；账户密钥保留background，现有UI可暂用测试页但不以测试页替代最终页面验收。
5. 捕获请求形式／服务协议版本／实际限制，校准后续工期。

如果归档桥接、Chrome证书或同链数据没有条件，保持W01未完成，说明明确缺失条件。可以继续做不依赖外部条件的类型和领域解析，但不得跳过三入口验收宣称整个迁移完成。新建钱包也无法规避相同前提。

## 3. 各包完成门槛

- [ ] W00：已提交／归档的基准同时含未提交与未跟踪源码；版本／文件哈希／功能期望保存，秘密与运行时数据排除。
- [ ] W02：配置校验、三入口真实身份、归档浏览器桥接、可信门禁、权限／TLS与流均有Chrome证据；新入口已持久到dev部署。
- [ ] W03：wallet与受影响core消费者能构建；发布没有旧包导出假兼容；客户端与Hook按完整网络隔离。
- [ ] W04：真实成功／失败／未知提交、跨窗口互斥、worker恢复和Wallet Standard新效果映射通过，journal升级可恢复。
- [ ] W05：资产与名称矩阵通过，GraphQL落后不会归零，gas与发送前验证使用Fullnode当前数据。
- [ ] W06：发送／收支历史语义区分、归档旧详情、动态字段／Kiosk、质押／APY及多epoch分支通过。
- [ ] W07：全部基础功能、边界、故障恢复、dev重建、保留数据冷启动和Chrome真实回归闭合。
- [ ] W08：生产bundle审计／抓包无JSON-RPC、同链配置／可回滚发布、观测与运维说明齐备，所有例外有明确范围。

勾选编码包必须有源码与定向测试证据；勾选真实接入必须有Chrome与链事实。不能以另一个archive-service任务已勾选替代钱包验收。

## 4. 完整验收矩阵

以下每行是必需验收主题，分支完整性由04–06细则决定。保存chainId、generation、profilerevision、SDKcommit、镜像、extensionbundlehash、Chromeversion、fixture、时间、预期／实际与trace。材料去除密钥和解锁凭据。

| 编号 | 验收主题 | 通过证据 |
| --- | --- | --- |
| A01 | 新装插件、创建／恢复助记词、派生、多账户、导入私钥 | 地址与签名基准一致；锁定、解锁、导出需密码；升级不丢库 |
| A02 | 三入口、身份／schema／包绑定 | 真实Chrome Fetch报文、服务身份、H0digest一致、能力声明与实际匹配 |
| A03 | 归档桥接unary／server stream／错误 | Ledger与Move成功，State／Execution／管理方法不可误启用；trailers／取消／限流／deadline保留 |
| A04 | min-checkpoint | 省略、H0、已观察H、不可满足、非法、负数、溢出；历史选择器不变；可信上界不可由外部header突破 |
| A05 | 币余额／元数据 | 多页、多币、总额精度、coin/addressbalance、不含元数据币原子单位、依赖错误不归零 |
| A06 | NFT／动态字段／动态对象 | 多页双向、nameBCS、值／childId、owner、类型、缺失、历史版本、缺图与非视觉资产 |
| A07 | Kiosk | 同链package、cap与personalKiosk、持有／内容／可转移性、转移前验证；按实际支持业务分支 |
| A08 | 普通转账／gas／模拟 | 大整数、小数边界、余额不足、错误版本、无效地址、未知命令、模拟失败、gas变化需再授权 |
| A09 | 签名／执行／链失败 | finalbytes／digest一致，普通／导入签名，成功和FailedTransaction真实链回执；无自动重复dispatch |
| A10 | pending／多窗口／worker | dispatch前后关闭、timeout但链成功、回执落盘失败、锁失效防护、旧digest恢复；持久记录与链事实一致 |
| A11 | 裁剪后的长期详情 | Fullnode查不到的同链历史交易／checkpoint／对象版本由归档读取；返回ID／版本／摘要核验 |
| A12 | 交易／事件分页 | ascending／descending、空扫描页、SCAN_LIMIT／terminal、重复／无进展／坏cursor、超时页不提交 |
| A13 | 账户历史语义 | sender、收款、对象变动、Kiosk／token／capability范围；缺证书／未注册不冒充全集，按扩展实际承诺验收 |
| A14 | read-after-write | 执行确认后GraphQL故意落后，显示索引同步；覆盖到目标checkpoint才刷新完整资产snapshot |
| A15 | 名称 | 正向／默认反向、缺失／过期、registry错链、解析lag、显示名与发送目标分开；确认最终地址 |
| A16 | 质押与治理 | Pending／Active／赎回、多pool／inactive、rate缺失、safe-mode补洞、APY多epoch、奖励舍入与大额值 |
| A17 | 网络与dev归零 | 同host换genesis、同genesis换generation、保留数据重启、只归档重建、URL／registry变动、迟到请求拒绝 |
| A18 | dApp与Wallet Standard | modernconnect／disconnect／account／chain事件、PersonalMessage、sign-only、sign-and-execute、origin／权限错配拒绝 |
| A19 | Chrome权限与证书 | 新装／更新、hostpermission批准／拒绝、自定义网络、正确CA／错误SAN、UI和worker实际调用；demo网页CORS另验 |
| A20 | 故障与冷启动 | Fullnode／GraphQL／archive分别不可用与恢复、Docker保留数据冷启动、入口依赖顺序、不误清journal |
| A21 | 发布清理与成本 | bundle／依赖／抓包无JSON-RPC与旧Kit、无Sui公网误访问、单活动钱包、限流／日志／配置说明 |
| A22 | UI与非RPC资产 | 国际化、账户／锁定／设置、资产隐藏、链接、授权窗、支持的应用入口保持；不支持的外部业务明示 |

### 4.1 特殊用例要求

- 超过50个交易事件／变动时验证SDKGraphQL截断风险，不能把first50当全集；必要完整事实用Ledger或raw连接完整分页。
- 质押APY需要多epoch样本，不能用epoch0的空列表签认；既有Rustrates fixture可验证算法，真实dev链验证对象及跨epoch状态。
- 只用mock可以验证转换／边界，不能证明bridge、CA、WebLocks跨窗口、worker关闭或实际入链。
- 关闭worker的验收记录必须证明它确实停止，不能只刷新popup；恢复打开新的worker继续查询原digest。
- 不自动销毁当前dev链。破坏性reset用隔离测试网络／已明确授权的重建流程，记录generation；保留数据冷启动不等价freshreset。

## 5. 执行命令与脚手架注意事项

下列是现有脚本与未来验收建议，**本轮未执行**。实施时先固定依赖与测试网络：

```sh
# 在 rtd-ts-sdk 内，按当前 AGENTS 和依赖图构建 SDK。
pnpm turbo build --filter=rtd-typescript

# 在 rtd-apps 内，依赖修复并安装后运行。
pnpm --filter rtd-apps-core test
pnpm --filter rtd-wallet test
pnpm --filter rtd-wallet build:dev
pnpm --filter rtd-wallet build:prod
pnpm --filter rtd-wallet pack:zip
```

发布前还需钱包tsconfig的明确typecheck／lint及SDK／Kiosk／wallet-standard受影响包构建；脚本不存在时新增并验证，不用Webpack输出自动证明全部类型通过。

当前wallet有 `vitest.config.mts`；原 `.ts`配置在工作区删除，基准需要同时保存实际新配置。Playwright配置默认链启动含 `--force-regenesis`，不能直接在现有工作目录照跑。先改造测试fixture：显式profile、固定已运行dev三入口或独立受控网络、测试数据身份、禁用默认破坏性启动，然后再运行：

```sh
# 仅在已修复测试网络启动合同后执行。
pnpm --filter rtd-wallet playwright test
```

Chromium自动化与用户Chrome unpacked加载均需验证extension实际background／popup。CA必须受信，不以ignoreHTTPSErrors掩盖问题；测试中不能把本机私钥／浏览器真实Profile复制到仓库。

## 6. 发布与运维交付

### 6.1 dev交付

- 一个钱包开发包、一个已校验网络profile、统一compose中的协议入口配置，复用现有中间件。
- 同链fixture与受控生成／重绑说明；名称／Kiosk／token／stake的package和registry明示。
- 账户库及journal的版本化迁移，测试用数据和生产密钥隔离。
- A02–A22通过证据及精简FinishedLog；未完成项保留未勾选并具体说明。

### 6.2 生产接入合同与本次范围

生产保留相同RPC和钱包领域代码，只变RTD实际域名／CA／限额／profile／包绑定／入口部署；不要编译dev单机与prodHA两套业务适配。GraphQL／Fullnode／archive可共用入口治理及观测，native和browser协议路线明确。

生产HA、托管PG／MinIO及K8s由现有TASKS-prod-env独立推进。钱包设计中的bridge、身份／错误／限流／配置是必要接入合同，HA副本与故障域扩展不是dev前置。没有生产域名和凭据时，dev仍可完整验收，生产连接项保持待部署。

### 6.3 下线旧层与回滚

1. 发布依赖图禁止导入JSON-RPCclient／Transport／旧Kit；测试／迁移fixture的历史名称有例外清单，不进入bundle。
2. Chrome实际抓包确认全部读写只到批准的新入口，无旧JSON-RPC POST method，无Sui公网默认MVR／faucet／explorer误访问。
3. 配置、bundlehash和schema一起签认；只有一个活动发布实现。旧基准不持续构建或启服务。
4. 配置错链、journal迁移或授权严重问题时暂停执行；恢复已签认包／profile，保留pending记录和账户库。
5. 回滚后的旧程序不得自动发送新schema未识别pending；降级遇到不兼容journal应进入只读恢复模式或阻止执行。不能靠清库解决。

## 7. 本轮文档交付的验收

本轮完成的是以下设计要求，与上面的待实施清单不同：

- [x] 比较官方当前Fullnode／GraphQL／archive分工并引用官方资料。
- [x] 对齐现有总体架构，说明公开入口／私网／摄取与查询边界。
- [x] 读取dev-260923当前SDK与wallet/core工作区，记录版本和代表文件哈希。
- [x] 综合原项目改造与新建的工作量、运维、安全与历史债务，给出明确推荐及改选条件。
- [x] 定义Chrome传输／协议桥接、身份／网络／dev重建、数据契约／页面功能、质押与历史专项。
- [x] 定义签名／执行／恢复、Wallet Standard、缓存／分页、权限／TLS及生命周期。
- [x] 给出工作包、依赖、估算、全功能验收与上线／回滚门槛。

设计审核后，建议从W00–01落地；本轮未实施上述工作包，未生成编码／Chrome通过证据。

### 2026-10-04：保留链启动与就绪补充

本地协议覆盖支持不等于既有链可中途改参。实际1000ms间隔调整在checkpoint424107重放时触发自分叉保护，原参数恢复后的数据点查通过、链头推进未通过，runtime保持ready=false。后续环境验收必须同时证明原H0／genesis／配置／debug来源、既有交易与余额，以及实际链头推进；进程或端口存在、身份查询与固定旧数据读取不能替代。变更入口已禁用，分叉标记和journal保留，未重置数据库或重发交易。详情见合并目录workLog/20261004-checkpoint-interval.md；原有任务仍按完整验收范围推进，不增加完成勾选。

### 2026-10-04：保留原计算摘要的受控重放恢复

实际只读secondary检查确认424107没有认证证书，原摘要及self-divergence marker仍在；从genesis验证三个epoch委员会转换，424106证书／内容／前驱和共识中的原签名通过。最新4096块中没找到424107签名，只能作为该范围观察。

[Sui节点源码](https://github.com/MystenLabs/sui/blob/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-node/src/lib.rs)的显式checkpoint override在指定摘要等于原存储摘要时保留计算记录；[builder](https://github.com/MystenLabs/sui/blob/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-core/src/checkpoints/mod.rs)仍在保存及签名前核验重放摘要，不一致则再次fatal。本次限制原环境／原摘要／原H0／单验证者、无交易分叉和认证冲突，并保留原计算记录，进行一次受控重放；不能选用不同摘要删除记录或将旧计算日志声明为quorum依据。

实际424107获得与原记录逐字一致的认证证书，签名／contents／前驱均通过且无新分叉。随后已撤回临时恢复字段，全部原YAML／genesis／数据库／journal保留；三笔原交易未重发，消费者未重启。15.082秒原生采样424269→424338，三笔成功回执和余额与调整前一致、0模拟0广播；Fullnode／faucet端口及PID3922身份检查通过，runtime.ready=true。钱包trial_ready仍为false，索引追平和display超时继续单独验收。详情见合并目录workLog/20261004-original-summary-recovery.md。

### 2026-10-05：对象版本延迟修复的验收边界

当前闭区间ID与联合排序生产 SQL、3项真实 PostgreSQL 回归、debug重编译及19项运维守卫通过，不等于完整钱包display或浏览器通过。退出状态守卫中止、KV环境遗漏、旧S越界与新能力拒绝均保留失败；受控恢复只处理证明退出的原服务，未重置数据库或重发交易。query／KV绑定核验通过，但当次KV日志仅观测1管线，不写成14条全部恢复。

RPC-03／NET-04／RPC-22仍未完成：必须取得共同S、完成最新完整display／OriginByte／Chrome、补齐v1历史模板合同。指定dev核心CLI最新debug切换仍须受控验证。任务保持48/98、trial_ready=false，见[本批日志](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/migrationToGRpcOrGraphQLDoc/workLog/20261005-query-range-recovery.md)。

### 2026-10-05：核心最新 debug 前置已完成

当前核心CLI21240已完成同H0／原回执余额／链头438627→438698／原配置与当前debug绑定的受控切换验收，33项守卫通过；失败的退出身份观察和单次停止后恢复证据保留。此结论更新本日早先“核心最新CLI待切换”，不代替完整ENV协议或钱包试用验收。

KV14条、consistent4条持久化水位已核实，但原生consistent下界176712仍高于GraphQL Ledger171325。共同S、完整display／OriginByte／当前产物Chrome及v1历史模板仍未通过，RPC-03／NET-04／RPC-22保持未完成，48/98、trial_ready=false。见[原链切换及范围诊断](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/migrationToGRpcOrGraphQLDoc/workLog/20261005-core-debug-current.md)。

### 2026-10-05：授权监听队列和资产只读恢复

共同窗口已由生产WalletAssetReader实际接纳S176808，13对象五组字段通过。随后公开查询出现的下游503，经私有日志脱敏投影确定63次超时均处于连接授权监听器阶段；Python3.9默认TCP队列5的8路/live测试仅24/32成功，不涉及发布／SQL检查。依据[Python官方队列语义](https://docs.python.org/3.9/library/socketserver.html#socketserver.TCPServer.request_queue_size)，指定合约仓库启动器将连接队列改为32；检查8和请求32预算、逐请求新鲜fail-closed及原配置／manifest保持。队列不是增加发布检查或适配器吞吐配额。

保存原源码／绑定／进程记录并核验后，只替换该Python监听器86054→11462；六个原生消费者身份保持，核心／genesis／数据库／journal未重启或重建。5项真实内核队列及停止守卫通过；同测试32/32、扩展256/256、Docker TCP24/24成功，合法三surface204、unknown403。固定S原生555ms与公开1027ms均通过；OriginByte两账户S182969共123请求，完整读取／新鲜对象比对及两条未签名转出路由检查通过、0模拟0广播。

不包含实际NFT签名广播、Chrome非空NFT或v1历史模板验收。早先失败证据保持，完整后续结果以[本批日志](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/migrationToGRpcOrGraphQLDoc/workLog/20261005-current-assets-window.md)为准。48/98保持、trial_ready=false。

后续稳定性检查修正：本机监听队列缺陷已消除，但Docker入口仍有39592建连超时；当前Chrome在资产查询阶段TimeoutError，0模拟0广播，未进入页面验收。完整NFT单次通过保持，不能把队列测试通过等同公开入口持续稳定。本批正在进行隔离建连预算对照，详情见同一日志。

### 2026-10-05：Local构建配置与Chrome失败原因修正

新增只读流量诊断证明上述Chrome超时期间0条GraphQL请求；原2eaddb／ef15ecc产物均缺审核Local registry，因此不能把该失败归因于入口503。已保留原产物，以现有profile03 revision2和显式API_ENV／WALLET_NETWORK_PROFILES重建开发产物，应用源码摘要保持。UI SHA90c2d492671d620e5ab4fee79309bc83d815adbec100a5834e768b8c2b064773，后台SHA05b4e235093f20812ad0385db7db9af9dfd19f890608ef5987b0038fecab1f24；AST逐JSON字面量证明双方bundle完整registry一致，4项拒绝／解析测试、四入口provider与39方法闭包通过。Local Chrome测试启动前强制该校验，避免未配置产物误入实链验收；当前Chrome结果以同一本批日志为准。

独立临时nginx对照2秒／5秒各40个授权请求全部204，未复现原入口残余超时；对照容器已移除，生产超时没有调整。TCP残余问题继续独立排查，不能把增大等待预算当作已证明修复。

### 2026-10-05：切网缓存清除后的就绪门禁与当前Chrome恢复

切网清空QueryClient后，存储迁移hook此前在ready时永久停用轮询，缓存消失又不核验，主页面因缺就绪状态而空白。真实React／QueryClient回归先复现该失败；现按ready状态同步enabled，缺缓存重新核验，保留切网清理／会话隔离与原准入。14项定向、132文件1418项、完整tsc和显式profile03开发构建／双入口AST／四入口provider／39方法静态闭包通过。

最新UI SHA c446dd353574351169480316ddeaf521340f644e0bbe347da3e257564cc59acd，后台SHA05b4e235093f20812ad0385db7db9af9dfd19f890608ef5987b0038fecab1f24。真实Chrome于S189657通过余额读取、10非视觉对象及链接、Kiosk卡片／空详情、密码／锁定／整浏览器重启，0模拟0广播，实际worker与当前磁盘产物匹配。全部此前未配置、空白、测试收集失败及旧产物保持，见[修复与证据](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/migrationToGRpcOrGraphQLDoc/workLog/20261005-storage-migration-cache.md)。

采用compiled Local及精确开发SPKI例外，正常CA、自定义权限、直接NFT display／隐藏、非空Kiosk页面和实际NFT转出未验。OriginByte生产两账户读取及未签名路由有独立证据，不能替代这些页面／执行验收。Docker原入口间歇建连、Display历史D2–D6及剩余完整门槛继续推进；48/98、trial_ready=false保持。

### 2026-10-05：Display v1历史索引与独立连续覆盖的编码状态

RTD新增hist_displays与每checkpoint的hist_display_checkpoints，保留类型BCS、完整链上位置、交易digest、Display ID、0–65535发布版本和原VersionUpdated事件。DisplayCreated或字段编辑不能产生发布模板；不折叠同checkpoint多事件。独立hist_display_coverage绑定H0／sourceId／generation，从-1经genesis连续前进；事务同时提交marker、全部事件、coverage及框架watermark。重放必须marker和完整事件集合逐字节一致，冲突／缺口不推进；数据库禁止历史改写、删除与truncate，coverage禁止身份变化、回退、缺前驱／checkpoint／事件。三个新表纳入Alt epoch提交门禁，promotion等待已准入事务结束，随后旧epoch写入被拒绝。该证明仅涉及Alt PG，不代替MinIO／HBase或多节点验收。

整个索引器库66项通过；新增19项包含17项历史测试（12项实际PostgreSQL）及2项配置测试，sourceUnchanged=true。GraphQL兼容编译、6项合约仓库回放准备守卫与格式／diff检查通过。回放准备只生成有界历史配置与保留原管线的恢复配置，要求认证来源和独占writer，未实际替换服务或执行认证checkpoint回放。新历史表未部署；D2仍有真实回放待办，D3的(type,S)loader／scope／v1-v2优先与basis、D4准入以及D5-D6完整认证和页面回归继续推进。完整debug重编译及运行绑定更新必须先于下一次新源码部署，不能把旧构建证明改成当前源码已通过。48/98、trial_ready=false保持。

详细源码、失败保留和验证范围见[历史索引实现日志](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/migrationToGRpcOrGraphQLDoc/workLog/20261005-display-history-indexer.md)。

## 2026-10-05：Display历史读取与GraphQL模板basis

D3已接入HistoricalDisplayKey(type,S)：参数化UNNEST／LEFT LATERAL以完整checkpoint／transaction／event位置取cp≤S的最后发布事件。一次MVCC查询同时检查从genesis连续覆盖、hist管线自己的watermark／H0／genesis及S marker／端点、sourceId／generation；缺历史失败，已覆盖且无发布事件才返回null。BCS模板ID和u16发布版本必须与存储元数据一致；重复键及同类型多S按ordinal处理。旧sum_displays保持。

GraphQL必须有indexed检查点S，v1读历史，v2同S registry优先，仅解除继承root界限；核对v2对象ID、具体类型、对象版本／digest及来源cp≤S。存在模板却缺资产layout会失败，execution／stream无S不能借当前模板。Display.basis为DisplayV1Basis／DisplayV2Basis union：v1含snapshotCheckpoint、objectType、templateId、publishedVersion、sourceCheckpoint／Digest、transactionDigest、checkpointTransactionIndex、eventIndex、eventBcsSha256及historyCoverage；v2含S／类型／模板ID、objectVersion／Digest、sourceCheckpoint、previousTransactionDigest、contentsBcsSha256及historyCoverage。historyCoverage含H0、sourceId、generation、first／lastCheckpoint及lastCheckpointDigest。digest出参checked 32字节后以规范Base58 String输出；UInt53显式限制JavaScript安全整数。SHA仅为BCS内容身份，coverage为认证来源索引绑定，不是可携带密码学证明。

默认features下Reader全库36项、GraphQL全库247项通过（新增7／10项，其中6／2项实际PG函数），两个证明sourceUnchanged=true且与本批当前源码一致。实际1025事件、7数组请求的热点／稀有／缺失／重复键Loader为15.720208ms（含连接／解码），同参数EXPLAIN ANALYZE SQL为0.466ms、type_position索引loops=7；仅为独立TempDb规模，不是生产SLA。SDL及新增27字段的范围映射snapshot已核对；初次Digest输入scalar出参panic和snapshot失败已修正并保留证据。

D3编码与本批库回归完成；D4的服务能力／availableRange／钱包basis准入，D2真实认证回放及D5–D6完整认证、中断恢复、最新八个debug产物受控部署和钱包／Chrome仍待推进。新代码未部署，不能先切换查询服务而跳过历史连续回放；不得以本批库回归代替产品验收。48/98、trial_ready=false保持。详见[源码、失败修复和最终证明](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/migrationToGRpcOrGraphQLDoc/workLog/20261005-display-history-reader.md)。

## 2026-10-05：Display历史能力与钱包basis准入

D4已接入ServiceConfig.displayHistory（apiVersion=1、V1/V2及连续coverage）。coverage在H0／sourceId／历史generation／0至hi端点之外，增加snapshotCheckpoint和snapshotCheckpointDigest；新的CoverageKey(S)以NULL类型边界关闭事件查找，复用同MVCC的独立历史watermark与marker验证。网络profile generation不等于历史generation。

MoveValue.display、Display.output／errors／basis及v1/v2 basis字段的availableRange依赖hist_displays、obj_versions、consistent、ledger_grpc；能力／coverage字段依赖hist_displays。缓存管线缺失或实际历史不覆盖scope S时直接失败，不使用默认空范围。SDL和依赖快照已同步。

钱包在admission检查H0与来源，pin／每页read／末验在固定checkpoint(S).query内校验同sourceId／历史generation及S摘要；覆盖上界可正常前进。非空Display要求规范类型／模板ID、source≤S、匹配历史来源与S marker的basis。v1按u16发布版本、交易／事件位置和原事件SHA核对；v2核对0xd registry的DisplayKey<T>派生ID和对象版本／摘要、前一交易及contents SHA。SHA只表示内容身份，能力不是可携带证书；null只有已准入完整覆盖才有效。partial、缺basis、来源变化、未来模板、取消／超时／旧session／分页预算耗尽均拒绝完整资产结果。

[Sui概述](https://docs.sui.io/develop/objects/display/display-overview)及[固定官方registry源码](https://github.com/MystenLabs/sui/blob/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-types/src/display_registry.rs)核对v2确定性派生语义；本批displayHistory／历史coverage／basis是RTD扩展，未冒充上游标准API。钱包完整请求按本地RTD SDL校验，公共投影另按SDK与保存的官方Sui SDL校验。

最终Reader38项、GraphQL249项均sourceUnchanged=true并绑定同一当前源码；D4新增4项实际PG测试函数。钱包133文件1463项、本批新增45项，完整tsc、显式reviewed Local开发构建及双入口AST、四入口39方法静态闭包通过。旧dist保存，新历史服务／认证回放／新版Chrome尚未部署或验收；D5–D6及父任务仍待完成，48/98、trial_ready=false保持。详见[本批合同、失败记录与证明](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/migrationToGRpcOrGraphQLDoc/workLog/20261005-display-history-admission.md)。

## 2026-10-05：Display最新debug部署与认证历史回放

D2–D4的八目标及三个publication辅助程序已由指定rtd当前源码在独立debug cache成功构建；完整索引器66项与Reader38／GraphQL249项回归的源码identity相同。仅CLI／indexer／GraphQL三个artifact改变，其余五个服务文件及三个helper字节不变。指定link-u-smart-contract的独立安装／停止恢复脚本保留原数据、genesis、YAML、交易journal与全部旧artifact，按原子复制和独立installation证据核验默认target实际文件，不将隔离构建的deployedArtifactsReplaced=false改写成已部署。只替换三个变化产物的进程；四个字节相同消费者、一致性快照、认证adapter和发布进程保留。旧reader单文件reload范围保持严格，未用于这次广泛修订。

真实最新来源守卫已接受安装文件；三个历史表及不变性／连续覆盖／epoch触发器安装，原22条管线保留。核心在旧durable cursor和共识恢复结束后通过487696→487767及原三笔回执／余额／H0和listener所有权证明，ready=true只对应核心。首次停止身份过渡、错误binding字段、RPC尚未监听和未推进采样均保留为失败；停止后恢复只接受原PID与同命令竞争者已消失、没有复制或新launch的状态，不重复发信号、强杀或交易广播。

认证history-only有界回放从checkpoint0真实执行，准备上界386503，复用原indexer两个读取名额，不增加cohort、不从当前sum_displays制造历史。监督进程记录实际child exitCode并持有lifecycle锁；同一只读TLS事务核对genesis／sourceId／generation、readerLo0、marker连续全集／端点和hist watermark，准确覆盖准备上界、退出0、源码／产物不变且旧22条水位原样后才恢复原22条加hist live。首次覆盖0–196／197marker是观察，尚无终态退出码；完整认证、生产同S Display／直接NFT／OriginByte和新版Chrome仍未验收。钱包Task48/98、trial_ready=false；核心和schema安装不能折算为这些父任务完成。



## 2026-10-05：认证前缀辅助索引与历史回放吞吐

指定dev的PG17.10已安装独立辅助前缀表，保留原checkpoint／chain数据。每行直接外键关联原(scope,sequence,transactions)，前驱外键关联前一行(scope,sequence,total)，行内算术约束从genesis归纳证明连续0..S及精确累计交易数。跨行事实不由CHECK函数推测。[PG17约束](https://www.postgresql.org/docs/17/ddl-constraints.html)；AFTER INSERT与原插入同事务、固定受信search_path和受限SECURITY DEFINER生成下一行。[PG17触发器](https://www.postgresql.org/docs/17/trigger-definition.html)／[函数安全](https://www.postgresql.org/docs/17/sql-createfunction.html)

安装事务逐行SHA核对431328条原checkpoint及全部chain状态前后一致；辅助表逐scope与完整原聚合一致，后续新增checkpoint也必须经过立即外键和原子触发器。读者每次持有两表ACCESS SHARE锁、开启只读REPEATABLE READ，检查冻结catalog摘要，约束／触发器／函数／权限／对象身份变化即拒绝；关键catalog行xmin使禁用后恢复仍不能复用旧证明。固定版本GET、源及副本latest HEAD／复制状态／SHA和前后末验保持，未缓存positive admission。数据库superuser仍属于受信运维边界。

guard采用单独证明的镜像overlay，仅替换ledger_snapshot函数体调用prefix_ledger，其他原函数的AST逐项相同；adapter冻结的三个主机文件及manifest保持。辅助DDL与镜像安装分别有独立证据，不将新增辅助schema冒充纯镜像部署。真实独立PG26测试及12组新旧守卫差分场景、镜像24项／主机32项TLS守卫、部署7项单元测试通过。候选镜像实际读取0／100／386503固定版本并拒绝未来与非法路径；运行mTLS准入与固定SHA通过。首次切换后监听尚未启动导致URLError，保留失败，随后仅只读终验通过，没有重做切换或重启消费者。

并发回放中的12次相同checkpoint读数，中位约0.486秒降至0.302秒，全部200且固定SHA相同；包含运维身份检查及请求开销，仅为本机测量。连续回放仍使用原PID66145、原H0／sourceId／generation、0起点和386503上界，原22管线水位保持；部分覆盖不等于终态或Chrome验收。guard8、adapter6、三个消费者各2名额保持。原全扫描算法及旧镜像保留；完整认证回放／恢复live／共同资产S与新版Chrome仍待。此项不提供多节点旧writer提交fencing证明。设计、实际状态与逐次证据见合并目录workLog/20261005-publication-prefix-index-design.md及workLog/20261005-publication-prefix-index.md。


## 普通 Chrome unpacked 安装方式（2026-10-07 官方复核）

Chrome 官方说明从137移除普通 Chrome 的 `--load-extension` 命令行入口。因此，Chrome for Testing 中采用该参数的页面测试，不能证明普通 Chrome 已安装钱包。普通 Chrome 开发包应通过扩展管理页的开发者模式和“加载已解压的扩展程序”安装；必须继续核验实际扩展 ID、UI／MV3 worker 字节与 host permission。加载方式不改变 CA、SAN、H0、generation 或业务覆盖验收门。官方依据：[Chrome 137 变更](https://developer.chrome.com/blog/extension-news-june-2025)、[开发包分发方式](https://developer.chrome.com/docs/extensions/how-to/distribute)。

如采用 Chrome DevTools for agents 的安装工具，需显式启用 `--categoryExtensions` 并提供 unpacked 目录的绝对路径；工具是否在当前会话可调用须另行核实，不能把文档中存在此工具当作已经安装成功。[官方工具说明](https://developer.chrome.com/docs/devtools/agents/extensions)。

本机仅通过应用包元数据确认普通 Chrome 154.0.8037.92；此观察没有启动浏览器、安装扩展或修改证书信任。后续仅新建独立测试 profile，保留全部已有钱包 profile。普通 Chrome CA 既有确认尚未返回，安装元数据及当前 isolated loopback 网关的 Chrome for Testing 结果不能替代其验收。运行状态及限制以钱包 workLog 和 totalProgress 为准。


后续版本观察：本轮收尾时普通 Chrome 磁盘应用包已从154.0.8037.92变为154.0.8037.98，先前独立测试进程仍报告92，现已按准确出生时间／命令／独立profile／本地端口正常关闭。首次不可变app输入校验失败保留；只为收尾明确接纳两app文件版本变化，全部项目输入继续相符。普通Chrome安装因Mac锁屏未开始，不能将旧版本元数据／启动证明称为98版本的安装、更新或CA验收。后续须重新验证实际运行版本。


## 2026-10-07：guarded checkpoint 每次传输的正式提交约束

当前RTD的三类Rust索引消费者实际启用`--require-published-watermark`，每次取checkpoint先重新读取正式marker，校验序号不高于本次上界，再读取checkpoint体。这是RTD fork新增的提交门，不应因Sui普通对象存储客户端每次直接GET文件而删除。对标不可变[Sui源提交d502662](https://github.com/MystenLabs/sui/blob/d502662dc474bb315f0e9155ff12743b8ad7e45d/crates/sui-indexer-alt-framework/src/ingestion/store_client.rs)。

实际运行guard的CHECKS为16，当前`checkpoints.py`与运行镜像SHA一致：读取必须保留fresh catalog／SQL及正式marker、ledger上界、源／副本latest HEAD、固定版本GET及SHA和二次HEAD／ledger一致检查。根目录server默认8及visibility全前缀扫描不是该运行镜像配置，不能据此将重复增大并发／重复连接池当作修复。MinIO transport已复用。

仅可在显式的新传输合同中评估一次HTTP携带marker与body，两次原校验均保留；目前只是候选假设，未实现、未ABBA实测、未编译安装。禁止通过关闭require-published-watermark、缓存实时事实或改成无提交门直读来提速。须通过原否定／竞态合同、真实ABBA不少于1.20和指定最新debug源验证后，再走受控部署。


## 2026-10-07：摄取成功数与重试耗时统计

按[Sui不可变摄取源码](https://github.com/MystenLabs/sui/blob/d502662dc474bb315f0e9155ff12743b8ad7e45d/crates/sui-indexer-alt-framework/src/ingestion/ingestion_client.rs)，以及RTD同一语义的cohort实现，`ingested_checkpoint_latency_count`表示被计时的尝试，不能作为成功checkpoint数；NOT_FOUND外层重试另计`total_ingested_not_found_retries`，成功数使用`total_ingested_checkpoints`及持久水位实际增加，两者不可混用。耗时均值存在重试时也不能称为纯成功fetch耗时。

当前34秒实际样本仅表明：正式434325处的18持久水位不变，native增加160，三成功计数均0，128／129／128为NOT_FOUND尝试。该时点需要先完成正式发布边界，再衡量body传输或索引写入吞吐；不把这段等待当作永久性能上限，不关闭正式marker或重发业务交易。

## 2026-10-07：未发布尾段本地缓存的有界并发候选

缓存水合仍须逐序号fresh staging HEAD并固定对象version GET，拒绝未版本化／缺失对象和缓存／历史符号链接，保存变化前的未发布缓存历史，以fsync及原子替换落盘。已提交且存在的本地缓存仅遵循原hydrate跳过规则；全前缀native证书和完整已提交ledger审核仍决定能否发布。并发只影响调度，每序号原校验／写入语句可逆保持，每批最多16，出错或取消先等待已启动任务退出，失败不能进入发布调用。

MinIO官方Python API允许同一进程的threading并发共享Minio实例，跨进程应分别创建实例，见[官方API](https://docs.min.io/aistor/developers/sdk/python/api/)。本候选只用ThreadPoolExecutor、单进程独立连接池；TLS／CA／timeout／重试策略不变，不缓存fresh事实，也不改Sui／RTD证书或提交门合同。

C50实际256个未发布序号、1／16／16／1轮隔离缓存对照，中位2.943737秒／0.843516秒，约3.489841倍；独立审核1024份缓存内容和4096条HEAD／固定版本GET／close／release记录，版本与摘要一致，14边界测试及8实际loop调用／启动摘要检查通过。仅属未安装候选；完整前缀native验证、正式发布、安全生命周期切换和写后524022覆盖仍独立必需，不以小样本代替。原发布器、五封存控制器和正式缓存未修改。

## 2026-10-08：受支持账户活动与有限并发验证

Sui官方GraphQL说明索引管线、保留范围、筛选与分页，并支持固定检查点查询；归档是历史点查，Consistent Store提供近期固定检查点的对象／余额。接口具备分页和索引覆盖，不自动证明任意业务账户活动全集。[官方组件与查询范围](https://docs.sui.io/develop/accessing-data/graphql/graphql-rpc)、[官方GraphQL参考](https://docs.sui.io/references/sui-graphql)。

RTD账户服务的registrationComplete／allAccountActivityCertified保持false，allAccountTransfersCertified原样为false或null。主方案04、account-activity/history_coverage.py及indexed_history.py均明确此限制。完整RegisteredKiosks／发现的Token／capability活动窗口可分别验证；不将sender筛选或完整分页升格为全账户认证。C53旧合成测试错误要求全集true，原文件和45项历史资格已保留并撤销当前资格；验证工具改为51项，独立02核对主方案、实际服务源码和五生产reader离线解析。最低524022、七覆盖、完整分页和六原参与事实保持，正向分支尚未执行。

原发布器自然提交486334；旧07交接控制器实际拒绝过期窗口，0信号。C52仅去掉重复入口全校验，原fresh before／after、自然无child／pending为空／终态年龄和原五实现保持；驻留观察结果及真实安装必须分别审核，不把观察启动当作服务切换。

C53真实38秒测量的writer／consistent约2.233／2.128cp/s，native约4.308；本次三cohort成功82／81／81、NOT_FOUND均0，attempt不当作成功。八次原算法分段诊断显示耗时分布，不据单个catalog或连接阶段推定唯一原因，也不缓存实时事实。C54相同transport候选128次固定blob ABBA仅1.128倍，低于原1.20门，未安装。

C55使用指定最新debug的四轮4／8／8／4有限0–205 SQL摄取；均自然exit0、23水位205，独立108次完整SQL表比较相等。全程中位3.152／3.834cp/s，样本比1.216455；不将SQL-only有限样本当作完整三cohort、HBase／Rocks等价、持续追赶或生产容量证明。原29服务／14健康检查、source／八debug与1015文件保持；本批四个临时只读guard正常退出并精确清理，累计56，四database与失败证据保留。并发预算任何部署仍需完整容量及生命周期资格。运行进度以钱包Task／totalProgress／workLog为准。

## 2026-10-08：实际共享容量与HBase物理隔离

Sui的IngestionService接受固定或自适应摄取并发，慢subscriber会对该服务施加背压；这不为独立运行的RTD三个cohort分配共享adapter／guard预算。[固定官方源码](https://github.com/MystenLabs/sui/blob/d502662dc474bb315f0e9155ff12743b8ad7e45d/crates/sui-indexer-alt-framework/src/ingestion/mod.rs)。

C57核验已安装镜像的guard16、只读PG pool16、实际冻结adapter12和三个fixed4。8×3超过共享容量，不能从C55的SQL-only收益直接部署。实际PG max_connections100、reserved3、本次连接36只作为资源快照。实际gateway.jar的tableName经白名单验证后只返回matcher.group(1)，project／instance路径不形成物理表空间；仅换instance不能隔离HBase测试。23容量／物理边界检查及fresh源／jar经独立审核，断网、只读的单一Maven17字节码工具自然退出并精确删除，累计57；首个解析器错误和既有完整输出保留，未重做实验。

C58依原同源immutable HBase3／MinIO root／WAL／初始化／mTLS蓝图声明四个新project、四default network及16个独立S3／WAL／ZK卷，每轮八服务，原配置只读引用，仅预留loopback42260–42263。四次实际Compose schema解析与独立02字段／scope／当前无冲突检查通过；含私有环境的输出只保存于自有0700目录的0600文件。声明准备没有启动服务，实际物理隔离、24共享输入资格、四轮14HBase／27SQL业务表／4Rocks等价、故障和部署仍独立必需。524022、七写后覆盖、普通Chrome和完整父合同不因这些准备而降低。


## 2026-10-08：有限容量资格、真实启动顺序与终态指标

C58独立32输入容量仅在实际原安装逻辑三处16→32变化上完成24同时读取和八项拒绝；原共享入口未替换。首个自有guard以docker stop退出137却误记正常，原失败及报告保留，正常生命周期资格撤销；独立02以新ID明确SIGINT、实际130退出并精确删除。原帧为执行保留的body，不冒称完整HTTP wire头帧。PG连接上限仍须实际观测，不据瞬时资源快照认证持续容量。

真实物理环境必须沿实际dev_workspace部署顺序等待S3／ZK健康，再依次完成S3-init自然0、master、RegionServer、HBase-init自然0、gateway及mTLS。首个并行up导致S3连接拒绝、0消费者／0新SQL库，失败和全部数据保留；九自有服务正常SIGINT清理经独立复核。镜像自动产生的ZK/logs匿名卷与命名卷一同保存，确认未与原服务共享之后才精确清理容器，不能删除卷或按名称猜测用途。

顺序02首轮已摄取205，但终态匹配使用连字符而实际pipeline标签是address_balances、object_by_owner、object_by_type及balances。14HBase／27SQL完整读取和23＋4持久水位已只读保留；缺失原生退出回执与完整计时不补造。唯一自有控制器正常收尾、十新退役ID独立确认，累计79。03只修标签与新实验身份，采用全新四物理project／数据库、4／8／8／4及最新debug。全部14HBase最新业务cells、27SQL业务表和8Rocks CF全键值须实读对照；HBase cell时间戳原样保留并逐表区分应用时间与服务器时间，Rocks使用原生merge_balances语义、关闭服务后只读导出并证明数据库文件SHA不变。四轮、真实终态及独立复核之前不得部署或完成父项。

C56观察器自然3600秒结束、未attempt／未安装／0信号，经独立终验。C60是新唯一有界观察，保留原完整fresh前后门与原五实现；准备及运行绑定不等同实际交接。正式发布／HBase14／SQL23／Rocks4／Display／资产窗口／受支持账户窗口达到524022仍是七个分别的写后门，六笔原NFT交易不重发。当前进度、失败与真实安装以钱包Task、totalProgress及workLog为准。


## 2026-10-08：完整有限业务等价与时间戳裁决

C58最新debug四全新物理project的4／8／8／4有限0–205完整通过，每轮14HBase持久水位、23SQL与4Rocks均205，24391最新cells／27业务表／8全CF相等。独立108次fresh SQL表读取、32次原生merge语义CF读取及56张HBase解析通过，Rocks文件SHA不变；八服务和Java只读工具每轮正常退出／删除，连同输入guard为37个新退役ID，累计116，20卷／四数据库／四Rocks保存。首审正数时间戳假设失败保留，审核修正未重跑实验。

不能将所有HBase cell时间戳当成服务器生成值统一忽略。当前RTD make_entry(Some(ms))写入应用时间，genesis交易bitmap合法为0；只有None变为-1，再由网关采用服务器时间。protocol_configs handler明确None，watermark客户端build_set_cell_mutations明确-1。实际12张应用时间表逐cell完全相同；只有protocol_configs一cell与watermark_alt142cells在各轮出现服务器时间差异，原始143个差异均保存，所有row／family／qualifier／value仍精确一致。该裁决取自当前已构建RTD和已安装网关源码，不由外部产品默认行为推测。

四轮中位吞吐比1.087147未达到1.20，生产fixed4／原容量保持，有限业务等价不授权直接部署新预算或宣称持续追平。实际39.4秒原生产观察native4.238、writer2.030、consistent2.081cp/s，只证明该样本的差距，成功／attempt／重试分别记。既有链改变checkpoint interval曾导致共识重放摘要分歧，变更入口已退役，不能为提速再对保留链应用新协议覆盖。

C51已按明确授权在独立普通Chrome安装C46；本次专属网关21实际请求证明三服务200和18条拒绝规则，保留供后续普通Chrome Local验收。该网关证据不代替实际普通Chrome页面、host permission、CA或524022七写后覆盖；密码／条款页面未确认完成时不读取敏感内容。98父进度与后续依赖继续以当前workLog为准。

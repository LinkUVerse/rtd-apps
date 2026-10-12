# 04 · SDK 契约与钱包功能迁移矩阵

> 2026-10-12 语义核对：初始源码评估和带日期实施记录保留其原始时点；设计约束继续有效，历史“待实现／未完成”不覆盖后续验收。 当前构建与真实业务来源见 [C281](./workLog/20261012-C281-business-traffic-completion.md)，当前环境及未收口合同见 [第 14 章](./14-开发验收包安装与回归说明.md)／[剩余工作量](./leftProgress.md)。

> 合并基线：2026-10-03，原评估及原文副本保留于 evidence。本文主体表格按现行实现维护，带日期的后续章节保留各阶段合同；完成状态以 Task.md、totalProgress.md 和 workLog 的当前证据为准，不将初版“待实施”状态沿用到已完成项。

初版评估日期：2026-10-02，SDK基线为本地 `rtd-ts-sdk` 的 dev-260923 源码。初版代码示意本身不构成编译或接入证明；当前实现、构建及真实验收分别查阅 Task／workLog。现行首页余额规则见本文 C250 章节及下方主体矩阵。

## 1. 当前 SDK 使用规则

| 导入 | 用法 |
| --- | --- |
| rtd-typescript/grpc | RtdGrpcClient、GrpcWebFetchTransport、RpcError／状态、raw 服务类型 |
| rtd-typescript/graphql | RtdGraphQLClient、typed query |
| rtd-typescript/client | ClientWithCoreApi、CoreClient、RtdClientTypes、ClientCache、错误与 BCS 解析工具；没有旧 RtdClient／RtdHTTPTransport |
| rtd-typescript/transactions | Transaction、TransactionDataBuilder 等；构建传入同链 Fullnode client |
| rtd-typescript/cryptography 等 | 原有签名与 Intent；不因传输迁移更换算法或派生路径 |
| rtd-wallet-standard | 当前 modern features 及仍保留的旧 feature 类型；公开钱包能力按实际支持声明 |
| rtd-kiosk | KioskCompatibleClient = ClientWithCoreApi；通过同链配置传入 client／packageIds |

当前包版本为 2.31.3，不能根据名称“2.0”推断所有最新官网示例都已经存在。通用库使用 `client.core`，钱包具体操作使用选定客户端的顶层方法；某些网络辅助方法按源码走 `.core`。参照[官方 Core API](https://sdk.mystenlabs.com/sui/clients/core)，具体是否顶层导出以当前本地源码为准。

### 1.1 dApp Kit 决策

当前 SDK 的包是 `packages/dapp-kit/packages/dapp-kit-core` 与 `dapp-kit-react`，不是旧根目录包。新 React Kit 面向 dApp 连接外部钱包，并不替代插件自己的账户与 background signer。

推荐：钱包内部用自己的 WalletRpcProvider + TanStack Query；共享 core 的数据 Hook 接收领域读接口／client，移除旧 `rtd-dapp-kit` 数据 Hook。钱包测试 demo dApp 如需 Kit，接入现代两包。不能在插件内部再自动连接自身钱包制造循环。[官方 dApp Kit 迁移](https://sdk.mystenlabs.com/sui/migrations/sui-2.0/dapp-kit)。

### 1.2 数据类型必须整体更换

- 金额、version、epoch、checkpoint 的协议精度分别校验；金额始终 decimal string／BigInt，禁止先 Number 再格式化。
- ObjectInclude.content 是 **Move struct 字段 BCS**；objectBcs 是完整 Object envelope，两者解析器不可互换。
- owner、交易结果和动态字段均按 `$kind` 分支处理；缺 include 的字段不能当数据不存在。
- 新 Balance 的 balance／coinBalance／addressBalance 不能无损伪造为旧 coinObjectCount／lockedBalance；UI 需要的总额按合同定义。
- include.json 可用于展示；质押、NFT capability、gas 判断优先固定类型的 BCS 解码，不以跨传输 JSON 形状一致为前提。
- getObjects 可包含单项 Error；每项错误显式处理，不能缩短数组导致对象错位。
- getCoinMetadata 可返回 null；分开缺元数据、协议不支持与依赖失败。现有 SDK 某些路径吞非取消错误，关键域操作须通过能力探测／typed query 错误检测避免误报空值。
- 不保留一个覆盖全部旧 DTO 的转换层。只保留页面确实需要的 Portfolio、Asset、HistoryRow、StakePosition、ExecutionReceipt 等领域模型。

## 2. 旧方法到具体服务接口

完整对照统一维护在 [JSON-RPC 全量迁移对照表](./08-JSON-RPC全量迁移对照表.md)：**21 个实际使用的线协议方法**逐项列出旧 RPC／SDK、源码位置、承接服务、新 SDK 方法、具体 gRPC RPC／GraphQL 字段及参数／结果差异；另有 **18 个当前 SDK 声明但钱包未调用的方法**单列附录。

该清单覆盖钱包、共享 core、测试、原始 fetch，以及已安装 SDK／Kiosk 的可达间接请求；组合封装不重复算作独立 RPC。`getLatestCheckpointSequenceNumber`、构建器的 gas 价格及 Move 签名请求已纳入。2026-10-02 历史安装快照 1.45.2 与目标源码 2.31.3 的区别也在该对照表标明。

选定路由遵循[端点职责](./03-端点职责与浏览器接入架构.md)：首页和发送币种选择的当前余额走 Fullnode `ListBalances`，与 GraphQL 固定S的组合资产读取分开；复杂索引读走 GraphQL，构建／模拟／执行／近期确认走 Fullnode，指定长期详情走归档。ToAddress、质押、APY、全部名称列表等语义不能由同名新方法直接保证；以[逐项接口边界](./08-JSON-RPC全量迁移对照表.md)及本文第 4～6 节专项为准。新类型和字段由 RTD 当前源码／SDL 核对，不通过旧 JSON-RPC 转发实现新接口。

## 3. 功能近似一致的逐项合同

| 功能 | 当前代表代码 | 目标实现与验收 |
| --- | --- | --- |
| 助记词创建／派生、多账户 | background/accounts、account-sources、accounts pages | 保留加密／派生／导出／锁定；网络迁移不改变地址；Chrome 重启后恢复 |
| 私钥导入、密码恢复、删除账户 | accounts/import/export/forgot-password | 支持原有合法密钥格式；不能因 RPC schema 迁移丢账户或绕过密码 |
| 币列表、总余额、详情 | useGetAllBalances、TokenList、useFormatCoin | 首页／币种选择使用 Fullnode ListBalances 全分页当前资金；GraphQL 固定S组合资产及元数据读取独立，不能把实时资金标为同快照余额；失败不归零，元数据缺失保留原子单位；交易准备仍实时校验 |
| 发送币、gas 估算、预览、回执 | SendTokenForm、PreviewTransfer、background/execution.ts、execution-coordinator.ts、receipt | Fullnode 构建／模拟／执行，新联合结果与失败链回执；pending 可恢复 |
| NFT 展示／详情／隐藏资产 | nfts、nft-details、core/useGetOwnedObjects | type／display／owner、非视觉资产、缺图、冻结／共享所有权、分页无遗漏 |
| NFT 转移、收件人警告 | nft-transfer、recipientWarning | Fullnode 验证当前归属；不得将“无历史交易”视为安全地址；同链地址／名称确认 |
| Kiosk／PersonalKiosk | kiosk-details、findRecipientKiosk、core/useGetKioskContents | 新 Kiosk SDK + RTD 同链 packageIds；cap／动态对象／可转移性；复杂交易仍 Fullnode |
| 历史与详情 | useQueryTransactionsByAddress、account-history-reader.ts、ledger-reader.ts | 区分发送／被影响／领域完整历史，边界标记、分页、迟到索引、归档详情 |
| 质押／赎回／验证者／APY | staking、core/useGetDelegatedStake、useGetValidatorsApy | 组合读全部位置和状态，质押、赎回、跨 epoch 测试；无历史数据时 APY 未知 |
| 名称输入与账户默认名称 | address-input、useAppResolveRtdnsName、name-reader.ts | 展示可固定快照；收件人是新查询，检查 registry／期限／lag 后确认地址 |
| dApp 连接、断开、权限、签名 | Permissions、Transactions、WalletStandardInterface | 保留 origin／account／chain 验证与 modern Wallet Standard；签名在 background |
| 网络选择、自定义网络 | api-env、NetworkEnv、settings | 三入口配置、身份握手、权限确认、切换取消旧请求、dev 重建 |
| 设置、国际化、锁定、通知 | settings、i18n、alarms、background | 功能保持；错误／同步中／未知回执需清楚呈现，不透出底层内部节点地址 |
| 应用目录／浏览器跳转／探索器 | home/apps、地址／交易链接 | 网络配置包含 RTD explorer URL；未知主网不使用 Sui 链浏览器 |
| 法币、推广、外部入口 | banxa 资源、usdc-promo 等 | 与 RPC 替换独立；未经真实 RTD 对接的业务不在发布中宣称可用；保留受控开关与展示合同 |

### 3.1 特殊账户与残留

| 项目 | 源码情况 | 本次建议边界 |
| --- | --- | --- |
| zkLogin | AccountType、登录／prover／epoch 代码存在 | 遵循既定 RTD 不引入该业务的目标，默认关闭创建／成功链路；已有开发数据不静默删除，提示不支持并提供受控处理；不是本次基本功能必验 |
| Qredo | QredoAccount／Signer／connect 页面存在 | 作为可选集成保留隔离接口；需要远程账户和网络映射才能声明可用。若产品要保留其可用性，增加独立验收工作，不在估算中假设远程成功 |
| Ledger 硬件 | 创建流程有 ledger 分支／文案，但 AccountType 与账户 factory 不含 Ledger 实现 | 标注残留并整理；不能宣称已有可保留的完整硬件签名能力。今后引入需单独需求、驱动与设备测试 |

2026-10-03编码落实：ZkLoginAccount现为既有开发记录的只读适配，canSign=false，创建／解锁／签名明确拒绝，isLocked恒为true；不删除账户库、salt／claims／addressSeed或地址标签。UI移除有效OAuth创建按钮并显示不支持提示。旧FromAddress／ToAddress历史探测与登录／prover成功路径已移除；原epoch／入口限制残留已迁移为身份受检gRPC工具并分类，不构成启用zkLogin业务。

本方案的“近似一致”指可核验的现有普通账户钱包功能与界面。所有特殊入口均显式列出，不能用隐藏失败页面冒充迁移完成，也不能扩大为新建上述远程／设备业务。

## 4. 质押与验证者专项：不能遗漏的编码工作

已读本地 `rtd/crates/rtd-json-rpc/src/governance_api.rs` 与 `rtd-types/src/governance.rs`。GraphQL 当前 SDL 没有可直接替换的 `getStakes`／`getValidatorsApy`／`asStakedRtd` 专用根字段；需组合已支持的对象、动态字段和系统数据。

建议在共享 core 新建 `stakingReader`，输出新的 StakePosition／ValidatorView／ApyEstimate，页面不再引用 DelegatedStake 旧 DTO。此工作仍属于钱包领域，不给归档新增治理 gRPC 服务。

### 4.1 持仓与状态算法

1. 固定 GraphQL 会话 checkpoint S、digest 与依赖 availableRange。
2. 完整分页查询 owner 的 `0x3::staking_pool::StakedRtd`；include content，按本地 BCS `id/pool_id/stake_activation_epoch/principal` 解码，检查 owner/type。
3. 从固定S当前0x5版本包装及内层BCS得到epoch、active validators、staking_pool_id和exchange_rates表；inactive pool经inactive_validators表的versioned wrapper读取。Epoch.systemState是epoch起始值，不替代当前系统状态，具体按4.4。
4. 按 pool_id 关联持仓到验证者；所有动态表完整分页，读取 exchange-rate epoch 与 PoolTokenExchangeRate BCS。若 SDK多请求不能固定 S，使用现有原生 GraphQL snapshot 适配扩展，不用“最后一次 epoch 相同”冒充原子快照。
5. activation_epoch 大于快照 epoch 为 Pending；否则为 Active。当前拥有对象列表不含已销毁的赎回仓位，历史赎回从历史事实展示，不把被删对象反推为 Pending。
6. 预估奖励按锁定 Rust 基线：`max(0, round((rate_at_activation / latest_rate - 1) * principal))`，缺 activation rate 的上游默认行为需按基线 BCS默认 rate 处理并独立测试；缺当前 rate 或依赖资料区分未知与实际 0。
7. 请求 epoch 使用 `activation_epoch.saturating_sub(1)`，避免 H0／epoch0 下溢；金融金额采用 bigint／有理数计算并用基线 fixture 对照舍入。
8. 显示激活、pool 不活跃、未绑定验证者、rate 缺失、safe mode 等状态；缺覆盖时报同步中／无法估计，不能制造零奖励或假 APY。

### 4.2 APY 算法与历史

- 同一 snapshot 的 active validators 和 exchange-rate；按 epoch 降序，按 Rust `backfill_rates` 处理 safe mode 缺失 epoch。
- 只使用 stakeSubsidyStartEpoch 之后的有效相邻数据；参考 `calculate_apy` 的 `(rate_e / rate_e_plus1)^365 - 1`，过滤 `0 < apy < 0.1`，取最多 30 个样本平均。
- 校验 rate 的定义、排序与分母；不能把原生余额比例直接当 APY。365 年化口径来自当前链代码；不擅自因为 dev epoch 更短就改成新的业务公式。
- 官网旧函数返回小数，UI再乘 100；避免重复乘 100。有效样本不足、全被过滤、NaN／Infinity 时显示“暂无历史估算”，不要复制上游的非有限值到页面。
- 链 epoch0 只能证明初始化与空样本分支；必须有多 epoch 真实样本或受控同链 dev fixture 才能签认 APY／激活／赎回变化。估算与当前可提取奖励的含义分开标注。

质押与赎回合约调用继续使用同链系统包，签名执行统一遵循合并方案第 05 章。需要测试普通仓位、多个 pool、inactive pool、pool缺失、safe mode补洞、奖励舍入与大额值。域解析器使用新 RPC；旧 Rust 只作为算法基准，发布运行不依赖旧 JSON-RPC。

### 4.3 奖励精度与缺历史的实现边界

2026-10-06完成RPC-11的有限接口验收：S586007／epoch3原测试owner具有非空active仓位，principal1000000000、activation3、version22与精确归档BCS一致，完整4条真实率表及末验通过；同激活epoch的估算奖励0经独立整数公式核验，不是兑付。生产reader的显式BCS夹具以active9998＋inactive2率、200页验证10000策略，10001总数／单表及末页重复均整批拒绝，大整数舍入一致。85定向、当前C19源码保持；生产链网络规模与Chrome完整质押／赎回留给RPC-13／QA，不能把约1.19秒夹具称生产吞吐。详见钱包workLog/20261006-RPC-11-completion.md；下方旧日期的待验收记录保持为历史。

汇率方向为 pool_token_amount／rtd_amount；当前 RTD PoolTokenExchangeRate::rate 在 rtd_amount=0 时返回1，Default 的两个余额都为0。激活期在表最小／最大 epoch 之间缺项时沿用更早的已知率；在范围之外缺项才使用默认率1，不能把 safe mode 补洞扩展到已观察表范围之外。请求epoch对0饱和减一。

奖励按第4.1的有理数公式精确计算，并在非负范围半向上取整。本金、汇率原始 u64、乘积和舍入不经过 Number；这保留算法含义但有意纠正旧 f64 的精度损失。当前 debug Rust 对照中，principal=9007199254740993、activation rate=1、current rate=2/3，旧结果4503599627370496，新精确结果4503599627370497。不能声称与旧 f64 对所有金额逐位相等。缺当前rate、当前ratio分母为零或奖励超出u64分别返回 unknown 原因，不复制旧实现的零、无穷转整数或饱和最大值；实际非正奖励仍返回确定的0。

APY 是非金额比例，遵循固定源码的浮点率／365年化、严格0<apy<0.1筛选与最新最多30个有效样本，输出 fraction 不提前乘100。补洞产生的相邻相同率均会被零收益过滤，故可只遍历已观察变化边界，无需按巨大 epoch 差值分配数组；补贴边界仍作用于补洞后的相邻epoch。少于两个历史点为 insufficient-history，样本全被过滤为 no-valid-samples，不向UI泄漏NaN。未来／重复epoch、非规范u64与超预算表拒绝整批。此算法模块和原生Rust对照只是RPC-11／12的部分实施；同S组合reader按4.4接入，全部质押页面仍须完成。

### 4.4 当前系统快照与完整质押组合读取

固定 [Sui Epoch 源码](https://github.com/MystenLabs/sui/blob/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-indexer-alt-graphql/src/api/types/epoch.rs)及当前 RTD SDL 表明 Epoch.systemState 是 epoch 开始时的值，不能仅因查询嵌套在 checkpoint(S) 就当作当前S系统状态；ValidatorSet／Validator从同一epoch-start来源派生也不补足当前可变字段。当前钱包采用同S对象路径：0x5 RtdSystemState wrapper → u64 version动态字段 → RtdSystemStateInner V1／V2 原生BCS。未知版本、类型、wrapper UID、内部system_state_version不匹配一律拒绝；BCS精确重编码拒绝尾随字节。epoch/reference gas/protocol、safe mode、起始时间／周期、active validators和inactive table均来自该内层值，不拼接另一时点JSON。

退役表字段名是object::ID pool_id，值是validator_wrapper::ValidatorWrapper；进一步按其Versioned UID／u64 version查询Validator（目前明确支持版本1），核对返回pool_id。各pool的exchange_rates整表按BCS声明size核对数量，验证字段名u64、PoolTokenExchangeRate BCS、唯一epoch和非未来值。所有表页包括空但仍推进的页均须完成；单次组合共享20秒预算，active／inactive各最多1000项，汇率总计最多10000项，超预算明确失败。该上限是钱包读取策略，不是链协议人数限制。

owner有值时完整读取同S StakedRtd，核验type／owner／UID及BCS principal／pool／activation；输出新StakePosition，不构造旧DelegatedStake。Pending、Active与active／inactive／unresolved pool分别表达；未关联pool和无有效rate显示unknown，不造零奖励。没有请求owner时positions=null，不把它当空账户。全部子读取和最终H0／S／digest／依赖覆盖末验通过才交付整组WalletStakingView；缓存含完整binding／readSession／snapshot／owner且不持久化，查询失败撤下旧展示。

当前reader及useStakingView已编码，ValidatorLogo／DelegatedAPY已接新模型；全质押页面、Fullnode新鲜系统输入与质押／赎回批准执行仍继续迁移，RPC-10–13保持未完成。当前debug库可解码并原样重编码测试的V1／V2／退役Validator BCS；这一证据不等于真实服务、跨epoch或Chrome通过。

### 4.5 质押／赎回构建与批准边界

2026-10-03 再核对固定 Sui 源码 `c860146823abcedef45a1b5a9c766920be98a29c` 的 `sui_system.move` 214–255 行及当前 RTD `rtd_system.move` 229–300、`staking_pool.move` 157–190、`validator_set.move` 308–324：新增质押入口接受可变系统 wrapper、Coin 和验证者地址；赎回入口接受系统 wrapper 和 StakedRtd，由系统转回调用者。当前 RTD 支持未激活仓位在非 preactive pool 中撤回本金；不能把旧页面仅允许 Active 的状态判断当作协议约束。池映射存在时路由 candidate/active，否则查 inactive；当前能否撤回必须由正式 Fullnode 模拟／执行确定。

构建器必须读取 Fullnode 当前 0x5 wrapper，验证 UID／类型／Shared 所有权／兼容版本，使用实际 initialSharedVersion，不能硬编码 1。赎回必须读取当前 StakedRtd 的类型／UID／BCS／当前账户所有权，使用最新 owned 引用；ConsensusAddressOwner 使用其 startVersion 的 shared 引用。本金保留 u64 十进制字符串，奖励估算不代替实际赎回金额；仓位展示通过 poolId 关联，不能以 URL 验证者参数代替所属池。未知字段不能填 0。

预览保存 Fullnode resolver＋正式模拟产出的最终 bytes／digest／gas，确认仅重模拟同一 bytes；会话变化、模拟失败或 digest 不同必须重新预览授权，不重建／偷换 gas／重发。准备阶段整体 20 秒并支持取消。当前构建器、验证者表单及质押／赎回提交页面已编码和定向验证；页面已接 background journal、固定bytes批准、pending阻断和原摘要恢复，真实链／Chrome 验收仍待完成，不能据此勾选整项 RPC-13。

官方对照：[固定 Sui 系统合约](https://github.com/MystenLabs/sui/blob/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-framework/packages/sui-system/sources/sui_system.move)。证据存于钱包合并目录 `evidence/official/sui-staking-execution-manifest.json`（含本地 RTD 三文件哈希）。

### 4.6 完整质押集合的有界并发（2026-10-08 C109）

C108 实际 Chrome 质押查询出现 TimeoutError，原始网络帧和失败记录保留。C109 先用真实 GraphQLSnapshot／BCS fixture 和相同叶请求时延复现原串行读取累计超时，再在完整确定 active／inactive 集合后，以最多四个逻辑任务读取互不依赖的全部 pool rate 表和可选 owner 的全部 StakedRtd。依赖链 0x5→当前内层→完整 inactive wrapper 仍按顺序执行；提前校验重复 pool／active 地址、commission、activation／deactivation 和声明 rate 总量，结果按原集合顺序组装。

原20秒总期限、每个表完整分页及叶读取末验、四个物理读取名额、1000／10000 上限、BCS／数量／epoch／owner 校验、精确 APY／奖励和最终 H0／S／digest／覆盖复核全部保留。新增组合专属取消 scope：任一读取失败或调用／会话取消后中止本组合 siblings，停止启动排队任务，拒绝部分或迟到结果，不关闭其它会话。该调度是客户端实现选择，不是 Sui 协议规定。先通过两个 reader 的原回归、受控时延／并发／取消测试、TypeScript 与独立 production 构建，再以新自有网关检验真实页面和完整 worker／consumer 三服务流量；单测或构建通过不能宣称 C108 实机超时已修复或完成 REL-02。

## 5. 账户历史专项

历史已撤销的 archiveAccountHistory.ts 设计查询 `accountHistory(...)`，含 snapshot／totalTransactions／registrationComplete／allAccountActivityCertified 等扩展旗标；它不是官方原生 GraphQL 的一部分。历史已撤销的余额、对象、动态字段和名称 archive 适配主要使用原生 GraphQL；本轮按第8节重新实现，不能把全部 archive* 文件都当扩展服务。

建议保留两个显式入口：

| 视图 | 数据源 | 宣称的含义 |
| --- | --- | --- |
| 发送记录／某类事件 | 原生 GraphQL listTransactions/listEvents | 仅已声明筛选范围内完整；sender 与收款方不等价 |
| 账户收支／Kiosk 等已有领域历史 | 可选 accountHistoryUrl 扩展 | 仅证书旗标真实覆盖的注册 Kiosk／发现 token／capability 范围 |
| 详情与证据 | 同 digest 归档 Ledger，必要时 GraphQL 补充显示 | 事实与选择器一致，不复用另一个端点的分页 cursor |

内置完整网络必须配置并验收现有账户历史功能；自定义只有 Fullnode 的网络显示历史能力受限，不用旧 RPC补齐。`allAccountActivityCertified=false`／null、未完成注册或新类型未发现时，必须展示覆盖限制。

迁移时保留已有分页失败关闭：chain、地址、窗口、snapshot、总量、去重、顺序和 continuation 全部通过，才写入新页和 cursor。旧环境变量中固定 checkpointHi 的配置不能持续代表最新完整历史；新会话先读取覆盖确定窗口，刷新开启新窗口。

## 6. Kiosk、名称与展示的合同

- KioskClient 接收 ClientWithCoreApi，新 SDK 改造 shared core 类型；同链 kiosk／personal kiosk 包 ID 由 profile 管理。默认 SDK testnet 常量和 MVR 远端不是 RTD部署证据。
- portable Core getObject 没有任意历史 checkpoint 选择器；精确历史对象用 raw Ledger version 或 GraphQL atCheckpoint，不向 SDK普通参数塞未声明字段。
- 默认反向名只表示一个名称，不等价全部名称列表。业务若未来确需全名列表，应另加自定义索引，而不是重接旧 RPC。
- 收款名称必须采用新读取会话、过期校验、索引 lag 策略和最终地址确认；现有 `fetchArchiveDefaultName` 明确只供展示，不能复用其旧 snapshot 授权新转账。
- 交易内事件／objectTypes 的 GraphQL SDK查询有 first:50；需要完整事实时走 Ledger 或 raw GraphQL完整分页。不能由显示 50 个事件推断完整账户收支。

### 6.1 同快照资产与 Kiosk 解码细则

完整WalletAssetReader内部的余额、元数据、拥有对象、NFT点查和动态字段共用Provider准入的同一S／digest／会话proof。每次重新准入产生独立缓存键，即使S没有前进也不能复用旧会话成功；准入失败撤下该完整资产领域数据，分页到终页并重验覆盖后才交付完整列表。页面useCoinMetadata与useGetAllBalances分别按下文2026-10-05独立领域合同取得自己的S／proof，不依赖完整资产的Display准入；metadata或余额自己的失败撤下其数据及proof，不同领域结果不能拼接宣称同一资产快照。`configured`仍仅表示配置成立，链、schema、package和执行能力须分别核验。

币种元数据只有明确 null 才表示不存在；缺字段、partial data 和依赖错误保留失败。展示缺元数据时只能显示原子单位，转账／质押不能把未知 decimals 默认成 0；链返回的真实 decimals=0 有效。原子金额使用 bigint 或十进制整数串，已超出安全整数范围的 Number 必须拒绝。品牌覆盖只修改标签／图标，不得覆盖 decimals。Display v2 的结构值不能直接作为 React 文本或 URL，单字段渲染错误也不得冒充有效文本。

动态名称支持 primitive、vector 和 struct，保留 name BCS。普通 `dynamicField` 与 `dynamicObjectField` 使用各自的原生选择器；动态对象的包装字段 ID 按 `Wrapper<Name>` 派生，与 child ID 分开核验。按 `rtd-framework/sources/dynamic_object_field.move` 的 `add_impl`，child 实际加入包装字段 UID 下，因此对象 owner 应与派生 field ID 比较，不能直接与 Kiosk ID 比较。该关系与 [Sui 动态字段官方说明](https://docs.sui.io/develop/objects/dynamic-fields)及本地 Move 源码共同核对。

framework／PersonalKiosk 读取必须核验完整 caps 分页、cap UID、BCS 精确重编码（拒绝尾随字节）、Kiosk 类型／UID／item_count、完整 Item／Listing／Lock、child ID／type／BCS／owner、所有批量对象位置及最终 proof。Listing 的 u64 price、profits 保留整数串；锁和上架状态不得从缺数据推断为 false。PersonalKioskCap 中 cap=None 不能证明可控制 Kiosk；未知／自定义 package 未验明 ABI 不得套用默认 Sui 布局。

OriginByte 是独立合约分支，不由 framework reader 冒充完整支持。已固定读取 [Origin-Byte/protocol 源码](https://github.com/Origin-Byte/protocol/blob/e8e8efd77ab15d7b2cf30958fd748dbb3afbdaab/contracts/kiosk/sources/kiosk/ob_kiosk.move)：OwnerToken 包含 id／kiosk／owner；此版本不能证明旧钱包配置的 package 或旧 p2p 方法 ABI。必须绑定 RTD 同链实际部署的发现包与执行包、逐项探测 layout／函数／权限后迁移；不能因名字相同混用两个历史 package ID，也不能默默删掉既有分支。RPC-22／RPC-23 在完整页面、交易和该分支迁移前保持未完成。

### 6.2 发送 coin 的 Fullnode 原生读取合同

发送前的 coin 对象独立从 Fullnode StateService.ListOwnedObjects 读取，精确筛选 `0x2::coin::Coin<T>`，read mask 显式请求 object_id、version、digest、owner、object_type、balance；GraphQL 资产快照中的 coin 不能充当新鲜发送引用。钱包返回现代 `Coin` 的 objectId／type／owner 联合类型；不恢复旧 coinObjectId／coinType DTO，也不设置旧 JSON-RPC fallback。该领域接口只释放读取能力，不释放执行客户端或承诺交易 ready。

一次完整扫描共用取消信号和总 deadline（默认10秒，最大60秒），默认最多256页／10000对象。只有 next_page_token 缺失才是终页；空页仍有推进 token 时继续扫描，空 token、重复 token／对象或超预算全批拒绝，禁止返回已收集的部分余额。每个对象的 ID、32字节 base58 digest、u64 version／balance、完整 Coin<T> 类型与指定地址所有权都必须成立；缺字段不能默认为零。AddressOwner 与 ConsensusAddressOwner 分开，后者保留 startVersion；普通 gas payment 不能把共识对象伪装为 address-owned reference。

扫描前及终页再次核验 GetServiceInfo 的完整 H0、checkpoint 水位和保留下界；错链、缺水位或退高拒绝交付。网络会话关闭或调用方取消后，即使传输忽略取消也拒绝迟到结果。TanStack key 包含完整 binding、独立 readSession、owner 和 coinType，即时过期、不持久化、不自动重试。该检查不把 live 分页变成固定 checkpoint 快照；交易最终构建／正式模拟仍须校验新鲜版本并遵循第05章的最终 bytes、授权与 journal 合同。

发送表单将查询失败展示为错误，不当作零余额；coin 排序与金额使用 bigint／精确十进制运算。交易参数使用完整已读取的引用，共识持有 token 使用 shared startVersion；不舍入超精度金额，不把非法金额改为零。执行结果错误后禁止自动重新构建、签名和发送，未知结果只能交给原摘要恢复协调器处理。

权威对照：[Sui Core API](https://sdk.mystenlabs.com/sui/clients/core) 的现代 Coin／owner／取消合同与短扫描页说明；实现 ABI 以已冻结的本地 rtd-typescript 2.31.3 和当前 rtd 的 StateService 源码为准。此小节规定编码合同，不证明完整 Fullnode 构建器、持久恢复或真实链试用已通过。

### 6.3 名称 registry、有效期与发送目标

名称包和 forward／reverse registry 必须显式绑定 NetworkProfile。当前 RTD `rtd-rpc-api/src/grpc/v2/name_service.rs` 的 NameService 只使用内置 mainnet／testnet 配置，Unknown 链返回 Unimplemented，不能把 dev profile 的自定义 registry 当作服务已支持。钱包使用原生 GraphQL `checkpoint(S).query.address.dynamicField` 读取显式 registry，核对派生字段 ID、name 类型／BCS、value 类型和 BCS 精确重编码，不调用旧 JSON-RPC。没有配置时拒绝名称解析。

收款解析每次重新准入查询，不复用资产展示旧 S。2026-10-11 C277依据真实联调修正此前自行设置的“初始S必须追上Fullnode、结束不超过S+20”条件：正常索引延迟本身不证明名称记录已陈旧，也不能证明名称仍有效。名称相关 Query.checkpoints／Query.object／Address.dynamicField／MoveObject.contents 仍须共同覆盖同一 S，读取末尾仍完整 revalidate；随后用当前 Fullnode 无version的 Ledger.GetObject 核对本次实际用到的全部正向／反向／祖先字段，以及明确缺失的字段。每个对象都须通过完整H0、规范Object BCS／摘要／UID／owner核验；派生field ID、动态Field类型、父owner以及完整 `UID + name BCS + value BCS` 须与索引读取逐字一致，缺失则须当前NOT_FOUND。新增、删除、变更、错误类型／owner／BCS或核验失败都拒绝结果，不当作名称不存在，不自动回退旧RPC。

另读当前Fullnode 0x6 Clock，与同S时钟和本次单调经过时间一起确定保守过期时点；当前链时钟低于快照时钟、最终Fullnode高度低于开始高度或快照S均拒绝。默认20秒总取消预算不变；核对对象以最多4个并行请求复用现有身份队列，无跨次成功缓存。这里是逐对象当前一致性核对，不声称跨服务原子快照、quorum证明，或解析后名称永不改变。构建前／签名前的新解析和已批准收款地址核对继续保留。

权威依据：[Sui官方SuiNS集成说明](https://www.docs.sui.io/sui-stack/suins/developer)规定GraphQL名称与默认反向入口；[固定官方gRPC NameService源码](https://raw.githubusercontent.com/MystenLabs/sui/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-rpc-api/src/grpc/v2/name_service.rs)从当前对象记录和最新链时间解析，并对反向名再核对正向目标，没有要求GraphQL零落后。RTD当前同名源码保持该语义且Unknown链仍不支持内置registry。C277因此继续显式registry的GraphQL解析，增加已具备的Fullnode对象核对，未将Unknown链的NameService标为可用。此为钱包查询策略修复，不把历史脏数据或链端缺陷当作原因。

Domain labels 按链上顺序（TLD 在前）编码，支持 dot／星号／@ 格式，遵守 ASCII 小写、63 字符 label、200 字符输入、分隔符规则，钱包仅接受 RTD TLD。NameRecord 保留 registration NFT／expiration u64／target option／VecMap BCS；期限为 0 的叶子逐级核对同一注册 NFT，找到最近非叶子祖先的期限，缺失、失配、无有效祖先或到期不能返回收款地址。期限与同 S 及当前 Fullnode 的 `0x6` 对象（`0x2::clock::Clock`）数据分别加本次单调经过时间，采用两者更晚的保守时点比较；有效期等于链时间本身遵循 Rust 的 `<` 过期边界，本次经过时间会保守缩短可用期。

固定 [Sui name-service 源码](https://github.com/MystenLabs/sui/blob/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-name-service/src/lib.rs)与 [GraphQL NameRecord 源码](https://github.com/MystenLabs/sui/blob/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-indexer-alt-graphql/src/api/types/name_record.rs)确认叶子与祖先关系。这个版本的反向 resolver 使用 `scope.without_root_bound()`，且 `by_address` 本身没有核对最终 target 等于请求 address；不能直接把 defaultNameRecord 当作同快照收款授权。钱包反向字段、正向字段及 Clock 全部固定同 S，额外核对正向 target 回到请求地址；只展示一个默认名，不冒充全名列表。官方读取文件和哈希保存在 evidence/official/sui-name-service-manifest.json。

默认名称展示使用独立 binding／readSession 缓存键，禁止持久化；刷新失败或最多 20 秒／链有效期中的较短期限到达时撤下名称，TTL 仅用于当前浏览器显示，不作为持久授权。输入校验移除旧的一分钟布尔缓存。代币转账记录原始名称与已确认地址，构建前和签名前新解析均须匹配绑定、会话及批准目标；改变、过期、缺失或网络失败均要求新预览，不能改写已批准 bytes。NFT 同样核对解析后的 sender／object 排除规则；直接持有及原生 Kiosk 的批准与执行遵循6.5，其他合约分支仍由对应任务实施。实际 registry ABI／同链部署探测、Chrome、改名与续费场景尚待实链验收，本段不得当作已试用证明。

### 6.4 NFT 页面、收件人检查与当前对象的合同

NFT 列表基于同一准入 S 的完整 ownedObjects 集合再做本地 includeTypes／excludeTypes 筛选；空扫描页继续，全集合准入和末验之前不显示部分页面。视觉、非视觉、隐藏三个展示组互斥：隐藏 ID 不提前丢弃，也不重复落入非视觉组；无 Display 的受控 Buy-N-Large 特色类型可优先展示。隐藏资产逐项 Error 保留对应 ID／位置并提示读取失败，查询失败或缺项不能展示“没有资产”。现代对象直接使用 objectId／type／content BCS／json／Display.output，不重建旧 data/content.fields DTO；json 只用于属性展示，Display 的结构值和失败字段不充当字符串。隐藏偏好存储的历史作用域迁移仍按 NET-12／QA-A22 单独完成，不能把本次读取迁移记作已验证持久化升级。

详情持有关系按规范化 AddressOwner 或 ConsensusAddressOwner 判断；ObjectOwner、Shared、Immutable 不冒充当前账户。Kiosk 中的对象必须经同 S 的账户 cap、Kiosk、完整 Item 与包装 field ID／child owner 关系证明；framework／PersonalKiosk 整组读取共享默认20秒总取消预算。直接持有对象不依赖 Kiosk 页面加载，无 objectId 不产生永久 loading。RPC-22 的 OriginByte／执行 ABI 与全部转移分支仍未完成；页面所有权快照不是签名授权或新鲜发送引用。

[Sui 原生对象协议](https://github.com/MystenLabs/ts-sdks/blob/3c32c302625c7d4c63cd89597c34b86bcccdbcea/packages/sui/src/grpc/proto/sui/rpc/v2/object.ts)和固定 [Object 源码](https://github.com/MystenLabs/sui/blob/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-types/src/object.rs)表明 has_public_transfer 是过时存储字段，执行时从类型判定能力。页面可把明确 true 当保守入口提示，但不能以它、hasPublicTransfer=null 或 JSON 字段代替 Fullnode 新鲜输入解析、类型能力与最终正式模拟。PersonalKioskCap 的包装布局由 [Sui Kiosk 官方资料](https://sdk.mystenlabs.com/kiosk)及相应 Move 源码核对；[framework take](https://github.com/MystenLabs/sui/blob/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-framework/packages/sui-framework/sources/kiosk/kiosk.move)还校验持有权与锁，不能靠界面 bool 绕过。固定原文与哈希在 evidence/official/sui-nft-object-manifest.json。

收件人当前对象只通过 Fullnode LedgerService.GetObject（省略 version）读取，不请求归档历史版本。显式 mask 请求完整 object BCS、引用、owner、type、内容、previous_transaction 与能力提示；操作默认10秒，开始／结束都验证完整 H0 与合法水位并拒绝退高。对象 BCS 精确重编码，Object:: 原生摘要、ID／UID、version、owner 联合布局、Move 类型／内容和 previous_transaction 与 wire 字段必须一致；package 地址同样属于对象，不能当成普通收款账户。当前单对象 BCS 预算1 MiB，超过或当前 SDK 不能解码的 Party／优化 accumulator 等布局保留未知，绝不当不存在。只有实际 gRPC NOT_FOUND 且末验通过才返回当前无对象；成功缺对象、缺字段、超时、取消、错链和其它状态都是失败。本实现的 BCS／摘要一致性不声称共识 quorum 证明。

地址风险检查先做上述当前对象读取，有对象即提示；当前无对象后，才查询独立 accountHistory 的完整支持窗口。原生 sender/affected 列表的一页不能证明账户没有交易，空历史只能描述 checkpointLo–checkpointHi 内未发现受支持活动，保留原覆盖旗标。未知、有限覆盖、无活动、有活动及仅地址／名称格式通过均不宣称收款安全；收件人最终地址和执行授权另按 05／名称合同校验。query key 含完整 binding／readSession／规范化地址，禁持久化、不自动重试，整组默认20秒，取消或绑定失配不交付警告结果。

本批 NFT／Kiosk 查询页面与地址风险入口已接新领域 reader；NFT 执行、OriginByte、隐藏偏好持久化升级、完整 bundle 与 Chrome／实链验收仍按 Task 推进。定向 React、SDL、binary gRPC-Web 以及当前 debug Rust 8组对象 BCS／摘要向量只能证明各自范围，不能提前勾完 RPC-01／02／03／22／23。

### 6.5 NFT 转出、原生 Kiosk 命令与批准字节

直接持有 NFT 在 Fullnode 当前对象读取后核对 ID、type 与发送者所有权。AddressOwner 输入固定当前 version／digest；ConsensusAddressOwner 必须用 shared startVersion，不能伪装成 ImmOrOwnedObject。has_public_transfer 只用于保守入口提示；实际类型能力和当前规则必须通过 Fullnode 新鲜解析与 checks-enabled 正式模拟。

framework／PersonalKiosk 的准入快照仅用于发现账户 cap 与 item，不能直接提供可签名输入。再次从 Fullnode 获取 item、cap、Kiosk，核对 cap 当前持有人、BCS／UID、cap 指向和 personal 类型、item 的 dynamic_object_field::Wrapper<kiosk::Item> 派生 owner、Kiosk 类型／BCS／所有权。cap 使用当前引用（共识持有保留 startVersion），shared Kiosk 使用 initialSharedVersion。整次准备共享20秒取消预算，结束时拒绝跨会话或迟到结果。

[官方 SDK 转出文档](https://sdk.mystenlabs.com/kiosk/kiosk-client/kiosk-transaction/managing)规定 take／transfer 和 finalize；实际准入规则以固定 [framework kiosk.move](https://github.com/MystenLabs/sui/blob/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-framework/packages/sui-framework/sources/kiosk/kiosk.move)及当前 RTD Move 源码为准：普通挂牌可 take（会移除普通 Listing），锁定或独占挂牌拒绝；不能将旧 SDK “未挂牌”注释扩大为所有挂牌一律禁止。PersonalKiosk 先 borrow_val，使用返回 cap 执行 take／TransferObjects，最后 return_val 归还 cap 和 Borrow。钱包以显式 profile package 构建现代 Transaction，命令图及输入与本地 rtd-kiosk 1.4.13 的真实 KioskTransaction 对照一致；不创建具有网络默认值的执行客户端，不执行 MVR 或隐式 Sui 包查询。这个 SDK 对照是受控构建证据，不是链上部署 ABI 已验证的证明。

页面先检查账户 pending，再允许准备；展示对象 ID、最终地址（保留原名称）、gas 预算和 digest，确认前只重新解析名称并模拟同一 bytes。对象／账户／完整 binding／readSession 改变就撤销旧预览，旧异步结果不能继续 dispatch。进入 background 后使用统一 Intent、签名验证、durable journal、互斥和一次提交；响应中断也必须先恢复原摘要。pending 界面不能重新准备或发送；恢复为失败终态同样进入真实回执。预览不是一次签名授权可复用于新 bytes 的通行证。

OriginByte 仍需独立证明实际 RTD 发现包／执行包与 p2p ABI，不能套用 framework take；目前未证明的 ObjectOwner 明示不支持，旧 OriginByte 源码保留待迁移，不回退旧 RPC。RPC-22、全部 TX 任务及可试用门槛保持未完成，必须补齐该分支、真实 debug 链／Chrome／合约探测验收。

## 7. 修改范围与清理门槛

现行核心路径：wallet 的 shared/rpc 领域 reader／session／journal／coordinator、background/execution 与 dApp 授权、WalletStandardInterface、余额／coin／history／receipt／recipient／stake Hook；共享 core 的 client Hook、类型、Kiosk、名称、治理与 GraphQL adapters；package.json、锁文件、manifest／Webpack、测试 demo dApp。

共享 core 还有其他应用消费者。实施前做 import／export 依赖图，避免钱包改造使 explorer 等消费者无法构建；优先按域显式注入新接口，旧调用迁移为独立影响清单，不要求无关产品功能重写。类型隔离不能成为保留钱包旧 RPC 的借口。

发布门槛：生产 bundle 中没有 JSON-RPC请求器／旧 dApp Kit，也没有旧业务 fallback；全功能矩阵逐项有 Chrome／同链事实证据。源码中残留名称或测试 DTO 可以做例外列表，但必须证明不进入发布路径。

## 8. 独立账户历史 reader 与活动页的编码合同

WalletAccountHistoryReader 只使用 profile.accountHistoryUrl 上明确的 accountHistoryCoverage／accountHistory 扩展；它不是官方原生 GraphQL，不把 sender 或 affectedAddress 集合冒充完整账户收支。每次刷新先读取当前覆盖，而不是固化环境变量中的 checkpointHi。Fullnode-only 或未配置历史扩展的自定义网络显示能力不可用，不调用旧 RPC 补齐。

先核验扩展完整 chainId、UInt53 整数窗口及边界 digest，再使用同链原生 GraphQL 的 checkpoint 0 和固定 checkpointHi 核验 H0／边界，并复验 Query.checkpoint、Query.transactions(affectedAddress／affectedObject)、Query.object、TransactionEffects.objectChanges、Address.objects(type) 六项覆盖。GraphQLSnapshot 新的固定 window 合同要求整个 [lo,hi] 在准入和末验时仍可读，仅 hi 可读不足以接纳完整历史。新发布上界可前进，查询仍固定原窗口／边界，下界漂移拒绝。

页面请求使用同一 H0／地址／窗口／limit，校验 64 字符十六进制 snapshot、总量、无重复 digest、checkpoint 降序且同 checkpoint 按 digest 字典序、游标唯一性及终止关系。扩展游标是不透明的服务签名令牌，浏览器不持有 HMAC 秘钥，也不声称已独立验签。每页必须返回规定的完整性旗标，跨页不能改变；非末页必须满足 limit 并有新 cursor，末页 cursor=null 且累积条数精确等于 totalTransactions。仅当全部页及末验成功才提交结果；默认 limit=20、最多100页、整组20秒预算，上限60秒，超限／缺字段／partial response 均不能提交截断前缀或空集合。

每条保留原生 transactionJson／effectsJson、独立 transactionBcs／effectsBcs、完整 eventFacts 与可空 kioskTransfers。native JSON 按当前 proto 解析，交易 BCS 重算 digest、TransactionEffects:: typed digest／状态／epoch／gas、checkpoint／sender、金额 i128、事件顺序／sender／模块／StructTag／内容 BCS 和整组 eventsDigest 一致才接纳；JSON 的事件内容是展示补充，不能替代 BCS。显示日期截取毫秒，原文纳秒保留。系统交易保留 null sender、原生 kind／事实与 BCS，不借 SDK 仅支持 PTB 的构建器制造一笔伪普通交易；系统原生 payload 不作为可执行用户交易输入。

历史 facts 没有提供用户签名，不能写确认 journal、否定 pending 或触发重发。注册／发现范围与整页数量完整性分开：completeForRegisteredKiosks 必须成立，其它可空旗标原样保留，不能升级 allAccountActivityCertified／allAccountTransfersCertified。当前服务明确不证明账户全集；活动页展示窗口及覆盖限制，空集合只表述该窗口内受支持活动未发现。普通活动默认标为交易并展示真实 sender，不能由 sender≠自己或等额相反余额推断收款／对手方；当前账户质押类型只由完整原生事件 BCS 识别。

useQueryTransactionsByAddress 与 TransactionCard 已改为现代 WalletAccountHistory／WalletHistoryTransaction；query key 含完整 profile binding、独立 readSession 和地址，禁止持久化，错误显示不可用，切网迟到拒绝。该编码与受控 SDK／SDL／React 验证不等于真实 Chrome、同链扩展服务或 Kiosk 转移分类实链验收。

[Sui 官方 GraphQL 查询规范](https://docs.sui.io/develop/accessing-data/graphql/query-with-graphql)以及固定 c860146823abcedef45a1b5a9c766920be98a29c 的 TransactionFilter／SDL 是原生筛选与快照对标；账户扩展、分页排序和证书范围以当前 rtd-archive-service/modules/account-activity 为主。来源与 SHA 见合并目录 evidence/official/sui-ledger-history-manifest.json、sui-snapshot-manifest.json 及 evidence/account-history-schema.graphql.txt。


### 隐藏资产偏好隔离（2026-10-03补充）

钱包隐藏偏好使用版本2的独立持久键，按完整H0、generation及规范化账户地址隔离，不按可变化的endpoint／profile revision切分。profile提供的偏好作用域仅标识本地数据，不是实时身份校验成功的证明。原全局hidden-asset-ids缺少链和账户来源，保持原样，不自动套入当前账户；当前账户重新选择隐藏项后写入新键。

隐藏／显示与撤销使用IndexedDB原子read-modify-write，只修改目标ID，持久提交后更新UI。初次读取完成前不挂载资产子树；损坏或读失败明示并支持重试，不当作空列表。切换作用域通过重挂载隔离旧数据和迟到操作；跨窗口通过BroadcastChannel提示重新读取，窗口聚焦时也刷新。此前toast的撤销动作在作用域退出后失效。读取失败不覆写旧记录。

18项定向测试、完整TypeScript检查及Chromium153双标签页原生IndexedDB并发／刷新证据见钱包workLog/20261003-NET-12-hidden-preferences.md。该证据不是扩展UI实际隐藏操作或整个NET-12缓存升级验收；NET-12、RPC-03及QA-A22保持未完成。


### OriginByte 显式双包绑定与发现（2026-10-03补充）

重新核对固定版本[OriginByte官方源码](https://github.com/Origin-Byte/protocol/blob/e8e8efd77ab15d7b2cf30958fd748dbb3afbdaab/contracts/kiosk/sources/kiosk/ob_kiosk.move)：OwnerToken的id／kiosk／owner只用于链外发现，不是KioskOwnerCap；p2p转移检查Kiosk权限、版本和内部NFT登记。不能把此token塞入framework take的cap参数。

NetworkProfile增加可选packages.originByte，必须同时显式给出discoveryPackage和executionPackage，独立规范化、冻结并纳入网络绑定。两者分别表示类型起源包与调用包，不根据旧地址或网络标签推测升级关系。未配置此分支时保持既有绑定格式，避免无关配置升级使原journal绑定失效；同链执行锁不因包配置变化分裂。

新originbyte-kiosk模块严格校验OwnerToken的完整BCS、UID、owner字段与外层账户所有权。同一WalletAssetReader读取账户全集与对应framework Kiosk，拒绝重复token／错误对象类型／非Shared／UID或Kiosk owner不符，最后重新验证快照。返回kind=originbyte-discovery而非OwnerCap。该模块仍需接入完整Item／扩展登记读取、页面、受控ABI与p2p交易；当前只完成独立发现基础，不宣称OriginByte可执行，RPC-22仍未完成。测试与限制见钱包workLog/20261003-RPC-22-originbyte-discovery.md。


### OriginByte 内容读取接入（2026-10-03补充）

WalletAssetReader.kiosks统一组合原生／PersonalKiosk与显式配置的OriginByte，组合末尾重新验证S并拒绝重复Kiosk ID；页面hook与OwnerToken分组已接入该入口。原生Item、Listing、Lock、字段包装父子归属与完整对象BCS校验提取为共享读取函数，OriginByte不再使用旧JSON-RPC hooks。

OriginByte额外验证固定源码v3的VersionDfKey、内嵌KioskOwnerCapDfKey指向、NftRefsDfKey Table及完整登记行。表大小、ID、对应Item、auths唯一性和独占登记均校验；未登记的基础Item仍展示，但明确originByteRegistered=false，不能冒充可转移。OriginByte独占状态与原生Listing分开保留。当前RTD Move编译器对空结构Pack插入LdFalse，动态字段空key按dummy_field=false的BCS验证，不能用测试夹具推测为true。

该批接通内容与页面查询，不包含OriginByte p2p准备／执行、历史其他layout适配、真实RTD部署和Chrome验收。细节与测试证据见钱包workLog/20261003-RPC-22-originbyte-contents.md，RPC-22继续未完成。


### OriginByte P2P交易准备接入（2026-10-03补充）

NFT准备统一使用同S的kiosks发现；OriginByte分支要求已登记且非独占／未锁定，随后重新读取Fullnode当前OwnerToken、源Shared Kiosk及NFT包装父对象关系。OwnerToken仅复核发现关联，不作为交易cap输入。源／目标Kiosk均核对当前UID、owner、扩展开启及初始共享版本。

收款方仍在同一准入S发现：存在OriginByte Kiosk时按ID稳定排序选首个，读取新鲜目标对象并调用显式executionPackage::ob_kiosk::p2p_transfer；无目标时调用p2p_transfer_and_create_target_kiosk。仅“成功准入且确实无目标”可走创建路径；查询错误、快照不一致或模拟失败不得回退创建或换目标。目标存入限制由最终正式模拟和链上合约判断，不因失败自动绕过。

准备结果route为originbyte-kiosk，沿既有固定bytes预览、后台授权签名、正式模拟、journal一次提交及原摘要恢复流程。此处接通编码，不证明配置包与固定源码的实际RTD ABI一致；受控合约部署、历史其他layout、真实Chrome／链上执行仍必须验收，RPC-22保持未完成。见钱包workLog/20261003-RPC-22-originbyte-transfer.md。


## 正式模拟外层摘要的官方契约校正（2026-10-03）

固定Sui源码[c860146 simulate/mod.rs](https://github.com/MystenLabs/sui/blob/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-rpc-api/src/grpc/v2/transaction_execution_service/simulate/mod.rs#L226-L275)及当前RTD对应实现都创建默认ExecutedTransaction并填入transaction/effects等字段，未填外层digest。真实debug链已复现，因此不能把模拟缺少该冗余字段视作协议损坏。钱包仅在validateFinalSimulation入口、该字段undefined时从最终原始TransactionData字节推导并补给SDK解析器；显式错误或空摘要仍拒绝。transaction BCS必须与输入完全相同，effects.transactionDigest和原生effects BCS中的transactionDigest仍必须等于本地摘要，并核对状态及其余已有一致性约束。历史已执行交易仍用严格校验，不放松其必需摘要。模拟结果与本地摘要不构成已提交或共识确认凭据。

受控部署同样使用checks=ENABLED、doGasSelection=false的原始字节模拟；签名及发送前独占持久保存bytes、signature、digest和expiration，超时只能围绕原记录查询恢复，不能盲重发。CLI serialized-tx会重建TransactionData，不能用作原始最终bytes模拟。部署需按真实模拟结果配置gas预算；模拟失败不签名不广播。钱包定向60项及完整类型检查通过；此次真实合约发布证明低层模拟可用，尚不能替代钱包完整准备链、扩展批准和用户试用验收。


## 受控部署ABI与P2P实链证据（2026-10-03）

指定合约仓库受控NFT fixture与OriginByte五包已在独立当前debug链部署，H0及generation绑定的完整包／地址清单见钱包evidence/20261003-wallet-fixture-manifest.json。已发布包描述确认p2p_transfer与p2p_transfer_and_create_target_kiosk为private entry，泛型key+store，参数分别为源Kiosk／目标Kiosk或address／NFT ID／隐式TxContext；不能因visibility不是public禁止合法PTB entry调用。两条直接SDK构建的受控交易均实际成功，随后实际WalletFullnodeReader／原生BCS／OwnerToken与动态字段wrapper派生核对最终归属。该证据覆盖此受控部署ABI和执行，不覆盖未知历史包布局或GraphQL发现、完整钱包准备链及Chrome批准恢复。ENV-03完成，RPC-22继续验收。


## 持久归档支持的实际钱包快照验证（2026-10-03）

新链不能复用旧HBase的logical instance作为隔离边界：当前网关最终按表名寻址，独立链必须物理隔离存储或另行实现真实命名空间合同。本批使用独立project／卷／HBase／MinIO，当前源码debug写入器从创世摄取。GraphQL连接同H0持久Ledger后创世和head digest均可读，实际WalletAssetReader共同快照及末验、ownedObjects／balances／OriginByte内容读取在checkpoint36504通过。证据为钱包workLog/20261003-persistent-archive-graphql-assets.md；仅证明该固定快照路径，不放宽准入，不代表浏览器桥接、可信发布门禁、accountHistory或Chrome执行验收已通过。

## 2026-10-03 批量对象的实际请求预算修正

独立debug链实测原40项批次的GraphQL完整请求为5187字节，超过默认5000字节并返回GRAPHQL_VALIDATION_FAILED。不能只依据maxMultiGetSize决定批次；证明字段、完整32字节地址、查询文本和variables均计入请求体。[官方Sui固定版本config.rs](https://github.com/MystenLabs/sui/blob/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-indexer-alt-graphql/src/config.rs#L644)与当前RTD配置均默认max_query_payload_size=5000，且这是与max_multi_get_size独立的限制。

钱包资产对象批次改为20项，保持同一已准入快照、逐项ID核验、null到notFound的原位置映射及末尾复验。43输入含重复ID与两个已删除对象槽位在真实GraphQL成功跨三批返回；新增回归校验完整序列化请求不超过5000字节。服务若配置更小限制仍显式拒绝，不将失败转换成对象不存在；不自动重试改查询语义。76项对象／Kiosk相关测试与完整类型检查通过。这不代表历史指定版本批量或Chrome验收已完成。

## 2026-10-03 指定历史版本对象reader基础

钱包新增独立WalletArchiveObjectReader，明确选择器objectId＋规范u64版本，拒绝缺省／latest／不规范或溢出版本。单个读取复用同一批量路径，20项分批、1000项总量和20秒总预算；仅归档Ledger.GetServiceInfo／BatchGetObjects可达，不暴露State／Execution／MVR。

查询前后验证完整H0和对象保留下界／头部水位，拒绝头部回退与读取期间保留下界变化。每项完整Object BCS按原生摘要规则重算，并核对owner／类型／内容／previousTransaction及选择器ID与版本。成功项不能替换成最新版本；逐项gRPC错误保留规范ID、版本和code，不丢弃槽位。批量传输错误、缺槽位、空oneof、坏BCS或版本错配拒收整批。归档返回的覆盖水位不等于指定对象的创建checkpoint，也不等于缺失对象的不存在证明；不伪造min-checkpoint或可信发布头。

46项相关定向和完整类型检查通过。此reader尚未接入历史详情消费者和经过发布门禁的浏览器入口，不能作为当前交易输入来源，也不能据此勾选RPC-02／RPC-19或ENV验收。

## 2026-10-03 历史对象消费者接入

WalletRpcProvider现按明确archive配置提供readHistoricalObjects能力，GraphQL资产快照未准入不阻止独立归档只读能力；未配置时不猜测入口。收据ObjectEffects从已验证原生effects BCS保留输出对象摘要，ObjectWrite／PackageWrite只有完整ID／版本／摘要时才出现历史对象查询入口。删除／包装消失／非实体余额写入不推导版本。

用户查询后，受限reader先校验原生Object，再由页面消费者将ID／版本／摘要与该条交易effects逐项核对；错链、错槽位、错版本／摘要及逐项错误均不展示成功。查询key包含binding／read session／ID／版本／摘要，不持久化缓存；取消后不接纳迟到结果；失败提示暂不可核验并支持用户只读重试，不回退最新对象，也不修改交易终态。

当前87文件976项全量测试、完整类型与开发版构建通过。真实浏览器用户点击／可信发布门禁下归档历史读取尚未验收，RPC-02／RPC-19／TRY仍未勾选。

## 2026-10-04 新版 SDK 安装与构建核对

钱包依赖升级必须同时核对清单、pnpm lock、实际安装入口的模块解析及 Webpack 构建，不能以现有 SDK 源码软链接能运行替代冻结安装。当前隔离 frozen 安装、完整类型检查、976 项测试及 dev／prod 构建已通过；GraphQL 测试解析器从已安装 SDK 加载，官方与 RTD SDL 仍作为契约资料。锁文件保留其他应用 importer 与旧非 SDK 记录，更新共享 SDK 依赖；这不构成其他应用兼容证明。modern demo Kit、真实 Chrome 核心交易与公开服务门禁仍按清单验收，不能据此宣布可试用。

## 2026-10-04 现代 demo Kit 已接入

NET-09 的现代 core／React 双包、动作 API、显式网络与 gRPC-Web 配置已落地，并通过隔离冻结安装、类型／单测／构建与 Chrome 页面冒烟。默认不连接公共节点或额外钱包，扩展内部仍用自有 Provider。错误账户场景直接使用现代 Wallet Standard 到达钱包边界。此处编码／构建完成不等价于其他应用兼容、真实扩展审批／交易恢复或公开服务门禁验收，后者继续按 NET-10、TX、TRY 清单执行。

## 2026-10-04 归档 checkpoint 定位读取

WalletArchiveCheckpointReader 强制指定规范 u64 高度或完整摘要，限定 archive 的 GetServiceInfo／GetCheckpoint，使用 sequence_number,digest mask。禁止缺选择器隐式 latest；前后核验 H0／checkpoint 保留下界／head，结果选择器不符、缺字段、范围不含、下界漂移、头回退、取消或失效会话一律拒收。返回明确标注 service-reference；它不代表委员会证书、BCS摘要或交易包含证明，公开发布门禁仍单独验收。此范围不扩展原先未使用的 checkpoint 列表业务。

### Fullnode GetBalance 零分量合同补充（2026-10-04）

发送资金判断须区分 Coin 对象与 addressBalance，不能只汇总 Coin 对象后断言账户无资金。当前 RTD StateService.GetBalance 与 [Sui 固定提交 render_balance](https://github.com/MystenLabs/sui/blob/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-rpc-api/src/grpc/v2/state_service/get_balance.rs) 的编码合同一致：必须有 balance 消息、coin_type 和总 balance；值为零的 coin_balance／address_balance 可省略。仅在必需字段成立后，两个可选零分量按0读取，以 bigint 核验分量之和等于总额；缺消息、缺总额、错类型、非u64或饱和总额不一致均拒绝。每次读取前后核验完整H0、水位与会话，调用有总超时和取消；该读取不是固定快照或执行准备完成证明。

钱包已新增上述原生读取器并通过真实开发链读取；发送表单已接入地址余额资金选择，具体合同见下节。RPC-06接口与页面编码已于2026-10-04完成核验，RPC-04完整资金构建和真实执行验收仍待，不以余额读取替代交易验收。


## 地址余额发送资金合同补充（2026-10-04）

发送表单和准备器读取 Fullnode GetBalance 的总余额（coinBalance + addressBalance），listCoins 继续提供实时 Coin 引用。两次读取不是原子快照；若 Coin 分量与分页 Coin 总额不符，拒绝当前预览并重新读取。资产展示的共同 GraphQL 快照不替代执行准备资金读取。

存在原生地址余额时，指定金额使用 SplitCoins(GasCoin)，发送全部使用 TransferObjects(GasCoin)，保持 gas payment 未指定。正式 Fullnode 模拟负责选择真实 Coin 与 epoch 绑定的地址余额 coin reservation；钱包不自行将 gas payment 固定为空，不先提取全部地址余额再期望其补足 gas。该规则以 [Sui 固定源码 select_gas](https://github.com/MystenLabs/sui/blob/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-rpc-api/src/grpc/v2/transaction_execution_service/simulate/mod.rs) 和本地 RTD 同名实现为依据；不支持 reservation 的部署须让正式准备失败，不回退 JSON-RPC。非原生代币按需 redeem_funds，合并 Coin 后必须显式处理新产生 Coin 的剩余值。最终构建bytes必须再次checks=ENABLED模拟；Coin payment或gasless使用doGasSelection=false，空payment且gasPrice>0的地址gas使用true避免mock注入。回传bytes及effects必须与原授权完全一致；批准后不得接受重选资金或重建后的bytes。

纯地址余额账户的真实指定金额／发送全部准备与固定字节模拟已通过；发送全部的一次真实提交成功，原摘要查询恢复成功，发送账户总余额归零。此证据使用隔离测试密钥和私有文件 pending，不代表 Chrome 后台签名、产品 IndexedDB 恢复或混合／非原生资金实链验收完成。


质押资金补充（2026-10-04）：质押输入表单使用 Fullnode 新鲜总余额，而非索引资产快照作为资金上限。prepareStaking 在构建前再次读取原生总余额，缺资金或读取失败不进入构建；金额加 gas 的可支付性由最终正式模拟决定。gas payment 保持未指定，使协议支持的地址余额 reservation 可以参与选择。赎回仍基于新鲜仓位所有权和系统对象核验，不要求账户预先具有与赎回本金相同的流动余额。提交确认后刷新资产、Fullnode余额及Coin缓存。此项编码与定向测试通过，不代表地址余额质押真实执行或Chrome验收通过。


批量对象核验更新（2026-10-04）：公共资产hook在刷新失败后不再暴露旧data。实际配置的归档gRPC-Web入口已通过23项指定历史版本、重复选择器与两处逐项notFound的跨批验证，前后H0／覆盖核验及完整对象BCS／摘要核验成功。该证据补齐此前归档接口运行缺项，RPC-02接口合同可完成；Chrome页面操作仍独立归TRY，RPC-19整体不随之完成。旧章节中的“尚未完成”描述保留为当时阶段记录。


## 对象点查不存在语义裁决（2026-10-04）

[Sui 固定提交 get_object_impl](https://github.com/MystenLabs/sui/blob/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-rpc-api/src/grpc/v2/ledger_service/get_object.rs) 与本地 RTD 对应实现一致：无 version 时从当前对象存储 get_object，缺失返回 ObjectNotFoundError；显式 version 时从 get_object_by_key 读取，缺失同样为 ObjectNotFoundError。该响应本身不提供“从未存在／已删除”的可靠分类。

因此当前收件人读取仅在真实NOT_FOUND并完成前后H0与水位核验后返回null；传输失败、权限、坏BCS、缺object消息和错链均为失败。null仅代表此节点未提供当前对象，不能断言地址从未使用或对象已删除。历史活动风险提示独立读取账户历史覆盖范围，不将未知覆盖视为安全。历史详情只接受明确版本与effects摘要匹配的对象，不能用最新对象替代。


动态对象完整性补充（2026-10-04）：通用动态字段解码器除按Wrapper<Name>派生包装字段ID外，还核对MoveObject返回childId与contents BCS前32字节的UID一致，截断内容或错UID拒绝。该规则来自[Sui固定源码MoveObject::id_opt](https://github.com/MystenLabs/sui/blob/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-types/src/object.rs)及本地RTD同名实现。普通MoveValue不应用对象UID布局；具体Kiosk等消费者继续负责子对象owner、类型和完整业务BCS核验。真实系统普通动态字段已验证列表／点查同快照一致，本轮未覆盖真实DynamicObject样本。


外部服务支持状态补充（2026-10-04）：当前没有已经核验的RTD法币服务对接，钱包使用本地RTD对接验证门槛与远程功能开关共同控制入口；仅远程开关或旧缓存不得启用购买链接。当前门槛为false，不进行服务商探测，直接访问页面提示暂不可用。未来启用须另行完成真实网络／资产／结算合同验收。Ledger不存在账户factory／签名实现，对应创建表单、路由允许项与消息请求类型已移除；历史文案不作为硬件支持声明。Qredo既有数据和只读接口保留，后台签名仍按isSigningAccount拒绝不支持的账户，不伪造远程执行成功。


Qredo支持边界核验（2026-10-04）：既有账户和远程记录只读保留，账户徽标与转账页明示只读；未提供本地签名能力的账户在后台授权入口拒绝。旧远程createTransaction提交方法、转账页远程审批事件链已删除，读取远程状态不会写成本地执行成功。只读GET行为、拒绝签名／模拟／提交及全量钱包回归已验证；该结论不代表Qredo远程RTD交易对接或Chrome操作验收。


余额消费者与全额校验补充（2026-10-04）：完整资产余额hook刷新失败时不暴露旧data，不把依赖错误当零。Coin与地址资金两条准备分支均在构建前检查正u64原子金额、总余额上限及发送全部金额与新鲜总额精确相等；仅Coin资金同样不得用旧表单全额继续准备GasCoin全转交易。资金改变必须重新预览，批准后只模拟固定bytes。


Kiosk配置分支补充（2026-10-04）：组合资产读取按显式配置分别启用原生／PersonalKiosk和OriginByte。OriginByte独立配置不要求同时启用原生OwnerCap扫描；其底层framework Kiosk布局、动态字段和登记核验仍全部执行。无任何分支配置时返回不可用错误；双分支时任一失败不得返回部分集合。NFT详情持有判断使用同一分支能力规则并保留同快照对象一致性核验。


## 原生交易／事件列表实现补充（2026-10-04）

WalletIndexedLists与Provider／共享hooks提供显式sender交易引用、事件结构类型或包／模块筛选。每次读取要求checkpoint闭区间与方向，完整窗口准入后按first/after或last/before全分页，倒序反转每页节点，最后复核覆盖；空扫描页继续，重复／停滞／预算／取消／GraphQL errors整批失败。事件eventBcs与类型、模块、sender和内容逐项匹配；交易／事件列表均标为index-reference，不写确认journal，不充当完整账户收支。缺GraphQL配置不回退。固定SDL无scanLimit参数，历史SCAN_LIMIT错误仍按错误拒绝。

### 名称确认期间的有效期（2026-10-04补充）

名称结果的 `validUntilMonotonicMs` 是钱包接纳期限。Coin／NFT 构建或确认时均拒绝非有限或已到期的期限；签名前对固定交易 bytes 完成模拟后再次检查同一名称结果的期限，期间到期则要求重新预览，不自动重建或提交。此限制是钱包的保守授权策略，不改变链上 NameRecord 的过期语义。

权威对标：[Sui 固定源码 NameRecord](https://raw.githubusercontent.com/MystenLabs/sui/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-name-service/src/lib.rs) 的 `is_node_expired` 使用 expiration < checkpoint timestamp，叶记录期限为0且通过同一注册 NFT 校验父记录。钱包仍保持这些读取语义；期限窗口不能作为名称在签名后永不改变的保证。

默认名称消费端补充（2026-10-04）：Provider进入initializing时，即使binding／readSession键暂未改变也立即撤下缓存名称；非有限单调时钟期限不展示，也不创建期限计时器。RPC-21的接口／消费端编码核验与QA-A15的实际部署、改名续费和Chrome验收分别记录。

共享消费者兼容补充（2026-10-04，2026-10-05核对）：Explorer的钱包接入与已迁移共享消费者使用现代Kit／领域模型；其独立Explorer数据客户端仍有旧JSON-RPC路径，旧DTO须从jsonRpc出口显式type-only导入，不能从现代client入口伪造导出或强行视为gRPC结构。钱包采用新领域模型；Core API的统一类型与legacy顶层DTO不能混用。现代Kit局部验证、纯类型兼容及生成JavaScript一致性不代表Explorer独立数据接口／分析7项或NET-10全部迁移完成。依据[官方Core API](https://sdk.mystenlabs.com/sui/clients/core)及本地ExplorerRpcClient／DefaultRpcClient实际源码。

质押safe mode展示补充（2026-10-04）：系统safe mode状态必须独立于奖励是否可估算显示。历史汇率足以估计奖励不代表系统已退出safe mode；仓位卡片保留奖励和池状态，同时显示safe mode并抑制激活倒计时。

### APY 展示精度与排序补充（2026-10-04）

APY 领域模型仍返回未经展示舍入的 fraction。验证者排序和统计保留原始数值；列表／详情在最终显示时换算为百分比并保留最多两位小数，汇总最多三位。通过有效样本过滤的正 APY 在显示精度下舍入为0时标记 `~0%`，与缺覆盖／无有效样本的 `--` 区分。汇总按去重后的验证者集合计算，任一缺失／未知或快照读取失败时不展示部分平均值。该展示规则不修改365年化、样本过滤、奖励金额或safe mode语义，也不能代替跨epoch实链验收。

展示消费端范围包含验证者选择列表、质押表单验证者详情、仓位详情、汇总APY及质押交易回执。仓位详情同样显示安全模式，即使奖励估算已知；回执的当前APY为当前快照补充信息，读取失败时撤下，不修改事件中的历史本金与epoch。

实施状态更新（2026-10-04）：RPC-12已完成接口、算法与钱包五类APY消费端核验，认证S41616返回epoch0／1／2真实汇率与1个有效APY样本，95项相关测试通过。此前“RPC-10–13保持未完成”的阶段叙述不再代表RPC-12当前状态；RPC-11／13、真实安全模式切换和Chrome验收仍分别保留。正式计数与逐项证据以钱包Task.md及workLog/20261004-RPC-12-completion.md为准。

元数据刷新失败边界补充（2026-10-04）：useCoinMetadata在同一缓存键重新读取失败后必须撤下旧data，不能继续向发送／质押表单暴露旧decimals。明确返回null仍表示该快照下无元数据，decimals=0仍是合法精度；依赖错误保留isError，金额显示未知并阻止依赖该精度的表单继续准备。原查询缓存可保留用于诊断，错误状态下不得作为显示或交易参数依据。

NFT属性展示补充（2026-10-04）：对象json为展示数据，不假定旧JSON-RPC的fields包装。详情页兼容metadata.attributes与旧metadata.fields.attributes.fields；只有keys／values均为数组、长度一致且key为字符串时才按属性向量展开，否则按原始顶层JSON展示（排除id）。零、false、null和嵌套结构显式转成文本，大整数串不转Number。该展示解码不参与持有证明、转移能力或签名授权。


### 币种详情的法币估值绑定（2026-10-04）

币种详情页必须把当前 activeCoinType 与该币种的原子余额一起传给估值 hook，不能把非原生币余额套入 RTD 的价格或 decimals。零估值是有效结果，显示 0.00；没有价格／元数据或读取失败则省略估值，不能借用另一币种。此估值仍是链外信息，不用于发送额度授权。钱包回归证据见 workLog/20261004-coin-value.md；真实行情与 Chrome 页面另验。


### 拥有对象筛选与资产分类实测（2026-10-04）

通过现有dev profile的实际WalletAssetReader读取：固定S55580的两个OriginByte夹具账户各有一个OwnerToken；S55655的部署账户有13个异构对象。使用生产filterOwnedAssets排除两个Coin后，groupCollectibles隐藏一个对象得到visual=1／other=9／hidden=1，集合数保持一致。include／exclude联合及冲突筛选、隐藏隔离和特色类型分类通过。该证据是实际GraphQL查询加生产分类函数，不是Chrome操作；集合未超过50条，不能作为真实多页或直接NFT display渲染验收。钱包workLog/20261004-owned-assets-live.md记录完整输出与边界，RPC-03保持未完成。


### 单币余额接口与页面完成核验（2026-10-04）

Task RPC-06 已核验：资产单币展示使用已准入的完整余额快照；发送及质押输入使用 Fullnode 新鲜 coinBalance＋addressBalance，总额与Coin引用不一致时拒绝预览；错误不作为零余额放行。active-coins、tokens及质押页均已接入，7文件65项定向测试通过。

实际扩展页面在 S62929 读取受控 dev 账户原生余额149998999543361456，并显示149.99 M；独立整数算法核对显示值，观察到0次交易提交。使用编译 Local profile 与精确 dev SPKI 例外，不代表正常CA、自定义权限、真实发送或完整QA-A05通过。证据见钱包 `workLog/20261004-RPC-06-completion.md`。


### 仓位分页核验补充（2026-10-04）

全仓位组合必须跨过空但推进的页，任何末页重复对象或损坏BCS都拒绝整个结果。相关61项通过；实际认证S77495的epoch0／1／2汇率及APY只读复核通过，未验证非空活跃仓位兑付。官方治理算法复核及证据见钱包workLog/20261004-staking-portfolio-audit.md。10000条总汇率预算是钱包策略；生产规模历史可用性仍待验收，RPC-11不提前完成。


### 实际质押页面接入修正（2026-10-04）

账户仓位查询已包含同快照验证者，选择列表、验证者标识、仓位卡片和详情应复用该view，避免子查询重复整表读取并被下一次快照刷新取消。质押页面同一会话的并发只读恢复检查应合并，避免StrictMode重复effect争抢执行锁；执行提交不合并，后台互斥与journal不变。1310项／tsc／构建／审计及实际列表→选择→金额校验通过，0模拟0提交。证据见钱包workLog/20261004-staking-page-fixed.md；真实质押批准／活跃奖励／赎回页面仍待。


### 实际质押预览补充（2026-10-04）

Chrome扩展从验证者选择与1 RTD金额表单进入确认页，Fullnode读取及两次模拟通过，显示对应验证者、1000000000原子单位、gas与交易摘要，返回表单正常。0提交，不是实链质押成功或journal恢复证明。见钱包workLog/20261004-staking-preview-live.md，RPC-13仍开放。


### 实际钱包质押执行补充（2026-10-04）

实际Chrome扩展完成1 RTD预览、后台签名、一次提交和收据跳转；成功effects摘要与预览一致，整浏览器重启后journal仍为confirmed-success。摘要3AxtK5qS36Vy4wCwpoJqWYGAYJ9crwL2nSKmCFPLaKDi；4模拟、1提交。回执checkpoint=null不表示已确定checkpoint；非空活跃仓位、奖励和赎回页面仍待，RPC-13不勾选。保留固定浏览器档案，不得重跑执行模式。证据见钱包workLog/20261004-staking-ui-execution.md。


### 收据冷打开与索引滞后实测（2026-10-04）

账户查询尚未完成时必须保留收据摘要URL，不将暂缺activeAddress当作无账户立即跳转。实际质押原摘要在浏览器重启、账户锁定只读核验及解锁后重新打开，成功收据与资产仍同步提示同时可见，0模拟0提交；5项定向测试、完整wallet tsc、开发构建及四入口静态审计通过。该证据不代表索引已追上或全部执行入口验收，TX-08仍开放。见钱包workLog/20261004-staking-ui-execution.md。


### 拥有对象分页大小与真实跨页证据（2026-10-04）

ownedObjects默认每页50，可选1–50整数以限制单页响应体量；仍返回整个固定快照集合，原分页完整性、去重、取消及总预算保持，终页复核后才交付。真实快照89079的13对象每页3条共5页，与默认读取逐字段一致（包括BCS、owner和display）；实际OwnerToken Display可见，但不代替普通NFT Display／Chrome验收。66项相关测试、钱包类型检查及开发构建通过，详见钱包合并目录workLog/20261004-owned-pagination.md。RPC-03仍保留未完成。


### 共享消费者旧接口归属（2026-10-04）

Explorer既有JSON-RPC消费者使用SDK显式jsonRpc入口和明确网络标签，不从新版通用client入口取已删除构造器／旧类型。此次六处修正使Explorer类型诊断111降至101且无新增，7项客户端／共享注入测试通过；旧Kit和指标API缺失仍阻止完整构建。钱包继续只走新接口，四入口产物审计确认Explorer客户端不可达，禁止以保护Explorer为由引入钱包旧请求回退。详见钱包合并目录workLog/20261004-consumer-explicit-sdk.md。


### 2026-10-04：现有拥有对象页面的实际核对

实际 Chrome 扩展已在 S96880 核验部署账户的 10 个非视觉对象完整类型、逐对象 Explorer 链接、唯一 OriginByte Kiosk 卡片和该空 Kiosk 的详情内容。真实 ownedObjects 回包为完整单页，所有渲染对象 ID 均在该回包中；全程 0 模拟、0 提交。该证据不代替直接 NFT display、隐藏资产、非空 Kiosk、PersonalKiosk、NFT 转移或正常 CA／自定义权限验收。RPC-03／RPC-22 继续开放；初期页面定位失败日志保留。


2026-10-04混合原生资金实证补充：受控同链账户实际Coin与地址余额各1000000000。生产准备器对定额1500000000及发送全部2000000000完成固定bytes正式模拟；后者最终payment含全部已读Coin引用与coin reservation，模拟接收1998990120等于总额减净gas1009880。实际Chrome定额1.5 RTD发送表单及批准页可用、有效期可见，2模拟0批准0提交。资产旧快照S130882早于入账cp395329，不能据此推断Fullnode无资金或宣称索引追平。此证据不代表混合实际钱包提交或非原生资金验收；见钱包workLog/20261004-mixed-native-funding.md。


## 混合原生资金实际钱包执行证据（2026-10-04）

同一受控账户在实际Chrome钱包向外部管理账户发送1.5 RTD，批准bytes同时包含真实Coin v25精确引用和epoch绑定coin reservation。一次ExecuteTransaction成功：digest HR27Xmrhd2KPsN4YDCbJzsBYkmcpnnf3NN1m2kW5rEUd、Ledger checkpoint398996；接收1500000000、净gas1009880，发送方剩余地址余额498990120。原bytes摘要与effects BCS匹配journal及Ledger，浏览器重启后账户锁定，原唯一journal仍为成功。原脚本最后报告BigInt序列化失败，未把exit1整体记为通过；保留持久记录和失败日志，随后独立原摘要只读恢复exit0通过，0模拟0派发。保留目录和seed不得重跑。非原生资金、发送全部实际UI及共同快照追平仍待，不以此勾选RPC-04或TRY-02；详见钱包workLog/20261004-mixed-native-execution.md。


## 现代交易预览的同步快照合同（2026-10-04）

React预览缓存不得经过Transaction.serialize()的旧v1转换。地址资金FundsWithdrawal会被旧输入转换拒绝，即使现代dApp的toJSON与后台Transaction.from均已接通，批准页面也会在正式模拟前崩溃。

[Sui SDK迁移说明](https://sdk.mystenlabs.com/sui/migrations/sui-1.0)已弃用serialize()；固定[Transaction源码](https://github.com/MystenLabs/ts-sdks/blob/3c32c302625c7d4c63cd89597c34b86bcccdbcea/packages/sui/src/transactions/Transaction.ts)明确同步序列化可使用getData()，serialize()调用serializeV1TransactionData。[v1转换源码](https://github.com/MystenLabs/ts-sdks/blob/3c32c302625c7d4c63cd89597c34b86bcccdbcea/packages/sui/src/transactions/data/v1.ts)未接纳FundsWithdrawal；本地RTD SDK与其一致。

usePreparedTransaction同步捕获getData()的现代JSON快照，BigInt以十进制字符串保存；query key与后续Transaction.from必须使用同一个捕获值。保留完整输入、gas、expiration、指令及大整数精度，拒绝让调用方之后的修改改变正在准备的交易。不在React render中异步执行toJSON或构建。dApp异步序列化和后台正式构建保持原授权、持久pending互斥、最终固定bytes模拟及恢复边界。

内置转账和dApp预览均加入9007199254740993原子单位提款回归，克隆不改变原交易，现代有效期约束保留；6文件121项、完整钱包130文件1406项、wallet tsc、开发Webpack与四入口产物审计通过。官方原文和SHA留在钱包evidence/official/20261004-modern-preview，详见钱包workLog/20261004-modern-preview-snapshot.md。该合同不等于全部资金模式／授权故障／试用验收。


## 非原生混合资金实际钱包执行证据（2026-10-04）

修复现代预览快照后，既有受控账户经modern dApp和真实Chrome钱包批准，生产addressFundedTransfer将Coin与地址各1000000 WMIG组合，发送1500000并返还500000 Coin。RTD纯地址gas payment=[]、price1000，Validity与固定bytes保留。一次ExecuteTransaction成功digest6mTumr6izYKqyxrRyTzEwuzgqjj5SbTEL84kLfkmqhnK、Ledger checkpoint409864；3次模拟／1次广播，净RTD gas2489144，剩余RTD496500976。

批准bytes、Ledger bcs、签名、effects、双方token／RTD balanceChanges及整浏览器锁定重启的两条成功journal已由原摘要只读复核，后续0模拟0广播。初次runner在成功后误要求默认dApp结果包含可选balanceChanges、首个恢复又漏请求bcs:true，两次失败原样保留且未重发；原dApp返回全文未持久保存，不能视为该次全字段原文验收。该证据不代表WMIG发送表单、metadata索引追平或完整试用，RPC-04／TRY-02保持开放。详见钱包workLog/20261004-mixed-token-execution.md。


### 2026-10-04：发送页的元数据缺失状态

共同资产快照成功返回coinMetadata=null，与查询失败分开展示：说明当前快照没有币种精度，暂停按小数金额发送；不猜测decimals=0，不显示可批准按钮。查询失败仍显示同步错误；合法decimals=0维持正常处理。该旧S的null可能早于新币部署，不能推导当前Fullnode不存在该币或资金归零。仅展示可使用原子单位，发送仍要求已验证的精度信息及新鲜Fullnode资金。

### 2026-10-04：Display v1模板的快照合同仍待补齐

官方固定commit的 [Display reader](https://github.com/MystenLabs/sui/blob/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-indexer-alt-reader/src/displays.rs)仅按StructTag查询sum_displays；[v1 resolver](https://github.com/MystenLabs/sui/blob/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-indexer-alt-graphql/src/api/types/display.rs)没有传入scope／checkpoint。当前RTD对应源码一致。因此checkpoint查询树固定了资产对象，不足以证明v1模板也固定于S；Display v2则使用带scope的registry对象查找。

同S的v1模板查询／可核验模板basis是尚未完成的服务及钱包合同，归RPC-03／NET-04；在该合同成立前不得将v1渲染声称为固定S的有效元数据。已有OwnerToken display或BCS／owner快照回归不代替模板更新跨S验收。保持资产完整性与失败语义，禁止凭null替代未查明模板或用当前模板冒充历史模板。官方原文及SHA保存于合并目录evidence/official/20261004-display-boundary/manifest.json。

### 2026-10-05：对象版本批量 SQL 与 display 延迟验证

Sui 固定提交的 reader 合同仍是 ID 相等、checkpoint≤S、同 checkpoint 取最高版本、缺失不返回；具体 SQL 写法不构成 PostgreSQL 性能保证。当前 rtd 使用等价 ID 闭区间与完整联合排序，保持已有对象联合索引定位。生产七键包含热点对象、重复／早期边界和缺失 ID，7.114ms／32缓冲页；3项独立临时 PostgreSQL 回归与当前 debug 构建通过。单对象字面量、单个缺失 ID 和仅 EXPLAIN 的计划均不足以验证实际批量，失败候选保留。

改写不补齐 Display v1 按S的历史模板合同。完整 display／NFT／OriginByte／Chrome 仍受共同S和各自完整验收约束，RPC-03／NET-04／RPC-22不勾选。见[权威源码、编码及实链恢复证据](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/migrationToGRpcOrGraphQLDoc/workLog/20261005-query-range-recovery.md)。

### 2026-10-05：Display v1 历史模板采用发布事件顺序

[Sui Display 合约](https://github.com/MystenLabs/sui/blob/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-framework/packages/sui-framework/sources/display.move)中编辑字段与update_version发布事件分开；[sum_displays handler](https://github.com/MystenLabs/sui/blob/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-indexer-alt/src/handlers/sum_displays.rs)只保存VersionUpdated事件内容，并依checkpoint内交易／事件顺序保留同类型最后发布值。本地RTD对应代码一致。由此确定历史v1查询的权威语义是“S之前最后发布的模板”，而非Display对象在S时尚未发布的字段。

同类型可能对应不同Display ID、各自版本号从头开始；应以类型＋checkpoint＋checkpoint内交易顺序＋事件顺序选择最后发布，不能以最大display_version或当前sum_displays的ID推导历史映射。v1新建但未发布、字段编辑但未发布、同checkpoint多次发布及Display ID替换都须保持上述语义。v2按同S registry对象优先；不能把当前v2模板回套旧S。

RTD实施方案是增量保存完整发布事件历史和来源位置，按(type,S)有界批量读；可核验basis包含模板ID／u16发布版本／来源checkpoint／交易摘要／事件位置及原事件BCS的SHA256。历史coverage须证明从genesis连续回放至S、与原H0／认证来源及writer fencing保持；现有sum_displays当前值不能回填为历史。空结果只有在覆盖成立且S前确无发布事件时才是null；缺历史、范围不足或绑定失配须拒绝准入。历史若剪裁，须保留每类型边界前锚点并公布下界。

这是已由源码确定的实施设计，历史表／回放／resolver／basis及钱包校验尚未编码或运行，不声称v1按S已通过。逐步编码与真实验收列入Task中RPC-03／NET-04子任务，详见[事件语义和实施设计](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/migrationToGRpcOrGraphQLDoc/workLog/20261005-display-history-design.md)。

## 2026-10-05：Explorer现代Kit与共享消费者有限验证

Explorer旧Kit消费已迁入现代React Kit与应用自有查询Provider。查询方法来自实际SDK，签名／执行不得进入自动重试的query hook；缓存与Kit存储按网络／端点隔离，ModuleFunction显式传递当前账户、SDK小写network及signal，自定义网络缺少明确链绑定时拒绝签名。结构化Display原数据与局部错误保留，文字／URL只投影字符串；递归vector／option参数通过真实BCS编码及精确u64回归。钱包领域Provider不引入Explorer旧协议回退。

RTD getEpochs／getCurrentEpoch在本地ExtendedApi中仅有声明，当前源码未找到服务端实现／注册；应用扩展入口只按声明构造请求和校验回包，不记本地链能力通过，也不吞掉MethodNotFound。getEpochMetrics已移出不存在的SDK方法名；地址／全epoch地址／network／MoveCall统计接口和SDK类型仍缺失，保持七条实际诊断及完整Explorer构建待办，不伪造SDK类型、服务方法或空成功数据。

24项定向合同、Explorer全部现有32项单测、core4项、钱包1486项及独立Node批准准入5项通过；新Provider／签名／BCS范围类型检查及wallet／core完整类型检查通过。Explorer79→7条诊断，NET-10保持开放。happy-dom14的Wallet Standard app-ready事件警告保留；受控Kit测试不等价于浏览器扩展发现或Explorer真实页面验收。现代入口对照[官方useDAppKit文档](https://sdk.mystenlabs.com/dapp-kit/react/hooks/use-dapp-kit)，实际动作参数以本地Kit源码核对。

共享锁文件变更后已保存原dist并按审核Local profile重新构建；稳定999份源码SHA 740cdd8fc1450d1c15f17443ccdeb76e4e4d0e56ff476499379a102eb0e74b98，UI bd5293283dcc63e47225bb3854284972f1ce3dcbe0ee7979c8d38dc4bf7f3424，background 58e0e172cb9d0fdcbc67d33e1ff20afe7548e87027f1bf68194d6e874aebeecc。双入口AST配置和四入口39方法闭包通过；实际Chrome当前worker逐字匹配，原5＋2终态journal／原生effects再次只读核验且与前批逻辑SHA相同，0模拟0广播。前批50b804产物的批准／只签名／授权实测属于历史证据，不能自动转成当前58e0e1产物通过；完整资产、正常CA及试用仍未通过。

原历史回放PID66145仍运行；05:51:29只读连续0–49871、49872 markers，原22水位不变，无有界终态，未恢复live。总体49/98，trial_ready=false。详见[本批工作日志](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/migrationToGRpcOrGraphQLDoc/workLog/20261005-consumer-kit.md)与[机器证据](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/migrationToGRpcOrGraphQLDoc/evidence/20261005-consumer-kit-progress.json)。

新58e0e1产物的实际Fullnode-only只签名已另行通过：3次真实模拟均checks启用，两次正式模拟的BCS SHA与返回0e7190ca53ef3548e012a0ce2773242069cb373f0b622b460a413e4115aedc81一致，预览digest 5KmGLNcuJax2pq1hcijwcr9YSADvGuUxP5F7GGWXytSx及SDK TransactionData Intent验签通过，0广播；完整GasData和epoch3–4 Validity保持。8组批准前／真实模拟等待授权矩阵也在当前worker下通过，实际8模拟0广播。内币／NFT／stake完整批准、提交后切换、实际签名函数等待锁定、完整资产与正常CA仍待，父TX-01／TX-10不勾选。fresh Demo从审核profile读取localnet及Fullnode39400，不猜测网络；首次未配置及第二次unknown假设在发现阶段失败，日志与构建保留，两次均0模拟0广播。

06:05:05最后只读核验连续0–55171／55172 markers，原22水位不变、PID66145仍运行，无有界终态；未恢复live。

## 2026-10-05：质押独立BCS领域快照合同

2026-10-05复核[Sui官方迁移映射](https://docs.sui.io/develop/accessing-data/json-rpc-migration)：getStakes按类型读取StakedSui对象，APY需要客户端组合；同checkpoint跨资源／分页可使用Checkpoint.query。固定[Sui治理源码](https://raw.githubusercontent.com/MystenLabs/sui/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-json-rpc/src/governance_api.rs)和本地RTD治理／Move源码，以对象BCS、池和汇率计算仓位／奖励，未要求Display。RTD实际字段、类型和兼容BCS仍以本地当前SDL／源码为准；不把Sui运营时间表或新增服务假定为RTD已上线能力。

独立WalletStakingSnapshotReader只声明六项依赖：Query.checkpoints／object，Address.objects／dynamicFields／dynamicField和MoveObject.contents。选择树仅取对象ID、version、digest、owner、type、BCS与动态字段身份；不请求Display、basis、JSON或转移能力。最小WalletStakingObject不具有完整WalletAssetObject的展示字段。完整资产／NFT仍使用原ASSET_COVERAGE及Display历史证明；未取得Display证明时，不能把领域对象当作Display为空的完整资产。

治理组合继续读取同S当前0x5 wrapper／V1或V2 inner、全部active及inactive validator、全部汇率和全部owner StakedRtd。保留严格BCS重编码、UID／owner／type／动态字段派生、表size与重复项／游标核验、H0／S／digest／coverage及末次重验。奖励／APY算法不变；总汇率10000及整体20秒预算保持，超过预算或任一失败拒绝整批，不裁剪为局部成功。20秒从独立读取的准入开始计算，涵盖组合读取；逐请求预算不能延长它。

WalletRpcProvider注入readStakingView；useStakingView以bindingKey／readSessionKey／规范owner或null为键，结果同时保存完整view与独立snapshot proof。资产准入pending或Display失败但查询会话有效时，可独立读取质押；错误撤下view和proof，generation／会话切换不复用旧仓位，不持久化，不自动重试。20秒轮询／focus／reconnect仅在当前读取idle时触发，不中断正在执行的有界组合。系统／验证者／仓位在此领域内部同S；不同领域的S不能冒充原子账户总汇，也不能用索引仓位授权发送或赎回，交易仍要求Fullnode新鲜输入和正式固定bytes模拟。

本批新旧读取器42项治理测试、16项领域／Provider／Hook测试，以及钱包136文件1531项、共享core4项和双方完整tsc通过。稳定1006份源码Local构建、双入口profile AST及四入口21使用／18未使用方法闭包通过；UI b24b8f／background f2628c。原7条journal／effects只读一致、当前产物只签名3模拟0广播通过。这些证据未涵盖完整质押／赎回页面。

显式原生入口的生产读取器在S282633、epoch2完成13次只读请求，全部3条真实汇率、原账户该S下空仓位，0模拟／签名／广播；没有隐式回退。公开TLS入口仍因授权连接超时返回503，原质押cp300333晚于本次S，非空活跃仓位／奖励、完整页面、大规模汇率仍待。保留三个公开探针失败（缺CA、错误leaf信任、正确CA后503），不计通过；父RPC-11／13开放，49/98、trial_ready=false。原有界Display回放保持，不重启或提前恢复原管线。


## 2026-10-05：Coin metadata独立领域快照合同

页面useCoinMetadata采用独立GraphQL领域，依赖Query.checkpoints＋Query.coinMetadata，后者在RTD依赖consistent＋obj_versions；不借用无关hist_displays或完整NFT准入。整体20秒包括准入／固定S读／末验，叶10秒及session／原生预算保持。共同严格decoder及末验也用于完整WalletAssetReader.coinMetadata；完整reader保留自己的proof，独立结果不得拼接宣称同一完整资产S。成功及明确null都完成末验；缺字段／partial／错链／覆盖或摘要改变／取消失败，decimals必须0–255规范整数、零有效、未知不能解析金额，不硬编码9或旧RPC回退。

Provider有效session独立注入；hook键为wallet-coin-metadata／binding／readSession／规范type，raw cache带value＋proof，gc0不persist、idle20秒刷新。失败撤下metadata与proof，切会话撤值；NFT key变化不撤下独立成功metadata。override只影响labels。既有完整资产／Display合同保持，该节更新此前将所有页面metadata纳入完整资产proof的表述。

依据[Sui官方迁移映射](https://docs.sui.io/develop/accessing-data/json-rpc-migration)、[固定官方metadata源码](https://raw.githubusercontent.com/MystenLabs/sui/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-indexer-alt-graphql/src/api/types/coin_metadata.rs)及当前RTD字段依赖／scope，未把Sui接口存在当作RTD现场验收。新增22reader＋5真实Provider、66定向／1561全量／core4／双方tsc通过；1009稳定源码Local UIe55ab5／backgroundd58de2及AST／闭包通过。

真实公开TLS S288451 metadata链上decimals9、明确missing type为null、完整资产拒绝，共9请求HTTP200；当前Chrome UI／worker逐字匹配，列表／选择及真实Display失败后保持、金额表单接受9位输入并拒绝10位，未点击预览／批准、0模拟0Execute，原七条journal／effects只读不变。精确SPKI不计正常CA；缺失类型不替代非原生币种验收，原子转换／交易预览、发送全部、非空活跃仓位／赎回与完整试用仍待，49/98、trial_ready=false。详见[完整工作日志](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/migrationToGRpcOrGraphQLDoc/workLog/20261005-coin-metadata-domain.md)。


## 2026-10-05：当前metadata金额转换与正式质押预览

独立metadata实际S288451在当前UI供9位金额表单使用；1.000000001 RTD转换为1000000001原子单位，10位输入拒绝。当前1009份源码Local UIe55ab5／backgroundd58de2实际加载逐字匹配；点击预览的两次Fullnode Simulate均checks启用，首gas解析、末请求带最终BCS。最终BCS的sender／validator／SplitCoins u64和0x3::rtd_system::request_add_stake正确，SDK由该BCS计算digest与预览显示一致，最终批准可用但未点击。

2模拟0Execute、0最终批准／签名，返回表单并锁定，原staking两条journal保持；预览digest不是已提交回执。旧indexed epoch／空仓位不代表当前奖励或原cp300333仓位已消失，需追平后读取。当前源与metadata批1561项全量／tsc／Local证明相同；正式预览有限验收不代替发送全部／非原生表单／活跃仓位／赎回／正常CA／完整试用，父49/98、trial_ready=false。完整来源与截图见[当前预览日志](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/migrationToGRpcOrGraphQLDoc/workLog/20261005-staking-current-preview.md)。

## 2026-10-05：完整余额集合独立领域快照合同

页面useGetAllBalances使用独立WalletBalanceReader，依赖Query.checkpoints＋Address.balances；RTD IAddressable.balances仅依赖consistent。整体20秒覆盖准入／固定S全部页／末验，叶10秒和原生预算保持。共同readSnapshotBalances仍被完整WalletAssetReader.balances使用，并保留完整reader自己的S／proof；不把独立余额与metadata／NFT拼接宣称原子资产快照。

每页first50、集合最多256页／10000项，禁止超页长、截断成功或复用旧cursor。coinType唯一且规范，owner匹配请求，金额为精确规范u128字符串，严格total=coin＋address；允许推进中的空页，明确完整空集合只有末验通过才有效。partial／缺字段／错链／摘要或coverage变更／取消全部失败，不能当零余额。Provider在有效session中独立注入；hook键wallet-balances／binding／readSession／规范owner，raw cache保存完整value＋proof，gc0不persist、idle20秒刷新，自己的失败撤下数据及proof，切会话不复用旧值，NFT key轮换或Display失败不撤下独立成功余额。币／NFT／质押确认增加此域缓存失效通知；通知不证明目标checkpoint已追平，receipt仍单独验覆盖。

[Sui官方迁移映射](https://docs.sui.io/develop/accessing-data/json-rpc-migration)和[固定官方Balance源码](https://raw.githubusercontent.com/MystenLabs/sui/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-indexer-alt-graphql/src/api/types/balance.rs)支持余额两种表示及Checkpoint.query一致分页。该领域选用固定S完整GraphQL集合；实际发送另用Fullnode GetBalance／ListOwnedObjects新鲜输入，索引余额不授权花费。新增25reader＋5实际Provider＋3精确金额显示用例；96定向、141文件1594全量、core4及双方完整tsc通过。

实际公开TLS S288451完成一页一币全集合及末验，共4请求，原账户999998855320原子RTD、addressBalance0；额外完整资产准入仍按Display覆盖拒绝。当前1014份稳定源码Local UI189c8c／backgroundd58de2、AST及四入口闭包通过；真实Chrome UI／worker逐字匹配，首页999.99 RTD及ActiveCoinsCard在真实Display失败后仍可用。仅证明当次一页原生余额，实际多币／多页及其余资产仍需回归。见[本批完整日志](/Users/changzechuan/WenchuanProjects/RTD-Blockchain/rtd-apps/wallet/migrationToGRpcOrGraphQLDoc/workLog/20261005-balance-domain.md)。


## 2026-10-05：Explorer统计消费者与完整构建

SDK没有统计方法或对应服务实现时，应用必须显示统计不可用，不添加伪SDK接口、不把缺能力当零数据、空历史或空排行，不自动重试未部署接口。Checkpoint可独立调用已支持的SDK点查，保留0、u64精度和失败提示。当前6新合同／38全部Explorer测试、完整tsc＋2852模块production构建／root core类型通过；实际编译home仅闭网SDK夹具启动，统计card当前未启用，不能当真实Explorer数据。Wallet1076产品源码、SDK与配置／锁相对C10保持，2358钱包测试与四入口证明各守原范围；正常CA、当前签名、完整业务试用继续按原任务验收。


## 当前RPC-04币发送接口完成（2026-10-06）

钱包当前C21产品源码f867a8d4／1108文件保持。revision3独立回环候选实际coin导入／metadata／定额／非原生Max／原生Max／非法输入18项，以及原生1原子单位与WMIG100000原子单位实际Send Now各9项／4模拟／1签名／1单次广播，通过原digest独立Ledger BCS／签名／effects／余额变化审核与strict journal终结。两个完整coin/address分项读、六原模拟帧精确气费算术／Validity／reservation引用通过；七预览请求另一完整回包未捕获不计完整模拟。

十个完整coin编译module由原实际C18 JS到当前C21开发JS精确字节比对、当前生产候选同源码，变化的后台交易准入使用以上真实当前执行单独核验。原Oct4混合资金成功及失败日志按原日期保持，不能冒称重新运行或旧完整harness通过。WMIG原Execute完整原生二进制回包留存并验证grpc-status:0；RTD只留原请求及完整wallet receipt DTO，独立effects相同，未捕获原Execute运输响应体，不混写两案范围。RTD Ledger960704／WMIG962002，广播时wallet checkpoint=null合法。

RPC-04原编码／Fullnode完整扫描与gas／snapshot详情／coin表单合同收口后父71/98（72.4%）、trial_ready=false；其余TX、QA-A05／A08、NFT、TLS／归零／发布仍待。当前源保持及已有179文件2525测试／完整类型的原记录已复核，无本批新全量运行声明。具体原输出／源码／40快照／保留失败及父审核见钱包migrationToGRpcOrGraphQLDoc/workLog/20261006-RPC-04-completion.md；原目录保持。


## PersonalKiosk 独立部署及 NFT 回执边界（2026-10-06）

PersonalKiosk 的权威模型是 key-only `PersonalKioskCap` 包装 `Option<KioskOwnerCap>`；借出得到 Cap 与 Borrow，交易内完成 `borrow_val → kiosk::take → TransferObjects → return_val`，归还原 Cap 与 Borrow。[Sui 官方固定提交源码](https://github.com/MystenLabs/apps/blob/44c0918fd94dfb6bc97ca3c199ece42383516fb7/kiosk/sources/extensions/personal_kiosk.move)支持该模型；不能把 PersonalKiosk 当作直接持有的原生 KioskOwnerCap 或可直接 public_transfer 的包装对象。六个本地模块与固定提交的词法核对仅允许 sui/rtd 名称空间及 royalty 规则 SUI/RTD 币型对应差异，其余差异拒绝。

本地 revision4 声明绑定同一 H0/generation 的五个实际包：三个 genesis 系统包、原 OriginByte 和原 PersonalKiosk。后者来自原发布摘要 AxoiBpwfQJrcnqE9H3fmXe8H9pNQUamV4hoPpZiMtTCY／checkpoint201271，从 genesis 起连续验证 201272 个 checkpoint，并把输出包六模块只恢复 self-address 后逐字节对照原 debug 编译产物；服务响应和 ABI 匹配只作运行兼容验证，不能替代独立部署权威。原 revision3、证书、发布和种子资料保留。

Guardian 名单调用须同时遵守构建级外部服务策略。关闭时自动查询、手动 refetch 和历史缓存都不能冒充名单已核验；列表明确显示未启用风险名单，enabled 的坏响应／加载／错误同样不得当作安全空名单。已认证的链上资产读取可以继续。

资产快照变化不能终止已提交 NFT 的原摘要回执等待。C23 在同一 binding/readSession/account/NFT 生命周期内保留提交后的表单，仅用于等待或恢复；无 pending 的恢复结果回到当前持有关系准入，切网络／会话／账户／NFT 或锁定仍终止旧界面，新交易继续重新验证 Fullnode 当前 owner／引用／版本、最终 BCS、gas 与 expiration。

原 PersonalKiosk 实际一次执行摘要 GerYF8jrD8xwD9WqxKqSptLZVn12fZAS4YC5K8sP8oZH 在 checkpoint969759 成功，NFT 已归目标地址、原 PersonalCap 已归还、Kiosk 为空；原失败 Chrome 整轮的自动跳转仍记失败。独立原签名／bytes／effects 核验及重开原钱包锁定恢复为 confirmed-success、pending0 成立，恢复没有新增签名／模拟／广播。后续 C23 生命周期单测不冒充重新执行验收。GraphQL 尚未覆盖969759时，保留链终态并显示索引同步，不能用旧 snapshot 的持有关系批准新转移。所有路线／隐藏／动态字段多页及完整 QA 仍按98任务原合同验收。


## NET-04 查询能力状态合同完成（2026-10-06）

查询能力分别评估四角色完整H0、11项SDL、八个GraphQL领域、Fullnode／Archive原生方法、十二Move功能组、五个独立包声明及账户历史窗口。各领域snapshot-verified只对应其完整独立S；窗口可以前进，各领域S可不同。names未配置必须显示unconfigured，账户coverage-window-verified不代表账户全集。identity-verified或某域正面都不能推导交易ready；综合模型显式保留readiness=not-assessed、crossDomainSnapshot/serviceDeployment=not-verified、execution=not-probed。

错误身份返回mismatch并隔离旧会话；部分窗口变化、缺能力、未知协议、超时与存储失败按领域incomplete/unavailable/degraded撤回旧正面，不能用缓存复活。原生同H0/generation退高是reset-required，保留旧scope／journal／密钥；显式新H0或generation创建独立scope，不能删除旧reset记录或复用旧资产查询。profile revision／URL／账户／链／generation／重新进入期间取消旧请求，忽略取消的迟到成功或失败也不能回写当前查询。

C23五pin实际Chrome只读矩阵91次查询、11项SDL、七个已配置领域独立S、真实局部降级、五pin单独matched及错H0／pin／revision拒绝通过；同URL重建代次与迟到查询在真实Provider/TanStack组件测试及持久状态模型中验证。本项完成查询状态编码与规定只读合同；QA-A17实际dev重建／归档重建、普通HTTPS、完整交易与试用仍需分别验收，不能据此改变其它父项。

## 2026-10-06：RPC-13与QA-A16完整合同验收

当前C24源码839da1f5f5b326bb06ccb0309703c37e1fe15699e391c9f93be3f2c34255f425／1110文件。质押／赎回／验证者页面独立GraphQL固定S领域、Fullnode新鲜输入／正式模拟／系统交易、background严格journal与恢复已接入，RPC-13完成。原active仓位S656532／epoch3估算奖励0与epoch4真实赎回奖励46666663分别保留；原摘要ERpY…Bh5m／cp978399本金1000000000、净gas -132096、余额增加1046798759、对象删除，经完整原始帧／BCS事件／native签名effects和余额核验。原C23自动跳转失败保留；C24修复相同会话资产初始化取消在途结果的问题，新1 RTD质押qmge…gX3／cp980199实际列表→选择→预览→一次批准→成功收据自动跳转通过，新仓位激活epoch5。两笔原同profile锁定重启均只查原摘要、0新执行；C24原owner只读旧赎回收据显示奖励和待索引，journal前后不变。

QA-A16以真实Pending撤回／Active非零兑付、生产reader明确BCS多pool／inactive／完整页夹具、缺率／safe-mode／APY多epoch／BigInt舍入和大额算法／组件矩阵完成。12文件151定向、181文件2551全量、生产类型0诊断；10000率夹具全部source／SDL原SHA在C24仍一致，不称真实链已经进入全部治理状态或生产吞吐。完整1151路径输入／原失败记录保存，当前74/98、trial_ready=false。账户历史身份／覆盖观测仍有失败；原Chrome HTTPS、索引追平、NFT全部路线、其他故障矩阵与正式交付包继续由剩余任务验收。详见钱包workLog/20261006-RPC-13-completion.md及20261006-QA-A16-completion.md。

## 2026-10-06：QA-A05余额与元数据合同验收

当前C24源码839da1f5f5b326bb06ccb0309703c37e1fe15699e391c9f93be3f2c34255f425／1110文件。S663545受控source实际完整RTD／WMIG双币余额，每项balance=coinBalance＋addressBalance精确、末验通过；RTD9位、WMIG6位和明确缺失metadata=null，各自成功快照，16只读请求HTTP200／无errors，0签名／模拟／Execute。真实本次集合1页；多页推进／空中页／缺字段／partial／末页变更／重复／总数限制由当前8文件86项明确夹具验证。u128／unsafe Number／零精度／无元数据原子单位和依赖错误不归零矩阵通过；同键失败撤下旧data，独立域保留自己的成功proof。

C21已验证的真实普通币／WMIG UI与当前C24实际UI块中12份完整sourceContents逐文件相同，并结合当前181文件2551全量／生产类型／完整产物闭包审核；历史执行仍标历史，没有新的C24币发送或索引追平声明。完整1151产品输入及本项10份完整路径输入保存，QA-A05完成后75/98、trial_ready=false。普通Chrome原HTTPS、其他转账错误与发布条目继续。详见钱包workLog/20261006-QA-A05-completion.md。

## 2026-10-06 新建账户当前发送验收边界

当前C24实际创建助记词／保护密码／备份确认、同H0一次注资、内部币1原子发送与严格终态、独立原BCS／签名／effects／金额及锁定重启恢复已通过。GraphQL资产仍只陈述指定S的完整集合；不能将最新Fullnode资金发送成功当作资产索引已追平。创建与导入、混合币发送、真实链失败的历史证据按日期保留；同源码继承须逐字比较相关完整sourceContents，不重写旧证据为当前运行。具体证据与版本边界见钱包迁移workLog/20261006-TRY-02-completion.md。

## 2026-10-06 连接与交易预检的外部服务边界

钱包dApp-preflight属于build-owned外部辅助服务，与Guardian风险名单采用同一开关。关闭时自动查询与显式refetch均不得请求默认公网URL，不为风险辅助预检另外构建交易，不复用缓存为安全通过；界面保持安全检查不可用提示且不无限loading。开启时仍只能发送已经批准的最终bytes，预检不能重建或替换bytes，也不能替代链身份／正式模拟／签名授权。此边界是RTD钱包辅助服务策略，不是Sui官方数据服务协议。C25修复与有限验收记录在钱包workLog/20261006-dapp-preflight-progress.md。

## 2026-10-06 金额模拟与 gas 变更授权验收边界

当前C25的gas预算变更必须重新出现可见批准，生成新的请求ID／最终bytes摘要和签名；原签名不能用于新字节。实际Chrome两批准／两签名／四正式模拟、0提交及关闭外部服务下0公网尝试经独立原帧／BCS／验签通过。关闭预检时明确不可用，不保留缓存安全结果或另做辅助构建；正式批准与模拟保持。C24原生8个金额／gas／版本／未知命令模拟案与189项领域测试的来源逐字继承，保留历史运行日期。完整QA-A08证据见钱包迁移workLog/20261006-QA-A08-completion.md；其它内部入口、索引、TLS与试用门槛分别验收。

## 2026-10-06 动态字段／NFT当前验收边界

DynamicField与DynamicObject必须按同一已准入资产snapshot核验完整分页、nameBCS／kind点查、确定fieldId、childId／UID、类型及原BCS。当前C25真实S677361正反各两页与生产完整列表一致，两个缺名称明确null；NFT归档精确version22与该S一致、重复槽位保持、缺version0逐项返回gRPC5，不自动latest。实际Chrome非空Kiosk／子NFT详情、缺图无虚构URL、5非视觉类型行和86正式边界回归通过。指定S的owner是索引历史事实，不能覆盖后来真实交易的新owner；直接Display NFT／隐藏／转移和索引追平分别验收。完整证据见钱包迁移workLog/20261006-QA-A06-completion.md。


## 2026-10-06 原生包对象类型与 Display V2 键

原生Object协议的object_type对包对象为精确字面`package`，Move对象为StructTag；交易详情objectTypes须保留包标记，不能统一送入Move TypeTag解析。非精确包标记和畸形Move类型仍拒绝，完整最终交易BCS／effects／回执／H0与归档覆盖校验保持。依据[Sui官方Object proto](https://github.com/MystenLabs/sui-apis/blob/main/proto/sui/rpc/v2/object.proto)、当前RTD proto及SDK实现。C26 ledger-reader修复后181文件2562测试、完整类型、独立production06／5277模块2033源码7chunks闭包、实际UI／worker及四回环角色同H0通过；原C25证据保留历史，原HTTPS信任继续独立验收。

Display V2从共享注册表0xd按`display_registry::DisplayKey<T>`确定性派生。当前实链ABI的DisplayKey实际字段为`dummy_field: bool`，编译器对空Move struct执行LdFalse；键BCS必须为单字节00，不能凭源代码零字段假定空字节。SDK deriveObjectID及RTD display_object_id使用该原字节。依据[Sui官方类型实现](https://github.com/MystenLabs/sui/blob/main/crates/sui-types/src/display_registry.rs)及当前RTD对应源码；新dev夹具原生只读核验已确认派生ID、shared Display字段/cap、两件直接拥有NFT的BCS/owner/UID。只有GraphQL认证覆盖达到mint checkpoint1002694并固定S核验后，才可记当前资产集合与Chrome展示/隐藏验收；fresh Fullnode对象不替代索引快照。

## 2026-10-06 动态对象字段与派生对象ID

动态字段使用deriveDynamicFieldID(parent,type,keyBCS)；动态对象字段的name类型为dynamic_object_field::Wrapper<Name>。deriveObjectID用于derived_object机制，会额外包裹derived_object::DerivedObjectKey<T>，不能互换。Display V2采用后者，Kiosk Item字段采用前者。依据[Sui官方动态字段实现](https://github.com/MystenLabs/ts-sdks/blob/main/packages/sui/src/utils/dynamic-fields.ts)与[派生对象实现](https://github.com/MystenLabs/ts-sdks/blob/main/packages/sui/src/utils/derived-objects.ts)、当前RTD源码与SDK。

实际Kiosk NFT的ObjectOwner可为动态对象字段Field UID；应验证Field的父Kiosk、规范name BCS、子UID和原NFT owner链，而不是直接假定NFT owner就是Kiosk UID。当前受控OriginByte seed在checkpoint1007816的两件NFT、两个OwnerToken和两个共享Kiosk已通过原摘要／签名／effects／各层原BCS核验；OwnerToken仅是发现入口，不当成OwnerCap或交易授权。当前钱包生产动态字段推导保持正确；只有认证GraphQL覆盖后，才验收当前索引发现及Chrome两种转移分支。


2026-10-06 C31 Kiosk 复合查询期限：当前实际 CLI 与 Chrome 的 source Kiosk 完整读取会超过 20 秒（连续 GraphQL 约 1.1–1.7 秒），客户端将整个 Kiosk/native/OriginByte discovery/contents 有界集合期限统一为 60 秒，并合并调用方取消 signal。单次 HTTP 期限、原生 4 个物理读取 permit、分页上限、owner/BCS/登记校验以及最终同一快照复核保持原有合同。慢复合查询、60 秒拒绝迟到结果和中途取消均需测试；此客户端期限不代表服务覆盖水位或完整 NFT 转账验收。


## 非空 Kiosk 与挂牌状态的权威验收边界（2026-10-07补充）

按照 [Sui 官方 Kiosk 源码](https://github.com/MystenLabs/sui/blob/main/crates/sui-framework/packages/sui-framework/sources/kiosk/kiosk.move) 与 [官方文档](https://docs.sui.io/onchain-finance/kiosk/kiosk-example)，并逐项对照本地当前 RTD framework：普通 `place`、普通 `list`、`lock` 和 `list_with_purchase_cap` 分开验收。`take` 拒绝锁定及 PurchaseCap 独占挂牌，普通挂牌可由具备有效 OwnerCap 的所有者 take，成功时删除普通 Listing；不能把所有挂牌统一描述为禁止转移。仅 OwnerToken 发现不构成授权，PersonalKiosk 实际封装／借出与归還 cap 需按当前已认证 package／ABI 验证。

真实非空内容、Lock／Listing／PurchaseCap 的规范 DF 键和值、数量与 owner 必须来自同一实际快照；最终转移输入还需 Fullnode fresh object／当前授权。空 Kiosk、历史已转出 NFT、静态 BCS 或 native 夹具播种均不能代替当前 indexed／Chrome 内容和转移验收。新夹具使用独立受控账户与全新 gas，保留原 pending 与既有签名；单次提交的未知结果只查原 digest。


当前页面准入补充（2026-10-07）：NFT详情页与转移页共用同一资产快照 eligibility；public transfer且无locked／exclusive Listing可继续，OriginByte还必须登记且非独占。普通Listing仍放行；已dispatch仅保留原结果，未批准草稿在独占状态变化时撤销。snapshot允许发送不代替Fullnode当前输入／owner cap／正式模拟。两个真实React页面旧实现共8个业务断言失败，修复后相关100项测试及生产类型通过；C44为单独构建候选，当前严格入口未注册其新来源，不能据此宣称Chrome／链上资金转移验收或父任务完成。


### 名称功能启用与失败提示（C241 实施补充）

名称能力首先要求当前钱包网络配置具有名称合约部署；远程实验配置缺失不能把已配置的能力静默关闭。UI 的 `rtdns` 开关缺省为启用，显式 `false` 保留关闭语义；远程开关为真也不能补造缺失的部署。外部配置服务禁用时不为名称查询重新启用外网请求。

合法名称分三类失败：功能未启用、解析服务/覆盖暂不可用、在已验证快照中没有可用收款地址。三者都禁止检查/发送，但不能统一误报地址格式无效。服务返回目标仍必须经生产名称 reader 的链身份、registry绑定、原生高度/覆盖、新鲜度和发送前重新解析检查；展示名不授予发送目标权威。此补充是代码合同，实际正向名称与续期/过期完成情况仍由 QA-A15 的真实证据决定。


## 2026-10-11 C245：名称实时依赖与官方接口边界

当前显式registry名称读取开始时要求GraphQL覆盖当前Fullnode头，读取结束只容许快照后新增20 checkpoint；20是钱包的有界读取策略，不是官方协议常量。实际native1964660→1964990而四个名称覆盖仍1006768，当前正向保持拒绝。延长publisher预算只解决整批运行时间，不能直接证明索引实时追平。

[Sui官方gRPC客户端](https://sdk.mystenlabs.com/sui/clients/grpc)虽提供NameService，但[固定官方服务源码](https://github.com/MystenLabs/sui/blob/9948bc0d23ca89c0fe00ad7448071713ff14860d/crates/sui-rpc-api/src/grpc/v2/name_service.rs)和当前RTD均只为Mainnet/Testnet提供内置名称配置，Unknown拒绝；不能用同名SDK方法替代本dev的显式registry后冒称已支持。保持当前GraphQL/快照/lag及最终目标确认合同，未增加公网或JSON-RPC回退。详细实据与后续依赖见钱包合并目录workLog/20261011-C245-current-release-dependencies.md。


### C250 当前资金展示接入（2026-10-11）

现行首页/币种选择 `useGetAllBalances` 使用 `WalletRpc.readFreshBalances` → `WalletFullnodeReader.balances` → 原生 `StateService/ListBalances` 全分页。与 `readFreshBalance/GetBalance` 共用Fullnode负面准入/H0检查，返回当前资金数组，不返回GraphQL snapshot。固定S的 `readBalances/WalletBalanceReader` 及完整资产reader保持独立。前文C20/RPC-05/06中的“首页为固定S余额”属于当时实现；现行当前资金路由以本段及端点职责表为准。

读前/读后H0与高度、全流程10秒预算、最多256页/10000项、完整u64金额与coin/address分量、币型去重/游标前进、会话/调用者取消均验证；省略零分量遵循Sui与RTD render_balance，不缺省total或coinType。没有假冒checkpoint，也没有把索引落后改成零余额。UI缓存前缀独立为wallet-current-balances；当前会话5秒导航复用、空闲20秒刷新、写后失效、冷启动不从持久缓存恢复。NFT/仓位/对象组合快照不混入该列表；提交准备仍使用新鲜资金和最终模拟，不从页面余额获取授权。

Sui官方依据：[查询说明](https://sdk.mystenlabs.com/sui/clients/querying)、[固定源码ListBalances](https://github.com/MystenLabs/sui/blob/9948bc0d23ca89c0fe00ad7448071713ff14860d/crates/sui-rpc-api/src/grpc/v2/state_service/list_balances.rs)。当前真实Chrome缺陷、修复测试及安装结果分别见合并目录workLog中C249/C250记录；API、测试与实际Chrome不可相互替代。


### 2026-10-11 C254：质押轮次估算过期边界

新质押与赎回表单不得把已结束的索引epoch当作当前轮次；本地时间不在已知epoch区间、safe mode、零时长或不可表示时间时显示“轮次信息待更新”，不退回旧epoch绝对编号。仍在区间内的倒计时仅为展示估算，且在源epoch结束时同时失效；此判断不充当Fullnode当前轮次证明，不新增RPC、不扩大缓存新鲜度或交易授权。最终交易仍按Fullnode原生预检/有效期验证，已确认收据的奖励轮次仍来自已核验事件。


### C257：dApp 嵌套授权的身份读取

同一次dApp请求复核先执行本地账户/选中状态/网络绑定栅栏，再读取原请求、源交易绑定和当前站点权限，最后执行一次完整三入口身份核验（内部仍在网络读取前后复核本地账户和profile）。不能把本地栅栏单独视为网络授权，也不能跨签名/派发边界缓存上一次正向结论。该调整移除原同边界前后的重复网络读取，保持出口原始lease、30秒有效期、撤权检查、严格journal和未知结果只读恢复合同。

C256真实执行当前尚未确认：验签后未观察到ExecuteTransaction，原digest进入恢复。重复检查放大出口有效期耗时是已定位的风险，精确拒绝原因未由原捕获直接暴露；C257候选通过不等于C256已确认或全部dApp执行完成。不能删除原journal或重新广播该摘要。

### C257：dApp 授权包装中的查询复用（2026-10-11）

同一后台授权包装入口使用现有本地账户/网络会话检查，出口保留一次完整新鲜网络身份核验并复验账户、权限和请求绑定；不跨动作边界缓存授权，不扩大30秒出口有效期。当前代码及2893项回归/两类型/生产产物审核通过。C256原签名交易仍未确定，具体超时点未被原日志记录，不能将该优化宣称为本笔根因完全确认或执行成功。

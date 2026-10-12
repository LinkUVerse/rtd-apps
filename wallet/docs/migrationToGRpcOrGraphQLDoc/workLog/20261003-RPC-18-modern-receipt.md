# RPC-18／20 现代交易详情与收据推进

日期：2026-10-03。继续RPC-14／18／20及TX-06／08，未新增完整任务勾选，不能将近期收据替代长期归档／账户历史职责。

## 编码结果

WalletRpcProvider注入只读readTransactionDetails，增加hasFullnodeSession以使GraphQL准入等待不阻断独立Fullnode收据；会话字段不能冒充链身份已验证，shared core新增receipt-hooks与现代TransactionDetails／Transaction类型。ExecutionReader.details使用私有Fullnode binary gRPC-Web Ledger.GetTransaction，明确完整mask，H0／水位／BCS／effects／digest／签名字段／时间／精度检查；实际NotFound返回未知，Unavailable或缺字段拒绝，不广播、不写journal。该入口复用执行回执核验，但不向UI释放execution client。

新增event-envelope：按照当前Rust Event字段顺序与TransactionEvents::data重新序列化整组事件，要求bytes及TransactionEvents:: typed Blake2b256摘要与effects一致，截断列表不冒充完整，JSON不作为质押事实。补充模拟／回执validator的eventsDigest／dependencies／auxDataDigest与effects BCS一致性；真实无事件可以为空，缺必需事实不能默认空。

收据页移除getTransactionBlock／旧RtdTransactionBlockResponse／navigation.state旧响应初始值，改现代native读取及状态。单次请求有界，自动再查最多10次，错误／未确认提供手动刷新；详情读取错误不标题为链失败。缓存含完整binding与独立readSession，不持久化，切网迟到拒绝。

ReceiptCard现代展示保留状态、日期、全部余额变化、gas、BCS对象效果和当前staker的全部质押／赎回事件。余额按address／币种和bigint分组，不按等额正负猜对手方；对象归属／版本直接由effects BCS导出，objectTypes为索引补充。质押／赎回使用当前validator.move准确BCS字段，principal／reward／amount不转Number；TxnAmount修复大整数abs路径，GasSummary区分赞助账户本人支付费用。移除这些基础收据组件的旧SDK类型依赖。

## 权威对标与原生Rust证据

读取当前RTD event.rs、effects/mod.rs、crypto.rs、validator.move、grpc Ledger渲染及SDK grpc/core.ts；查询固定Sui c860146823abcedef45a1b5a9c766920be98a29c对应官方源码。web GitHub cache miss未当作源码，raw HTTP成功文件与SHA已冻结在official/sui-receipt-events-manifest.json。wallet05与archive04第9节逐字对齐，原目录与冻结原文保留。

使用既有当前debug rtd-types／bcs库及rustup1.96.1编译单独Rust向量程序。初次编译成功、运行因短地址解析失败；改成完整地址后编译与运行exit0。生成0／1／55项事件原生BCS及摘要向量，与TS逐字节比较通过。源文件、库绝对路径／SHA、编译／运行日志及三向量已冻结；该程序不启动链、不修改rtd源码／DB，不将此证据当实链验收。

## 验证

- 371/371，30文件定向测试exit0，新增28项；其中10项现代详情、5项事件封装、5项业务模型、5项实际Provider／Hook和3项i18n。React act警告已消除。
- 超过50事件完整返回、截断／错摘要／缺BCS拒绝、成功／链失败现代模型、大额余额／奖励、只认本账户全部事件、NoFound未知、时间溢出、切网迟到都覆盖。
- rpc/core领域及直接依赖定向typecheck exit0；完整钱包exit2、161条诊断（上批169、初始276），本批收据／领域／事件文件无诊断。完整Webpack构建尚未通过，不计TRY-01。
- 23个源码／测试文件prettier检查exit0；13章／14冻结源／21RPC／22QA文档核验通过，两边第9节相同。AST全wallet/core615文件、47生产候选、3wire字面量；候选包含原生getTransaction／其它产品，不能作为bundle清零证明。

日志：20261003-receipt-tests.log、receipt-typecheck.log、after-receipt-typecheck.log、receipt-format-check.log、receipt-inventory.log及event-envelope-rust-*。详细SHA与范围：evidence/20261003-receipt-verification.json。

## 尚待推进

原生归档受限Ledger／裁剪证明fallback、journal已确认终态独立发现、GraphQL写后读水位／历史新领域模型未完成。质押卡片的验证者／APY／epoch时间下游仍走旧core路径，图片display不能将当前对象冒充历史事实；这些继续分别迁移。NFT／质押／dApp／Qredo及全签名入口迁移、全bundle／真实Chrome与debug链／试用包仍待完成。本批无新环境启动／合约部署。总体12/98=12.2%、不可试用，完整目标继续进行。

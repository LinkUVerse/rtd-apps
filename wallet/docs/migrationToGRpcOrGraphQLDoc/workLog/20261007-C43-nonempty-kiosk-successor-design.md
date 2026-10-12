# C43 非空 Kiosk 新受控夹具与完整转移矩阵

本合同服务 RPC-22／23、QA-A07、TX-04 M3／M5、TX-08；子项不另计 98 父项。原三个严格 pending profile、原所有签名／gas 引用／成功交易、原 stake 与链数据均保留；创建器只执行一次，未知提交结果只查原 digest。

- [x] K1 核对当前 HTTP1.1 明确 authority、29 容器／14 health、全部原进程及最新八个 debug；创建全新三账户，私钥只保存到权限 600 的独立运行目录。仅 source 申请本地 Faucet，两个新 recipient 分别用于已有／自动创建 OriginByte 目标；不得使用原账户 gas。
- [x] K2 使用指定 localDeploy 的独立 Move 源码、当前 RTD framework／debug 和当前链 compiler id 编译；正式 checks-enabled 模拟／验签／fsync pending／单次发布。保留原 unsigned bytes、receipt、digest，不重新发布同一操作。
- [x] K3 同样单次播种：一个 framework Kiosk 四件（serial1 普通、2 普通挂牌、3 锁定、4 PurchaseCap 独占挂牌）、一个 PersonalKiosk 一件（serial5）、直接持有一件（serial6）、两个 OriginByte NFT 与明确已有目标。全新夹具；原项目 profile、pin 与原对象不更改。
- [x] K4 独立 native H0／原签名／规范 TransactionData 与 Effects、当前对象 BCS／cap／DF owner／Item／Lock／Listing／PurchaseCap／数量；对普通和普通挂牌成功 `take`、locked／exclusive 拒绝做真实 checks-enabled 的未执行模拟。原状态保持，不能把 native 准备当作 indexed／Chrome 验收。
- [ ] K5 正式发布与 14 HBase／23 SQL／4 Rocks、Display、十域及账户根实际覆盖本次 checkpoint 后，以当前 C43 和新钱包 profile 正常导入／保护账户，核验非空内容、风险、最终准备和全部 NFT 竞争／持久恢复；当前历史索引不能替代本次持有。
- [ ] K6 当前钱包完整普通／Personal／OriginByte 既有目标及创建目标的一次批准转出、受控收款人／原回执／Observer 写后 indexed 刷新、三 journal／密文／冷恢复；只按完整父合同逐项收口。

权威语义采用 [Sui 官方 Kiosk 源码](https://github.com/MystenLabs/sui/blob/main/crates/sui-framework/packages/sui-framework/sources/kiosk/kiosk.move) 与 [官方 Kiosk 文档](https://docs.sui.io/onchain-finance/kiosk/kiosk-example)，并对照当前 RTD `kiosk.move` 294–357、394–420：`take` 拒绝 locked 与 **独占**挂牌；普通挂牌不会因 Listing 本身被拒绝，成功 take 会删除普通 Listing。生产 `nft-transfer-preparation.ts` 已按 isLocked／listing.isExclusive 区分，本次不改成所有挂牌一律拒绝；真实四类夹具分别验收。锁定需要实际 TransferPolicy，不用 `new_for_testing` 或伪造 DF。

前置测量：[当前 36.16 秒窗口](./20261007-C43-http11-current-catchup-performance-01.json) native 4.48 cp/s、writer3.87／consistent3.84；head421795、writer369442／consistent369771，只是观察点。当前已发布376723／pending401214的只读观察说明发布与 consumer 两段均需继续分析；不放宽名称 minimumCheckpoint／S+20。当前 HTTP1.1 socket 四帧实证单列 [原对象保持](./20261007-C43-http11-current-socket-closure-01.json)；最初 inline SyntaxError 未产生网络请求，失败 [00](./20261007-C43-http11-current-socket-closure-00-failure.json) 保留。


## K1–K4 实际结果

[编译准备](./20261007-C43-nonempty-kiosk-prepared-01.json)、[新账户资金](./20261007-C43-nonempty-kiosk-funding-01.json)、[原发布只读恢复](./20261007-C43-nonempty-kiosk-publication-recovered-01.json)、[一次播种](./20261007-C43-nonempty-kiosk-seed-01.json)、[独立原生审核](./20261007-C43-nonempty-kiosk-native-independent-01.json)和[四模拟独立审核](./20261007-C43-nonempty-kiosk-take-independent-01.json)通过。source 为 0xd50b47e5956effdff99b840cc1a34eb7e23a6a1997ec2e324ff4960b7f27077c；新包 0x9ffb3f86e97388c60a94b52716b3a7eeda085854238b928a395a5625289a1332。原发布 3v9maE8nVbJD72yk2nGjvMeRBqvBsQsAb453mLni6F1S／424164；原播种 cSRkmqRs95uTmVP2Vt2sLo5zAqvW3sQUuS7GvbcXeT2／424677。两次正式 checks-enabled 模拟、两次私有签名、两次实际 Execute；独立审核不新增签名或提交。

发布后的首次工具读取失败保留于 publication-postread-failure-01：四个合并输入 gas 正常被 canonical Effects 删除，不能要求全部输入仍为 live。只读恢复精确核验原 bytes／签名／digest、四个 Deleted／NotExist 和真实包／UpgradeCap／TransferPolicy，未重新模拟、签名或提交。旧 creator 永不重跑。

八件真实 NFT 的数量为 framework 四件、Personal 一件、直接一件、OriginByte 两件；五处真实 Item DF 与 NFT owner、普通 OwnerCap、Personal 内部 cap、两个 OB OwnerToken／private capability／Version3／NftRefs、普通挂牌和独占挂牌价格、真实 PurchaseCap 逐项独立核验。四份实际 gRPC 请求均明确 ENABLED／doGasSelection=false：普通与普通挂牌成功（后者模拟 Effects 删除原 Listing），锁定 MoveAbort8、独占挂牌 MoveAbort4。没有签名或提交这些 take 模拟，实际对象与 gas 版本／digest／内容保持。take-simulations-01／02 的初始常量赋值失败均为零模拟，保留原失败；03 与独立01才是四次真实通过证据。

[操作后环境保护](./20261007-C43-nonempty-kiosk-protected-runtime-01.json)确认当前29容器／14健康、原29进程与新listener、最新八debug、1015个原私有文件、1119个产品源码保持。K5／K6仍开放：正式发布、41管线、账户根、Display与十域须实际覆盖424677，才能运行当前Chrome完整转移／竞争／回执。不能用历史窗口或 native fallback 代替；原 FFMB／DEFM／BMWQ／GYF profile 不打开，原摘要不重发。


## K5 前置的当前观察与拒绝验收

[实际覆盖观察02](./20261007-C43-nonempty-kiosk-readiness-02.json)完成：正式376723／pending401214；14 HBase最低375753、23 SQL最低375760、4 Rocks最低375764、Display375760；当前声明与native共同窗口333000–375762，账户窗口0–375757。七前置均未达到原播种424677，`infrastructureReadyForProductionProbe=false`。passed只表示只读观察成功，不是K5完成。首次检查器因checkpoint规范字符串的类型断言失败，发生于网络／数据库前，原失败及源码保留。

[生产最低高度拒绝01](./20261007-C43-nonempty-kiosk-production-readiness-01.json)实际调用生产 WalletAssetReader.open(minimumCheckpoint=424677)，只发一份当前现代GraphQL准入请求；[独立原帧01](./20261007-C43-nonempty-kiosk-production-readiness-independent-01.json)解码十域与Display，真实共同上界376103，生产明确 coverage 拒绝。零profile／模拟／签名／提交，不使用旧快照或原生替代。正面库存分支未执行。

后继 `scripts/probe-C43-nonempty-kiosk-indexed-v2.ts` 仅修正静态 WalletKioskItem 显式类型，原实际v1及typecheck01失败保留。该工具计划在fresh覆盖全通过后核验同S三类非空Kiosk、四类挂牌／Lock、Personal cap、OB token／registered refs、existing空目标和new无目标、direct serial6、八NFT indexed与fresh native版本／digest／owner／BCS。正向和Chrome仍未运行，不预勾K5／K6。下一步真实共同覆盖424677再执行，不重跑fund／publish／seed或原三finite。

本轮最终[环境复核](./20261007-C43-nonempty-kiosk-final-environment-01.json)与[两链真实gRPC探测](./20261007-C43-nonempty-kiosk-final-chain-readiness-01.json)通过：当前29运行／14健康、全局110＝98运行／12退出、原1015私有文件和最新八debug／全部原进程保持；未新增清理动作，累计42确认退役。新库存工具v2及全部生产导入类型检查[02](./20261007-C43-nonempty-kiosk-indexed-tool-typecheck-02.json)零诊断，正向分支仍未执行。14章／14原文／22QA／21RPC映射完整核验与三仓git diff --check通过；84/98保持。

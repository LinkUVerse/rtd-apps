# 2026-10-05：D4历史Display服务能力与钱包basis准入

推进RPC-03／NET-04下的D4；本批编码、库回归、钱包测试和开发构建完成。未执行认证历史回放、新原生服务部署或新版Chrome验收；48/98及trial_ready=false保持。

## 服务覆盖合同

ServiceConfig.displayHistory返回非空DisplayHistoryCapability：apiVersion=1、supportedTemplateKinds=[V1,V2]及coverage。coverage绑定genesisDigest、sourceId、历史generation、firstCheckpoint=0、lastCheckpoint／Digest、snapshotCheckpoint／Digest。apiVersion与网络profile.schemaVersion是独立合同；历史generation与网络配置generation也是独立身份。

新增DisplayHistoryCoverageKey(S)，以NULL类型数组关闭发布事件查找，复用D3同一次MVCC SQL对独立coverage、hist管线watermark、genesis／H0、端点marker及S marker的检查；不伪造Move类型或缺失模板作为覆盖依据。每个请求S均返回自身marker摘要，无模板事件仍可声明覆盖；任一键缺历史、超界或watermark不一致都使整批失败。

availableRange(MoveValue.display)及Display.output／errors／basis、两个basis类型的字段明确依赖hist_displays、obj_versions、consistent和ledger_grpc；能力／coverage字段依赖hist_displays。范围解析改为async：先核对缓存中的所需管线，再检查同scope S的实际数据库覆盖；缺历史不能返回空集合或默认范围。新增SDL与依赖快照已按预计变化检查，未删除原接口。

## 钱包准入与失败语义

GraphQLSnapshot只在依赖包含MoveValue.display或ServiceConfig.displayHistory时请求该能力。Admission核对根scope的H0／marker／格式；pin、每次read和末验均在checkpoint(S).query内读取walletDisplayService，并核对S与GraphQL检查点摘要及最初sourceId／历史generation。快照proof及缓存key保存冻结能力；历史上界正常推进不使有效S失效。区分网络generation与历史generation，不能通过相等比较混淆二者。

WalletAssetObject.display非空时必须有WalletDisplayBasis。v1核对规范类型／模板ID、同S、source≤S、完整u16发布版本、UInt53交易／事件位置、规范Base58摘要、原事件BCS的64位小写hex SHA、历史来源及S marker；来源checkpoint等于S或0时分别核对S摘要或H0。v2核对同一覆盖身份，按0xd registry与DisplayKey<T>派生对象ID，使用对象版本及对象／前一交易摘要和contents BCS SHA；不套用v1 u16限制。SHA和coverage描述来源／内容身份，不能当成钱包独立验证的可携带证书；认证来源和提交fencing的生产成立仍须D5／D6。

明确null模板只有已准入完整历史能力才有效；缺basis／能力、partial GraphQL响应、错误类型／来源／S、未来模板、字段不完整、调用方取消、超时、旧session及预算耗尽都拒绝完整结果。沿用四路读取名额、64等待队列、每请求超时及完整集合分页预算；能力与basis嵌入原请求，不增加额外叶请求。跨批次对象查询含新字段仍通过默认5000字节请求预算测试。

## 权威核对和测试夹具

[Sui当前Display概述](https://docs.sui.io/develop/objects/display/display-overview)确认v2使用每类型确定性registry对象；[固定官方源码](https://github.com/MystenLabs/sui/blob/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-types/src/display_registry.rs)用DisplayKey<T>和原始key字节00派生对象。display_registry.rs与derived_object.rs及SHA保存于[官方manifest](../evidence/official/20261005-display-admission/manifest.json)。RTD本地常量registry=0xd已检查；Rust和TypeScript独立派生0x42::nft::NFT均得到0x740798106da92e9542250651d68bbd154073b8dbcfa98199598783becdfbc49f。

本批displayHistory、historyCoverage及basis是RTD的连续历史扩展，不声称Sui已有同名标准接口。夹具对完整请求使用本地RTD导出SDL；另将扩展投影移除后，分别校验SDK SDL与保存的官方Sui SDL。投影保留__typename避免固定S纯能力查询成为空selection；完整RTD校验没有绕过。Coin／Kiosk／staking夹具变更类型时同步其模板类型依据，切链夹具同步能力H0；这些修改不放宽生产准入。

## 最终验证

- Reader整个库38项通过：[证明](./20261005-display-admission-reader-02.json)、[日志](./20261005-display-admission-reader-02.log)。D4新增2项实际PostgreSQL函数，验证无类型覆盖数组、重复S、S摘要、空batch、超界／溢出、缺历史及缺watermark。
- GraphQL整个默认feature库249项通过：[证明](./20261005-display-admission-graphql-03.json)、[日志](./20261005-display-admission-graphql-03.log)。D4新增2项实际PG函数：能力／范围实际coverage失败或成立，及四种缓存管线缺失矩阵；原D3历史resolver／union测试继续通过。两份最终proof sourceUnchanged=true，sourceHead和diff及全部changedFiles一致，并再次核对当前文件。
- 钱包133文件1463项通过：[全量](./20261005-display-admission-wallet-full-03.log)，本批新增45项历史能力／basis／跨语言ID／完整失败／取消／预算测试；[完整tsc](./20261005-display-admission-tsc-03.log)exit0。测试是SDK Fetch、SDL及夹具合同验证，不能作为实际HTTP／浏览器验收。
- [开发构建和双入口AST](./20261005-display-admission-local-build.json)通过，显式沿用reviewed profile03 revision2，sourceUnchanged=true；构建前旧dist完整保留。UI和background摘要见证明。新版产物要求新历史合同，旧服务未部署此能力，不声称新版资产页面已可用。
- [四入口39方法闭包](./20261005-display-admission-wire-closure.json)、[Provider与旧Kit可达性](./20261005-display-admission-provider-check.json)通过；这是源码／已构建map静态检查，不是全部动态流量证明。
- SDL导出1项及范围快照1项：[SDL](./20261005-display-admission-schema-01.log)、[最终范围](./20261005-display-admission-ranges-03.log)。文档13章／14份保留原文／22 QA／21接口覆盖及格式检查见最终整合证据。

## 失败记录与修复

Reader首轮38项测试exit0，但范围快照在期间更新导致sourceUnchanged=false：[旧proof](./20261005-display-admission-reader-01.json)，不能记稳定源码通过；最终两库证明重新生成。GraphQL首次244通过／5失败：测试Query和真实Query同名，能力类型注册引入真实Query后冲突；将测试根显式命名DisplayTestQuery后修复。失败[日志](./20261005-display-admission-graphql-01.log)和后续阶段249项证明均保留。

钱包首次3文件35通过／61失败：移除自定义能力的上游投影把pin的query变为空selection；修复投影后95通过／1 Coin夹具类型依据失败。首次全量1430通过／31失败包含夹具类型未同步及Kiosk测试缺导入；补齐后全量1461通过，新增两个最终回归后1463通过。首次tsc在Display错误字段测试中发现缺必需basis，测试已保留basis并继续验证字段render error。失败日志与中间轮次均保留，最终结果只引用末轮。

## 后续

D4本批完成，不勾选父RPC或NET任务。D5仍需认证源完整回放、同S原发布内容／未发布编辑及中断恢复；D6必须先保存现有debug产物和运行绑定，按最新rtd源码重编译八个debug目标及所需认证辅助产物，由link-u-smart-contract脚本实施新历史schema／fence注册和受控回放／恢复原管线，再接入同一绑定的新GraphQL服务及实际完整Display／Chrome。不能使用旧object_versions专用reload脚本直接部署本批广泛变更，不能篡改旧构建证明或用当前sum_displays补造历史。

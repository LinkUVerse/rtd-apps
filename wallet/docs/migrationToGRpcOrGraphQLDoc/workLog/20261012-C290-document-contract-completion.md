# C290 主方案内容终核

REL-05.4 的范围是 14 份主方案的现行合同、官方依据、本地实现及历史语境对齐。C288/C290 完成该项；逐 RPC/页面的全部实证追溯、98 项最终通过、运行资源最终清理仍分别由 REL-05.5–8 验收，不由本文代签。

| 章节 | 终核内容及裁决 | 当前依据 |
| --- | --- | --- |
| 01 冲突裁决 | 官方协议事实、RTD fork 和部署实证分开；无 JSON-RPC fallback；原基准完整保留 | 固定官方 SDK/SDL manifest、C281 当前来源、C280 冷恢复 |
| 02 选型与基线 | 旧 HEAD/已撤销 archive*.ts 仅作历史；单活动钱包允许必要的隔离 G3/G4 对照环境 | C274 debug、C287 淘汰 G0、当前 shared/rpc |
| 03 端点职责 | Fullnode 当前资金及执行；GraphQL 固定快照；archive 点查；accountHistory 独立。桥接已经落地，旧392xx不作当前地址 | C281 四入口；SDK Fetch transport；C280 当前服务 |
| 04 SDK与功能 | BCS、联合结果、分页、Kiosk/OriginByte、质押系统/兑换率、名称新鲜度分别成立；更正不存在的当前文件名 | asset/kiosk/staking/name readers；C275–C279；C281 |
| 05 签名恢复 | background 协调；IndexedDB journal v2只存原摘要/最小回执；durable pending后不重签、不重建、不自动重发 | execution-journal/coordinator、background/execution、C190、C280 |
| 06 网络与缓存 | 完整H0/generation/revision；四类端点；OriginByte配置；可读上界与保留下界分开；缓存/分页/取消/权限合同 | profile、identity、session、read-admission、snapshot-pagination；C207/C266/C270 |
| 07 批次与验收 | W00–W07分组门槛与98项/A01–A22区分；修正编号；历史“未实施”不覆盖后续结果；生产HA等独立范围保留 | Task/leftProgress；C190/C212/C279/C280/C281 |
| 08 全量RPC映射 | 原21种线协议保留，18种未用方法不扩大范围；通用SDK调用与钱包自定义reader分开；名称实际走显式registry动态字段和Fullnode复核 | 21类current source anchors；name-reader；SDK resolver；C281 |
| 09 官方规范 | gRPC标准读写、GraphQL组合、显式归档；两客户端能力不等于本项目允许随机选路 | 最新官方迁移/客户端文档；固定RTD源码 |
| 10 旧审计 | 2026-09-24旧依赖/调用计数完整留存；不再作为现行C278仍有旧Kit或旧RPC的证据 | 旧源码归档、C281的531个当前TS文件/547个产品模块 |
| 11 拓扑与留存 | 历史rtd-indexer与现行archive-service区分；G4已部署Ledger/HBase/PG/Rocks，生产拓扑仍是建议；旧BFF兼容路线排除本钱包 | C280持久数据/四入口；当前ledger-reader与归档合同 |
| 12 实施方案 | Mobile旧接口迁移为另一个应用的历史建议；钱包按04–08；质押不再笼统映射epoch起始systemState | staking-reader/snapshot-reader；C276真实赎回；C281 |
| 13 验收次序 | GraphQL身份为checkpoint(0).digest；钱包原摘要恢复与Mobile订单模型分开；尚未通过项不得宣称生产完成 | identity；journal；QA-A17与REL-05继续开放 |
| 14 安装回归 | C278原路径/四账户；G4原绑定；C286临时只读profile与锁屏阻塞明确标示，未冒称已切回 | C278安装/C281来源；C286实况；C280/C282 |

源码终核发现并修正两项实质描述错误：归档 `checkpointHeight` 是共同覆盖上界，不是最早可读下界；现行名称并非直接依赖通用 SDK 的 `nameRecord/defaultNameRecord`，而是显式 registry 的 BCS 动态字段组合，加 Fullnode 当前字段/时钟复核。另修正了不存在的 `execution-journal-browser.ts` 引用，journal 自身直接封装 IndexedDB。

双方七份对应方案的正文变化同步；剩余差异限定为合并编号、相对链接、文档入口说明和既有章节重排。归档源第二章的“2026-10-07 G3 PostgreSQL传输复用”全文在合并第06章，未遗漏。原归档目录、原12份编号文件/两README副本，以及本轮逐文件更新前副本均保留。C241名称提示与C207首页准入两段已补回归档侧对应方案。

本轮在线复核[官方SDK迁移](https://sdk.mystenlabs.com/sui/migrations/sui-2.0/json-rpc-migration)、[gRPC客户端](https://sdk.mystenlabs.com/sui/clients/grpc)和[归档查询](https://docs.sui.io/develop/accessing-data/archival-store/using-archival-store)，并结合C288已读取的Core、Kiosk、Wallet Builders与GraphQL官方资料。官网通用方法与RTD部署能力分别描述；不会从Sui官网的上线日期或默认网络推断RTD实际可用。

[机器核对](./20261012-C290-document-contracts-01.json)绑定当前14章、7份源方案、源码锚点、官方冻结材料和修改链；检查所有主章本地链接可定位，C281来源604个输入及业务审核45个输入仍与原SHA一致。哈希和链接检查只保证材料对应，语义裁决是上表逐章审核结果。带日期历史段落保留原试验结果，不冒称在当前环境逐一复跑。

当前服务/浏览器的未完成合同继续写入leftProgress：全0..709569重放、完整比较/WAL、四服务实际换H0、后端换代和仅归档重建等。本文仅收口文档语义子包，不新增运行验收通过数。

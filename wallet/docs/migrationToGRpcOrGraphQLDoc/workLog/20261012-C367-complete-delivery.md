# 钱包新 RPC 迁移完整交付

验收时间：2026-10-12T09:57:23.198159+00:00。原 **98/98** 项、最后五项 **45/45** 子包、原27个剩余子包均已完成，剩余比例 **0%**。

## 当前可试用环境

普通 C51 Chrome 已安装 C362（26.10.12.0），扩展ID `kiahlcbejlgmnbmcggnhagbccojnbkaa`。原四账户和独立profile保留，稳定路径仍为 `dev-20261006-03/certified-positive-production-C46-20261007-01`，目录名不代表当前构建。当前G4 `c51-tls-acceptance` revision4，完整H0为 `BTrU3deMDbnWcUWLJ2ruDj9vbCC4gaYnVj8qV3K2nFah`。

| 服务 | 当前入口 |
| --- | --- |
| Fullnode gRPC-Web | http://127.0.0.1:43150 |
| GraphQL | https://127.0.0.1:43210/graphql |
| 归档 gRPC-Web | https://127.0.0.1:43203/archive |
| 账户历史 | https://127.0.0.1:43211/account/graphql |

指定rtd最新源码C347 debug已由C360实际部署至G4；C366在临时环境清理后核验源代码/八种产物、13个当前容器、持续出块、真实余额/资产/历史/质押/名称和原交易读取，普通Chrome首页100 RTD及发送入口通过。C362修复验证者选择被后台刷新清空的问题；269项针对性回归、钱包/core两项类型检查、完整生产构建和依赖闭包通过。

## 完整恢复及清理

原0..709569全部41条持久管线已从归档完成重放。SQL29表53,813,169行、HBase14表83,387,096单元及时间戳、Rocks8列族、归档8表、完整账户事实与三账户9/6/1笔支持历史均已核对。源码中的位图恢复缺陷已修复并验证36行338个成员。

published与副本各795,324版本，staging 1,006,772版本完整核对；恢复时所有body/VersionId已逐一读回，冷启动后逐版本核对size/latest并重读全部元数据。真实HBase未flush WAL与PostgreSQL Immediate Shutdown恢复、全数据故障后比对及历史fence重启持久化通过。全部工作限本机指定dev；不宣称生产跨宿主HA或正式RPO/RTO。

已正常停止并删除 13 个完成使命的恢复临时容器，正常停止 6 个主进程及账户worker，删除 1 个确认无使用者的专用镜像；保留 8 个数据卷和全部bind数据、配置与失败记录。共享镜像按仍有使用者保留。G3用于原H0、默认开发profile和原pending对照，G4用于当前试用；两条链及 `rtd-archive-events-hbase3` 六个中间件保留，无无依据停机。

## 验收边界与后续使用

98项完成指钱包约定的迁移及验收合同。21个旧RPC/54个路由已有逐项来源、版本和例外追溯；不声称54条路由全部重跑真实浏览器。历史失败保留，后继通过注明范围。账户活动仅承诺证书支持类型和窗口。当前兑换不可用；zkLogin签名、Qredo执行、Ledger、法币服务按明确支持状态隔离。

原G3待定摘要按原H0/generation/账户保留并只读恢复，不因G4不存在该摘要而删除、重签或重发。所有后续重启先核对当前身份记录与真实端口，使用指定仓库最新debug和合约部署目录；不重放绑定旧PID/容器ID的历史单次故障脚本。不在文件中保存钱包密码。

证据：[生命周期](./20261012-C363-lifecycle-completion.md)、[98项逐项审核](./20261012-C364-parent-contracts-complete.md)、[最终运行与清理](./20261012-C366-final-runtime-01.json)、[当前源码/页面追溯](./20261012-C362-upgrade-completion-01.json)、[全部实际业务流量](./20261012-C281-business-traffic-completion.md)。

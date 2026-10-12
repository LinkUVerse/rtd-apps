# C146：固定归档组与钱包迁移实例的依赖边界

## 核查结论

`rtd-archive-events-hbase3` 确实属于 `rtd-archive-service` 的完整固定开发部署。它包含 24 个服务，除 PostgreSQL、MinIO、ZooKeeper、HBase/gateway 外，还有消费者、Ledger、GraphQL、账户查询、准入、Consistent B/C、PostgreSQL 热备/WAL 和观测组件。不能把它描述成与钱包迁移无关的项目，也不能因为本轮未启动就认定已废弃。

本轮选择启动集合依据的是既存钱包测试配置的实际连接路径：G0 原链恢复/对照、G3 当前钱包测试、C120 完整历史查询恢复。它们分别拥有独立的数据和凭据。当前恢复了这些部署的 18 个基础中间件及 18 个查询服务进程；原固定组的 24 个容器仍停止，原容器定义、镜像引用及数据卷保留。

## 实际部署与连接路径

| 部署 | 用途和身份 | 本轮状态及边界 |
| --- | --- | --- |
| `rtd-archive-events-hbase3` | 原固定事件链完整归档部署；`DATA-SOURCE.md` 的链 ID 为 `6KCU6Gnv3PNLKE1mNopYdSsqQTGJ6K3KDPtQtVtupYZo` | 24 个容器实际全部停止；没有实测其当前链身份或接口，不能计入本次通过 |
| `rtd-dev-wallet-pub-20261004` | G0 原钱包链恢复/对照；`3tEPxLxUysGx4gfr8UEycvH7xohMWuwKVbTX5np4TCYj` | 6 个中间件健康；G0 原生查询恢复，新链增量仍待 |
| `rtd-dev-wallet-g3-20261006` | G3 当前钱包测试；`BkuLHhdtnoK7yLxo2eQuvcjHtdyipE7MMyxgTJiyHGg4` | 6 个中间件健康；原生查询恢复，G3 账户配置实际绑定该身份 |
| `rtd-dev-wallet-c120-20261008` | 为 G3 完整历史查询恢复提供独立存储；不新增另一条业务链 | 6 个中间件健康；C139 六消费者及观察器尚未完成重启恢复 |

当前 G3 实际保留的原生服务命令使用 `rtd/target/debug/rtd-kvstore-alt`、`rtd-indexer-alt`、`rtd-indexer-alt-consistent-store`、`rtd-kv-rpc`、`rtd-indexer-alt-graphql`。8 个 debug 产物仍与本轮登记的当前源码身份匹配。账户接口实际使用 `rtd-archive-service/modules/account-activity/account_wsgi.py`，经 gunicorn 部署；没有以某个容器组的名称判断实现归属。

G3 账户 reader 的实际配置为：对外原生 GraphQL `https://127.0.0.1:41900/graphql`、内部 GraphQL `http://127.0.0.1:41840/graphql`、准入 `http://127.0.0.1:41892/authorize`。原生查询的 PG 为 `41830`、Ledger 为 `41885`、实时 Fullnode 为 `41750`。原固定组文档中的 PG `35434`、查询入口 `39231`、Fullnode `39214` 不在这条依赖路径中。数据库、证书及私有命令仅记录摘要，不复制凭据。

因此，在原固定组停止时，仍可恢复和验证这条独立部署的实际查询路径。不同链身份的数据不能混接；“相同源码模块部署于独立 dev 实例”也不等于原固定部署的版本、配置、恢复及全部业务验收已经成立。

## 已验证与尚未验证

[本轮只读依赖核查](./20261009-C146-archive-dependency-scope-audit-01.json)实际核对了全部 113 个现存容器的配置/运行状态，36 个选择启动的容器、18 个基础中间件健康、18 个查询进程的本次出生身份，以及 G3 账户 reader 的配置。其他 77 个容器仍保持停止；其中包括相关但本条连接路径尚未调用的固定归档组。本报告仅通过依赖核查。

此前两端实际 checkpoint 0 回读、G3 14 条 HBase 水位同链及 Ledger `/health` 成功，均只计各自限定范围。当前节点仍未证明 checkpoint 持续推进；发布者、staging blob indexer、账户生产者及 C139 完整回放恢复仍待。原固定组接口、公开钱包接口全链路、完整归档/WAL/冷恢复及 TX-01/TX-04 不能据此记为完成。

后续验收应按每项实际端点、链身份、权限、覆盖高度和生产者依赖决定启动集合。调用原固定部署或验证其中热备/WAL/Consistent B/C 等部署行为时，必须启动相应实际环境再验；如果使用独立恢复部署验收，也须明确其完整角色及真实故障恢复证据。不能从另一部署进程在线推导其通过。

## 清理与进度

[本轮实际清理](./20261009-C146-obsolete-wallet-environment-cleanup-01.json)删除了最早 `rtd-wallet-migration-archive-20261003-01` 的 5 个已被替代且停止的容器、一个停止的旧钱包 PG，以及没有任何容器引用的 guard 中间镜像 `20261007-03/04`。未删除数据卷、共享镜像、原固定组、现用 PG 或验收 profile。

原 98 项仍为 89/98，签名授权与持久恢复仍为 10/12，细分剩余 9.18%，`trial_ready=false`。依赖核查、环境启动和清理不折算为业务验收。

# 同链查询服务debug启动与准入缺口

2026-10-03。本轮沿Task的同链数据入口／ENV-04–08方向推进，未改变既有归档链。当前rtd HEAD49a05a0de323b45a49d067a855c419e98d071afc、tracked diff SHA与原debug编译记录一致。cargo build构建rtd-indexer-alt-graphql、rtd-indexer-alt、consistent-api成功（3m05s）；随后--locked -j4构建rtd-indexer-alt-consistent-store成功（3m02s），均为dev unoptimized+debuginfo，未使用release镜像。日志分别为20261003-query-services-debug-build.log、20261003-consistent-store-debug-build.log。

独立链checkpoints目录保存从0.binpb.zst开始的完整文件，实际已超过2.8万checkpoint。指定link-u-smart-contract仓库新增start_wallet_query_services.py：显式绑定runtime/debug/H0，从完整本地checkpoint摄取；独立PostgreSQL39432、GraphQL39440、一致性gRPC39441、metrics39442–39444，记录binary SHA、PID、参数、source HEAD与diff。拒绝覆盖既有部署，resume仅允许没有任何已记录服务PID的前置初始化阶段，不自动重启已启动服务。3项守卫测试通过，Python编译通过。

首次macOS bind mount导致PostgreSQL wrong ownership，首次启动终止且未启动索引进程。recover_wallet_query_postgres.py验证独立容器标签／已退出／前置阶段，保留旧容器为*-failed-bind及原目录，仅以全新独立Docker volume恢复。没有删除数据库或影响原有服务。第二次启动成功，索引器／一致性存储真实推进水位，三进程均经ps复核在运行。服务metadata位于~/.local/state/rtd-wallet-migration/dev-20261003-01/query-services/services.json；公开证据及binary hashes见evidence/20261003-query-services-bootstrap.json。

GraphQL真实请求返回完整chainIdentifier=3tEPxLxUysGx4gfr8UEycvH7xohMWuwKVbTX5np4TCYj，与目标一致。但当前Ledger URL暂连Fullnode热数据，Fullnode报告最低可用checkpoint已到30396附近且GetCheckpoint(0)为NOT_FOUND；GraphQL创世digest=null、head digest=null。不能通过钱包现有共同快照/H0/digest准入，也不能当三入口就绪。一次诊断把availableRange误放Query根而得到validation error，随后改为有效checkpoint查询；原错误保留在证据，不标通过。钱包实际availableRange正确位于serviceConfig中，无须改钱包代码。

后续必须接同链持久归档Ledger、校验窗口与当前对象版本、受控浏览器入口/信任边界，再生成完整profile和开展真实Chrome。当前ready=false，ENV-04–08与TRY继续未完成。总体16/98，不因进程运行或chainIdentifier正确就提高试用结论。

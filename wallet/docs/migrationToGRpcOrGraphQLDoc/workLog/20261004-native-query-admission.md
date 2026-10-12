# 2026-10-04 独立原生查询准入

本次推进 ENV/TRY 的运行环境依赖，未勾选完整接口或浏览器验收。

- 部署入口位于 `link-u-smart-contract/all-in-one-deploy/localDeploy/prepare_wallet_query_admission.py` 和 `start_wallet_query_admission.py`。
- 使用当前 archive 的 `event-visible-facts-dev.py`、queryGuard/guard.py、index_coverage.py，绑定源码 SHA、链 H0、发布只读身份和索引只读身份。独立配置位于 runtime/publication-foundation/native-query-admission，私有文件不入库。
- 发布账本连接 foundation 数据库，索引覆盖连接 wallet_certified_query；均显式校验证书，以只读角色访问。源／副本存储使用各自受限身份和私有 CA。
- 私有监听 `127.0.0.1:39592`，实际 PID19053。GraphQL、Ledger、consistent 三类准入上界为100；未知 surface 拒绝。该值是发布准入上界，不能当作所有后端同时已覆盖的无条件保证；GraphQL 另有22条管道覆盖检查，钱包仍使用共同快照校验。
- 真实故障注入仅将本次检查子进程的目标端口设为未监听的9，不停止共享服务：索引库不可用时 GraphQL 拒绝；源存储不可用时三种 surface 均拒绝；恢复后重新通过，不沿用成功缓存。
- macOS Python 初次启动后将解释器路径切换为 Framework/Python，触发进程身份严格检查。已核对 PID、启动时间和全部参数，只允许这一明确可执行路径替换；原始记录保存 process-before-framework-exec.json。未重启或替换进程，随后重复启动入口成功复用。此处记录修复不代表通用启动竞争已根治。
- 首次故障测试完成断言后，证据路径误写到不存在的 workLog/evidence，保存失败；随后在规范 evidence 目录重新执行并保存，不把失败命令记为通过。

公开 TLS 入口、GraphQL 内部 consistent 门禁、浏览器 gRPC-Web 与 Chrome 核心链路尚未接通。保持 publicQueryReady=false、18/98，不提供试用完成结论。证据：[准入结果](../evidence/20261004-native-query-admission.json)。

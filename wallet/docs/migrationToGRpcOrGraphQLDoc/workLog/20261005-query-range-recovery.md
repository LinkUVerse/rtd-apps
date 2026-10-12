# 2026-10-05：checkpoint 对象版本批量 SQL 修复与受控 debug 替换

本批属于 RPC-03／RPC-22 读取延迟与 NET-04／NET-11 能力恢复的增量工作。**生产 SQL 和临时 PostgreSQL 回归通过；完整钱包 display／OriginByte／Chrome 当前仍未通过，不勾选清单。** 六个 debug 服务已恢复，开发链维持 PID3922，三笔原交易／余额和原生推进再次通过。核心 CLI 已重新编译，但运行中的 CLI 尚未替换，不能宣称整个 dev 环境已完成最新产物切换。

## 权威合同与诊断修正

以 archive 方案为主；[Sui 固定提交的 reader](https://github.com/MystenLabs/sui/blob/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-indexer-alt-reader/src/object_versions.rs)确认批量 UNNEST／LATERAL 的合同：对象 ID 相等、cp≤请求边界、cp 降序且同 cp 取最高版本，缺失对象不返回记录。它采用的标量写法不构成特定 PostgreSQL 计划的性能保证。[PostgreSQL 17 索引排序](https://www.postgresql.org/docs/17/indexes-ordering.html)解释 B-tree 多列方向与 ORDER BY／LIMIT 的关系；[多列索引规则](https://www.postgresql.org/docs/17/indexes-multicolumn.html)用于核对前缀约束。官方原文及 SHA 保存在 evidence/official/20261005-object-version-bound。

上一轮 1.9／9.7ms 是单对象字面量 SQL，不能排除实际批量 SQL。真实 UNNEST／LATERAL 使用全局 checkpoint 索引，过滤1499784条、命中93844页并读24812页，执行1361ms；实际服务等待时 PG 正在对象版本 IO/DataFileRead。保留[实际旧批量计划](./20261004-display-lateral-sql-plans.json)及[服务活动](./20261004-display-waiting-activity.json)。此前“继续定位 resolver／pool”的判断已由本批证据修正。

仅加两列 row bound 的候选对单个缺失 Display v2 ID 很快，但对包含 Clock、SystemState、重复边界、早期边界和缺失 ID 的七键生产 SQL 超过5秒；加标量边界仍失败，array-member 也失败，单独扩展 ORDER BY 约2810ms。不能从单键计划推导全批量性能。候选编译／3项回归成功仍保留为历史，不作为最终产物证明。

## 最终编码与验证

指定 rtd 的 object_versions.rs 只改变 CheckpointBoundedObjectVersionKey 查询：ID 用闭区间 id≥key AND id≤key，保留标量 cp≤S，显式 ORDER BY object_id ASC, cp DESC, version DESC。闭区间等价于 ID 相等；保持 ID 排序项以便当前 PostgreSQL 使用既有 obj_versions_id_cp_version，并按 cp 定位。没有 schema／索引迁移、线协议变化、Display 移除或钱包预算放宽。

新增热点历史回归：1024个版本、同 cp 多版本、删除 tombstone、冷对象、ID前／中／后缺失、未创建边界、重复 key、多个 cp 和空批次。三项 reader 测试在独立临时 PostgreSQL 17 实际通过：[测试记录](./20261005-query-range-reader-tests.log)及[当前源码测试证明](../evidence/20261005-query-range-reader-tests.json)。宿主先前没有 PostgreSQL／nextest；安装 PostgreSQL 工具且未启动持久服务，使用 cargo test --lib 的非 simtest 定向回归，没有访问运行中的钱包数据库。

[直接提取最终生产 SQL 的七键实际计划](./20261005-query-range-production-plan.json)：7.114ms，19 hit＋13 read＝32缓冲页，使用对象联合索引。它是实际 READ ONLY EXPLAIN ANALYZE，不能将仅 EXPLAIN 的计划当成执行通过；查询 proof 绑定最终 reader 源码 SHA。物理缓冲 IO 不等于 DML／DDL。

八个所需 native 二进制使用当前 rtd 的 debug 重新编译，源码构建前后完全一致（含已有未跟踪修改），见[最终构建](../evidence/20261005-query-range-debug-build.json)、[构建日志](./20261005-query-range-debug-build.log)。当前源码的 archive 证书 helper 同样重新编译并核对原 helper 源码，见[helper](../evidence/20261005-query-range-verifier-provenance.json)。此前候选和失败日志均未覆盖。

## 运行替换、失败与恢复

所有部署脚本位于指定 link-u-smart-contract/all-in-one-deploy/localDeploy。构建器与 reload 守卫检查当前源码／完整测试、实际七键性能、原 baseline 仅 reader 增量、原进程与 launch intent、manifest、genesis／H0／source scope、证书 helper 和原绑定。私有备份保留命令和身份；公开日志只输出投影。

首次停止阶段遇到进程退出身份变化，守卫报 PID reused after signal 并中止，原11份元数据未修改；后续确认六个原 PID 均已消失。没有据此声称实际 PID 复用，也未强杀。第二次恢复只允许全部已退出、无其它 PID 执行同命令、元数据和原记录逐项等于保存的 backed-up 操作；再完成当前 debug 绑定替换与启动。见[首次失败](./20261005-query-prefix-reload-apply.log)、[最终替换](./20261005-query-range-reload-result.json)。

第二次启动中的 KV writer／Ledger 因漏传原 HBase mTLS 环境退出，错误由本批引入。已修复为共享原启动器的 kv_environment，严格检查这两条原记录已退出、无竞争进程、端口空闲、原 mTLS HTTP/2 通过且当前 build／manifest 相符；保留失败记录再恢复。没有重建数据库、证书或账户。最终 writer16636／Ledger16643；见[环境恢复](./20261005-query-range-kv-environment-result.json)。原 TLS 环境构造与拒绝无关 credentials 的回归已加入；[最终19项运维守卫](./20261005-query-range-reload-guards-final.log)通过。

当前 source4756、indexer4762、consistent4792、GraphQL4804、writer16636、Ledger16643。启动 running 不是查询健康。实际消费者核验中 query／KV debug 和 adapter 绑定均一致：indexer22管线最低241124，consistent4管线177613，KV日志当次仅观测1管线164700；不能写成14条全部已恢复。[消费者记录](./20261005-query-range-consumers-after-kv.json)。

开发链未重启、未调协议 interval、原配置／genesis／三笔 journal 未删除或重发。原生只读证明 cp434379→434439，15.037秒、原三笔回执／余额一致、0模拟0广播：[链证据](./20261005-query-range-native-chain.json)。旧原摘要恢复证据继续保留。

## 当前实链读取边界与下一步

旧S163619两端最初因 KV 退出而 INTERNAL_SERVER_ERROR，恢复 KV 后 H0／checkpoint digest 匹配，但 ownedObjects 返回 BAD_USER_INPUT，旧 S 已不在一致存储可读窗口。新 WalletAssetReader.open 仍未接纳：FEATURE_UNAVAILABLE 在 serviceConfig.range0（Query.checkpoints），SnapshotReadError.reason=partial，未读取任何资产字段。所有失败0模拟0广播，详见[旧S复核](./20261005-query-range-display-after-kv.json)与[新 admission](./20261005-query-range-owned-admission-errors.json)。

进一步原生 watermark 日志显示合并请求 S168643 低于 consistent 的176712–178627窗口，WatermarkTask 保留初始空状态，能力探测因此拒绝。该范围仅从私有日志提取公开checkpoint数值：[范围诊断](./20261005-query-range-watermark-bounds.json)。不能把这个门槛跳过后宣布完整 display 成功。当前下一步优先恢复所有 KV 管线并形成共同 S，验证最新 GraphQL display／完整 OriginByte／Chrome，再完成核心 CLI 的最新 debug 受控切换。Display v1 按 S 的历史模板合同仍单独未完成。

48/98（49.0%）、trial_ready=false；RPC-03／NET-04／RPC-22 不勾选。未进行本批 Chrome、NFT实际签名转移、正常证书／自定义权限验收。

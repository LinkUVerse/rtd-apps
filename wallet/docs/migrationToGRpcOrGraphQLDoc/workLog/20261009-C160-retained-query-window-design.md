# C160 保留库重启后的真实查询窗口与持久水位

## 实施前合同

C159 六个原完整重建消费者已使用当前源码 debug 与原配置恢复。原四请求审核的第三个请求实际失败：consistent AvailableRange 的 min_checkpoint 为 12686，原 fresh rebuild 断言为 0。旧失败不覆盖，不修改原审核的零号下界条件，不重启已恢复消费者，不改数据库、水位或固定摄取范围。

本地 consistent-store 的 db/mod.rs 明确区分持久写入/水位和进程内 RocksDB snapshot 句柄；test_persistence 实际测试重新打开后旧 snapshot 不存在、重新建立 snapshot 后数据仍可读。同步器从持久水位恢复，并在之后的 stride 边界建立新的句柄。因此调大 snapshots 容量不会将历史句柄持久化。对标 [Sui 官方实现](https://github.com/MystenLabs/sui/blob/main/crates/sui-indexer-alt-consistent-store/src/db/mod.rs) 与 [同步器](https://github.com/MystenLabs/sui/blob/main/crates/sui-indexer-alt-consistent-store/src/store/synchronizer.rs)，逐字节保存相关官方源及当前本地源摘要后核对。

1. 实际只读捕获 Ledger GetServiceInfo、零号 GetCheckpoint、consistent AvailableRange、GraphQL 完整十依赖范围的请求/原始响应。所有协议状态、H0、零号身份、stride 和有界窗口必须验证；记录每个实际下界，不以范围不含零号的结果声称原 fresh rebuild 零号条件通过。
2. 在原 30 加新 6 出生身份、116 容器与当前八 debug 全程保持下，使用已编译的只读 RocksDB secondary 辅助程序读取四条真实持久水位/链身份。SQL 23 条由 verify-full、repeatable-read、read-only 事务获取；HBase 14 条物理水位须读取完整原生响应，metrics 仅另列观察，不代替持久证明。
3. 独立审核完整捕获字节、规范解码、全部输入 SHA/当前来源及保留库角色，确认水位不倒退；实际拒绝错 H0/缺正文/伪造零号范围等反例。先做有限只读观察，不自动创建常驻观察器、不停止或重启服务。
4. 同时对齐双方技术方案：资产一致性仅使用当前真实可用 snapshot 的交集；重启导致旧 S 不再可用时废弃旧读上下文、重新准入；历史 checkpoint/transaction/object-version 由相应归档接口处理。完整 0–709569 摄取、709570 输入/全物理数据/WAL/两账户与 NFT 原合同保持，不能改成局部窗口通过。

本步骤不包含钱包签名或发送、NFT 验证、父 TX-01/04 完成，也不把完整物理恢复设为已经收口的非 NFT 签名开发合同的新前置。旧 C139 新库零号快照证明与 C159 保留库重启事实分别记录，不能偷换证据。

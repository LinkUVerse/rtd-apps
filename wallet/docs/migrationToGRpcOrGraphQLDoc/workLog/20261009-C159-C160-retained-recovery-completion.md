# C159/C160 本次恢复实际交付

## C159／C160 保留库恢复与查询窗口核清（2026-10-09）

六个完整重建消费者已按原配置、保留库和当前源码 debug 恢复，登记新出生：adapter16912、writer16937、indexer16941、consistent16945、ledger16999、graphql17030。原30加新6共36个指定进程、116容器及固定归档组6个必要基础依赖保持；18个固定应用仍停止，完整24部署不计通过。原数据库、只读角色/TLS、固定0–709569摄取范围与认证零号输入保持；没有provision、清库、写水位、额外Docker或重播签名/Execute。首次启动仅父目录缺失、无消费者启动，封存原intent后另存精确修复；旧失败保留。

保留库重启后的 consistent 最小可用 checkpoint 为12686。数据和提交水位持久，但 RocksDB snapshot 句柄属于进程内存，重开库后从持久水位之后重建当前窗口；调大 snapshots 数量不能持久保存旧历史句柄。此结论对齐 Sui 官方源码提交41a3c701e2c6f4193918730cce397a7cf99cdd62的 db/mod.rs、同步器和 AvailableRange，并保存完整官方/本地源摘要：[官方持久性实现](https://github.com/MystenLabs/sui/blob/41a3c701e2c6f4193918730cce397a7cf99cdd62/crates/sui-indexer-alt-consistent-store/src/db/mod.rs)。钱包资产 snapshot 仅使用各依赖真实可用区间的交集；旧 S 不再处于区间内时须重新准入，历史 checkpoint/交易/对象版本按各自归档接口读取，不能伪造零号资产快照。

C159原 fresh-rebuild零号下界审核实际失败并保持；C160查询01完整四请求捕获时 GraphQL 返回 FEATURE_UNAVAILABLE，也保持失败。消费继续后只读查询02的 Ledger H0/零号、consistent完整H0/stride及GraphQL十依赖成功，实际交集12686–13174；不是原零号下界通过。23 SQL由verify-full/read-only/repeatable-read实读、14 HBase由物理网关读、4 Rocks由已编译只读secondary程序读出；41条真实持久水位最小12655，重放水位进度1.7836%。启动时全零metrics没有当持久证明，active writer的元数据变化也不误称为只读程序写入。

C160独立完整字节/规范解码/原SHA/36出生审核通过，10个实际错误H0/缺正文/伪造零号/缺水位/假持久性与假完成反例拒绝；现有钱包snapshot合同23项定向测试通过。完整709570数据对照、两账户、全物理归档/WAL及普通Chrome仍未通过；P159-3独立全恢复合同保持开放。此次只读恢复不会扩大TX非NFT开发验收范围，NFT原条件和98项分母保持。89/98、TX10/12、细分剩余9.18%、trial_ready=false。

证据：钱包workLog/20261009-C159-current-retained-consumers-started-02.json、20261009-C160-retained-query-window-02.json、20261009-C160-retained-persisted-watermarks-02.json、20261009-C160-official-and-local-snapshot-source-02.json、20261009-C160-retained-query-window-independent-01.json。

P159-1/2与P160-1/2/3仅按上述限定证据完成；P159-3、TX-01/04、全物理/WAL及其他原父项未勾。P160水位01因旧诊断器固定端口41841拒绝，另存v2用确切新消费者42841及完整原始headers/body；没有改全局诊断器或服务。官方源检查01仅因资格器用错变量名snapshot_stride失败，实际源码变量self.stride在另存02核对，原下载完整保留。

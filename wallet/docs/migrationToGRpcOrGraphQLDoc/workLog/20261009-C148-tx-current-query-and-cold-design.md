# C148 当前运行资格与 TX 冷恢复验收

本批接续 TX-01/04 原合同，非 NFT 先行。两节点已以当前源码 debug 产物恢复；12 原生查询进程及 10 生产者具有新的确切出生登记。固定 `rtd-archive-events-hbase3` 的 PG、S3、ZooKeeper、HBase master/regionserver/gateway 六个既有依赖均已健康，原配置、镜像、数据卷不变。其余 18 个固定应用未启动，不把六依赖健康写成完整 24 服务验收，也不把不同 H0 的固定数据混入 G3。

1. 使用 C148 实际 113 容器、30 节点/查询/生产者的身份与配置范围。新建钱包所需的三个查询边缘和一个只读 guard 时，另登记确切容器 ID 和 guard 出生，不沿用 C144 重启前资格，不暂停或恢复旧观察器。
2. 完整来源审核从 0 重新核对 709570 条实际输入；旧 C141 完整认证保持历史来源，当前 debug 原生校验器从已认证 200000 状态续验至 709569，并比对全部 digest/SHA 和最终状态。旧失败/部分进度不充作通过。审核终态之前不改变其冻结运行集合。
3. 查询 guard 继续采用 C119 已核对的原权限/只读 catalog/精确 prefix 和完整源及 replica 正文、元数据、后检查逻辑；此次只更新运行登记、端口、当前构建 origin 及测试工具来源。完整证书绑定当前复核，不缓存发布许可，不豁免每次 fresh 观察。
4. RocksDB 重启后的四条 metric 为 0，不能替代实际持久水位。通过当前版本只读 secondary 工具分别读取四条 `$watermark` 和四条 `$chain_id`，验证实际 RPC 范围；独立临时 secondary 目录，不向 primary 写水位、改 metric、清库或停止原 actor。每次验收使用新鲜的七门检查，门槛仍为原 524022，不降标准。
5. 只读复验 C138 自然形成的原 pending 摘要，四入口 durable 拒绝、空闲 native Web Lock 下 trusted prepare 拒绝、正常 Unlock/Reject/Disconnect/relock、三个 journal store/密文不变、实际 UI/worker/popup 字节和三个私有 signData 入口的真实计数。完整原响应实体先持久化再交付；包括正常 teardown、实际 requestfinished/requestfailed 与全部中间事件的独立关联。原 creator、批准、签名、Execute 不重放，不制造 journal。
6. 新的必要 live、普通/导入账户最终授权缺口及 NFT 后置条件逐项继续。当前阶段的环境、范围、只读工具通过均不替代两父任务，仍 89/98、TX 10/12；只有全部原条件与独立实际证据成立才标完整。

临时边缘只服务本批钱包验收；不再使用时按确切自有 ID 正常停止、删除，保留卷、共享镜像和验收记录。必要运行时不提前清除，也不操作其他任务进程。

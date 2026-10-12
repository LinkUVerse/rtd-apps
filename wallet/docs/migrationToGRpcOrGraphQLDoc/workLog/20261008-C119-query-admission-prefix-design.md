# C119 非NFT签名准入热路径优化方案

一期非NFT优先，原98与所有未满足的签名、执行、普通Chrome、名称及冷恢复标准保持。C118实际诊断05在原生验证返回时已累计约88秒，原90秒清理取消会话。单次三角色身份读实测3750ms，fullnode35ms、archive3412ms、GraphQL3707ms。旧queryGuard每次执行event-visible-facts-dev.py；ledger_snapshot每次从0汇总完整已发布前缀，现正式553728，对原生验证前后多轮授权形成累计开销。

本批先准备独立候选和只读对照，不覆盖旧文件、进程或网关，不重启原两组链，不触碰工作发布者、正式/预备账本或桶。使用已经安装且冻结的prefix-proof.json及完整prefix_ledger原源，保留每次fresh catalog指纹、立即且已验证FK/trigger/唯一索引、ACCESS SHARE锁、REPEATABLE READ READ ONLY、无写权限门；将新鲜边界查询扩展为显式through≤当前正式published_hi的定点读。只缓存已冻结的目录结构证明，不缓存任何checkpoint、对象版本、body或成功准入。

候选event-visible-facts-dev.py仅完整替换ledger_snapshot实现，恢复应与原源字节相同；其余query-prefix主副本固定版本/latest语义、COMPLETED/REPLICA、marker全文、boundary body全文SHA、最后一次新鲜账本核对、链/桶/独立私有身份/TLS、索引window全部保持。现有event reader的prefix SELECT已只读确认true、写权限false，不新增授权，不改变catalog ACL/旧proof。

依次：全源逆变换及固定proof资格；有意义的边界/目录/身份/响应损坏拒绝；当前同S的旧完整扫描与候选定点结果逐字段对照及实际耗时；重新full C116准入与完整独立审核。安装属于后一明确步骤，须编制可回滚的确切自有运行操作与完整原scope保护，不能以候选测试替换安装或业务验收。

本批无NFT业务、profile、签名、Execute、容器创建/重启/清理、原服务信号或DB写；C118延长等候的单请求仅用于诊断，原正常90秒及12签名／39模拟合同仍待解决。

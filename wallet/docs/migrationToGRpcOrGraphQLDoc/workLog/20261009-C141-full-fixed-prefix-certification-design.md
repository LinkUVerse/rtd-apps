# C141 完整固定输入认证与回放提速合同

先完成所有非NFT功能验收。C139回放继续，本批不是NFT业务验证；仅读取完整标准checkpoint输入，0钱包/私钥/签名/Execute调用。

固定源为真实G3 H0/sourceId/sourceGeneration，范围0–709569共709570个checkpoint，禁止换成0–205、有限150000–200000或跳过中间区间。原发布者cache仅作为不可信原始输入，不能赋予发布许可。

1. 全原两链/来源/debug/受保护文件/29配置/14健康服务、C120六中间件与C139七出生身份重新核对，资源实时成立。保留完整795320行SQL恢复输入与所有历史失败，不改变任何原服务或配置。
2. APFS独立inode克隆原cache至新的私有目录，固定genesis并核SHA。所有0–709569块逐一以真实只读TLS SQL记录核SHA/摘要/VersionId，无缺失；额外克隆文件不在可服务membership中。
3. 并发仅8个只读检查worker。每块源与replica均实际HEAD核VersionId/COMPLETED或REPLICA，再GET明确VersionId，核实际回复版本、全部正文大小/SHA，与独立克隆/SQL相同，再HEAD；不是仅HEAD或信任cache。全prefix阶段前后取得原真实mTLS guard正文准入。
4. 既有完整0–200000 quorum状态/证据/全部SQL行/源码/当前debug helper逐SHA重新固定；新native程序仅从200001开始连续验证至709569，逐条native输出sequence/摘要/bodySHA与固定真实SQL行相同。错误seed SHA必须拒绝且不产生状态。helper必须来自指定rtd最新源码的debug构建，debug/overflow检查开启，不能使用release或过期产物。
5. native结束后全部709570行SQL再次相同、全部克隆正文SHA、两角色最新VersionId/复制状态再次核验。每1000条写实际阶段进度，运行中不计认证完成。完成后仍是离线认证，不能代替每次读的fresh SQL/双端HEAD/namespace授权，不能凭该证据缓存positive admission。
6. 后续严格固定全范围membership源须先通过真实HTTP/损坏/范围/授权/两端正文对照及当前debug消费者同字节等价验证，证明安全且有收益后才能对C139的确切自有adapter实施正常可恢复切换。无证明不切换，不增全节点/未提交数据入口，不停原链/索引/发布者，父项及完整查询比较/归档/两账户/冷WAL仍按原合同。

实际守卫源检查已确认ledger_snapshot使用已安装prefix_ledger定点/新鲜catalog证明；历史完整SQL聚合的耗时与planner对照不能据此认定当前guard仍在全前缀扫描。原性能观察记录保留，禁止部署已经拒绝的planner hint或减少原权威检查。

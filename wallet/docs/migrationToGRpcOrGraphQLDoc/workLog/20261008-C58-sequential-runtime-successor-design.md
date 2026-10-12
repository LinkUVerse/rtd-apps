# C58有限环境的独立顺序启动后继

首轮并行up偏离既定启动合同，S3初始化实际connection refused、自然exit1；HBase相关初始化随之失败。完整失败目录和源码保留，0三cohort消费者、0SQL新库。收尾先SIGTERM等待Envoy未结束，后独立清理对本轮确认退役的9容器明确SIGINT，全部退出并精确删除，未使用SIGKILL；四命名数据卷和ZK镜像自动生成的/logs匿名卷均保留。原29／14和1015文件保持。初始化失败不能算物理或容量部署验收。

独立02后继使用全新四个project、网络、16命名数据卷及四个新ZK/logs镜像自动卷，绝不重用失败01的物理数据。顺序以实际dev_workspace._manage为准：S3／ZK up --wait → S3-init实际自然exit0 → HBase master up --wait → RegionServer up --wait → hbase-init实际自然exit0 → gateway up --wait → mTLS代理。每个阶段无论成功失败都保存已创建ID，失败时只按本次身份正常收尾，不自动重试。

输入仍是已限定审核的独立32许可guard／适配器，24总预算和PG连接观察门保持，原正式入口不替换。Rocks全CF工具用当前已构建RTD rocksdb依赖单独链接，保留与原源码相同的merge_balances i128 BCS合并语义，只读模式、关闭原生服务后的完整目录SHA不变；自身合并／写拒绝／重复读取测试不是四链库证明。四轮摄取到205后需实际读完全部8 CF及全部键值，与14HBase最新业务cells、27SQL表及23／4真实水位一起精确对照。原HBase每个cell的server时间戳原样留在原始输出，等价比较以row／family／qualifier／value为准，不能忽略业务值或丢失表。不会安装Python第三方数据库绑定。

本后继完整四轮及独立复核之前，H58-2／3／4及98父项均保持开放。并发对照只表示本次有限样本，受控正式生命周期、持续追赶和六笔524022写后门仍需实际验证。

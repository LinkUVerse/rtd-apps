# 当前正式批次后的实际摄取瓶颈

上一轮完成A46当前授权矩阵及清理，本轮需要让非空NFT／Kiosk查询达到424677。[覆盖15](./20261007-C44-nonempty-kiosk-readiness-15.json)正式434325仍成立，新pending486334由原工作进程拥有，不能人工清理；其余六覆盖门未齐。旧性能记录只能提供观察入口和指标名，不能当作本轮吞吐。

G46-1测当前原29／14、原25消费者与两latest debug核验；采集writer14／consistent4持久水位、writer／SQL indexer／consistent三摄取cohort的完成／重试／延迟／并发原指标及native head、原预算和CPU／RSS。30秒观察用同一进程monotonic差分；不同历史运行只能比较带时区wall time。

G46-2在原guard容器的独立短进程运行真实现有算法，只加委托计时wrapper；不修改正在运行的handler。读取同一已认证旧／当前checkpoint原字节，八个隔离SQL/catalog/MinIO原操作读足以分析阶段。历史128并发marker/body诊断不重播，避免额外大负载拖慢正向验收。必须保存每次失败和实际原算法源码／image／配置／进程绑定。

G46-3先核对阶段延迟、cohort inflight／重试及真实持久推进，再决定可实施的优化；G46-4须有独立真实基线／候选与完整门保持后才部署。未达到吞吐／可用性准入门的旧候选继续不安装。诊断不能改变SQL、水位、证书或pending；不停止原工作子、不重启终态finite、不使用预制事实或旧响应补造正面数据。当前不需要新的临时容器。

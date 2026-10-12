# C119 独立查询入口安装与原签名回归

本轮承接已通过的C119定点前缀候选及C118真实租约过期定位，不修改已固定的原方案/失败/工具/证据。非NFT优先，所有原98、细分权重、12签名/39模拟/12原生验签、正常90秒等候和30秒一次性结果租约保持。

仅创建本任务自己的HTTP/1.1 guard(127.0.0.1:42030)、两个内部TLS查询入口(42031/42032)、gRPC-Web bridge(42033)和当前构建使用的loopback(42011/42012/42013)。两个内部入口共用一个Nginx，bridge一个Envoy，loopback一个Nginx，总计三份自有容器及一个自有只读guard进程。原C118网关已经独立确认正常删除，端口须实查空闲；已有两组链、25actor、29配置/14health、工作发布者及所有其他容器/服务不改动。

Guard加载原完整queryGuard/guard.py和绑定，CHECK仅在新进程指向已验证C119候选；保持8并行、32接纳、12秒子检查期限、每次新鲜可见性与23pipeline window，不缓存正面结果。原源与原guard进程继续运行，禁止覆盖/重新启动。GraphQL入口完整继承当前HTTP/1.1原配置；Ledger server从原mTLS入口完整复制，沿用原证书/CA/SAN/客户端证书要求/业务后端/链头剥离/visible ceiling，只将其guard连接指向本次新只读入口。Bridge仅变更连接地址到本次唯一Docker alias，TLS/SNI/CA/codec与方法不变。Loopback仅变更GraphQL/archive两上游端口，保持当前C109允许origin、所有原方法/TLS与account入口。

准备输出完整文本/结构逆变换及固定来源；语法验证使用两份自有自动删除的临时容器，必须记录数量和全局归属。安装前取300秒内完整C116七门/524022，原显式单RegionServer事件仍保留，旧全部启动时间门不重写。安装后逐一记录自有CID/StartedAt/完整配置和guard PID/birth/argv，原全scope及原源码保持。

先实际SDK三角色身份及公开原始response/TLS/方法拒绝核对，记录端到端耗时。随后在新的私有测试profile运行未插桩当前正常三路签名矩阵；除原内部精确gas参数负向故障外，不插入阶段断点或port包装。纠正完整VerifySignature路径匹配，仍严格要求恰好12帧。独立审核全部规范BCS/intent/对象/effects/expiry/token摘要/journal/当前UI与worker，完整通过后才接受相应限定任务。若仍未通过，保留失败并继续定位，不能延长租约/重捕旧租约或减省门。

清理只针对记录中确切自有身份：容器正常stop20秒/exit0/rm、不force/卷/镜像；guard仅在确认本次PID/birth/argv及所有原来源后正常终止并等待。可回滚即关闭这些自有入口，原入口仍在；所有配置和失败证据保留。候选安装与本次签名限定验收不等同完整非NFT一期、完整物理/WAL或父项关闭。

# C217：原生入口准入读取性能

原生 GraphQL、Ledger、Consistent 三路仍调用旧聚合守卫。6.425秒观测内 checkpoints 表发生67次顺序扫描，读取24,513,042行。仅将原 nginx 配置三处准入端口41892替换为已核验的42030精确前缀守卫；TLS/mTLS、方法和路径、后端、可见上界及身份规则保持。

strict latest-marker和query-prefix模式的完整可见性事实分别等价；三路正向接口、缺失客户端证书400、禁用StateService404均通过。首次部署因历史scope固定旧配置SHA失败并自动回滚，原失败证据保留；后继验证器仅对这一个配置建立原文件SHA及精确三处替换映射，其余文件继续逐项比对。第二次部署热重载成功，无容器重启、链/publisher/consumer信号或数据库业务写入。后续runtime检查使用 `capture_wallet_C217_current_query_scope.py`。

单次接口样本 GraphQL 2271.90→902.17ms、Ledger 1619.51→440.59ms、Consistent 1651.15→496.61ms。后续6.310秒SQL观测顺序扫描0、读取0行、索引扫描787；不能外推为永久性能保证。

30秒重放复测没有提速：indexer/consistent约0.666/0.633 checkpoint每秒，故不宣称解决重放耗时。原publisher父进程93647仍工作，旧子进程自然超时退出；无子进程和锁0不能作为整体停止证明。原发布循环不重启。最近持久水位216884，216885/709570=30.5657%，完整重放及五个剩余父项未完成。

部署、等价、回滚、接口和SQL证据索引：`20261010-C217-native-ingress-completion-01.json`；持久水位：`20261010-C217-retained-all41-watermarks-01.json`。该完成收据生成时浏览器仍C210；后续C216安装以20261011日志为准。

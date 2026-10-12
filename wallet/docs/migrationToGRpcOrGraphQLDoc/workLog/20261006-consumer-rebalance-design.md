# 当前六名额消费者再平衡实施合同

当前 SQL 23 条实际持久管线均到726884，consistent／KV约669388；原4／1／1配置保留。发布器拥有PID58791、身份匹配，仍working且未超7200秒预算，不重启、不删除pending、不更改认证前缀。

新操作拟沿用原全局六名额，将indexer／consistent／writer分配为2／2／2，保持每消费者1..4及合计6。实际配置只能从当前拥有进程的明确config和原覆盖manifest提取；原catchup-reallocation-20261006-01/indexer.toml不得改写，克隆新config保持Display和全部其它配置。最新源码及八debug必须与installed provenance一致。

- [x] R1 新LD控制器与六项身份／PID复用／只TERM／超时不强杀控制测试，当前SQL／KV／consistent持久指标与拥有身份前置记录。
- [x] R2 fresh operation准备原config／command／manifest／绑定和私有备份，0信号；核对全部字段及总预算。
- [x] R3 原三个拥有进程一次协作TERM、真实退出后配置变更，沿用同debug和数据启动。任何身份、退出或启动不确定均停止自动重试；不重启链、publication、GraphQL、Ledger／adapter和账户reader。
- [x] R4 同H0／独立原交易／完整持久指标不倒退及原生查询窗口复验，有限吞吐采样前后分清，不宣称稳定速度或全部追平。

此配置只服务开发环境追赶，实施须在当前浏览器签名批次结束后；不将配置运行事实当成98父项或试用完成。所有公开结果仅PID、配置摘要和指标，不输出DB命令／密码。

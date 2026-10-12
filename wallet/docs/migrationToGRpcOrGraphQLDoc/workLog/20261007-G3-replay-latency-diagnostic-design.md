# 有限追赶数据源的只读阶段耗时

当前333000控制器继续运行，不能修改已资格绑定的source、并发、参数或PID。CPU观察只是诊断：writer/indexer低CPU不能证明瓶颈原因。最新SQL正式published355797／pending=null也不等于索引追平。

- [x] I1：新增LD只读诊断工具，从SHA绑定的已认证成员选294934、现存中间点、原332734及333000，各两轮；原fresh published SQL、双role最新VersionId/复制状态、私有完整body SHA、SQL recheck、最新双role、真实mTLS /authorize均执行。
- [x] I2：每个阶段记录实际wall time及通过条件，保留原published row／bodySHA和响应状态，不记录秘密。完整来源/debug、三finite和保护进程前后身份相符；0信号、0配置改写、0新Docker。
- [x] I3：独立复核实际记录和输入SHA、三finite保护与原28/14保持，结论只限八个点读，不能据此提高并发、减少fresh校验、部署候选或宣称全区间/持续吞吐。

此任务仅为下一步提速提供实际读证据，不能影响当前控制器自然完成或减弱发布认证。未证实的SQL、S3、TLS或queue瓶颈不得写为根因。原504/503与全部业务父项保持开放。

## 实际只读结果

[八点阶段01](./20261007-G3-replay-read-stage-timings-01.json)与[独立01](./20261007-G3-replay-diagnostics-independent-01.json)完成上述限定诊断：294934/315000/332734/333000各两轮，fresh SQL、规范私有body SHA、双role latest/version/复制状态及真实mTLS /authorize成立。平均各点0.402585秒，fresh snapshot0.087062、recheck阶段0.060372、真实授权0.231670秒；**recheck调用还包含一次源latest HEAD，不能把整个阶段称为纯SQL耗时**。独立fresh选中行、355798个完整prefix聚合及AST精确原查询相符，29个输入保护/finite进程身份不变；过去wall time只为原producer观测，独立没有重测过去时间。

[原SQL执行计划02](./20261007-G3-authorization-aggregate-plan-02.json)在正式published355797下读取，聚合355798/0/355797/3100988，两个原计划49.940/57.209毫秒。已有checkpoints_pkey、checkpoints_prefix_counts与checkpoints_prefix_reference三个索引，不能未经核验再创建重复索引。

[八轮事务局部对照01](./20261007-G3-authorization-aggregate-planner-comparison-01.json)只改变本测试只读事务的planner设置，不改变任何live/global参数；全部原查询结果完全相同。baseline76.421/84.394、强制index66.564/95.015、serial190.828/126.189、serial-index82.004/99.061毫秒，未证明稳定收益，因此不安装。原默认计划Parallel Seq Scan，候选Index Only Scan仍有49073 heap fetch；不能据此认定真正根因或全链提速。

执行计划01在JSON写出时Decimal不可序列化，原不完整字节文件保留，不能解析为成功；新v2输出02才通过，旧工具和不完整结果不改写。所有操作0服务信号/0数据或配置写/0DDL/0新Docker。[在线独立07](./20261007-G3-staking-finite-live-independent-audit-07.json)独立确认28/14及320738/326694/326696，原stake尚未全部覆盖；原333000控制器继续自然追赶。

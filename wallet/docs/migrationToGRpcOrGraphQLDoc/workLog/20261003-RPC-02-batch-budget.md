# RPC-02 批量对象实链预算修复

日期：2026-10-03。

真实探测43项批量（系统对象重复ID及已赎回StakedRtd的缺失槽位）暴露原40项分批请求5187B超过默认5000B。初次失败保留：[原失败](./20261003-batch-objects-live.log)、[服务诊断](./20261003-batch-objects-diagnostic.log)。钱包原先拒收错误响应，没有把查询失败当空对象。

修改 WalletAssetReader.objects 分批为20项，不更改同快照／顺序／错误语义。重跑真实服务成功，checkpoint54093，43个输出，第1和40索引为ObjectError notFound，其他41项为同一系统对象的独立位置。见[实链证据](../evidence/20261003-batch-objects-live.json)。原缺失对象来自前一轮真实赎回，不是伪造响应。

新增测试覆盖完整JSON请求字节预算和跨批次槽位。3文件76项通过：[测试日志](./20261003-batch-budget-tests.log)。完整TypeScript退出码0：[类型日志](./20261003-batch-budget-types.log)。官方固定Sui源码和本地RTD默认限制已核实并同步两套方案。

审计还发现归档reader当前仅交易详情／同摘要恢复，指定历史版本对象批量路径尚未完成；RPC-02／RPC-19不能由当前展示对象批量结果整体判为通过。进度保持16/98，下一步继续补齐缺失范围。

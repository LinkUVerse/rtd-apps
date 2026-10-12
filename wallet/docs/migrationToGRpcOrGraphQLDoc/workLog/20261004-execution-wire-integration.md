# TX-05／06／12 协调器与实际gRPC reader故障联动

日期：2026-10-04。

在execution-coordinator.test.ts新增10种联动场景：传输中断、失败trailer、缺失交易回执、错误digest、提交期间会话关闭，分别恢复为链上成功和链上失败。测试使用实际WalletExecutionCoordinator、WalletExecutionReader、SDK gRPC-Web transport、protobuf请求与原生effects验证；服务响应仍是受控fixture，模拟回调／journal／互斥为测试实现。

直接解码线上格式ExecuteTransaction请求并计数：每例只出现一次，bytes与批准bytes一致，发送时已存在pending记录。以新WalletReadSession和新协调器模拟内存实例重建后，另一个requestId的execute被既有pending阻断，不再模拟、签名或发送；recover只发GetTransaction查询原digest，再将journal终结为confirmed-success或confirmed-failure。

这补齐以往“协调器使用mock reader”和“reader单独模拟网络”的组合边界，不能代表真实IndexedDB持久屏障、真实worker重启、浏览器Web Locks或实际服务器断网。已有这些独立测试／实链证据仍按原批次列示，不混合为端到端通过。

最终2文件48测试通过（23 coordinator、25 reader），见20261004-execution-wire-integration-final.log。首次5种成功恢复版本43测试同样通过，保留初次日志；最终增补链失败恢复。最终钱包完整tsc通过，见20261004-execution-wire-typecheck-final.log。仅新增测试，未修改生产执行代码，未新发链上交易或重新构建产物。

TX-05／06／12仍未勾选，完整跨worker持久恢复与故障验收尚待。总体试用门槛不变。

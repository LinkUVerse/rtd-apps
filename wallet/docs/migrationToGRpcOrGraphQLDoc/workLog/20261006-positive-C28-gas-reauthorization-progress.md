# 新链 C28 gas 再授权限定验证

[实际04](./20261006-positive-C28-gas-reauthorization-04.json)通过15项：独立受控导入账户，当前六pin C28/profile3，真实 worker／UI 加载字节与磁盘一致。预算100000000与101000000的两个固定交易分别产生可见新批准窗口、不同requestId与digest；各点击一次批准，实际返回两份签名。四次checks=ENABLED正式模拟都使用对应最终BCS，旧预算签名不能授权新BCS；完整initial／final三journal store相同，账户重新锁定。0 Execute、0公网／证书修改／打开原profile。

01连接popup等待失败，02等待资产RTD超时失败，03工作目录路径错误未执行；所有日志与已生成proof保留。04显式选择活动账户、通过实际demo连接流程验证授权，并将资产页面诊断保留；Fullnode授权验证不以共同资产窗口恢复为前提，也不宣称资产恢复。产品源码1113文件未改，未手改权限、准入pending、journal或导出密钥。

[独立审核02](./20261006-positive-C28-gas-reauthorization-audit-02.json)通过：四组完整grpc-status0帧、protobuf原始bytes／gasData、原生effects摘要／Success／epoch及两份签名一致；initial／final全部journal store独立深比较通过。审核01因错误要求trailer冒号后必须有空格失败，真实`grpc-status:0`合法，修正后的独立工具与失败日志分别保留。父TX-01内部全入口及其它未完成父合同继续开放，79/98、trial_ready=false保持。本证明是保留C28产物范围，新C29另验。

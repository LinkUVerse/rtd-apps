# QA-A20 实际 archive 入口停机与恢复

本批只验证当前任务独占的native-archive-bridge实际Docker容器停止／恢复，使用当前C26生产WalletLedgerReader及原cp144179资金摘要读取历史。暂停前必须取得archive原BCS正例；暂停时要求真实Docker stopped和生产reader错误，不能注入503或把null当作预期故障；finally启动同一容器并重新取得相同摘要／BCS。所有操作仅回环，无签名、模拟、执行、journal清理和数据库归零。

- [x] A1 [实际停机恢复完整证据](./20261006-physical-archive-outage-01.json)核验原bridge manifest／compose所属容器ID／镜像／read-only挂载／端口／配置，以及原profile／pending／密钥文件hash与六消费者归属记录。
- [x] A2 [停止之前原digest实际archive读取](./20261006-physical-archive-before-01.json)与精确原BCS通过。
- [x] A3 sole owned bridge实际stop，ExitCode0；native Fullnode仍可读，当前生产reader实际拒绝archive历史查询。真实网络请求与容器终态位于完整证据operation内，不注入响应。
- [x] A4 finally恢复同一容器，原BCS历史读取恢复，container ID／image／挂载配置、profile／pending／密钥文件和六消费者PID保持。
- [ ] A5 补Fullnode／GraphQL各自实际停机恢复、Docker保存数据冷启动及真实Chrome页面完整验收后才勾QA-A20；本批有限archive证据不代替父合同。

原校验器安装等待继续。archive bridge不是索引消费者；不更改待安装计划冻结的source／live／publisher配置或六消费者进程。不清除任何原交易pending，也不主动中断publisher working批次。

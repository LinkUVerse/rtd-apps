# QA-A20 实际Fullnode停机与原数据恢复

- [x] F1 [固定摘要前置点查02](./20261006-physical-fullnode-before-02.json)与[独立恢复审计](./20261006-physical-fullnode-recovery-audit-01.json)通过：latest debug源／两核心binary、原H0／genesis／全部原YAML／启动argv／无协议override，三原摘要／两余额、六消费者及所有原pending／keys／profile冻结核验。
- [x] F2 原PID43153收到唯一SIGINT后退出，无强杀。原停机wrapper在退出过程中身份断言失败，保留[失败日志](./20261006-physical-fullnode-outage-01.log)。实际生产Reader的[不可用证据](./20261006-physical-fullnode-recovery-unavailable-01.json)采集于唯一替代进程初始化、尚无RPC监听的连续停机期间；不是注入错误，也不声称原wrapper成功或在替代进程启动前已采集该证据。
- [x] F3 已通过独立恢复路径，用相同debug／genesis／config／db／argv和默认协议环境启动原链PID16577。[恢复点查03](./20261006-physical-fullnode-restored-03.json)同H0、checkpoint1018143→1018167、原三摘要／两余额一致；[最终独立审计](./20261006-physical-fullnode-recovery-audit-01.json)将原runtime标ready=true，六消费者及所有pending／keys／profile保持。初次冷启动点查失败及第二次未推进均保留，原finally未完成不能记为通过。
- [ ] F4 [GraphQL实际停机G1–G4](./20261006-QA-A20-physical-graphql-design.md)后续已通过；当前Chrome故障／恢复与完整Docker冷启动待补，逐完整父合同完成后才勾QA-A20。

原通用interval probe01要求15秒内lowestCheckpoint不变，当前正常移动238376→238412导致exit1，未停任何节点。独立固定摘要probe02只允许保留窗口单调前移且始终覆盖三个immutable receipt checkpoint，保持每次H0与同一真实process、余额／receipt比较；它不用于集合snapshot准入，也不修改钱包生产窗口或授权门禁。

本批与原校验器安装等待的八冻结运行配置、六消费者边界分开。若任一原消费者退出或身份改变，停止依赖工作、保留失败并恢复环境，不能把它当成已安装或未影响。source仍依赖原checkpoint目录；原pending发布批次不主动中断。

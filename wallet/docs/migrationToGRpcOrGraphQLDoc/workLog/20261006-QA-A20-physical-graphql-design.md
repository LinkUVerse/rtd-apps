# QA-A20 实际GraphQL停机与同配置恢复

- [x] G1 [生产Reader前置13次实际读取](./20261006-physical-graphql-before-01.json)通过：同profile4／原H0，Fullnode点查、原cp144179归档交易BCS、GraphQL共同快照717132、system对象与余额读取；0模拟／签名／执行，不注入响应。
- [x] G2 [实际维护最终恢复](./20261006-verifier-venv-final-recovery-02.json)已通过且final-recovery-status为running-needs-publication后，才开始GraphQL操作；当前debug、原PID64878／argv／端口、另外五消费者及原profile／pending／keys／配置核验成立，未打断安装等待。
- [x] G3 [实际停机恢复](./20261006-physical-graphql-outage-01.json)通过：唯一SIGTERM后原64878退出、两端口释放，生产WalletAssetReader真实拒绝snapshot，Fullnode与原归档回执保持可读；无再次信号、无强杀，无响应注入。
- [x] G4 同一[实际恢复证明](./20261006-physical-graphql-outage-01.json)确认原process／launch-intent／log历史保留，同debug／原argv恢复唯一PID6803；生产共同snapshot717132→721764、system标识及原cp144179归档BCS一致，另外五消费者和原配置／profile／pending／keys保持。不同合法snapshot的集合不声称同字节。
- [ ] G5 当前Chrome故障恢复与完整Docker冷恢复合同另验，通过全部必需项后才勾QA-A20。

独立部署工具为link-u-smart-contract/all-in-one-deploy/localDeploy/run_wallet_physical_graphql_outage.py及probe_wallet_physical_graphql.ts。G1–G4实读及实际停止／恢复通过，前置检查失败不得发信号或退休原进程记录；G5及QA-A20整体仍开放。

[Fullnode独立恢复F1–F3](./20261006-QA-A20-physical-fullnode-design.md)与[archive物理停机A1–A4](./20261006-QA-A20-physical-archive-design.md)限定证据已成立，原失败记录保留。

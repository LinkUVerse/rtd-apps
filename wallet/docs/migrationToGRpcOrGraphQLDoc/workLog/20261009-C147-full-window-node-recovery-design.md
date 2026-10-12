# C147：满背压窗口的原链恢复与 TX 前置

## 现场证据和修复合同

C146 G3 本次启动日志显示：`consumer last processed commit index=139885`，`persisted target=140885`，差值恰好 1000；重放及数据库 scan 已结束，但新构造的 checkpoint 1204853–1204890 签名仍需送入共识，原生可查询头停在 1204852。

`AuthorityPerEpochStore::prepare_consensus_recovery_drain_state` 仅在 `startup_head - durable > MAX_PENDING_DURABLE_COMMITS` 时登记固定恢复额度。普通 monitor 的上限为 `durable+1000`，等于满窗口时剩余提交能力为 0，因此漏掉了恢复时所需 checkpoint signature 提交的边界。与 Sui 官方 [checkpoint_output.rs](https://raw.githubusercontent.com/MystenLabs/sui/main/crates/sui-core/src/checkpoints/checkpoint_output.rs) 中 checkpoint 签名提交到共识的路径一致；RTD 的背压及持久化额度是本仓库实现，不能声称上游已经提供该修复。

本批仅扩大恢复入口判定到满窗口，沿用原有有限、持久化且跨重启复用的绝对上限。小于窗口不增加额度；scan 结束前不准许越过普通窗口；已消费旧目标且剩余实际提交回到普通窗口时永久退回普通背压；未消费恢复 anchor 时重启不得增加额度。原创世、链数据库、epoch 参数、发布/查询 fencing 与签名授权实现保持。

## 子任务和通过标准

1. 保存当前源码身份、三个拟改文件、8 个原 debug 摘要、两组节点的本次出生记录；测试修改先于生产修复。
2. 实际 epoch DB 测试复现满窗口未登记错误；验证小于窗口、已登记额度复用、消费 anchor 后释放。monitor 测试确认满窗口 signature 容量在 scan 前拒绝、scan 后有限放行、恢复完成退回普通限制，耗尽后重启不授予额外额度。
3. 修复恢复边界，运行相关 scoped 库测试及源文件格式/差异检查。
4. 由 `link-u-smart-contract/all-in-one-deploy/localDeploy` 脚本，从当前 `rtd` 源码编译 debug 产物，记录真实命令、退出码、源码身份及 8 个产物摘要。旧资格保持为历史证据，新产物必须获得新运行登记。
5. 对确切自有 stalled 节点正常停止/恢复，保留原数据和参数；验证当前二进制身份、同 H0、新出生、恢复阶段及 checkpoint 持续推进。启动成功不等同节点 ready。
6. 按当前源码及新出生登记恢复必要查询、staging、发布和账户生产者；验证原生公开查询的真实身份/覆盖与 fresh 准入，再接续 TX 原 pending 只读 cold 和缺失的新授权矩阵。需要原固定归档部署的测试时启动 `rtd-archive-events-hbase3` 相应依赖，不能混接其他链数据。

原节点、消费者、WAL 和失败报告不覆盖。编译/限定回归/恢复检查不计原 TX-01/04 完成；所有非 NFT 一期验收后再完成原 NFT 条件及完整 M5，全部必需条件成立才将 10/12 更新为 12/12。


## 本次执行更新

生产代码仅恢复入口判定；另外三个测试文件包含新增epoch DB/monitor测试和原满窗口退役测试的正确边界，共四源文件。当前源码8个debug服务及3个原生校验辅助产物实际编译通过；3个校验辅助产物摘要均变化，旧字节完整留存，新产物已按实际来源安装，不沿用旧摘要。G0/G3新出生PID为86081/80039，同H0/原创世/数据库/参数；三次连续gRPC实测高度分别2232875→2232923→2232970及1208084→1208132→1208180，恢复日志确认固定有限额度及普通背压重新生效。19个原生来源/摘要绑定已显式更新并保留原件；原查询进程仍须按新产物正常重启，公开查询fresh准入及TX业务验收尚未通过。

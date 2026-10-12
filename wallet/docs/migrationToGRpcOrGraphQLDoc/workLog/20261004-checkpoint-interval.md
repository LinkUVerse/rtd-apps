# 本地 checkpoint 间隔调整失败与原启动环境恢复

日期：2026-10-04。对应ENV／TRY-05及剩余资产RPC的共同环境阻塞。本次未完成提速或链恢复，没有新增完成勾选。

## 原因与权威资料

调整前实际来源产出约4.32 checkpoint/s，消费者最低水位仍落后。依据Sui官方固定commit c860146823abcedef45a1b5a9c766920be98a29c的本地CLI覆盖说明与本地RTD对应实现，尝试将同一个 `rtd start` 进程内所有节点的最小间隔统一改为1000ms。**本次调整前未证明既有链的共识重放约束，实际导致自分叉保护触发。** 官方参数支持不能据此扩展为保留链安全热切换；这是本次设计判断的缺口，不能将退出当成提速成功。

官方 [CLI说明](https://github.com/MystenLabs/sui/blob/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui/src/sui_commands.rs) 与 [CheckpointQueue](https://github.com/MystenLabs/sui/blob/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-core/src/consensus_handler.rs) 对照：间隔影响checkpoint分组。原生 [GetEpoch](https://github.com/MystenLabs/sui/blob/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-rpc-api/src/grpc/v2/ledger_service/get_epoch.rs) 读取版本声明协议配置；当前RTD同路径的 `get_for_version_if_supported` 不应用环境覆盖，不能把接口返回200ms当成1000ms覆盖未应用或已应用的证据。四份原文及SHA256见 [manifest](../evidence/official/20261004-checkpoint-interval/manifest.json)。结论同时同步archive02／06与合并03／07。

## 真实操作与失败记录

只使用指定rtd源码的当前debug；来源／二进制／原genesis／YAML摘要核对通过。所有启停和恢复代码都在指定 `link-u-smart-contract/all-in-one-deploy/localDeploy`，沿用runtime dev-20261003-01、原H0 3tEPxLxUysGx4gfr8UEycvH7xohMWuwKVbTX5np4TCYj。

1. 原PID72736只读核验通过：checkpoint423769→423834，15.046秒约4.3201/s，三个既有交易成功及余额记录，0模拟／0广播；[before.json](./20261004-checkpoint-interval-native-before.json)。plan核对实际进程环境无覆盖、唯一Fullnode／faucet监听与原启动argv一致。
2. 操作 `checkpoint-interval-01` 保存原metadata、read proof、intent，先将ready置false，只发一次SIGTERM。进程退出过程中身份变化，守卫拒绝继续；随后实测旧PID已不存在、两个端口空闲。没有已确认PID复用，原错误字样不能当作复用证据。初次空stdout原样保留，结构化结果见 [apply.json](./20261004-checkpoint-interval-apply.json)。
3. 在原PID确实消失、无任何替代启动文件且原source／config／genesis绑定相符后，通过受控中断恢复入口启动PID4431。未再次停止原PID。替代节点重放checkpoint424107失败：此前摘要CfAAcLB9nEaxsWeBCrJfJ9b6vbUSGT7rEAvnbMjp6dQc，重放摘要4b9pAiKW525DQ4gy3GQnrJkGnL65xrvqbmxm83RYSjCf；`crates/rtd-core/src/checkpoints/mod.rs:1957:13`保护退出。GetServiceInfo探针fetch failed，保留 [after.log](./20261004-checkpoint-interval-native-after.log)。
4. 实测PID4431消失、端口空闲，通过 `restore_wallet_checkpoint_interval.py`核对原转换记录及debug、genesis、全部原YAML，恢复原无覆盖启动环境；没有修改YAML。通过 `resume_wallet_debug_dev.py`沿用同链同数据启动PID26238，操作 `debug-resume-3cba71a7cb2b43b6b26fb9fb1634dc63`，ready仍false。实际环境覆盖投影为{}。私有操作原件／节点日志留在runtime，公开审计仅记录白名单字段。
5. 当前节点原H0、三个交易及两种余额与before完全一致，15.039秒checkpoint424106→424106，**chainAdvanced=false、passed=false**；[original-data.json](./20261004-checkpoint-interval-original-data.json)。此前断言advance失败原件保留在 [original-read.log](./20261004-checkpoint-interval-original-read.log)。当前启动有fork recovery阻止记录，没有完整Swarm启动或faucet；持久文件至424106，424107无认证文件。
6. 对失败证明实际调用ready finalizer，明确拒绝，runtime保持false且没有写native-read-verification；[ready-rejected.json](./20261004-checkpoint-interval-ready-rejected.json)。完整安全投影见 [failure-audit.json](./20261004-checkpoint-interval-failure-audit.json)。

原混合原生发送、混合WMIG发送与WMIG种子三笔均未重发。所有既有dApp／质押／混合执行journal、账户、fixture、genesis、数据库和消费者保存；没有清除分叉标记或配置checkpoint override强行恢复。原Fullnode当前仅能读已有数据，不能宣称可继续执行、链头就绪或可试用。

## 代码修正与测试

- `tune_wallet_checkpoint_interval.py` 的所有实际变更入口已退役，`--apply`在任何runtime读写、信号或启动前拒绝。保留失败实现及受控阶段历史供审计，不提供再次尝试的命令。
- `resume_wallet_debug_dev.py`默认恢复剥离所有继承协议覆盖；保留链非默认覆盖缺乏创建时重放证明会拒绝，不能借冷启动再次应用失败配置。
- `restore_wallet_checkpoint_interval.py`仅恢复已退出替代进程的原metadata环境，严格检查原转换、配置及来源绑定；ready保持false、分叉标记保持。
- `verify_wallet_checkpoint_interval.mjs`原生只读比对H0、三个既有回执、当前余额、进程及15秒采样；数据点查通过但链头不推进时落盘passed=false并非零退出，不能丢弃失败证据或产生就绪误报。
- `finalize_wallet_debug_resume.py`核对实际覆盖与证明，明确拒绝未通过的readiness。运维守卫25项通过，见 [tests.log](./20261004-checkpoint-interval-tests.log)；包含原PID在场／变更／复用／超时、只TERM、中断阶段拒绝不明启动、源或配置变更、恢复原环境、退役入口无动作、假readiness等。修正中的一次Python缩进错误已修复并保留失败原件。Python编译及Node语法检查通过；不替代链恢复。

钱包生产代码和UI／background产物本批未改；之前1408项、tsc及Webpack的证据保留，未重复计为本批全量通过。

## 消费者与有限资产窗口

22:46:28原indexer／consistent／KV进程身份及当前debug／adapter绑定匹配，最低水位223275／159806／151723，22／4／14条管线仍推进；[watermarks.json](./20261004-checkpoint-interval-watermarks.json)。未重启消费者、没有提高并发或绕过发布guard。

实际生产WalletAssetReader在S151755读取原账户13对象、生产过滤和分类成功；[owned-assets.json](./20261004-checkpoint-interval-owned-assets.json)。这证明已保留checkpoint的查询还能工作，不能证明424107之后的认证、链恢复、WMIG400826／发送409864或PersonalKiosk203097追平。

本次额外只读OriginByte复核在S154734遇20秒聚合读取超时，17次请求均为GraphQL，未到新鲜Fullnode对象比对，0模拟／0广播；失败保留于[originbyte-nft.json](./20261004-checkpoint-interval-originbyte-nft.json)及[日志](./20261004-checkpoint-interval-originbyte-nft.log)。这是当前非空集合读取的未解决预算／延迟问题，不能套用此前S109849的两条构造通过记录，也不能据此推断NFT丢失或Fullnode当前对象接口失败。RPC-03／22／23仍未完成。

## 后续边界

先核对所有原节点分叉标记和共识重放状态，取得可验证的原结果恢复条件；若需代码修复，必须在指定rtd最新源码实现、完成适当验证并重新编译debug及来源绑定。不能用本地旧计算摘要替代quorum证书，不能清标记／重置genesis消除故障，也不能更换日志重发已确认交易。当前总进度48/98（49%）、trial_ready=false，完整目标持续进行。

23:00:51追加原生GetServiceInfo复核：H0相同、PID26238、checkpoint424106、Ledger／对象下界135445、ready=false，0模拟／0广播。见[最终来源观察](./20261004-checkpoint-interval-final-fullnode.json)。此为当前身份和链头读取，未产生新的推进通过证明。

## 后续状态更新：原摘要受控重放已恢复

本日志记录的失败和当时未清marker状态保留。后续完成官方源码核对与真实secondary诊断后，采用仅匹配原存储摘要、保留所有计算记录并继续签名前guard的单次受控重放；424107已取得原摘要证书，全部原YAML已恢复，原生checkpoint推进和三笔原交易／余额一致验证通过，runtime.ready=true。完整证据和约束见[原摘要恢复](./20261004-original-summary-recovery.md)，钱包trial_ready仍为false。旧摘要仍不能充当证书；本次最终证明来自实际认证和推进。

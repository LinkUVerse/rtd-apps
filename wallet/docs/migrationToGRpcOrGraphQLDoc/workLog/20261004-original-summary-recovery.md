# 2026-10-04：保留原摘要的受控重放与开发链恢复

本批恢复同一 dev-20261003-01 链。H0 为 3tEPxLxUysGx4gfr8UEycvH7xohMWuwKVbTX5np4TCYj；没有重建 genesis、清数据库、删除计算摘要、重发既有交易或重启消费者。节点使用指定 rtd 当前源码对应的原 debug 二进制，检查工具也由当前源码依赖离线编译；source HEAD／diff 和 debug 摘要重新核验。

## 只读诊断与证据范围

实际创建参数为单验证者。checkpoint 导出文件 424107 缺失不能推出验证者内部证书不存在，因此新增合约仓库 `wallet-checkpoint-inspector`，通过 RocksDB secondary 打开已有主库，secondary 临时目录独立；不调用主表写入／删除。验证者和 Fullnode 的真实检查均确认 424107 没有认证证书；验证者仍有原计算摘要 CfAAcLB9nEaxsWeBCrJfJ9b6vbUSGT7rEAvnbMjp6dQc 和 self-divergence marker，无交易分叉标记。

检查从 genesis 验证三个 epoch 委员会转换；424106 认证证书、内容及前驱均通过。扫描最新4096个持久化共识块未找到424107签名，不能声称全库没有该签名；同样扫描对424106找到了原签名，验证并聚合为quorum证书通过，作为解码与签名核验的正例。证据：[验证者](./20261004-checkpoint-inspection-runtime-validator.json)、[Fullnode](./20261004-checkpoint-inspection-runtime-fullnode.json)、[原签名范围](./20261004-checkpoint-inspection-signatures-validator.json)、[认证前驱](./20261004-checkpoint-inspection-certified-parent.json)、[前驱签名正例](./20261004-checkpoint-inspection-signed-parent.json)。

首次工具构建因 Committee 参数类型失败；修正后的运行因缺 Tokio reactor 失败，均保留原日志。加入 Tokio runtime 后实际只读检查通过，后续签名及受控配置提案扩展分别编译通过。最终来源记录：[inspector provenance](./20261004-checkpoint-inspector-provenance.json)。这些失败均未修改原数据库或分叉标记。

## 官方裁决与受控恢复条件

固定 Sui commit c860146823abcedef45a1b5a9c766920be98a29c 的 [节点恢复实现](https://github.com/MystenLabs/sui/blob/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-node/src/lib.rs) 区分自动恢复和显式摘要 override。自动恢复仍拒绝没有认证依据的 self-divergence；手工 override 只有在存储摘要与指定摘要不同才清除计算记录。原摘要相同的配置可清 checkpoint marker，并保留原记录。当地 RTD 对应实现一致。

[checkpoint builder](https://github.com/MystenLabs/sui/blob/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-core/src/checkpoints/mod.rs) 在保存重放结果及[发送签名](https://github.com/MystenLabs/sui/blob/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-core/src/checkpoints/checkpoint_output.rs)前再次比较原记录；不一致仍先记录分叉并 fatal。因此本次不是将未认证的原摘要声明为canonical，而是恢复原启动环境，并保留原计算记录，让重放重新经过签名前守卫。最终canonical证明必须来自重放后认证证书。官方原文和SHA见[manifest](../evidence/official/20261004-original-summary/manifest.json)。

恢复脚本位于指定 link-u-smart-contract/all-in-one-deploy/localDeploy/recover_wallet_original_summary.py。限制单验证者、原H0／db path、相同原摘要和marker、无交易分叉／认证冲突、当前源码和inspector来源、原协议环境、真实PID／启动命令、三笔原回执及余额。Rust提案核验原contents与认证前驱，重解析配置并去除唯一新恢复字段后与原配置做完整语义深比较。提案与原配置含私密部署信息，仅保存在权限0600的owned runtime操作目录，不复制至文档。

操作按 prepare → 一次TERM → 原PID确实消失且端口空闲 → 再次实际数据库检查 → 受控启动 → 原摘要认证 → 原配置恢复 → 原生就绪采样推进。任何 uncertain launch 不重放；recover-stopped 仅允许尚未写启动文件的已记录停机阶段，禁止重复signal／强杀。最终35项运维守卫测试通过，见[guards](./20261004-original-summary-guards-final.log)。

## 实际结果

prepare检查和停机后检查均通过：[提案核验](./20261004-original-summary-inspection-prepare.json)、[停机核验](./20261004-original-summary-inspection-stopped.json)。本批apply正常完成，原PID26238退出后启动PID3922，原协议override仍为空。

424107现已取得证书，认证摘要与原计算摘要逐字一致 CfAAcLB9nEaxsWeBCrJfJ9b6vbUSGT7rEAvnbMjp6dQc，genesis→委员会→签名、contents、前驱全部核验，certificateMatchesLocal=true，无checkpoint或transaction marker：[首次认证](./20261004-original-summary-first-certificate.json)、[最终认证](./20261004-original-summary-certified.json)。原计算记录仍保留，日志没有清 computed 表或再触发自分叉。

取得证书后已撤回临时恢复字段，所有原YAML恢复原摘要，network.yaml逐字节等于操作前备份。原genesis／账户／journal／fixture／数据库保留；没有重发原三笔，也没有调慢interval或重启消费者。

23:37:43北京时间原生实际采样checkpoint424269→424338，15.082秒、4.57499 checkpoint/s；同H0、三笔成功回执和两类余额与失败调整前严格深比较一致，0模拟／0广播：[after](./20261004-original-summary-native-after.json)。真实finalizer又核验原证书、原YAML恢复、replacement身份、原数据和Fullnode／faucet端口均由PID3922持有，已将runtime.ready标记true：[ready](./20261004-original-summary-ready.log)。

## 限制和后续

这是开发链恢复；钱包trial_ready仍为false，总进度48/98未增。生产者恢复原速度，索引追平、非空NFT/Kiosk延迟、新扩展Chrome、正常CA／权限和完整试用核心链路仍须分别验证。先前失败日志和保护入口禁用保持：[间隔调整失败](./20261004-checkpoint-interval.md)。其中“不能清标记消除故障”仍指禁止掩盖分叉或选用不一致摘要；本批显式采用经过官方源码核对、原记录不删除且签名前守卫保留的受控重放，最终以原摘要证书和实际链推进证明恢复。

恢复后消费者实际身份、debug和adapter绑定核验通过；22／4／14条管线最低235204／171706／163635：[水位](./20261004-original-summary-watermarks.json)。这些低于目标交易checkpoint，保持索引追平未完成。

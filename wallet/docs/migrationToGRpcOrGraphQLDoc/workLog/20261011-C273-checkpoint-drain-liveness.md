# C273 干净链上的 checkpoint 队列停滞

C272 使用最新源码已编译的 debug 产物创建全新 dev-20261011-04，创世起设置 5000ms checkpoint 间隔。原始数据库为空；实际 gRPC 连续 30 秒不推进，旧链及索引数据没有复制进来。失败记录保留，未标记 ready。

源码定位：CheckpointQueue 的容量触发 flush_forced 会重置 last_built_timestamp；持续容量拆分可无限推迟普通 flush，导致 commit 末尾一直留有 roots。RTD 的本地持久恢复要求完整 drain 才推进安全游标，1000 commit 有限背压因此可能耗尽。C147 修复的是重启时的满窗口恢复入口，不覆盖这条运行时饥饿路径。当前先新增确定性队列回归复现，不增加窗口、不伪造持久水位。

上游核对：[Sui consensus_handler](https://raw.githubusercontent.com/MystenLabs/sui/main/crates/sui-core/src/consensus_handler.rs)、[checkpoint 签名输出](https://raw.githubusercontent.com/MystenLabs/sui/main/crates/sui-core/src/checkpoints/checkpoint_output.rs)。RTD 的 durable 背压约束属于本仓库逻辑，不能把 RTD 修复声称为官方已解决。

拟修复：区分容量拆分时间与完整提交 drain 的周期，防止容量拆分不断推迟 drain；同时核对 randomness 后续 roots 是否使定时 drain 失效。保持已认证才能推进安全游标及固定 1000 窗口。因 checkpoint 分组可能变化，新产物先在新的干净链及统一版本中验收，不热替换旧链运行二进制；原链、旧产物及原摘要恢复记录保留。

实施验证：先保留失败回归，再运行完整 checkpoint 队列测试、相关持久游标测试及 debug 构建；实际新链持续推进、认证前缀和保留数据重启通过后，才接入业务验收。此日志不关闭原父项或任何尚未满足的子包。

## 当前实施记录

- 原始新增回归实际失败：100 次提交的 drain 列表为 `[]`，期望 `[25,50,75,100]`；日志 `20261011-C273-checkpoint-drain-before-01.log` 保留。
- 初步队列修复的全部 13 项测试通过；尚未带完整协议开关，不作为最终交付证明。
- 已按仓库 [protocol-config 技能](../../../../rtd/.claude/skills/protocol-config/SKILL.md) 检查远端：`git fetch --no-tags origin` 成功，未发现 `origin/releases/rtd-v*-release`。保守地冻结既有138及以下，新增139，仅 Chain::Unknown 启用；Mainnet/Testnet 均不开启。
- 三份139协议快照逐项核对，原版本快照不动。全部18项协议测试通过，含1..138三网络关闭及139仅dev启用断言。
- 完整handler首轮为16通过/17失败，17项均在 TestAuthorityBuilder 创建创世时因缺139框架快照失败。没有把此轮标记通过；正在通过仓库规定的 rtd-framework-snapshot 工具生成139框架。已中断先行的编译子进程并保留失败构建证据，业务服务未被信号中断。
- 原8个运行debug产物已逐文件验证并保存到新runtime的 `C273-retained-debug`，新最终构建与运行验收仍待。
- 139 框架已用仓库生成器生成；5 个包与 138 逐字节一致，138 的 manifest 和文件 SHA 均未改动，证据 `20261011-C273-framework-identity-01.json`。协议配置最终格式化及异步测试调整后，18 项再次通过（`protocol-after-03.log`）。
- handler 的 after-03 使用 4 个测试线程，触发已有全局 ProtocolConfig 测试 override 的互相干扰及 PoisonError，进程 abort，不能算通过。当前环境没有 cargo-nextest，改为 `--test-threads=1` 串行 after-04；失败日志保留，未修改生产锁行为来绕过测试。
- after-04 完整 handler **33/33 通过**；持久恢复的满窗口与不足窗口 **2/2 通过**。源码修复已通过相关回归，8 个 debug 服务正在重新编译（build-02），尚无实际运行通过结论。
- 为保留旧环境验证器，归档原生来源新增对显式 `deployedArtifactsReplaced=false` 隔离构建的支持；仍核验源码、不可变 provenance、绝对规范目录及二进制 SHA。4 项测试通过，含隔离旧产物、篡改拒绝、符号链接及错误目录拒绝。旧 provenance 的默认目录语义保持。
- 编译期间 VS Code 自动启动的全工作区 `cargo check --all-targets` 占用同一构建锁。核实进程命令与 rust-analyzer 父进程后，仅 SIGINT 该检查子进程62369；没有终止编辑器、任何链或业务服务。证据 `20261011-C273-compiler-lock-release-01.json`。
- 旧干净链的实际指标确认 `consensus_last_commit_index=1002`、`consensus_quarantine_queue_size=1000`、`last_certified_checkpoint=20`，与有限窗口耗尽一致；见 `20261011-C273-stalled-native-metrics-01.json`。
- 8 个当前源码 debug 服务构建成功，sourceUnchanged=true（build-02）；3 个隔离归档辅助程序构建成功，原默认目录旧辅助程序 SHA 均保持。新归档输入将显式绑定隔离构建，不改旧运行验证器。
- 已执行授权重置，仅停止新建但停滞的 C272 节点24654，整个旧config/数据库/checkpoint/日志保留在 `dev-20261011-04/C273-chain-reset`。新节点81985，H0 `BTrU3deMDbnWcUWLJ2ruDj9vbCC4gaYnVj8qV3K2nFah`，协议139，epoch300000ms。采用5分钟epoch，确保跨越原约2分钟的1000commit停滞窗口，避免短epoch的强制drain掩盖缺陷。旧G0/G3、C51钱包未改动。
- 新链真实持续推进采样正在进行；middleware绑定暂保留旧H0，尚未接入新链或标记ready。重置证据 `20261011-C273-clean-reset-01.json`。

## 原生运行收口

- 连续180秒19次采样：17→96，18个间隔全部推进，全程epoch0。没有依靠epoch结束的强制drain；另一次指标采样显示共识3351、隔离队列67、认证checkpoint84，跨过原1002/1000/20停滞点。见 `native-liveness-01.json` 和 `advanced-native-metrics-01.json`。
- 使用本次新源码debug验证器完成0..50的完整委员会签名和连续性验证，见 `native-prefix-01.json`。
- 正常SIGINT新节点81985，保留数据库，创世及0..96共98个文件SHA不变；启动89642后重放到原持久游标4248，恢复checkpoint104，实际gRPC继续104→111→115→119。未清空数据库、未签名或重发任何交易。见 `native-restart-01.json`、`native-liveness-after-restart-01.json`。
- 以上运行条件成立后，将尚未建立归档来源/身份/消费数据的G4中间件从原失败H0改绑新H0，并仅标记nativeReady；queryServicesReady、contractsDeployed仍为false。见 `native-foundation-binding-01.json`。链端缺陷已完成本地dev修复验证，归档全套环境与27个业务子包继续由C274推进。

# C306：跨批次位图恢复起点缺陷

## 已复现并在隔离副本修复

当前 RTD debug 源码的原生回归确认了三种失败：

1. checkpoint 2、3 在一次提交中跨入新桶，持久恢复起点错误地为 3，而不是 2。
2. 批次仅在 checkpoint 2 有索引值，最终水位到 8，恢复起点错误地为 8。
3. 实际关闭提交器、创建新 store 和提交器、读取持久恢复水位并据此重放，原本 `[0,1]` 的桶在追加后变成 `[1,2]`，丢掉旧 bit 0；预期应为 `[0,1,2]`。

三个原代码失败完整保留。候选将 `BitmapBatch` 已有 checkpoint 范围的最小值传入 generation 状态，在跨桶时用它保存恢复起点；空批次仍使用当前水位，没有增加新的持久字段或改变存储格式。重启原桶的已有恢复起点仍保持，已封桶仍由原逻辑跳过，允许保守地多重放部分 checkpoint。

修复后 **59 项位图测试全部通过**，包括三个新反例、既有重启重放、已封桶不覆盖、跨桶、稀疏提交、并发重试和水位 CAS 测试。[回归报告](./20261012-C306-bitmap-regression-01.json)给出原失败日志、候选日志及补丁的 SHA。

## 交付边界与后续

目前改动仅在独立源码副本，主仓库运行源码尚未应用、运行二进制尚未重编译、原环境的 338 个缺失维度成员尚未修复。三项原生反例确认了会造成同类缺失的代码缺陷；不能凭这些测试倒推八次历史缺失发生的精确进程时刻。

C297/C298/C300/C301/C302 的长任务绑定当前 C274 源码及 debug 产物，结束时会重新核验。先让这些已完成大量工作的数据任务收口，再应用主源码补丁、编译最新 debug 并重新认证运行环境，最后修复受影响数据及验证实际持久恢复。不会为通过检查而修改原任务的输入哈希，也不会仅重置数据而保留缺陷。

隔离目录：`~/.local/state/rtd-wallet-migration/dev-20261006-03/publication-foundation/C306-batched-bitmap-recovery-20261012-01/workspace/rtd-kvstore`。部署/复现脚本位于 `link-u-smart-contract/all-in-one-deploy/localDeploy` 的 `prepare_wallet_C306_bitmap_regression.py`、`C306BatchedReplayTests.rs`、`C306ColdReplayTests.rs` 和 `fix_wallet_C306_isolated_bitmap_replay.py`。

最初一次构建因未带原 `.cargo/config.toml` 而停止，随后使用相同工具链和原构建配置完成原反例及候选回归；原始构建记录保留。测试使用 mock BigTable 协议服务，不将其称为 HBase WAL 或完整物理冷恢复。QA-A17.5/.6 继续开放，无需主人提供额外信息。

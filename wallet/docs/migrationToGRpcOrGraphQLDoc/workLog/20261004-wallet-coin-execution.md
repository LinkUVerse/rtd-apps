# 真实钱包 coin 准备、模拟与提交

关联 RPC-04、RPC-14、RPC-15、RPC-20、TX-01、TX-05、TRY-02、TRY-04；本轮均不据此整体勾选。

## 已执行

新增 `scripts/probe-certified-coin-execution.ts`，显式绑定独立 dev runtime、四入口 profile、fixture H0/generation、当前 rtd HEAD／dirty 文件哈希及 debug CLI 哈希。测试账户为 fixture deployer；仅向自身转移 1 个原子单位。

实际调用 WalletFullnodeReader.coins、prepareCoinTransfer、WalletTransactionReader.prepare、revalidateCoinTransfer；固定批准 bytes 经 debug CLI 的本地 keytool 签名后，由 WalletExecutionReader.verifySignature 验签、dispatch 走 gRPC ExecuteTransaction。签名前模拟与提交回执验证均通过。摘要 `Hb3LJi6m3wV8HYBYgZmitSwmVTMcwaiNaYsKhpuPTvwf`，节点返回 success=true、epoch=2、checkpoint=null。未调用 CLI execute-signed-tx，也未使用旧 JSON-RPC 提交。

提交前以 exclusive-create、fsync(file) 和 fsync(directory) 保存 pending；已有 attempt 目录禁止重新执行。运行数据在用户私有 runtime 的 `wallet-coin-execution-01`，私钥及签名不复制进文档。此文件记录仅服务测试，不替代产品 IndexedDB journal／Web Locks。

另一次仅模拟最大 u64 金额的 self-transfer，真实 prepare 返回 WalletSimulationError(reason=failed)，未进入签名或提交，dispatches=0。它证明模拟阻止无效提交，**不代表已执行失败交易验收**。

## 原摘要恢复仍未通过

首次提交后立即 lookup 返回 null；之后独立进程仅按原摘要查询，仍为 null，无再次提交。最新一次观测 Fullnode `[129944,129968]`，Archive `[0,4534]`，H0 相同。Fullnode 配置 `num-epochs-to-retain=0`，历史保留窗口很短；归档尚未覆盖新交易。钱包有裁剪证明后才查同链归档，未因 NotFound 重建／重发。

当前 RTD `crates/rtd-rpc-api/src/grpc/v2/ledger_service/get_transaction.rs` 要求交易 checkpoint 位于可用窗口，否则 NotFound；这与现场水位一致。没有将 `checkpoint=null` 编造为目标高度。未停节点、未改裁剪配置、未重建链。

一次恢复探测遗漏私有 CA 环境变量导致 TLS fetch failed，已保留失败 trace；补回明确 CA 后查询返回 null。该失败不计入成功证据。

证据：[回执与模拟拒绝](../evidence/20261004-wallet-coin-execution.json)、[实时服务窗口](../evidence/20261004-coin-recovery-watermarks.json)。最初成功提交后 lookup 的断言失败，因此未输出完整成功 summary；证据如实由已落盘 receipt 和随后只读观察整合，不补造首次请求 trace。

## 范围

真实钱包领域代码和执行 reader 已跑通受控提交；CLI 测试账户签名不等于后台账户签名。Chrome 授权／确认、真实 IndexedDB 协调器、跨 worker pending 恢复、GraphQL 写后读仍未完成，不能据此标记可试用。原摘要保留，后续只读恢复，不重新发送。

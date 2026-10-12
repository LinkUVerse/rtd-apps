# RPC-04／TX-01：混合资金发送全部覆盖检查

日期：2026-10-04。

## 问题与权威依据

RTD `select_gas` 对真实 Gas Coin 使用 `take(protocol_config.max_gas_payment_objects() as usize)`，其后才加入地址余额 reservation。Sui 官方当前源码具有相同限制。超过选择上限时，GasCoin 转移可能模拟成功，却不包含全部已观察 Coin；只比较准备前的金额与余额无法发现这个缺口。

- [官方源码快照](./20261004-pay-all-sui-simulate.rs)
- [来源 URL 与 SHA-256](./20261004-pay-all-sui-source.json)
- RTD：`crates/rtd-rpc-api/src/grpc/v2/transaction_execution_service/simulate/mod.rs`，`select_gas`。

## 修改

`src/shared/rpc/coin-transfer-preparation.ts` 对混合地址余额且有 Coin 的“发送全部”结果，解码最终 bytes，逐项检查 gas payment 中是否包含新鲜读取的每个 Coin 的精确 objectId／version／digest。覆盖不完整就拒绝返回批准记录，不补建、不补签、不补发。

`address-funded-transfer.test.ts` 新增四种最终真实 BCS 测试：完整覆盖通过；遗漏、版本变化、摘要变化拒绝。reader 和正式准备返回仍为测试替身，这些不是链执行证明，也不证明 reservation 金额核验。

## 验证

- 定向 2 文件 31 项通过：`20261004-pay-all-coverage-tests.log`。
- 完整钱包类型检查通过：`20261004-pay-all-coverage-typecheck.log`。
- 全量 113 文件 1236 项通过：`20261004-pay-all-coverage-full-tests.log`。
- 开发版 Webpack 构建成功（49098 ms）：`20261004-pay-all-coverage-build.log`。
- 新产物四入口静态审计通过：`20261004-pay-all-coverage-static-audit.json`；不等于动态抓包。
- 双方交易章节同步，文档完整性验证通过。

## 边界

RPC-04／TX-01 保持未完成。本改动防止已观察 Coin 被自动 gas 选择遗漏；不声称解决并发新增余额、所有 reservation 校验或大规模 Coin 的拆批发送。真实混合／非原生资金、扩展端到端、共享 core 构建错误仍待。没有发出真实交易或修改 dev 环境。

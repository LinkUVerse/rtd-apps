# RPC-15：dApp 模拟摘要使用同一准备结果

日期：2026-10-03。模拟展示迁移，实际批准／签名提交仍未全部迁移。

## 实施

- 批准页移除 useTransactionDryRun 和旧 useTransactionSummary，新的 SimulationPreview 从 prepared.simulation 读取现代余额变化与 effects BCS；详情／Gas／模拟摘要共用上一批 Fullnode 准备结果。
- 收据公共映射函数的参数收窄到实际使用的字段，使模拟与收据复用精确金额汇总和原生 effects 对象归属解析，不伪造旧 JSON-RPC DTO 或事件。
- 页面注明只是预期变化、尚未提交；预览摘要不展示链终态或创建交易浏览器链接。
- 准备失败／缺失／仍加载时不能批准，删除旧“失败仍然批准”二次确认；拒绝在准备中仍可操作。
- 删除已无调用的 dry-run hook及WalletSigner.dryRunTransactionBlock，移除未引用的旧 normalized type工具；Command详情类型改为当前TransactionData命令联合，不再依赖已删除的Commands导出。

## 验证

- 新增5项React预览测试（精确大额余额、原生effects所有权优先于展示字段、错误清旧展示、失败联合类型、缺数据／加载）和3项批准门禁测试（无准备、失败不可绕过、准备期间可拒绝）。
- 定向回归56文件、683/683通过。之后移除无调用的signer dry-run方法并重新完整类型检查；RPC类型检查exit0，完整钱包exit2，107条诊断（前110）。
- [证据与哈希](../evidence/20261003-dapp-preview-verification.json)，测试输出 `20261003-dapp-preview-suite-final.log`。AST结果是候选扫描，不能当作产物零JSON-RPC证明。
- 未运行真实链、Chrome扩展或部署；React依赖使用受控替身。

## 未完成边界

respondToTransactionRequest仍走旧WalletSigner重新处理原请求，background也尚未实现完整dApp origin／request／chain绑定及modern返回契约。当前只统一了预览，尚未证明最终签名与预览bytes一致，更未迁移全部dApp执行到journal。下一步必须完成这条批准到后台的链路；不得据此勾选RPC-15／TX整体或开放试用。

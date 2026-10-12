# dApp请求来源／账户／网络绑定基础

日期：2026-10-03。关联RPC-15及TX授权／执行迁移；只完成基础，不勾选整体。

## 变更

- WalletStandardInterface的新旧执行方法补传input.chain，后台sign分支不再丢弃chain。本地wallet-standard源码rtdSignTransaction.ts要求现代输入包含chain；rtdSignAndExecuteTransaction.ts继承该输入。旧可选chain保持兼容并绑定当前后台profile。
- Transactions创建请求前选取当前配置，未配置直接拒绝。持久请求包含浏览器origin、requestId、规范account、chain、profile bindingKey、交易原文SHA-256和签名／执行模式。
- shared绑定模块校验Web origin、请求ID、显式链、sender、布尔模式及最多2MB UTF-8原文；绑定重验拒绝source、profile revision／generation／H0、账户、模式等变化。绑定对象冻结。
- 方案5.4双向同步至archive源目录及合并目录。

## 验证

- 29项绑定测试：真实SDK序列化／解析，错链／账户／origin／hash／模式／网络切换、旧请求和无效输入。
- 5项真实Transactions模块测试：mock浏览器storage、Window和网络配置；验证错链／缺配置在写storage或开窗之前失败，执行及sign持久绑定，关闭清理。不是Chrome扩展运行。
- 定向整组717/717，58文件，见20261003-dapp-binding-tests.log。
- RPC类型检查的首轮发现新增负例测试强制类型转换诊断；已改为显式unknown转换，再检查。完整钱包仍存在旧SDK／dapp-kit等基线诊断，最终107条，RPC类型检查通过，见../evidence/20261003-dapp-binding-verification.json；不声称构建通过。

## 尚未完成

assertDappRequestBinding尚未接正式签名路径；旧批准thunk仍由WalletSigner构建／提交。下一步是后台准备与批准token／最终bytes绑定，签名和dispatch每个边界重验请求、权限、账户与网络，断连失效与journal恢复，以及现代签名／执行结果契约。没有新dev启动、合约部署、实链或Chrome验收；当前不可试用。

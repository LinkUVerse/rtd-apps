# Wallet Standard 自定义链发现与事件修复

2026-10-04。TX-09／TX-10继续审计期间发现：account.chains可返回已审核自定义链，但wallet.chains固定四个内置值；network变化只发送accounts事件。

对照[Sui官方Wallet Standard文档](https://docs.sui.io/onchain-finance/asset-custody/wallets/wallet-standard)的Exposing accounts与Events wallets emit：账户公开的链必须存在于钱包chains；chains变化由change事件传递。已将钱包链集合改为内置链加当前自定义链并去重，连接／状态事件同时返回chains与accounts。切换到另一自定义链或内置网络会移除前一个自定义标签，不泄露服务部署地址。

新增测试先复现自定义账户链不属于钱包链集合的失败（20261004-wallet-chains-before.log），修复后4文件69测试通过（20261004-wallet-chains-tests.log），钱包类型检查退出0（20261004-wallet-chains-typecheck.log）。覆盖自定义A→B→Local、账户链一致性、事件负载、去重及取消订阅。没有以此替代真实Chrome自定义权限／网络切换验收。

## 下一项明确缺口

官方[signTransaction 2.0输入源码](https://github.com/MystenLabs/ts-sdks/blob/main/packages/wallet-standard/src/features/suiSignTransaction.ts)与本地SDK均包含signal?: AbortSignal，execute继承该输入。现有sign-only把signal混入...input后经window.postMessage转发，不能用它建立后台取消；execute则未传递signal。后续须以请求ID绑定原连接的取消协议贯穿批准生命周期，覆盖预先abort、toJSON等待、批准中、dispatch前后；dispatch后取消不得清除pending journal或重发交易。不能只让页面Promise拒绝后留下可签名批准窗口。TX-09／TX-10保持未勾选。

官方网页示例仍含旧options及signature类型描述，现代方法输入输出以官方当前TypeScript源码为准；本次不恢复JSON-RPC或旧feature。所查main为可变分支，未称固定提交。

最终开发版Webpack退出0，仍编译Local profile03 revision2（20261004-wallet-chains-build.log）；新产物四入口审计通过（20261004-wallet-chains-static-audit.json）。文档完整性验证通过，进度39/98（39.8%），trial_ready=false。本批未重复全量或真实Chrome；上一批1266测试／Chrome属于修改前产物。未启动或修改dev链、未签名／模拟／提交交易。

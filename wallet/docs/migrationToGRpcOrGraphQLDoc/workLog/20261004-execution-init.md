# 交易授权初始化期间的会话变化

## 缺口与修复

withExecutionAccount 原先先 await 网络、账户和账户地址，再注册网络／账户事件。初始化期间发生切换并恢复原配置，最终绑定校验不能发现中途授权变化。初始化读取失败也尚未进入 finally。

现在先建立 lifetime 取消状态并注册四类事件，再进入 try/finally 执行初始化；每次初始化 await 后检查取消，已建立 session 时同一事件同时关闭 session。账户状态事件仍只针对当前account，activeAccount事件在选中其他account时取消，不扩大无关账户状态影响。

## 验证

8个新增场景在修复前均失败（20261004-execution-init-before.log）；涵盖network/account/address三个等待阶段切网，accountsChanged/accountStatusChanged/activeAccountChanged三种事件，network/account两种读取失败清理。

修复后execution、dapp-preparation、dapp-signing、dapp-execution、execution-recovery-wakeup共5文件75测试通过，见20261004-execution-init-tests.log；完整钱包TypeScript检查通过，见20261004-execution-init-typecheck.log。所有取消场景禁止签名／dispatch，初始化切网场景还验证无simulate、无pending写入，且清理四个监听器。

本轮未提交链上交易，测试模拟事件与账户读取，不代表Chrome实际切换或跨worker恢复验收。TX-10继续未完成，总体33/98。双方合同同步更新。

最终开发扩展构建及四入口静态审计通过，见20261004-execution-init-build.log、20261004-execution-init-audit.json；构建已包含本轮初始化取消逻辑。

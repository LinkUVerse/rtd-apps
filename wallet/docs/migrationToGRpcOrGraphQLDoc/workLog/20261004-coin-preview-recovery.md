# TRY-02 币发送预览与只读恢复重复请求

## 真实页面发现

新增可选 `RTD_TEST_COIN_PREVIEW=1` 浏览器测试，从公开测试账户进入原生币发送表单，准备向自身转 1 原子单位，检查最终批准按钮可用并返回表单，不点击发送。测试不使用部署者账户，不改已有执行档案。

第一轮脚本误将中文“检查”按钮定位为“预览”，保留 `20261004-extension-coin-preview.log`；诊断也发现真实页面显示“当前链账户正在签名或恢复，请稍后查看结果”。修正定位后第二轮 `20261004-extension-coin-preview-retry.log` 已进入“检查并发送”，金额与 gas 预览可见，但同一提示仍在、最终发送不可用，不能将此轮记作通过。

## 修复

发送页面恢复 effect 在 StrictMode 重放时重复调用后台恢复，第二次会争用链账户执行锁。页面现在仅合并 accountId／bindingKey／readSessionKey 相同的进行中只读恢复 Promise；完成后释放引用。会话改变发起独立读取，旧会话回调被 cleanup 的 active 标记抑制，旧 Promise 完成也不会清除新引用。执行提交和后台锁／journal 未改。

2 项定向测试覆盖 StrictMode 单次恢复和会话切换后旧错误隔离；完整钱包 tsc 通过，见 `20261004-coin-recovery-replay-final-tests.log` 与 `20261004-coin-recovery-replay-typecheck.log`。实际修复后页面结果和构建以后续记录为准，不以单元测试替代实际链路。

TRY-02 仍开放：本轮只准备与模拟，不证明普通发送真实执行、链失败和完整账户创建流程。总体完成数保持 40/98。

## 最终页面结果

`20261004-extension-coin-preview-final.log` 的实际公开账户原生币自转 1 原子单位准备通过，最终发送按钮启用、返回金额表单成功，4 次 Fullnode 模拟、0 次执行请求。测试随后完成账户锁定／密码验证和整浏览器重启恢复。未点击最终发送，未创建新的执行 journal。

Webpack 41303ms 成功，四入口静态审计通过；UI SHA256 `9601f6ee38696c6527d162932030d5777cfc4607e85299e1037aaf5eaa28aa62`，background 仍为 `6e451aaea41dd3545141e8f0d8d5948cdac89273097cfa9d1183e69ea653c565`。本轮为 2 项定向测试，不宣称重跑全部历史测试。

证书仍为精确 dev SPKI 例外，网络为编译内置 Local profile。实际币发送提交、模拟拒绝与真实链失败的区分、创建账户完整链路仍待验证，TRY-02 不勾选。

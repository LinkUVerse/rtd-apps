# C249 当前普通 Chrome 内部 dev 转账及写后余额缺陷

2026-10-11。当前 C241，指定开发账户 0xd50b…077c 向独立 C51 原测试账户 0x9d76…e5bc 单次转账 0.01 RTD，交易 DsPidw8nXD3VhpLjWqqz6veYZsKEP6cfqJGTs4yqnHqg，checkpoint 1977015，费用 1997880 原子单位。正式执行原 bytes/digest/签名与预览一致，实际收据显示成功；初次 native/archive NOT_FOUND 单列，后续只查原 digest 确认。

规范证据：[独立审核02](./20261011-C249-execution-audit-02.json)、[预览审核](./20261011-C249-transfer-preview-audit-01.json)、[单次操作意图](./20261011-C249-submit-attempt-01.json)。三个 HAR 捕获范围重叠，每份各一次 ExecuteTransaction，不相加为三笔。原生 UI 01/02 及 HAR 已固化 SHA。审核01曾在写文件后的 console 输出遇 BigInt 序列化错误，旧脚本/证明/失败均保留；02修正输出与 ROUND_DOWN 预期显示，作为有效审核。

Fullnode 实际余额 999881962424 → 999869964544，差额11997880正好等于转账加费用。首页和发送币种选择仍显示999.89 RTD：GraphQL在固定S1006768返回999893960304，低于实际交易checkpoint。当前余额应显示999.86 RTD（向下保留两位）；不是简单缓存失效问题。审核明确 postWriteHomeAccepted=false，P249-3不完成。

C250将当前资金展示切换独立Fullnode ListBalances，保留组合资产GraphQL同快照读，不放宽名称新鲜度/资产pin/归档准入。当前未重新提交任何C249/C248交易。临时检查窗口已关闭，原首页DevTools停止记录。98父项仍93/98。

# TX-01：最终批准字节与授权边界子任务

按原TX-01的bytes／sender／gas／赞助／expiration及重新模拟合同核对。TX-12刚完成的故障矩阵是输入证据，不据此自动勾选TX-01。

| 子任务 | 内容 | 状态 |
| --- | --- | --- |
| B1 | prepare／页面预览／revalidate／background／sign-only／dispatch全调用链逐项核对，边界映射 | 已完成 |
| B2 | 官方Sui赞助交易文档、固定源码与本地RTD签名者规则对照；区分sign-only与单签execute | 已完成 |
| B3 | 对无直接测试的赞助方批准边界补测试，保持原拒绝策略与固定gas bytes | 已完成 |
| B4 | 定向测试、完整tsc／当前源码稳定构建及双方合同同步 | 已完成 |
| B5 | 原TX-01完整授权验收逐项复核，未证明范围保持pending | 完整当前产物授权实测待验 |

本批不新增实链交易，不改RTD源码或重启消费者。实际Chrome全入口与赞助收集／执行系统若没有完整实现或证据，明确保留待验，不把sender单签看作赞助执行完成。

B1–B4证据见[本批核对](./20261005-final-bytes-authorization-audit.md)及[机器记录](../evidence/20261005-final-bytes-boundaries.json)。B5和父TX-01保持pending。

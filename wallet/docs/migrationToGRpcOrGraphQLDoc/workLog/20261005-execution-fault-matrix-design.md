# TX-12故障矩阵：子任务与证据范围

继续既有TX-12单测故障注入合同，历史回放由原PID／supervisor继续。没有重新定义钱包可试用门槛；TX-04／07／10的真实扩展完整切换、签名及执行场景仍按原父项验收。本批不重发旧journal或派发新实链交易。

| 子任务 | 完整验收 | 状态 |
| --- | --- | --- |
| F1 | 当前coordinator／reader／journal分支及既有测试映射，枚举未覆盖边界 | 已完成 |
| F2 | 五次授权检查、模拟／签名／验签等待取消、批准输入TOCTOU、原摘要保守恢复 | 已完成 |
| F3 | 真实Chromium：pending写成功后原生异步abort、严格durability不可用、损坏journal／scope、升级blocked后迟到成功 | 已完成 |
| F4 | 既有gRPC wire成功／链失败恢复、终态原子abort、跨窗口／worker停止、NotFound保留矩阵整体核验 | 已完成 |
| F5 | 对照原TX-12完整单测故障合同逐项审计、文档对齐及总进度更新；证明不足不勾选 | 已完成 |

现有真实PG／认证索引仅属于独立D5／D6；不会用于证明本批执行故障。新测试必须说明受控网络响应和回调的范围，原生IndexedDB／Web Locks可用其真实浏览器结果证明。物理断电／磁盘故障、正常Chrome CA和新产物实链验收归其余任务。

本批最终[逐项合同核验](./20261005-execution-fault-matrix-completion.md)及[机器证据](../evidence/20261005-execution-fault-matrix-completion.json)已落盘，F1–F5完成；TX-12仅按其单测／原生故障合同勾选，不替代其它任务。

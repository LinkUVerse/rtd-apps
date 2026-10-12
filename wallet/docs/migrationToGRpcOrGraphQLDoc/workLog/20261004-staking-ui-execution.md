# RPC-13 实际钱包质押提交与持久化

## 本轮结果

2026-10-04 使用既有指定源码 debug 开发链，实际 Chrome 扩展从验证者选择、金额校验、1 RTD 预览进入“立即质押”，由钱包后台签名并提交成功。实际发送一次，四次模拟，随后整浏览器重启，journal 仍为 confirmed-success。成功 effects 的摘要与批准前预览一致，页面跳转到同摘要收据。

- 摘要：`3AxtK5qS36Vy4wCwpoJqWYGAYJ9crwL2nSKmCFPLaKDi`
- requestId：`324a70b0-e915-4d2c-bb34-6d97119b02fc`
- 测试账户：`0xa0ccc8bcc83f6c628340134f8546a21e0618fd1aaa02432bba454c4a2c2233da`
- 验证者：`0xbff484df028a08ddddeec25f086ee08b1c79dc9e411a378fe1a92620f3bbded4`
- 本金：1000000000 原子单位；预览 gas 上限：4419224。
- 回执 source=fullnode、epoch=2、checkpoint=null。null 不冒充已确定 checkpoint，也不否定成功 effects。
- 证据：[完整扩展执行日志](./20261004-extension-staking-execution.log)。该轮退出 0。

后台实际加载的源码哈希在提交前和重启后均与磁盘一致：`6e451aaea41dd3545141e8f0d8d5948cdac89273097cfa9d1183e69ea653c565`。UI 哈希 `5e618783858660d38b80f5c452a15390dccdbddcd2ea8735955723302052acc1`。提交测试阶段仅变更测试工具，提交时业务构建沿用上一轮已通过的 1310 项、完整 wallet tsc 和 Webpack。随后只读收据检查发现冷打开问题并修复，最终验证见下节；不将旧全量结果写成本轮重跑。

## 防重发与环境依据

运行前重新核对指定 rtd HEAD、工作树差异及两个 debug 二进制哈希，全部一致，见 [debug 核对](./20261004-pre-staking-debug-recheck.json)。没有重启链或重新部署合约。

只读打开原 dApp 保留浏览器，核对全部 4 笔 journal 均为 confirmed-success、成功回执，0 模拟／0 提交，见 [全部记录核对](./20261004-pre-staking-all-journals.log)。新测试启动要求该核对不超过 10 分钟、账户一致、4 笔终态完整；不触碰另一个部署者账户的未决交易。

执行档案固定为 `~/.local/state/rtd-wallet-migration/dev-20261003-01/staking-execution-browser-01`，目录已存在即拒绝再跑执行模式。密码只存本机 0600 文件；批准前以 wx 和 fsync 保存 attempt.json；成功保存 confirmed.json、重启后保存 restart-verified.json。失败也保留全部档案，不能换目录重发。本轮批准只点击一次。

启动旧 dApp 档案的第一次只读核对曾遇到扩展 reload 时 ERR_BLOCKED_BY_CLIENT；失败日志保留。第二次只读加载成功，此后新增全量终态核对也成功。该临时浏览器加载错误没有触发链提交，不宣称 reload 工具分支已修复。

## 未完成边界

RPC-13 仍开放：实际非空仓位、活跃奖励、赎回页面尚未完成；资产索引滞后不能靠伪造仓位或改读新鲜资金入口掩盖。使用精确开发证书 SPKI 例外、编译内置 Local profile，尚不代表正常 CA、自定义网络或主网验收。总体仍为 40/98，trial_ready=false。

## 后续只读收据检查发现的问题

首次只读脚本在粗粒度“locked journal verification”阶段断言失败，日志不足以区分该阶段的具体断言，不推断原因。随后细化诊断，明确确认账户锁定、原 journal 成功终态和只读恢复命令通过；直接导航原交易收据却跳转到 tokens，未显示成功收据。失败日志 `20261004-staking-retained-receipt.log`、`-diagnostic.log` 和 `-render.log` 均保留；没有新的批准动作。

页面代码在账户查询尚未完成、activeAddress=null 时立即 Navigate，导致冷打开原摘要丢失路由。本轮已添加回归测试并修正等待账户加载的条件；真实复验以后续日志为准，不用提交成功来替代收据渲染验收。

执行后只读资产组合探测在 S=80968 仍返回 0 仓位、1 验证者（14 次只读请求，0 提交），见 `20261004-staking-after-execution-portfolio.json` / `.log`。该快照未证明已覆盖本次质押，不能将空仓位误报为交易失败或完成非空仓位验收。

## 收据冷打开修复与最终验收

`ReceiptPage` 仅在账户加载结束后才以无地址跳转；账户未就绪时不渲染依赖地址的详情卡片。新增 MemoryRouter 回归覆盖冷加载保留完整 digest URL，以及账户就绪后的原交易确认展示。

最终 `20261004-staking-retained-receipt-final.log` 退出 0：保留档案重启后账户锁定、同摘要成功 journal 和只读恢复命令正常，解锁后直接冷打开原交易链接，同时显示确认成功和“交易已确认，资产数据仍在同步”。0 模拟、0 提交。没有重发原交易，也没有篡改索引水位。

验证：5 项收据定向测试、完整 wallet tsc、Webpack 46960ms、四入口静态审计均通过，日志前缀 `20261004-receipt-cold-open-final-*`。首版类型检查与构建因详情卡片地址尚可为 null 失败，已补地址条件并重跑通过；失败日志保留。未重跑全量 1310 项，不宣称全量结果覆盖本轮新增测试。

最终 UI SHA256 `9ce2d0402e1450a24fd9c593482771ff1238416f56dfea7db474914806bdc4f1`；background SHA256 不变。RPC-13、TX-08 仍未完成：本次只证明该真实质押收据在索引滞后时保留终态，尚未证明索引追上后的刷新、全部执行入口或实际赎回页面。40/98 不变。

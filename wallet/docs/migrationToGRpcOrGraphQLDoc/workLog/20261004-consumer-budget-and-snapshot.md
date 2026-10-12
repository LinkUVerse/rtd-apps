# 2026-10-04 消费预算与钱包共同快照恢复

## 调整前证据

GraphQL最新checkpoint／availableRange上界为i64::MAX且digest为空；PG索引100、consistent18。consistent已取到100，但checkpoint19的committed marker请求反复503。三个消费者共用4并发适配器，KV采用默认高预取，另两个上限8，存在竞争。未把异常上界写为可用覆盖。

## 实施与恢复

新增指定部署目录 `wallet_consumer_budget.py`、`tune_wallet_consumer_budget.py`。以PID／启动时间／完整命令核对三名消费者，先保留原始配置和进程记录，发送SIGTERM并验证退出，再增加单独runtime override；不清数据库、不改变已认证数据，不停止publisher／Ledger／GraphQL。override将ingestion并发固定1、重试1000ms，保留pipeline／快照／提交配置；启动器校验原文件hash、override hash与限定转换，再选择配置。

重启后三名消费者：KV65614、PG indexer65781、consistent65784；原Ledger90546和GraphQL36527复用。默认GraphQL checkpoint恢复为100及有效摘要，availableRange为0–100。保留的数据库在有界并发恢复后共同覆盖成立；不将一次结果外推为所有负载下的性能验收。

## 钱包实链读取

新增 `wallet/scripts/probe-certified-query-snapshot.ts`，运行实际WalletAssetReader.open／objects／balances／ownedObjects，经钱包已有共同覆盖与末验逻辑，固定snapshot100读取系统对象和部署者账户，返回5个对象。证据：[真实钱包共同快照](../evidence/20261004-certified-common-snapshot.json)、[GraphQL覆盖](../evidence/20261004-consumer-budget-coverage.json)。不是手写GraphQL响应或fixture。

首次probe误把proof.checkpoint当number，实际是字符串；所有读取完成后断言失败。已改为规范数字字符串和BigInt安全范围检查，重新实链执行通过。预算转换幂等测试发现空白行差异，已保持已有转换结果不变，部署override字节未被重写。

2项预算守卫测试通过，覆盖限定转换／幂等、原配置／override突变拒绝；见[测试日志](./20261004-consumer-budget-tests.log)。没有改钱包生产逻辑，本次仅增加真实探测脚本。

## 验收边界

当前只有私有认证数据面的钱包读取通过；public query ingress、gRPC-Web和Chrome尚未连接。认证发布者仍需完成持续追赶，不能把snapshot100当作当前链head。ENV／TRY清单不勾，总体18/98。

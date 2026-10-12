# OriginByte名称收款后台入口集成

## 验证范围

在实际executeWalletPrepared命令、WalletExecutionCoordinator、批准bytes解析和assertApprovedRecipient之间执行集成测试。Fullnode／名称解析／账户签名／journal存储／dispatch为边界mock，因此这不是实链签名或IndexedDB耐久性证明。

新增create／existing／wrong-owner／unavailable四项：两种合法格式用SDK构造完整BCS交易，后台接收原bytes并使用新摘要；核对签名收到Intent前缀+原bytes，commitPending保存相同bytes/digest且发生在唯一dispatch之前。模拟传输中断返回原摘要pending。目标owner不符或查询失败时签名、commitPending和dispatch均零。

2文件35项测试通过，钱包完整tsc通过；日志20261004-originbyte-background-integration-tests.log和-typecheck.log。本轮仅新增测试和只读探测脚本，生产代码与上一轮100文件1086项全量、dev构建及静态审计通过版本一致，未重复构建。

## 实链只读目标校验

新增scripts/probe-live-originbyte-recipient.ts，使用保存profile和既有公开夹具，限制仅本机GetServiceInfo／GetObject。真实WalletFullnodeReader与批准参数校验函数读取目标Kiosk e6c4…ae63b，当前版本11、owner 0xaaa通过；以另一个夹具owner 0xbbb检查同一目标时被拒绝。完整H0与公开夹具一致。

证据20261004-originbyte-recipient-live.json和.log。该探测使用合成unsigned命令，仅证明当前目标owner校验；没有验证NFT类型、模拟、名称registry、签名或Chrome。dispatches=0，没有启动／重启环境或执行合约部署。

## 任务状态

先前RPC-21重新打开所指的OriginByte后台编码缺口现已补齐，接口与消费端合同可重新标记完成。QA-A15仍负责真实名称registry部署、改名／续费／lag与Chrome确认；RPC-22及TRY承担完整NFT转移与核心试用，均未借本批结果勾选。总体30/98，尚不可试用。

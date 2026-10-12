# RPC-04／11／TX-01：最新产物质押金额转换与正式预览

2026-10-05，V1–V4按[实施前设计](./20261005-staking-current-preview-design.md)完成有限验收。复用metadata批1009份源码稳定Local，不改产品代码或重编译服务，源SHA c63396fd22fec7f2b9b3eda169059a70dae7582f56bdbde7aebd1f8d32381d2b；UIe55ab5／backgroundd58de2、profile03rev2保持。

[当前真实Chrome证明](./20261005-staking-current-preview-01.json)校验实际加载UI及worker逐字匹配当前磁盘，原账户／原两终态journal不变。公开GraphQL验证者列表和独立metadata S288451可读，真实Display失败后选择保持；9位输入接受、10位拒绝。点击“预览交易”只触发Fullnode正式模拟，最终批准按钮可用但未点击。

两次真实Simulate请求都解码通过、checks=ENABLED、目标审核http://127.0.0.1:39400；第一次doGasSelection=true、无BCS是gas解析，第二次doGasSelection=false、带最终BCS。最终BCS SHA f2e97ef2754eb4e07f15b6db584eb3fe307baecd00ee951732b02e9cbca12f46；SDK Transaction.from解析得到sender原账户、0x3::rtd_system::request_add_stake、原验证者、SplitCoins u64=1000000001，与1.000000001 RTD金额完全一致。SDK由最终模拟BCS计算digest=4SW5EcpHNsyscg2ynxwXkos4k4ndZfnkckCtvhhXdNPf，与真实预览显示一致。

[预览截图](./20261005-staking-current-preview-01-preview.png)已查看：原子质押金额、gas预算、digest及交易有效期可见、最终批准可用。有效期来自当前Fullnode准备；旧indexed epoch和空仓位不能当成当前奖励或仓位。返回表单、原journal逐字段未改、原账户重新锁定；2模拟0Execute、0最终批准、0签名、新交易未广播。该digest只是预览交易摘要，没有回执或新checkpoint。

metadata批[1561项全量／双方tsc等完整证据](./20261005-coin-metadata-domain.md)继续适用于相同产品源码；本批只新增真实预览probe，不重复跑未变化产品测试。此前[七条原journal／effects只读审核](./20261005-coin-metadata-original-journal-audit-02.json)保持，该审核在本批预览之前完成；预览之后另外确认staking profile两条记录不变，不冒称又复核七条实链。

V1–V4本批有限合同、源码／产物与文档同步完成，父RPC-04／11／TX-01不勾选。非原生发送表单／发送全部、cp300333之后非空活跃仓位／奖励、大规模汇率、完整批准授权／赎回／正常CA／完整资产与TRY仍待；49/98、trial_ready=false。原历史回放继续同scope／PID，最新独立07:14观察0–83684，386503终态和之前一次状态拒绝调查未完成；本批未重启或恢复live。下一步推进剩余接口真实表单及完整资产／活跃质押读取。

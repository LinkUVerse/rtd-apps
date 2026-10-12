# 当前名称索引落后实际拒绝

[2项真实服务检查](./20261006-name-actual-lag-01.json)通过：生产WalletNameReader正向wallet-migration.rtd及真实已seed默认反向目标均向原Fullnode与GraphQL请求。GraphQL实际head低于每次最新原生checkpoint，生产快照门禁以coverage拒绝，两案均没有返回名称或发送地址。真实GraphQL准入响应记录保留，无响应注入。

使用同H0、已原生审核的五模块根／两Table形成仅内存候选profile，原profile4保持且没有创建信任声明。此证据是实际lag拒绝，不代表正式名称部署接纳、正向或反向成功、UI发送最终地址、续期／改名或QA-A15整体通过。完整genesis认证与六pin声明仍按[认证清单](./20261006-name-certified-release-design.md)推进。

0模拟、0签名、0ExecuteTransaction。失败与空结果均不能替代成功解析，索引追平后另做正面路径。

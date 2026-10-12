# QA-A04：实际最小checkpoint矩阵完成

[设计](./20261006-QA-A04-minimum-design.md)及[native-minimum01](./20261006-QA-A04-native-minimum-01.json)实际exit0：原H0/generation、binary/text各15调用，共30个只读请求，0模拟/签名/Execute。省略min、创世高度0、实际观察H均成功读取checkpoint0，返回sequence0与完整H0摘要，末status OK及trailers完成；创世H0指其高度0，未将摘要作为数字传入。

u64最大min不可满足时返回Unavailable；负数、空串、嵌入空白、正号、前导零、小数、指数、非数字、u64溢出各返回InvalidArgument。Fetch会规范化边缘空白，因此实际空白案例为`0 0`，不把客户端trim后的` 0`假称送入服务器的非法原值。外部伪造visible checkpoint、admin read surface及forwarded-for依然不能突破不可满足min，返回Unavailable；历史selector在三成功门槛下保持0。

执行前[审核01](./20261006-QA-A04-bridge-audit-01.json)和执行后[审核02](./20261006-QA-A04-bridge-audit-02.json)均actual exit0：最新8 debug/source、原H0/generation、bounded renderer/13方法、固定镜像/只读挂载及持久manifest匹配。probe脚本和前置audit摘要执行前后固定，所有调用限定Ledger身份与历史checkpoint，不存在Execution路由。

此项只使用Node子进程显式信任既有公开dev CA，无浏览器或系统信任变更。正常Chrome、host permission及错误SAN仍由ENV-07/QA-A19负责；完整资产共同S和账户历史覆盖也不由本项代替。传输fixture的零/最大u64转发和六畸形值不触达upstream仍见[固定33协议](./20261006-ENV-06-candidate-pinned-01.json)，fixture与本次原链请求分别留证。

QA-A04完整有限合同通过，总体56/98（57.1%），trial_ready=false。其余QA、六剩余RPC及签名/试用继续，不将本项扩展为全钱包动态请求或共同S通过。

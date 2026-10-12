# QA-A09签名／执行／链失败完成

[独立合同审核](./20261006-QA-A09-completion-audit-01.json)实际通过，仅收口Task.md与07表A09明示合同。总体将65推进至66/98；trial_ready仍false。

| 明示合同 | 验收证据与范围 |
| --- | --- |
| 普通／导入账户签名 | 当前C20审核候选04的普通12词及独立导入账户，4消息签名与4交易签名，SDK公钥／sender验签一致 |
| finalbytes／digest一致 | 各只签名及实际执行的批准摘要与最终BCS摘要相等；12次正式检查启用模拟；独立Ledger重新核验2笔实际执行bytes SHA与journal effects |
| 成功链回执 | 当前106条Chrome检查、2笔分别独占attempt与一次Execute、原生effects Success，各confirmed-success journal；第二笔保留第一笔，正常重启两条原摘要保持 |
| FailedTransaction真实链回执 | 既有同H0真实钱包交易d4kE2koaXQ829UWnhXd8exWawWa37zEuzCfA7WLdkRC只广播1次，历史返回FailedTransaction、confirmed-failure及锁定恢复；当前C20按原digest重读checkpoint390790、MoveAbort完整effects，签名／sender／原bytes／现代投影与原结果匹配 |
| 当前失败页面 | 新随机未注资账户，仅密码解锁／Local选择／页面重载；候选04 UI3脚本／worker精确匹配，原digest显示交易失败及MoveAbort。12项通过，查看前后journal均空，0模拟／签名／Execute；自己的成功profile及旧原profile均未打开 |
| 无重复dispatch | 当前2成功各1次、历史1失败仅1次；重读／页面／审核0派发，无清pending、重签或旧摘要重发 |

当前失败交易来源明确为历史，不声称新C20钱包失败提交。父A09覆盖终态与签名合同；完整金额／赞助／expiration、故障窗口、各业务页面、普通HTTPS仍由TX-01、QA-A08/10/19等任务验收。

3次失败页面日志、精确源码和profile保留：01加密副本锁定守卫，02新导入账户尚未解锁，03解锁后页面前置状态仍未建立；04在实际选定Local与页面重载后通过。没有修改产品守卫来迁就测试，当前产品仍C20源码7aa9ed8d／1106文件。原C19与旧ZIP保持历史包，C20 dev与生产构建、178份2520测试及完整类型已通过。

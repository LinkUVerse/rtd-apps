# RPC-04／TRY-02：混合原生资金实际钱包发送与重启恢复

2026-10-04。延续 mixed-native-funding 的受控账户与同一当前源码 debug dev，完成实际 Chrome 钱包 1.5 RTD 发送。RPC-04／TRY-02仍未完成；非原生资金、发送全部实际UI和新建助记词账户注资等范围不能由本证据替代。

## 环境与一次性批准

发送前重新核验 RTD HEAD、git diff、所有记录的 dirty 文件摘要及 rtd／rtd-node debug 产物摘要，运行PID和完整H0匹配。当前HEAD仍为49a05a0de323b45a49d067a855c419e98d071afc；没有启动其它链或发布新的合约。管理账户和目标账户runtime里10笔pending，均重新按原bytes计算摘要并通过真实Ledger取回成功结果；没有重复提交seed。目标仍有Coin 1000000000＋地址余额1000000000。

实际账户生命周期脚本增加显式RTD_TEST_MIXED_EXECUTE模式，必须同时满足原mixed/local/coin-preview限制。保留目录为runtime/mixed-execution-browser-01，mkdir拒绝覆盖；在真实Send Now点击前fsync attempt.json。通过被动观察UI发给后台的executePreparedTransaction保存原digest／requestId／bytes，不改变消息或交易。之后任意运行只允许scripts/test-retained-mixed-execution.cjs恢复原摘要，不重建目录或重新批准。

真实私钥导入、设置密码、Local配置资产查询、币发送表单和批准页执行后，链上结果如下：

- sender：0x1cedd5e3a0e54992fcf62656b0ec9b69aa0a93aca99e2d404a1fc77bac23b126。
- recipient：0x11e90d26087af15981c5e7d0739ce58886755f1ac83ebaeb1f7c643b87e5f614；不是自转。
- digest：HR27Xmrhd2KPsN4YDCbJzsBYkmcpnnf3NN1m2kW5rEUd；Ledger成功checkpoint398996。
- 接收1500000000；净gas1009880；目标剩余498990120，均为地址余额，零Coin分量按协议缺省。
- 最终gasBudget2988000、gasPrice1000；gas payment同时含真实Coin对象0x2b13aa0eb96f8e7b2733ef2b8287fcedc090af872391e91ef1243e3c14d6da4c的v25精确引用与epoch绑定reservation；固定bytes的Validity为epoch2–3、同H0及proposer约束。
- 批准bytes重新计算的digest一致；成功effects原生BCS与journal、只读Ledger返回逐字节一致；实际收据路由txdigest一致；recipient及sender balanceChanges分别为1500000000和-1501009880。

## 报告错误与只读复核

原Chrome运行最后在序列化报告时TypeError退出：新增证据包含GetBalance的BigInt，JSON.stringify未设置转换器。此前confirmed.json、locked-restart-verified.json和restart-verified.json已经落盘，单次派发断言通过；不能把整个脚本exit1记录为通过。原失败日志20261004-mixed-native-execution-chrome.log保留。新增helper现将输出余额BigInt转换为字符串，生命周期catch补充模拟与派发计数；未为验证输出修复再次发送。

之后独立保留配置只读脚本实际exit0通过：当前worker与磁盘均为e355c0d81dbf3dc4e2eef83bac004ec6a549dc891124227c5826ab5f78799c5b；账户锁定、原唯一journal保持confirmed-success，recoverPreparedTransaction原摘要复核成功；GetTransaction取回checkpoint398996及匹配effects和balanceChanges，GetBalance余额符合2000000000－1500000000－1009880。只读复核0模拟、0执行。原执行回执checkpoint为null合法，不能伪造；报告同时记录Ledger checkpoint与executionReceiptCheckpoint。

证据：

- [原执行日志（末尾报告序列化失败）](./20261004-mixed-native-execution-chrome.log)。
- [独立只读恢复通过](./20261004-mixed-native-execution-recovery.log)。
- [原持久记录的公开摘录](./20261004-mixed-native-execution-records.json)：环境复核、attempt、approved摘要／gas引用、confirmed和restart记录；不包含私钥、密码或签名。

原restart记录明确ExecuteTransaction=1；原脚本未将simulationRequests持久化，因此不推测该次模拟总数。修复后新增该字段，仅适用于未来新用例，不能补造旧计数。精确开发证书SPKI例外、编译Local配置和旧共同快照限制保持；本批不声称原生CA权限或资产索引追平。

## 文件与验证

新增scripts/lib/test-mixed-native-execution.cjs、scripts/test-retained-mixed-execution.cjs，扩展scripts/test-extension-account-lifecycle.cjs；预览helper仅将“self transfer”阶段名称改为适用于外部接收方。上述脚本语法检查通过，独立恢复实际通过；无业务源码变化或新构建。双方SDK章节同步增加本证据，Task细项保持开放，总体48/98（49.0%），trial_ready=false。

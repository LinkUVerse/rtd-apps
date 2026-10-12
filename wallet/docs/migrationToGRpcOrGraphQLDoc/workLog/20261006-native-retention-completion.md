# C20原生裁剪分类与当前资金签名

已完成编码与本轮有限验证，父任务仍65/98，trial_ready=false。

同H0、合法字段且高度／下界不倒退时，native／Move／发布组的保留下界前进返回ABORTED窗口变化；native降级changed，聚合partial。投影及共享core类型同步接受changed，保留原Fault／pending。错链、畸形字段及倒退继续原故障。双方网络边界文档已同步。[编码前方案](./20261006-native-retention-design.md)引用固定Sui源码；钱包持久策略是本地推论。未将失败03的未知具体原因归因于本修复。

最初RED02与定向01失败保留。诊断01仅发现窗口错误，投影不接受新枚举而另造identity/incompatible；补齐后10份263项、全量178份2520项及prod完整类型检查实际通过。开发和独立可信registry生产候选04同源码SHA7aa9ed8d71bf404b115b7475f4f85e274cbf980c19c447fed416763951aaa46f／1106文件。生产5274模块、2032来源、7脚本块审计通过。[独立来源审核02](./20261006-native-retention-revision-audit-02.json)只读重建C19原SHA609dfb4e，候选03／旧开发产物逐文件保持，未将旧包证据改名为C20。

[资金签名04](./20261006-TX-reviewed-funded-signing-04.json)81项通过：实际12词创建／备份／3路径与导入独立私钥，两账户各V2 Faucet注资一次；普通／导入各2消息签名与1交易签名，真实批准摘要等于最终BCS摘要、SDK验签通过。6次checks-enabled模拟含2次gas选择及4次正式固定bytes模拟，每账户准备／批准两次bytes SHA相同且不再次gas选择。两profile4阶段正常关闭前实际所属观察结束；同profile重启锁定／逐账户密码解密与加密source保持，独立助记词恢复通过。0Execute／CA改变／原profile打开。

后续Node实际native／Move／发布三组只读通过；当前链lower199149等已前进，正常Chrome资金试验也记录全部实际Fullnode公共GetServiceInfo水位。浏览器HTTPS在本测试中阻止，没有普通Chrome三HTTPS验收结论。新候选成功不删除失败03的身份Fault；两笔旧注资、未知签名数与加密现场保持。完整链执行、失败、批准变更竞争和剩余业务页面仍按各父任务验收。

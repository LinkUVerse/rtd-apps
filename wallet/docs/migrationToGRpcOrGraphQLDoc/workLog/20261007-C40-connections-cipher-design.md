# C40 连接授权与密文保留 C1–C4

QA-A22界面范围补证：使用刚完成32项真实界面回归的受控测试profile；不用主人原Chrome账户，不重复任何交易。

- [x] C1：当前UI／worker与独立生产逐字匹配，已有导入账户锁定、正常UI解锁，readonly账户encrypted字段真实存在；仅输出公共身份和SHA，不输出密文／密码。
- [x] C2：真实modern demo本机随机端口，同源连接弹窗中英文警告／拒绝／批准、真实已连接卡片及界面撤销，demo账户授权撤销与明确空态相符。只连接不签名／模拟／执行，不注入权限或DOM。
- [x] C3：完整三store、账户密文投影在连接及撤销后保持；完整Chrome关闭／重启后相同密文／锁定账户／journal与偏好保持。与前32项的原始密码保护阶段分开，不能声称此前未采集的密文基线已经存在。
- [x] C4：独立核验原始实际请求／来源／中英文弹窗／连接卡片、清理临时HTTP server和本轮Chrome；统一QA-A22矩阵按父清单逐条审核，未满足项不勾。

所有HTTP只许可本机demo和已审核五入口；Simulate／VerifySignature／Execute／JSON-RPC及外站直接阻止并记录；0签名。不改变产品源码／当前源hash。三个HTTPS普通Chrome验收与服务覆盖仍单列。


[实际03](./20261007-C40-connections-cipher-chrome-03.json)10检查／两语言四连接弹窗和两界面撤销通过，前后与完整Chrome重启的encrypted projection SHA27db75…完全相同，完整journal三store均空且相同，已重锁；恢复后原zh-CN／red-thread／10分钟保留。两原失败来自测试默认1280 viewport与实际屏幕bounds不匹配，demo真实错误“Bounds must be at least 50% within visible screen space”，未出现任何连接弹窗／签名／交易派发；采用既有成功工具的800×600／(0,0)实际窗口参数后通过，没有改产品弹窗算法。01和02及源均保留。C4自然auto-lock和父合同独立审核继续。

C4[当前父完整审核](./20261007-QA-A22-current-C40-completion-audit-01.json)已通过42UI、自然Chrome alarm、原始响应／两原生持有事实及2022源map逐条对照；全部测试context与本机随机HTTP server均正常关闭。C1–C4完成，QA-A22按本次整体矩阵完成，REL-02／ENV-07不代勾。

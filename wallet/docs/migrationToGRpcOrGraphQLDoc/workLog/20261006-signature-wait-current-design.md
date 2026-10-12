# TX-10：C21真实签名结果等待八事件

2026-10-06。TX-07已收口67/98，剩31不改变；继续TX-10尚缺的实际签名返回等待矩阵，不对未验证范围提前勾父。

1. 继续使用C21同一审核生产候选05，fresh独立profile、随机账户、同H0／generation，单独一次V2注资；密码／私钥只RAM。新脚本和全相对路径快照保存，原源／profile／failed／pending保持。
2. 对真实后台两个签名leaf（sign-only／execute）×四事件（lock／network／account／caller cancel），以实际background sourceMap映射真实account.signData调用，CDP获取当前脚本逐字匹配；map sourcesContent与当前TS源匹配，generated original位置／接收对象与accountId匹配后才能设置断点。生产minified符号从这一精确map位置验证，不硬编码旧offset／变量。不打印私钥／签名。
3. 矩阵全程禁止ExecuteTransaction网络派发（保护wrapper），真实原account.signData先完成，再暂扣结果交付；事件实际发生后仅释放原结果进原授权逻辑，应无返回签名、无journal变化／token残留、原popup关闭。每case恢复原方法／scope，锁定用原私有密码closure解锁；切账户使用已经创建的未注资derived账户，不删除它。
4. 前置PersonalMessage／只签名基准与批准BCS校验，八case启用检查模拟／真实签名次数分别记录；正常重启原加密库保持。失败保留原profile／guard和未知签名计数，不将中途部分冒充八case通过。
5. 本矩阵当前通过后再逐项审查完整TX-10 origin/account/chain/request/tab/events/disconnect合同；原历史实测只在能证明相关生产源码／合同未变化时继承，不能将当前签名等待矩阵泛化成TLS／全业务验收。最终Task／总进度及两侧文档保持一致。

01失败保留：生产V8断点将receiver n起点1552395解析到真实signData属性1552397，严格相等前置拒绝；尚未启动held签名case，3启用检查模拟／0Execute，整个签名计数not-counted，已注资profile与全路径快照保存不重开。02使用同一源码映射中signData属性token的真实位置，source/name/line及receiver账户二次核验，仍精确比较Debugger实际位置；未改产品／放宽为任意附近断点。另修正矩阵模拟审核：相同交易bytes可能在九次准备复用，应按每请求双正式模拟的SHA聚合计数，不能把全矩阵同SHA误要求仅2帧。准备阶段语法失败原helper和0浏览器事实另保存，修复后所有7脚本syntax0。

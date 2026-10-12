# 瞬时窗口被动能力观察修复与C11实际只签名

按[实施前设计](./20261005-transient-capability-observation-design.md)完成P1–P4有限范围：持续页面独立观察，精确dApp连接／批准路由及toolbar popup不自动启动完整被动NC5，明确unavailable/policy，不复用正报告。owned session／native负面订阅、所有reader合同与后台固定BCS依赖门槛保持。旧pending、已知Fault及取消未知状态不删除，不使用TTL或空complete。

- [完整测试及类型](./20261005-transient-capability-observation-checks-before-browser-01.json)：168文件2372项，新增14项。首轮测试错误地要求普通snapshot也零IO，修正断言后全部通过；失败与原源码保留。React／实际SDK夹具不代替原生或实链。
- [来源](./20261005-transient-capability-observation-source-inventory-01.json)：137当前逐项SHA，1078产品SHA384de7e2；内存替回三个产品原字节并去掉两新增产品文件，精确重建C10的1076／90799353。auditor是非产品修改，四份原字节保存。
- [构建](./20261005-transient-capability-observation-current-extension-build-01.json)：实际0，Local profile AST一致，UIe8f6ed70／后台18c3f6cd。旧C10的32文件完整保存。Provider auditor首次旧硬编码根断言失败，原字节和失败日志保留；核查实际路由Surface后02通过，四入口wire亦通过。
- [第一轮持续页面](./20261005-transient-capability-observation-extension-readonly-01.json)：fresh当前worker匹配，四入口实际200／同H0；60秒仍pending1／fault0。该轮startup通过不能称NC5完成。profile保留，原因未确认。
- [隔离持续页面诊断](./20261005-transient-capability-observation-diagnostic-01.json)：实际执行UI与worker均逐字匹配当前磁盘；观察pending1到pending0／fault0，约17.7秒。含GraphQL的实际503响应，完成不等于全部业务能力ready；未修改第一轮保留profile或旧pending。有限请求origin记录查明外部请求为apps-backend.rtd.io、重定向sedo.com及Amplitude，下一批须核对本地外部功能边界。
- [实际只签名](./20261005-transient-capability-observation-sign-only-01.json)：fresh独立profile，3次真实模拟checks启用；两次正式字节SHA3b8a3c68相同、preview digest与63VxF4tk一致、SDK TransactionData Intent验签通过、0Execute。Fullnode-only试验准入要求新鲜原journal审核；assetSnapshotAccepted与newExecutionAllowed仍false。未证明staking／Kiosk真实Move ABI批准，未单独测量该签名窗口UI字节。
- [原journal](./20261005-transient-capability-observation-original-journals-01.json)：原两profile七记录实时effects核验、逻辑摘要保持、0模拟／重发。私有证据只公开哈希。
- [受保护回放](./20261005-transient-capability-observation-replay-01.json)：最新源码debug一致，连续0–352673／352674 marker、原22水位不变，目标386503尚未终结；未restart／resume。

两个C10失败profile及C11成功profile均保留，私有恢复密码仅权限0600文件。正常CA三个HTTPS失败仍待，精确SPKI不代替CA。持续页面首轮未知原因、旧票据安全恢复、真实发布签认、最终原子授权、完整Move与全试用继续。有限子任务不新增父完成：50/98、trial_ready=false。

本批汇总见[检查](./20261005-transient-capability-observation-checks-final-01.json)。

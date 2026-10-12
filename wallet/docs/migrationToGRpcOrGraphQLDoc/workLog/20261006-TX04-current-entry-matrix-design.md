# TX-04 当前扩展入口竞争矩阵（2026-10-06）

当前父任务保持开放。沿用 C28 生产产物和 profile5，单独验证真实扩展入口；原生守卫测试和历史构建证据不替代当前业务入口验收。

- [x] M1a：同一 H0／generation／账户，原始真实只签名请求占用 Web Lock，第二真实币表单在准备阶段拒绝；不新增正式模拟、签名或发送。[22项当前实际UI及独立审核](./20261006-TX04-current-live-lock-progress.md)通过。
- [x] M1b：第二真实 Wallet Standard 授权请求拒绝的完整竞争链路；实际统一费用失败、批准禁用与后台身份观察 pending 拒绝已记录，但未独立达到预期的执行锁拒绝，不把它归因于该锁。
- [x] M1c：第二dApp身份pending层真实拒绝、批准禁用及原实际signData返回在超过30s结果lease后拒绝，0签名返回/0Execute、完整journal三快照一致；[09实际与独立审核](./20261006-TX04-current-live-lock-progress.md)通过，未证明M1b的特定execution-lock错误。
- [x] M2：真实严格持久 pending 存在且原窗口已关闭，第二真实币表单与 dApp 请求拒绝再次构建／签名／发送；仅恢复原摘要。
- [ ] M3：NFT 直接持有、原生 Kiosk、PersonalKiosk、OriginByte 的当前真实入口竞争，同作用域与持久 pending 拒绝；索引覆盖与受控所有权不足时保留未完成。
- [x] M4：当前真实质押与赎回入口竞争由 [C43完整M4收口](./20261007-C43-staking-matrix-close-design.md) 实际完成：正确当前indexed验证者与原332734仓位、两live表单竞争／金额1和2与原赎回规范预览、两durable冷恢复、当前源／产物与完整原帧／journal独立关联。早期恢复守卫与历史validator夹具只为前序证据，不替代本次；M3／M5与父TX-04仍开放。
- [ ] M5：独立核验原始帧、完整 journal、当前加载 UI／worker 字节、请求与签名次数；更新日志和总进度，所有入口完成后才勾选父 TX-04。

M1 的测试只延迟受控账户真实 signData 返回值，不篡改 TransactionData、签名、链服务响应、journal 或锁记录；先绑定实际生产 source map 的 account.signData 调用点，再暂停原始返回。原始签名保持私有，不在控制台打印。所有 ExecuteTransaction 均禁止转发。占用验证使用同源 native navigator.locks.request(ifAvailable)，不以 query() 的快照推断占用。真实第二币表单和第二 dApp popup 的可见拒绝、按钮状态与新增模拟计数作为证据；结束后仅释放原始只签名结果并验证相同原字节。

跨窗口 live lock 与关闭窗口后 durable pending 是两项不同合同。M1 不代表 M2，当前 coin／dApp 不代表 NFT／Kiosk／质押／赎回。保留全部失败工具和记录，修正测试脚本时使用新文件与新输出。

2026-10-07 M2当前C39完成限定子合同：[原真实01](./20261007-C39-closed-owner-pending-chrome-01.json)由当前产品原批准生成唯一dispatch-pending，原签名Execute被浏览器截断、转发0，完整原窗口／worker关闭、账户锁定和正常解锁／密文保持、原scope native ifAvailable实际可用、币表单原摘要与禁止新检查均观察通过；整体失败在dApp被仍活跃的原只读恢复锁拒绝，不能记该错误为durable层。resume01原生实际快照每次仍有该execution锁，admission pending为0，未清除任何票。[resume02](./20261007-C39-pending-admission-resume-02.json)14检查通过：币入口观察后正常退出该路由、等待真实native lock可用，另一个dApp批准禁用、真实可信prepareDappTransaction明确拒绝原durable pending；0新模拟／签名／Execute，完整三store和密文保持、所有回执查询仅原digest、原账户重锁。[独立完整原帧审核](./20261007-C39-closed-owner-pending-independent-audit-01.json)原签名／两ENABLED模拟／完整trailers／journal与当前UI／worker字节相符，首两次整体失败保留。此子项没有广播链交易、不覆盖NFT／质押／live-lock／取消全部矩阵，父TX-04继续开放。


第二次主机重启后M2增量：[当前03](./20261007-postboot2-C39-pending-chrome-03.json)15真实检查与[独立原帧](./20261007-postboot2-C39-pending-independent-audit-01.json)、[启动分界02](./20261007-postboot2-C39-pending-host-audit-02.json)确认原三store／密文保持、实际host boot前后同原pending、正常解锁／重锁、币拒绝与dApp明确durable拒绝、只查原digest，0新增模拟／签名／Execute。01／02整体失败保留；每次诊断新建UI连接会按产品runtime.onConnect正常唤醒只读恢复，03使用与产品相同的持久可信UI连接并正常退出恢复popup路由再测持久守卫，不改journal／锁／产品。完整NFT／质押／取消与M1b／M3–M5继续开放。

2026-10-07当前C40 M1b由[明确锁完整子审核](./20261007-C40-WalletStandard-lock-completion-audit-01.json)完成：28真实竞争／6真实两cold保护／独立原帧及canonical BCS、第二不同Wallet Standard真实prepare明确execution-lock拒绝；原2ENABLED模拟、一次私有签名但0返回signature／0Execute、31.302s后原结果关闭式拒绝、密文与三store保持、正常重锁及最新debug/authority。旧C28“未达到execution-lock”保留为旧轮次，不冒充本次证据。M3／M4／M5和TX04父项仍开放。

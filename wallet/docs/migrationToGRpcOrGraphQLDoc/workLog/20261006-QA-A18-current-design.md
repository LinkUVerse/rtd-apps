# QA-A18 当前产物收口前范围

父合同：modern connect／disconnect／account／chain 事件、PersonalMessage、sign-only、sign-and-execute、origin／权限错配拒绝。普通 Chrome HTTPS 及完整 host permission 属于 QA-A19／ENV-07；提交后持久未知及全部 journal 故障属于 QA-A10／TX，不能一起宣告完成。

C17 一次真实执行已经保留为历史基线。E8 改变 observation 与签名前 pending 生命周期，QA-A18 必须补当前 C18 真实执行，不能只援引旧 C17 字节。

当前 C18 独立 lifecycle profile：真实连接／刷新恢复授权／disconnect 清理，错链与遗漏 account／chain 拒绝，PersonalMessage 与 sign-only 密码学；同源两 tab 和异源伪造 origin／权限请求；账户切换和 chain 事件；锁定批准、取消及八类 sign／execute 实际 signData held 事件。这些负例不广播，矩阵 fetch safety guard 必须恢复、原 journal 保持。未知旧 pending 不编辑。

该轮实际 exit 0 后，新增固定 c18-public-execution-20261006-01 目录，严格当前 C18 BG SHA 与新鲜原七 journal 审核；公开 seed 7 最小单位自转账一次，只花测试 gas。沿用禁止覆盖的 mkdir／attempt／confirmed／restart 规则，拒绝与零广播矩阵／SPKI／用户 keystore 混用；失败不重放。对当前 UI／worker、预览／final BCS／两次正式模拟／Intent／effects／唯一 journal 与整个浏览器重启逐一核验。

两轮当前证据和该合同均成立后才勾 QA-A18。新产物的正常 CA 参数明确保留 HTTP Fullnode 执行范围，三 HTTPS 未接受不会改写。Task 总数保持 98 项。

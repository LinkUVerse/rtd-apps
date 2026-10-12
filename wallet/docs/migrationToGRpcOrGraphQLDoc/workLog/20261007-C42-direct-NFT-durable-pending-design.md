# 当前C42直接NFT的真实持久pending

这是TX-04/M3的直接分支增量。原C39 strict-pending、已执行NFT/质押原profile和摘要不打开、不清理、不重发；不扩展成全Kiosk或父项完成。

- [x] P1：fresh共同窗口覆盖原direct198775、当前C42来源及最新debug/产物SHA；原受控收款账户与原canonical NFT仍一致。只创建新的专用测试profile，正常私钥导入/保护及空journal。
- [x] P2：新profile一次真实Wallet Standard自转1最小单位的批准，当前产品生成唯一严格dispatch-pending；原签名Execute在浏览器发出前截断、0网络转发。不注入journal，不重发任何已成功或原pending摘要。
- [x] P3：完整关闭原新context/worker，再用该新profile正常冷启动/解锁；原密文、三store与唯一pending保持，native锁实际可用。当前直接NFT入口只恢复该原pending，禁用新Review/发送，0竞争模拟/签名/Execute。
- [x] P4：当前UI/worker、原批准最终字节和本地/原生签名验证、完整模拟与原pending的全部查询、cold journal/密文、现存NFTcanonical owner/version/digest保持独立核验；测试正常重锁/关闭，新pending profile保留，失败另存且不能重跑创建。

该唯一请求不广播，不产生链终态成功，也不证明NFT转移或其他当前非空Kiosk分支。当前质押/赎回完整表单竞争仍等待332734覆盖；持久pending与live-lock分别验收。测试代码和证据必须明确executeAttempts=1、forwardedExecuteRequests=0、竞争请求0，不能写为未签名或零执行尝试。

## 实际P1–P4完成

[Chrome01](./20261007-C42-direct-NFT-retained-pending-chrome-01.json)和[独立01](./20261007-C42-direct-NFT-retained-pending-independent-01.json)通过19实际检查；新唯一摘要DEFMhkf1ibFqoMn5DmtQcV6Hx8u4qoKk1BUNzir332LD，自转1最小单位／明确Gas预算102000007／None到期，不复用历史批准预算。一次真实产品批准／一次已签名Execute尝试在浏览器内abort，forwardedExecuteRequests=0。两完整ENABLED模拟和一原生VerifySignature原帧、本地验签及规范bytes/effects/owner/Gas一致。

真实旧新context/worker关闭，再以相同新profile冷启动；锁定账户和密文保持、正常解锁、native锁实际可用。当前原direct NFT的S321312入口只恢复上述pending摘要，0新审批/模拟/签名/Execute，三store完全相同。自然退出恢复观察后锁再次可用、正常重锁及关闭；fresh canonical原NFT和Gas版本/摘要/归属保持，实际S摘要typed独立核验。

原读取的六个GetTransaction headers-only NOT_FOUND响应body未捕获，保留原请求/状态5/H0/高度；不补造原body，不称全部原读取响应完整。关键批准签名和两模拟完整。不证明其他Kiosk或质押durable，84/98及父TX04保持。

新增专用profile：/Users/changzechuan/.local/state/rtd-wallet-migration/dev-20261006-03/current-C42-direct-NFT-pending-20261007-01。该profile与DEFM原pending保留，禁止重跑creator、重新广播、清journal或升级后强行执行。后续只允许有明确只读续验计划的相同当前C42冷启动；原C39/profile和原成功NFT/质押都未打开。

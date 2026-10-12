# TX-07／TX-10：C21提交后恢复、NOT_FOUND与跨scope矩阵

父任务原合同保持，66/98、trial_ready=false。上一轮C21修复与真实正常执行／失败回执是实际进展，本轮按未完成恢复矩阵继续。

1. 最新RTD HEAD／diff与八debug只读再核验；C21候选05／源码f867a8d4固定，不重启dev／改动原链、原失败或原七profile。所有测试使用独立新随机账户；密码／助记词／私钥仅RAM，先核对无Fault／pending及H0，再各一次V2注资。
2. 四个独立请求串行：提交后network、account、lock、caller cancel。每case在批准前独占持久保存attempt，最多一次真实Execute；从真实gRPC-Web帧核验批准BCS、签名／摘要，真实HTTP200成功effects先接收再在worker交付边界保留。
3. 同一原摘要的恢复读取通过测试wrapper注入NOT_FOUND（gRPC status 5），明确标为受控transport故障，不声称真实Fullnode丢失了已成功交易。pending三个stores与原scope保持，当前账户／网络变动不能改scope或重新签名。不同scope恢复应拒绝或不触及原记录。
4. 回到原scope（locked恢复仍可用）后实际自动wake读取原摘要；在受控NOT_FOUND期间仍保持pending，另一新交易准备不可批准，模拟／派发计数不增。解除仅这一原摘要的读取故障后，实际自动wake恢复原终态；保存原bytes／signature／effects与Node独立原digest复核。任何未确定case失败后保留全部，不删除、不重发、不继续同账户的新提交。
5. 正常浏览器／worker重启复核原成功记录，额外保留真实pending跨锁定重启case以证明当前C21正向唤醒。锁、切网、切账户、取消和NOT_FOUND都不能改变实际链事实；阶段证据／完整源路径快照／Task／total同步。父完成须另审完整签名等待、origin/tab、所有恢复入口，有限矩阵不直接勾父。

权威依据：[固定Sui GetTransaction](https://raw.githubusercontent.com/MystenLabs/sui/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-rpc-api/src/grpc/v2/ledger_service/get_transaction.rs)对无法找到checkpoint和超出保留范围都返回TransactionNotFoundError。由NOT_FOUND不能推断未提交是本地恢复安全策略，不能写成链回滚证明。本轮2026-10-06重新读取该官方源码。

L5补充实施：独立fresh profile仅第一随机账户一次V2注资，最多一笔真实提交；批准成功回执暂扣后锁定、双角色受控NOT_FOUND及新准备阻止，重新锁定保存原pending三stores。正常关闭自有Chrome前所属观察实际收尾，再相同profile打开新worker，全部账户保持锁定；不显式recover、不解锁，实际onStartup／onConnect按原digest恢复终态，并比对加密账户source和真实Fullnode BCS／签名／effects。此项是正常关闭的锁定pending跨浏览器／worker恢复，不冒充物理断电／突然终止或普通CA。任一失败保存原pending，停止该账户新提交。

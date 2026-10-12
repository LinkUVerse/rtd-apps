# TX-04当前C29关闭窗口后的持久pending P1–P4

父TX-04仍开放；当前源1116文件SHA ab6a6b6a...，只在新的受控profile执行。沿用当前Local六pin／严格白名单，不改RTD/debug、B3消费者、用户profile或产品journal代码。

- [ ] P1：当前C29真实UI导入受控genesis owner，实际可见dApp execute批准；最终1atom自转bytes/digest固定，正式模拟启用检查。浏览器route在Execute请求发出前abort，验证拦截1次、向链转发0；产品自身commitPending真实生成v2记录，不播种journal。原始公开BCS／签名／请求帧保存在0600证据。
- [ ] P2：原完整Chrome context关闭、原worker不可求值；同profile新worker锁定，正常解锁。pending／原摘要／全部journal及加密字段保持，原生ifAvailable执行锁实际可获取，与旧窗口live lock分开。
- [ ] P3：新真实币发送路由暂停新构建；新dApp实际批准禁用／后台明确持久pending拒绝，新增模拟／签名／Execute为0。只允许恢复原摘要的Fullnode／archive真实只读查询，不合成终态，不清库或重发。
- [ ] P4：独立核验产品生成record scope／原始BCS与签名、初始／重启／最终journal快照、来源及请求计数。此pending来自真实批准流程但从未广播，不能称链上成功或广播响应丢失；原真实广播故障合同另留历史证据。完整NFT／stake入口仍待，因此不单独关闭TX-04。

限定P1/P2经[独立原帧审核02](./20261006-C29-product-pending-partial-audit-02.json)通过，原01/02全轮失败不重标：两grpc-status0全模拟/native BCS effects、1签名和原scope/digest/pending索引、新context/worker/加密与正常UI解锁一致；coin02有原摘要alert。P3 dApp实际先被无marker身份ticket阻止，P4全轮继续开放。审核初次仅SDK None的$kind断言不符，纠正后02通过，未改产品和原证据。

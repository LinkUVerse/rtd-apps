# RPC-04 当前发送入口单次执行增补合同

原current-ui设计的只读／模拟批次保持，无修改原执行计数。三个当前金额预览已通过18检查及六完整原模拟帧独立审核，七条请求中的另一个请求无完整捕获回包，不能记作第七完整模拟。

本增补在另一个全新自有profile真实导入同一受控目标资金账户。先复核最新8 debug产物／HEAD／diff／H0，原管理和目标顶层pending全部逐一按原bytes计算摘要并从真实Fullnode或原archive取回成功；原浏览器目录不打开。新native金额为1原子单位，发送到已有受控source地址。

- [x] E1：源码／新profile准入、既有原摘要只读复核、当前目标余额与旧记录保持；执行前fsync新独占attempt和仅runtime内0600恢复密码。
- [x] E2：真实UI批准一次，最多一次Execute；保存原请求／完整回包，原批准digest必须与原bytes一致，模拟启用checks。
- [x] E3：实际收据／strict journal成功，无pending；独立当前Ledger原BCS／签名／effects／余额变化审核，不再签名或派发。
- [x] E4：全部源与失败保存、按原RPC-04合同综合审核；其余TX、QA、HTTPS和trial门槛仍独立开放。

输出目录存在即拒绝再执行。若批准后失败只能恢复原digest，禁止建立第二个同目的广播来覆盖失败。

增补实施：另一个全新profile完成0.1 WMIG不同币种当前批准一次；前置检查包含原RTD摘要。两案各9项／4模拟／1签名／1广播且各自独立Ledger审核成功。E2运输层范围：RTD保存原请求与完整wallet receipt DTO，其原生Execute响应体没有捕获；WMIG保存原请求及完整原生二进制回包并审核grpc-status:0。完整wallet回执与链上effects均精确核对，不把native二案都描述为捕获原运输响应。

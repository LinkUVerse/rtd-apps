# C28 读取观察所有权有限验收完成

当前源码1113文件，SHA `4ccafc8f1fb55685171a6b1516aaae014e8324087a500ffc12d32e2d914a5a06`。以C27完整保留快照为基线，仅五个原文件及两个新文件变化。C27账户卡片与余额准入提示保持。

## 完成范围

v3增加独立capability-owner-v1；v1/v2原行不改写。读取观察在取得每票原生独占锁后原子保留pending和标记；正常退出释放锁以后，新观察可原子更换原票incarnation，完整重新校验。活跃票、无标记旧票、损坏绑定、已知负面继续拒绝。接管后的瞬时空失败保留原pending，原始响应/物理清理未结束不提前释放归属。普通交易观察与journal合同不变。

[独立完整审核](./20261006-C28-observation-owner-audit-01.json)：183文件2573项全量、完整类型、独立production及闭包、四入口HTTP200同H0、17项原生所有权、33项原存储合同、24项实际设置与保留浏览器重启均通过。完整1113文件副本与SHA manifest保存到私有runtime/C28-qualified-source-20261006-01；原C26/C27包、源码及失败证据保留。

[实际扩展中断/重启13项](./20261006-C28-current-owner-restart-04.json)与独立原帧审核：真实同H0 GetServiceInfo返回被暂缓转发；关闭整个浏览器后原marked ticket仍在，新production UI接管同ID、新incarnation，pending/faults未清；完成身份校验前余额不准入，释放原真实字节后fresh完整WMIG余额1500000、pending/owner归零。原设置成功profile全部字节保持；0模拟/签名/Execute、0公网/旧RPC/证书改动。

[实际reload9项](./20261006-C28-current-owner-reload-02.json)与[独立补充审核](./20261006-C28-owner-reload-audit-01.json)通过：真实挂起观察期间reload，重新读取完整余额、pending/owner归零。原生取消可能已使旧物理请求结束并由原owner完成；本案不强制接管，也不将测试端尚未转发的响应误当作应用原始请求仍未结束。

## 保留失败与边界

Provider首轮7失败因内存fixture未替换新beginRecoverable，修正后62定向通过，原日志与源码保存。浏览器恢复01/03持票时刻检查与具体挂起请求未可靠绑定；03记录显示检查时票已完成。02的页面route在第一轮未捕获持标记请求。04使用context route并逐请求采样原票/marker，实际13项通过；这些失败均保留，不能单由route层级变化断言根因。reload01强制要求每次刷新必须同票接管，与原生取消可合法收尾的合同不符；原失败保留，reload02按实际生命周期要求验证。

未标记的旧未知pending不会自动解除。本批不覆盖任意断电、BFCache、交易恢复、完整Docker冷启动、正常HTTPS信任、正面名称/NFT/隐藏资产或全父任务验收。父计数78/98，20项开放，trial_ready=false。

# C37 当前扩展 NFT 单次执行与写后读取

沿用 RPC-22/23、TX-01/04/08、QA-A07/13/14 的子项，不增加98项父任务。C37真实三种预览15检查通过，0签名/Execute；执行另行验收。

- [x] X1：当前源码/debug/H0、真实UI/worker/完整闭包和实际原生NFT所有权前置核验；只使用受控开发链的已有fixture。每次新0700 profile，保存0600恢复材料。
- [ ] X2：direct实际UI复核并单击发送一次，先持久化批准BCS/digest/对象/目标，Execute原帧立即单独fsync。出现不确定结果时仅用原digest恢复，不重签或新广播。
- [x] X3：独立Ledger回执/原始BCS/签名/效果与原Execute请求响应、最终NFT owner及完整journal终态核验；浏览器整体失败与链交易成功分别记录。
- [ ] X4：真实索引落后提示、达到目标checkpoint后完整snapshot刷新、资产所有权与历史语义核验；不把Fullnode高度等同GraphQL覆盖。
- [ ] X5：OriginByte已有/新目标、Personal/native分支及跨窗口关闭owner矩阵分别验收，所有父合同满足后再关闭父项。

原数据/genesis、旧profile及失败证据保持。正常Chrome HTTPS与普通CA仍独立验收；本次回环HTTP开发试验不能替代该合同。

当前 direct-execution-chrome01 整体失败保持：8项前置/预览检查通过，实际单击发送一次，Execute请求与成功响应原帧均已私有fsync保存，但90秒没有自动导航收据。独立 direct-native-audit01 已验证原批准BCS/digest/签名/成功effects与原请求响应，并由原生Ledger确认checkpoint168886、当前NFT确属目标账户。不能把链成功冒作初次UI整体成功；仅按该原digest诊断journal/恢复，禁止重试发送。

direct-journal-recovery01通过：冷打开同一owned profile，最初journal已经confirmed-success，pending=0，effects与独立原生回执一致。故本次没有调用恢复提交或修补journal；完整三store前后相同、原账户保持锁定，0新增模拟/签名/Execute。原Execute即时返回receipt的checkpoint为null，后续Ledger已记录168886；完整UI导航失败的原因仍待独立定位，不能归因为链失败或pending未清理。

独立direct-receipt-chrome01实际15检查通过：随机无资金新profile，当前UI/worker原字节、原digest成功状态/索引同步提示、真实同H0 GraphQL水位小于168886、原执行profile所有文件保持，0新增模拟/签名/Execute。这是故意实际落后时的收据合同，X4的达到覆盖后刷新仍待。接下来OriginByte已有目标单次受控发送，同时只读采样原渲染key、form状态和导航，定位已观察的自动导航失败；保存原attempt/请求/响应，不以新分支重新发送direct NFT。

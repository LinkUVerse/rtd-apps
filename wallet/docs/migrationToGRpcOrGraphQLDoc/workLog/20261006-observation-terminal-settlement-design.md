# E8：取消观察的拥有者收尾，编码前合同

C17 真实网络切换矩阵 02／03 证明：取消会结束 UI 等待，但原 ticket 永久 pending，切回 Local 后不能签名。保留这两个 profile 和失败；不得直接编辑旧库、TTL 清除、按新成功覆盖、重新签名或自动广播。

规范边界：[WHATWG DOM AbortSignal](https://dom.spec.whatwg.org/#interface-abortsignal)规定通知和 API 取消协作；不能从 abort 或 wrapper rejection 推断自定义 transport／body cleanup 已结束。[IndexedDB 3.0](https://www.w3.org/TR/IndexedDB-3/#transaction-finished)以事务完成为提交边界。本地新增收尾仅处理本次原对象所有权、所有实际工作均结束的失败观察；它不产生 positive capability 或交易授权。

1. 增加本次 observation 独立 lifetime，绑定原 ticket 对象、profile binding 和 session key。聚合、身份 raw allSettled、领域 schema／分页、native 两角色、deployment／Move 的 raw work 及真实 fetch／body cancel 清理都注册；取消只结束等待，仍有 raw work 时不能出收尾凭据。
2. 聚合退出后封闭 lifetime，后续不能启动新 IO。pending raw work 和 fetch/body/cancel 全部真正结束后才生成仅进程内 WeakMap 认可的一次性 terminal-failure 凭据。序列化／克隆／别的 ticket／别的 store／失去所有权不能消费。
3. 已知 identity／schema／ABI Fault 在本次 raw work 内收集，先分类后取消 fence；迟到的已确认 negative 必须保留。任何 Fault、其他 pending、已有完成决定和旧 worker 失去所有权均不能被空收尾覆盖。
4. 存储用新的 finishFailed 方法，在原严格 readwrite 事务内只移除该 ticket 并单调合并 Fault；继续以 complete／oncomplete 为提交边界。收尾失败保留 pending，不能重试为空。通知不提供正面授权；新动作仍经过当前 H0、业务依赖及最终 one-use 检查。
5. begin 提交后、任何 IO 前被取消的观察也用同 lifetime 的零工作收尾；begin 失败无所有权则不收尾。页面／worker 消失后遗留的未知 pending 保持拒绝，E8 不提供崩溃后的清库恢复。

验收：忽略 abort 的 fetch、未结束 body、异步 cancel 清理期间 pending；完成后本 ticket 才移除；兄弟／旧 pending／Fault 保持；迟到错链和 ABI／schema negative；存储 abort、owner 丢失、克隆／重用收尾；原生 strict IDB 与 C18 网络切换后正面签名。先有限编码／测试，再当前完整类型与测试／生产闭包、保存 C17 产物、C18 原七 journal 和真实 Wallet Standard。父计数保持 59/98，未验证范围不勾选。

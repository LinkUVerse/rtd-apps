# C98 新批次完整连续前缀的自然终态接续

实施前合同，2026-10-08。98父项保持84/98；本合同推进P96-4，仍由全部真实业务验收决定父任务完成。

当前正式553728、chosen pending709569。原C92父92149／子59696正常工作；旧C96只接受上一个553728批次的固定67394行，不能认证新的批次。当前完整连续前缀已经非空，producer/advisory的pending版本尚未写入。只读依据及十文档原字节见[封存](./20261008-C98-before-implementation-doc-archive-01.json)。原C96控制器、候选、失败及完整资格不修改。

源码依据：checkpoint-publisher-dev.py先固定pending_hi与staging版本，再逐行复制并登记；完整[0..through]行数检查后才登记producer，随后advisory，最后原epoch／admission／source和replica检查后正式提交。resuming使用原pending_hi与staging版本，接受producer／advisory尚未产生；明确拒绝advisory存在但producer缺失。接续不得直接填补SQL、版本、marker、epoch或admission。

本次只接受原709569批次的自然waiting_timeout(PUBLICATION_TIMEOUT、无through)或自然published/idle且正式>=709569。beforeFreeze仍是原C91完整实时窗口：exact PID/birth/canonical command、状态年龄<10秒、无child、作用域lock0、epoch1、active fence/admission、全部原source/eight-debug/29容器14健康25actors、完整repeatable-read链/fence/admission行SHA与全部连续prepared行SHA。working／空pending前缀、缺staging、未知phase、行洞、bool数值、时间NaN／未来、任何身份或状态竞态都拒绝，0信号。

pending三种明确阶段：staging-only=(staging非空,producer null,advisory null)，prepared必须非空且high<=709569；producer-ready=(三者前二非空,advisory null)与advisory-ready=(三者均非空)，均必须完整覆盖553729..709569。chosen staging精确绑定本轮原批次，所有现有版本与SQL原行在before／after冻结、正常排空后必须逐字相同。null不是伪造版本，也不能被当作已完成发布。

缩短窗口只调整额外C93保护复核的顺序：启动观察前完整1456文件／当前C92 lineage复核；选plan时只读取完整实时ledger与资格／实际PID，不重复昂贵C93全量复核。原beforeFreeze完整窗口不减少任何字段；SIGSTOP仅发给已合格的原父并且可逆。冻结后、任何SIGTERM之前再次完整1456／当前fixture authority复核，随后原fresh TLS／replica与完整原窗口复核，60秒boundary严格保持。任何冻结后的资格或竞态失败仅对精确原birth正常SIGCONT，不停child／进程组、不启动后继、不自动重试。没有薄窗口或伪造unaffected证明。

原C91 handoff主体与v2 witness全部stage／停止／排空／新venv命令验证复用；只将pending版本谓词绑定上述明确阶段，并对新plan强制原709569／本次staging。原source的逆向与AST等价检查必须证明除这一谓词及完整ledger选择外算法不变。候选仍为已真实ABBA合格的C96两个副本读取循环并发版，实际3.625倍样本仅属于隔离实验，不承诺live提速；C97不合格候选不安装。

- P98-1：原十文档／source／完整当前prefix封存及实施前拆解。
- P98-2：新批次phase、full-ledger／版本／PID／freeze-race资格；复用原完整controller，当前working实际拒绝0信号。
- P98-3：新selector的完整historical/current隔离与部分activation关闭式拒绝；完整13对象／5cap／3账户／6原digest工具接续，原51／29检查保持。
- P98-4：唯一有界观察自然终态，全部fresh门后一次正常安装；完整stage／source／数据及实际新PID独立审核。失败不得重开同operation或自动重试。
- P98-5：原七覆盖及全部完整API／Chrome／四类M3实际业务验收，才决定原14父收口。候选准备／观察／安装均不替代父验收。

GraphQL共同资产快照与post-write七覆盖不变。官方StateService.ListOwnedObjects是live状态且默认read mask缺owner／完整BCS；该接口不提供同S快照，本轮不将原生读取冒充已索引资产／Chrome验收。所有签名、原六笔Execute、Faucet与合约部署保持0。

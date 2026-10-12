# QA-A10当前C21持久与窗口故障矩阵

2026-10-06。前两父TX-07／TX-10收口后68/98，QA-A10原文pending／多窗口／worker：dispatch前后关闭、timeout但链成功、回执落盘失败、锁失效防护、旧digest恢复；持久记录与链事实一致。原合同不以当前已完成生命周期矩阵或单测替代。

| 子任务 | 必须证明的当前事实 |
| --- | --- |
| Q1 | C21源码／候选／最新8debug与原H0再次核验；独立fresh账户，仅一次V2、源快照、原failed／pending／profile保持；无secret日志 |
| Q2 | 批准前原popup关闭，0签名／journal／dispatch，另一个窗口可重新正常准备；批准后真实上游成功响应暂扣再关闭原popup，原digest pending不随临时request删除 |
| Q3 | 原Execute真实上游成功后保留原响应直到原reader实际deadline触发；controlled原摘要读取失败明确单列，原pending在第二窗口／新worker不能重新签名／发送，恢复只查原digest |
| Q4 | 真实Chrome IndexedDB terminal receipt事务受控abort：只针对任务自有journal的confirmed原记录，事务实际abort而非修改journal数据；原pending必须保留。解除写故障后原digest／真实Fullnode BCS签名effects恢复，不新增Execute |
| Q5 | 旧worker实际终止与新worker精确来源、跨窗口锁失效后仍以持久pending阻止新准备；如新worker在测试故障装载前已确认，准确记录有限终态事实，不宣称pending阻止／不重发来替代失败 |
| Q6 | 独立原摘要审核、全stores／加密账户source保持、受控故障与真实链事实分开、所有失败保存；逐项父合同审计与Task／总进度更新 |

所有提交前独占持久attempt，每一请求最大一次真实Execute；先保存实际上游frame／BCS签名effects，再进入故障阶段。命令使用当前Fullnode HTTP，archive身份注入只在明确受控读取故障内并记录原真实Node私有CA帧；不导入CA／改SAN／SPKI／权限，不称普通ChromeHTTPS通过。不重开七原profile、不清故障／未知观察、不重启dev或重建原链。正常关闭、独立worker终止、物理断电分别记录；本项没有物理断电假声明。

任何原请求状态不明，保留原账户和所有attempt／journal，停止该账户新提交。新profile仅用于不同故障case，不能代替原失败恢复；未知签名次数记not-counted。当前C21源码未修改，不重复报新编译／全量通过；若发现产品缺陷需先保存原版本并修复、定向必要测试／稳定构建／实际新版本复测。

receipt-abort 01实际一笔成功上链、1个原terminal strict事务真实abort、原pending保持及所属观察收尾已发生；随后脚本在quiesce关闭UI后用旧page读取journal，Target closed失败。整轮签名not-counted、原profile／attempt／upstream／pending／失败和完整源快照保持。02改从尚未关闭的同worker执行只读snapshot，再确认旧worker停止／新scope；不改产品、不清原pending，另行原摘要只读复核。

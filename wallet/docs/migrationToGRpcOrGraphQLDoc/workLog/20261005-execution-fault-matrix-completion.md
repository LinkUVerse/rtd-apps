# TX-12：执行与持久恢复故障矩阵

日期：2026-10-05。完成审计以原Task的“提交恢复单测故障注入、并发／崩溃／bytes篡改／落盘失败分支”为边界。最终证据、双方合同和父项勾选均已落盘，TX-12按该单测故障合同完成。本次不新增dev链交易；原链、原journal、原执行浏览器目录保持。

## 实际缺陷与修复

原生测试复现：既有pending有效，在dispatch返回前另一个连接写入legacy-quarantined后，commitReceipt仍写终态并删除scope占用。原方法未像其它journal操作一样读取隔离标记。失败原始日志保留于[第3次原生故障运行](./20261005-execution-native-storage-faults-03.log)，报错为quarantined journal admitted terminal write。

修复在commitReceipt的同一个readwrite事务内先读取metadata-v2隔离标记，再读取记录、核验占用、写终态和释放scope。发现隔离则abort并抛legacy；协调器返回pending／storage-unavailable。原生复核直接检查原record依然dispatch-pending、无receipt、scope仍指向原recordId；直接commitReceipt同样被拒绝。检查与更新共用事务，不把早先的pending读当作永久许可。

## 逐项合同与证据映射

| 原TX-12故障合同／补充边界 | 当前直接证据 | 所证明的结果 |
| --- | --- | --- |
| approved digest／signed bytes篡改 | coordinator摘要拒绝／签名验签测试、reader BCS／digest等7类缺失或篡改 | 不能进入pending或接纳错误回执 |
| 调用方在异步等待期间篡改批准输入 | 新增模拟、签名两阶段TOCTOU测试 | 冻结的bytes／sender／digest／request／origin保持，dispatch只取批准值 |
| 五次授权检查撤回 | 新增第1–5边界参数化测试 | 前4次未落盘不提交，第5次保留已落盘原摘要；NotFound不释放、新请求不再签名 |
| 模拟／签名／验签等待期间会话关闭 | 新增3阶段取消测试 | 迟到结果不写pending、不dispatch |
| 同requestId不同账户身份／origin／digest | 新增3类身份冲突测试 | 读取已有记录后拒绝，模拟／签名／验签／写入／提交均为0 |
| 恢复查询前或后授权撤回、查询期间关闭会话 | 新增3类恢复撤销测试 | 回执不得写终态；原记录不变，无模拟、签名或提交 |
| pending未完成事务屏障 | coordinator暂停commit测试、原生strict complete观测 | durable完成前不能dispatch |
| pending双store写入失败／请求成功后异步abort | 原生QuotaExceededError注入、新增双add成功后真实abort | 两store原子回滚且0提前dispatch；回滚后新批准调用可独立执行一次夹具提交 |
| strict durability不可用 | 新增控制transaction返回relaxed并观察原生abort | 拒绝写入与dispatch；不声称当前Chromium真的缺strict支持 |
| corrupt／missing pending record、wrong scope owner | 新增3类实际IndexedDB损坏测试 | execute与recover均在模拟／签名／网络前拒绝，raw占用不被清除 |
| v1升级／blocked／迟到success／较高版本／缺stores | 原生v1保留及新增升级4场景 | 原数据保留、旧数据隔离、失败不派发、迟到连接关闭 |
| 隔离在pending读之后出现 | 新增原生dispatch期间隔离＋直接commitReceipt | 同事务拒绝终态；pending与占用保持 |
| 同scope并发、别名／revision不可绕过 | coordinator并发、原生独立连接与跨窗口Web Locks、准备和执行共scope测试 | 签名前互斥、持久pending在接替窗口继续阻挡新请求 |
| popup关闭／worker停止与实例重建 | 原生关闭持锁窗口、worker实际停止重启；已保留TRY-04实链只读恢复证据另列 | 本次原生harness证明停进程后的pending存续；不把fixture当实链广播 |
| dispatch传输／trailer／缺回执／错摘要／会话关闭 | 实际reader＋transport＋protobuf的5×成功／失败10场景 | 每例ExecuteTransaction一次，接替execute不再签名，recover只查询原digest |
| 链成功／失败effects与现代回执 | reader两终态和BCS facts测试、原生两个终态abort场景 | success／failure必须与effects一致，不把传输错误写成链失败 |
| 回执put与scope delete成功后事务abort | 原生成功／失败×首次提交／恢复的既有真实abort矩阵 | 同时回滚记录更新和锁删除；最终只读lookup可原子终结 |
| NotFound、Unavailable或恢复落盘失败 | coordinator保守恢复、reader真实gRPC状态解析、原生接替窗口NotFound | pending持续阻挡重建／重签／重发 |

上表为三个实际类及其存储／transport边界的直接故障矩阵，不声称每一行都是生产Chrome或真实服务断网。unit中journal／授权／签名／模拟为测试实现，gRPC联动用实际reader和SDK transport、受控响应。原生harness使用真正Chromium IndexedDB／Web Locks／service-worker，网络与签名回调为公开确定性夹具。

## 当前验证记录

最终钱包全量：[133文件1479项，exit 0](./20261005-execution-fault-matrix-full-tests-03.log)。其中本批coordinator新增16项；reader现有29项，新增测试不与既有用例重复计数。完整tsc：[exit 0](./20261005-execution-fault-matrix-tsc-04.log)。最后定向／原生存储／构建及闭包审计在同批最终证据文件中登记。

失败不删除：第1次strict fallback观察用了setTimeout(0)，未等到真实abort事件；改为有界等待原生abort事件后第2次24场景通过。第3次发现真实隔离写入缺口；业务修复后第4次27场景通过。最终轮在身份与恢复测试补齐后再执行，避免只引用旧测试数量。Webpack既有Tailwind类歧义warning保留，不记作构建失败或全部lint通过。

## 范围及后续

TX-12可以在本合同的单测／原生故障harness审计齐全后完成；物理断电、磁盘损坏、分布式写入隔离不能从本机测试推导。真实扩展所有入口竞争、切网／切账户／签名执行期间锁定分别归TX-04／07／10；全场景故障回归归QA-A10等。最新Local扩展要重新执行其自己的Chrome和实链验收，旧产物结果不能用于新产物。钱包尚不能判定可试用。

历史回放另有[当前真实观察](./20261005-execution-faults-history-observation.json)：0–24073，24074个marker，与coverage／watermark及首尾摘要一致，原22水位不变，上界386503、无退出码。这里不是全覆盖或恢复live证据。RTD debug源码／服务未因本批钱包故障测试改变。

最终定向[39 coordinator＋29 reader＝68项，exit 0](./20261005-execution-fault-boundaries-tests-final.log)，原生[27场景，exit 0](./20261005-execution-native-storage-faults-final-02.log)。[最终Local构建](./20261005-execution-faults-local-build-final.json)sourceUnchanged=true并与当前源码一致；[四入口39方法闭包](./20261005-execution-faults-wire-closure.json)对应同一dist，8项审计测试通过。最后只对harness脚本排版；尝试用完整token AST对比时因标点排版差异失败，不据此声称AST相同，实际再跑27场景通过；5个变更代码文件Prettier检查通过。

父项计数49/98（50.0%），trial_ready=false。F1–F5完成；其余父项未挪用本批harness证据。完整机器记录见[最终证据](../evidence/20261005-execution-fault-matrix-completion.json)。

文档核验：13章、14份原文保留、22项QA及21项wire迁移映射均通过；双方新增执行章节逐字一致，169条当前文档链接有效、四仓库diff检查通过，见[文档证据](../evidence/20261005-execution-fault-document-verification.json)。

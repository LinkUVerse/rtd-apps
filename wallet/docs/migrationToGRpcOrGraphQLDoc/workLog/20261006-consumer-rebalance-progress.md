# 六名额再平衡实际记录

按[实施合同](./20261006-consumer-rebalance-design.md)执行。原4／1／1、原进程、原配置和pending均保留；新owned operation为consumer-rebalance-20261006-01。控制测试03六项与空行序列化回归01两项通过。控制测试首次运行目录错误、prepare01缺模块、02／03原override字节守卫拒绝均保留，0信号。

预检确认writer当前config与原已执行catchup候选、manifest SHA和base SHA全部一致；唯一差别为此前连续tuned调用相对canonical base少一个空行。新工具只允许每条非空行精确相同，任何设置变更拒绝；新writer候选由同原base生成canonical2，保持全部非空配置，旧config不改写。prepare04真实通过，原文件／绑定／manifest完整私有备份且0信号。

apply01在浏览器gas05结束并关闭后执行：三个原拥有进程各一次TERM、真实退出，无强杀。indexer **29099**／consistent **29106**／writer **29112** 沿用当前最新八debug、原数据，分配2／2／2、合计仍六。原链、publisher／其pending、GraphQL、Ledger、adapter／账户reader未由该操作重启。运行状态为running-needs-verification，不自动重放。

[before01](./20261006-consumer-rebalance-before-01.json)最高670783／KV最低670778；[after01](./20261006-consumer-rebalance-after-01.json)最高670876／KV670818；[after02](./20261006-consumer-rebalance-after-02.json)最高672087／KV672055，拥有进程身份和原生窗口核验均通过，持久最高不倒退。after01→02约174.748秒，KV约7.079 cp/s、consistent约6.907 cp/s；这是实际活负载有限采样，不宣称稳定性能提升或已经追平。

必须保留重启的实际影响：native AvailableRange下界由586007变为670805，不能写成旧S仍可查询或完整历史无影响。最高及KV持久指标前进，已有原摘要仍由Fullnode／archive职责读取；低于新的一致性下界必须重新取得可用snapshot或明确拒绝，不能手改watermark。SQL 23管线当时到726884，publisher实际身份匹配且在7200秒预算内working，不能删除pending或重复其当前认证批次。

本批不新增98父任务；总进度76/98、trial_ready=false。原最新debug来源由prepare／apply原plan核验，C25新钱包仅独立业务预检修复，未改变RTD源码。进一步持久指标／查询验收及最终操作状态需继续，不能以进程Up替代。

## R4完整核验完成；原76计数段为历史

[独立完整审核01](./20261006-consumer-rebalance-completion-audit-01.json)通过：当前2／2／2与全局六名额、三个拥有PID／实际config、原私有备份与绑定、原RTD HEAD／diff及8个debug SHA均保持。只读TLS SQL实际23条持久watermark全部不低于726884，hist_displays认证覆盖0起连续保持；KV14／consistent4相对after02均不倒退，原生下界670805保持、最高前进，GraphQL Ledger已在新窗口内。

重启后indexer23个Prometheus gauge均为0且尚未重新触发更新，这不能当成持久SQL倒退，原数值及实际SQL分别保存。原publisher PID58791身份匹配、action working，审核时从原开始状态约2367.522秒，低于7200秒预算；没有删除pending或重启。三个原native摘要复核另附SHA，不重派交易。

R4完成其当前配置／数据／查询窗口合同；operation原状态running-needs-verification仍作为实施时事实保留，没有借只读审核覆写控制器原状态。本批0新信号／模拟／执行，不另增98父项，当前78/98、trial_ready=false。原586007到670805下界推进影响仍明确，全部追平和稳定吞吐未成立。

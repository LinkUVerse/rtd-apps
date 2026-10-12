# 当前状态（2026-10-07，C43 M4 与鉴权连接观测）

总体 **84/98（85.7%）**，14父项开放，`trial_ready=false`。本轮真实子合同完成不另增父计数。完整历史状态原字节保留于 [收口前归档](./20261007-current-state-before-C43-M4-close.md)，更早版本按其链接追溯；以下是当前结论。

开发／测试所需环境恢复并复核：两个保留RTD链使用本地最新源码的八个debug产物，G3第三明确后继、原25查询／两core／两publisher与配置保持；钱包 **28运行／14项健康**。最新 [恢复独立08](./20261007-G3-staking-C43-restored-independent-audit-08.json) 实际最低HBase353485／SQL354317／Rocks354317、Display及实际共同窗口覆盖原332734仓位。333000有限操作已自然结束4791.78秒、原三命令恢复、四finite／replay退出，不能重跑；200000和283000操作同样不重跑。水位是当次观察，不代表当前native链头或名称查询已覆盖。

临时容器清理累计 **41个确认退役**：前序39（含两个成功一次性archive初始化及旧C42边缘）加本轮两个独占鉴权实验容器，三个实验监听器亦按精确PID结束。全局109容器＝97运行／12退出；[bootstrap独立02](./20261007-retired-bootstrap-cleanup-independent-02.json)、本轮两份连接实验独立审核确认所有剩余配置／启动身份／完整挂载、所有卷名和镜像ID保持，原五个archive常驻服务及钱包28／14健康保持。实验只终止自己创建的监听器，原服务signals=0；0force／卷／镜像删除。原脚本／日志／inspect保留；12退出容器未确认退役继续保留。旧独立Mounts顺序工具失败及其v2实际通过均保留。

产品源码当前1119文件 SHA **f489a51f709fbfc1e66f1a55e26f97f6f84c805f4cd64cadb8d857aa5bcddb31**。修复质押金额在同会话读pending／error卸载Formik时丢失：修复前两真实回归失败、修复后47边界测试及生产类型通过；只把用户金额草稿同步到已有keyed生命周期，换账户／读会话／binding／路由仍清空。 [A1–A4修复验收](./20261007-staking-draft-retention-design.md) 完成；C43生产构建0错误／2既有warning，5285模块／2036源码／7chunks闭包通过，原C42完整源与产物独立差异审核确认唯一运行叶StakingCard.tsx，Background／SDK／其他运行源不变。

C43真实来源 **bdndjiekaedpfbbndoefomeaeccaohgg** 为第十二来源，三现代查询入口78实际规则／12同H0／三私有TLS独立核验，原27容器及Account TLS保留。旧C42 loopback已确认退役并删除；旧C42业务成功证据只属改源前范围，不与C43产物混用。普通Chrome开发CA／正常安装完整资金业务仍未验收，不称可试用门槛已过。

当前 [TX-04 M4完整质押／赎回](./20261007-C43-staking-matrix-close-design.md) V1–V5已实际完成：正确当前indexed validator和原332734仓位、两真实完整Review在sign-only占锁下明确拒绝，金额1／2和原仓位赎回三预览、8完整ENABLED模拟（5规范最终effects／3kind gas选择），原私有签名结果98633ms后因租约到期失败关闭、0返回signature／0Execute、native锁及签名器恢复；完整三空store、Back／重锁／Chrome退出保持。1027原帧／108独立补充、18共享输入语义变异拒绝完成，原15缺失读取body／实际503/504和独立01工具失败保留。

当前 [原质押回执R1–R4](./20261007-C43-staking-indexed-receipt-design.md) 九真实Chrome检查与独立01通过：S347463、两份原十依赖／Display响应与真实Observer `indexing=true`、原332734规范effects／typed摘要、真实回执触发资产刷新；原空journal／账户密文、正常重锁／自然退出，零模拟／签名／执行。原一份503完整body保留；只限原成功质押回执，不代表所有TX-08入口或原提交后的自动导航验收。

当前 [新C43严格pending P1–P4](./20261007-C43-staking-pending-design.md) 19项一次创建／直接NFT冷恢复与15项质押赎回冷续验、各独立01通过：**BMWQQ6WChyYemAcKWRdMMLiTy8anJiZBYbWtQwcs1o8r** 唯一Execute尝试被截断且0转发、产品自然持久pending；原context／worker关闭、锁定冷开／正常解锁，真实native锁free下两个当前入口仅恢复原摘要，S349358规范仓位／系统／typed摘要、三store／密文／observer退出／重锁保持，零新模拟／验签／执行。六及八原NOT_FOUND读取body缺失保留。创建器、该profile与摘要永不重跑／清空／重发，已计划M4只读续验结束。

当前 [气费变化旧批准G1–G4](./20261007-C43-staking-stale-gas-design.md) 七真实Chrome检查与独立01通过：两真实立即按钮进入原生产revalidateStaking，完整加载957.js／source map／本地源码验证，仅克隆本次参数bytes的gas budget+1000、旧digest与原可见批准保持；6份真实模拟／4规范最终effects／2kind选择后明确要求重新预览。S351765及原仓位／gas对象9补充帧、三store／密文／正常Back／重锁／Chrome退出，0验签／Execute；一份关闭GetServiceInfo body缺失及一份503保留。明确是故障注入，不声称产品gas编辑或市场价格变化。333000区间S6限定子合同已收口。

持续503/504根因与可用性仍开放：[C43真实TCP计数实验T1–T4](./20261007-C43-admission-counted-transport-design.md)和[单监听器池因素U1–U4](./20261007-C43-admission-pool-isolation-design.md)诊断子合同实际收口，两份独立审核核验 **672真实查询原帧**（668×200／4×503）及六否定门槛。前者8／16／32并发ABBA384与原入口control16：短连接188条／188次fresh授权、4次实际鉴权TCP connect timeout未进入guard；长连接72条／192次fresh授权，120次复用。后者同一HTTP/1.1 fresh guard、32并发ABBA256与原control16：无池128条／128次，pool8为104条／128次、24复用，全部成功而耗时接近。仅证实实际复用与前序故障阶段，不宣称根因修复或稳定性能收益。未改变原算法／8checks／32admitted／backlog32／5s等待／12scheck／2sconnect，未安装；两容器及三个监听器精确清理、29原进程／28容器14健康／全局资源保持，trace和全部失败保存。

正式admission／ingress传输候选需要受控后继、容量与故障拒绝及回滚核验，不能直接覆盖旧source／精确启动authority。PG planner等前序候选亦未安装。不能放宽H0／generation、授权、完整范围、名称当前native高度／minimumCheckpoint／S+20门槛，不能写水位或构造缓存／journal证据。更新前状态原字节保留于[连接观测前归档](./20261007-current-state-before-C43-transport.md)。

剩余14父项：RPC-22／23的完整NFT／Kiosk非空、locked、listed与当前转移准备竞争；TX-01全部批准字节／气费／赞助／过期矩阵，TX-04 M3与M5全入口收口，TX-08全部回执与写后indexed刷新；ENV-07普通ChromeTLS，TRY-05三入口历史／分页／package／名称；QA-A07完整能力／所有权，QA-A15名称当前native高度，QA-A17 Chrome错链／generation／迟到／冷恢复，QA-A19正常安装更新／CA／CORS，QA-A20全故障／重启／持续可用；REL-02当前三入口全功能无JSON-RPC／Sui外访和REL-05逐文档／RPC／页面／A01–A22最终审计。按Task与对应设计继续，不因子项完成预勾父任务。

原C39 FFMB严格pending、原C42 DEFM pending、所有原执行profile、原GYF质押332734及新BMWQ pending保持；原实际链交易不重发。未运行／失败／未达到完整父合同的工作不记为通过。

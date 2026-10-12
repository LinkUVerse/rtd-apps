# C109 质押完整组合读取的总期限与并发方案

当前原98项89完成、九父开放、剩余9.18%。C108三内部完整矩阵通过，但全捕获browser05在质押页真实TimeoutError失败；不能据browser04十二页恢复或HTTP200宣称完整当前页面或REL-02通过。C108自有网关已精确退役，两组链、原29容器／14健康／25actor和工作中的80964／96887保留。

本方案先于产品编码与新增测试。以前一轮封存48质押阶段请求时序为调查输入，先用原reader复现累计期限，再实施有界并发；受控复现不能单独证明真实浏览器失败的全部底层原因。原实机失败、三504和所有原审核拒绝均保存。

主合同是archive-service技术方案03的4.4：从同S的0x5 wrapper／内层V1或V2读当前系统；完整active／inactive、全部rate分页和可选owner仓位；20秒完整组合期限、active／inactive各1000、rate合计10000；字段名／类型／UID／BCS／count／epoch／owner及最后H0／S／digest／覆盖均通过才交付。20秒是钱包策略，不是Sui协议人数或读取顺序规定。不得使用epoch-start systemState代替当前系统，不能调大预算、移除末验、跳过空但前进的页或返回部分集合。

官方复核继续采用已有方案固定提交c860146823abcedef45a1b5a9c766920be98a29c：[Sui staking_pool源](https://github.com/MystenLabs/sui/blob/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-framework/packages/sui-system/sources/staking_pool.move)定义每个pool的epoch→PoolTokenExchangeRate表，以及仓位pool_id／activation／principal；[Epoch源](https://github.com/MystenLabs/sui/blob/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-indexer-alt-graphql/src/api/types/epoch.rs)用于既有epoch-start边界。此次重新查询权威原文，不改RTD原BCS布局、精确APY／奖励算法或本地钱包预算。并发是客户端调度选择，不冒充Sui规定。

## 实施与验证

1. 封存当前完整1121产品manifest、原staking-reader、两reader／session／snapshot／分页／fixture及所有原质押回归、C102构建与资格、C108完整矩阵和失败，保存原Task／进度／fine文件；只另存新证据，不改已合格工具或旧构建。
2. 新回归用真实GraphQLSnapshot／BCS fixture和受控相同leaf时延复现原串行20秒到期，覆盖两个reader入口。记录失败，不把该模型视为真实服务根因全证。新增预算与取消测试不得改变原1000／10000或20秒。
3. 依赖链0x5→内层→完整inactive wrapper仍按原顺序读取。得到完整validator集合后，先复核重复pool／active地址、commission／activation／deactivation和声明rate总数量；这些与已有输出前校验保持同一语义，非法声明不能触发大量新读取。
4. 对已经确定的各pool完整rate表和可选owner完整StakedRtd集合，共享同一reader／proof／signal，以最多四个逻辑任务调度。每个任务仍执行自身完整分页／BCS身份和snapshot.revalidate；原四物理名额队列保持，不新增旁路fetch。
5. 完成全部任务后按原validator及仓位顺序计算。原所有count／name／BCS／rate／risk／owner／pool关联／精确奖励及最后snapshot.revalidate保留；没有owner仍positions=null且不查询owned。rate累计数量与完整实际数量仍双重检查。
6. 为本次组合增加独立operation AbortController，继续使用原20秒及调用方signal。失败、调用取消、会话切换或末验失败时取消本组合的在途siblings，队列不再启动新任务；原错误向上返回，不返回partial、不重建或签名。成功也结束本组合scope，不能关闭全局session。
7. 意义测试包含：原串行复现与修复后同延迟完整结果、V1／V2与active／inactive、固定顺序、大额奖励与unknown、最多四任务和失败停止排队、caller／原20秒取消、迟到结果／最终S变化拒绝、所有原完整分页和字段预算。完成相关回归和完整TS后，另存production构建，dist及旧C46／C102构建不替换。
8. 新产品来源资格只允许原staking-reader与新增并发测试变化，其余1120文件及全部原构建／原生debug／部署／链保持。源码逆变换和构建完整闭包逐范围审核后，用新的自有operation／网关／profile做真实API和完整12页面及worker＋consumer三服务原帧审核，再复核当前三内部原矩阵。原普通Chrome／NFT／名称／完整REL-02等父合同不降低。
9. 实机结束按准确自有ID正常exit0／删除、保留数据和其它项目容器。完整全局状态如有其它任务变化，原失败保持并单独报告，不能称全局不变。更新Task／workLog／totalProgress，只有完整父合同达成才更新原权重。

P109准备或单测／构建通过不计父项，不直接完成P108-3／4、TX-01或REL-02。未经当前完整真实页面及原帧审计，质押真实超时仍视为未修复。
